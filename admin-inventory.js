(()=>{
const cfg=window.GLEMI_SUPABASE;if(!cfg||!window.supabase)return;
const db=window.supabase.createClient(cfg.url,cfg.key),$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],movements=[],loaded=false,busy=false;
const fmt=n=>Number(n).toLocaleString('en-CA',{maximumFractionDigits:2});
function stockState(p){const q=Number(p.quantity),min=Number(p.reorder_level);return q===0?'out':q<=min?'low':'ok'}
function showMessage(s){$('inventoryStatus').textContent=s||''}
async function staff(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !!data?.active&&['owner','admin'].includes(data.role)}
async function load(){if(busy)return;busy=true;showMessage('Loading inventory…');try{
if(!await staff()){showMessage('Staff login required to view inventory.');return}
const [a,b]=await Promise.all([db.from('inventory_products').select('*').order('name'),db.from('inventory_stock_movements').select('id,product_id,quantity_change,resulting_quantity,reason,created_at').order('created_at',{ascending:false}).limit(20)]);
if(a.error)throw a.error;if(b.error)throw b.error;
products=a.data||[];movements=b.data||[];loaded=true;render();showMessage('');}
catch(e){showMessage('Inventory unavailable: '+(e.message||e))}finally{busy=false}}
function render(){
$('inventoryTotal').textContent=products.length;
$('inventoryOut').textContent=products.filter(p=>stockState(p)==='out').length;
$('inventoryLow').textContent=products.filter(p=>stockState(p)==='low').length;
const q=$('inventorySearch').value.toLowerCase(),f=$('inventoryFilter').value;
const list=products.filter(p=>(f==='all'||stockState(p)===f)&&[p.name,p.category,p.notes].join(' ').toLowerCase().includes(q));
$('inventoryList').innerHTML=list.map(p=>{
const st=stockState(p),label=st==='out'?'Out of stock':st==='low'?'Low stock':'In stock';
return '<article class="inventory-product"><div class="inventory-product-top"><div class="inventory-product-icon" aria-hidden="true">✦</div><div><h4>'+esc(p.name)+'</h4><span class="inventory-category">'+esc(p.category)+'</span></div></div><div class="inventory-qty"><strong>'+fmt(p.quantity)+'</strong><span>'+esc(p.unit)+'</span></div><span class="inventory-pill '+st+'">'+label+'</span><p class="muted" style="font-size:12px;margin:12px 0 0">Restock reminder at '+fmt(p.reorder_level)+' '+esc(p.unit)+'</p><div class="inventory-actions"><button type="button" data-add="'+esc(p.id)+'">＋ Add</button><button type="button" data-use="'+esc(p.id)+'">－ Use</button><button type="button" data-edit-stock="'+esc(p.id)+'">✎ Edit</button></div></article>'
}).join('')||'<p class="muted">No matching products yet. Add your first supply to begin.</p>';
$('inventoryMovements').innerHTML=movements.map(m=>{const p=products.find(x=>x.id===m.product_id);return '<div class="inventory-movement"><div><strong>'+esc(p?.name||'Removed product')+'</strong><div>'+esc(m.reason)+'</div><small>'+new Date(m.created_at).toLocaleString('en-CA')+'</small></div><div><strong>'+(Number(m.quantity_change)>0?'+':'')+fmt(m.quantity_change)+'</strong><div>'+fmt(m.resulting_quantity)+' remaining</div></div></div>'}).join('')||'<p class="muted">No stock movements yet.</p>';
}
function openProduct(p){$('inventoryForm').reset();$('inventoryId').value=p?.id||'';$('inventoryDialogTitle').textContent=p?'Edit product':'Add product';$('inventoryName').value=p?.name||'';$('inventoryCategory').value=p?.category||'Cleaning supplies';$('inventoryUnit').value=p?.unit||'units';$('inventoryQuantity').value=p?.quantity??0;$('inventoryQuantity').disabled=!!p;$('inventoryReorder').value=p?.reorder_level??2;$('inventoryNotes').value=p?.notes||'';$('inventoryFormStatus').textContent=p?'Use Add / Use to change the stock quantity.':'';
$('inventoryDialog').showModal()}
$('inventoryNewBtn').addEventListener('click',()=>openProduct(null));
$('inventoryClose').addEventListener('click',()=>$('inventoryDialog').close());
$('inventoryCancel').addEventListener('click',()=>$('inventoryDialog').close());
$('inventorySearch').addEventListener('input',render);$('inventoryFilter').addEventListener('change',render);
$('inventoryForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('inventoryId').value;const payload={name:$('inventoryName').value.trim(),category:$('inventoryCategory').value.trim()||'Cleaning supplies',unit:$('inventoryUnit').value.trim()||'units',reorder_level:Number($('inventoryReorder').value),notes:$('inventoryNotes').value.trim()};if(!id)payload.quantity=Number($('inventoryQuantity').value);if(!payload.name||Object.values(payload).some(v=>typeof v==='number'&&(!Number.isFinite(v)||v<0))){$('inventoryFormStatus').textContent='Enter a valid product and quantity.';return}
const button=$('inventorySave');button.disabled=true;$('inventoryFormStatus').textContent='Saving…';
try{const r=id?await db.from('inventory_products').update(payload).eq('id',id):await db.from('inventory_products').insert(payload);if(r.error)throw r.error;$('inventoryDialog').close();await load()}catch(err){$('inventoryFormStatus').textContent=err.message||String(err)}finally{button.disabled=false}});
$('inventoryList').addEventListener('click',async e=>{
const button=e.target.closest('button');if(!button)return;
const id=button.dataset.add||button.dataset.use||button.dataset.editStock,p=products.find(x=>x.id===id);if(!p)return;
if(button.dataset.editStock){openProduct(p);return}
const adding=!!button.dataset.add;
const value=prompt((adding?'How many '+p.unit+' to add to ':'How many '+p.unit+' used from ')+p.name+'?', '1');if(value===null)return;
const n=Number(value);if(!Number.isFinite(n)||n<=0){alert('Enter a number greater than zero.');return}
if(!adding&&n>Number(p.quantity)){alert('Not enough stock available.');return}
const reason=prompt('Reason for stock change (optional)',adding?'New stock received':'Used for cleaning');if(reason===null)return;
button.disabled=true;
try{const {error}=await db.rpc('adjust_inventory_stock',{p_product_id:id,p_delta:adding?n:-n,p_reason:reason.trim()||'Stock adjustment'});if(error)throw error;await load();if(!adding&&Number(p.quantity)-n===0){showMessage('Out-of-stock alert saved. Email delivery will be available once notification setup is completed.')}}catch(err){alert('Could not update stock: '+(err.message||err))}finally{button.disabled=false}
});
document.querySelectorAll('[data-view="inventory"]').forEach(b=>b.addEventListener('click',()=>{setTimeout(load,80)}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('inventory')?.classList.contains('active'))load()});
})();