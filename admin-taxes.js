(()=>{
const cfg=window.GLEMI_SUPABASE;if(!cfg||!window.supabase)return;
const db=window.supabase.createClient(cfg.url,cfg.key),$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let expenses=[],payments=[],employees=[],appointments=[],busy=false;
const expenseForm=$('taxExpenseForm');
document.querySelectorAll('[data-tax-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.taxTab;document.querySelectorAll('[data-tax-tab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-selected',String(b===button))});document.querySelectorAll('[data-tax-pane]').forEach(p=>p.hidden=p.dataset.taxPane!==tab)}));
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function estimateTax(){const f=expenseForm.elements,basis=f.tax_basis.value,amount=Number(f.subtotal.value)||0,g=Number(f.gst_rate.value)||0,p=Number(f.pst_rate.value)||0;const gstRate=Math.max(0,g)/100,pstRate=Math.max(0,p)/100;let base=amount,gst=0,pst=0;if(basis==='included'){base=round(amount/(1+gstRate+pstRate));gst=round(base*gstRate);pst=round(amount-base-gst)}else if(basis==='excluded'){gst=round(amount*gstRate);pst=round(amount*pstRate)}else{gst=Number(f.gst.value)||0;pst=Number(f.pst.value)||0}if(basis!=='manual'){f.gst.value=gst.toFixed(2);f.pst.value=pst.toFixed(2)}$('taxAmountLabel').textContent=basis==='excluded'?'Before-tax amount (CAD)':basis==='included'?'Total paid, taxes included (CAD)':'Subtotal (CAD)';$('taxEstimatePreview').textContent='Before-tax: $'+base.toFixed(2)+' CAD · GST: $'+gst.toFixed(2)+' · PST: $'+pst.toFixed(2)+' · Total: $'+(basis==='included'?amount:base+gst+pst).toFixed(2)+' CAD';}
expenseForm.elements.category.addEventListener('change',()=>{if(expenseForm.elements.category.value==='Vehicle & fuel'){expenseForm.elements.gst_rate.value='5';expenseForm.elements.pst_rate.value='0';if(!expenseForm.elements.quantity_unit.value)expenseForm.elements.quantity_unit.value='L'}estimateTax()});
['input','change'].forEach(type=>expenseForm.addEventListener(type,e=>{if(e.target.name==='gst'||e.target.name==='pst'){if(expenseForm.elements.tax_basis.value==='manual')estimateTax();return}estimateTax()}));estimateTax();
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const total=e=>Number(e.subtotal)+Number(e.gst)+Number(e.pst)+Number(e.other_tax);
async function staff(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !!data?.active&&['owner','admin'].includes(data.role)}
async function load(){if(busy)return;busy=true;try{
if(!await staff())return;
const results=await Promise.all([
db.from('tax_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
db.from('tax_cleaning_payments').select('*').order('payment_date',{ascending:false}).limit(1000),
db.from('cleaning_employees').select('id,full_name').order('full_name'),
db.from('appointments').select('id,client_name,appointment_date,status').order('appointment_date',{ascending:false}).limit(500)
]);for(const x of results)if(x.error)throw x.error;
[expenses,payments,employees,appointments]=results.map(x=>x.data||[]);
$('taxEmployeeSelect').innerHTML='<option value="">Choose employee</option>'+employees.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.full_name)+'</option>').join('');
$('taxAppointmentSelect').innerHTML='<option value="">Not linked to booking</option>'+appointments.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.appointment_date+' · '+a.client_name+' · '+a.status)+'</option>').join('');
render();
}catch(err){$('taxExpenseList').textContent='Could not load accounting data: '+(err.message||err)}finally{busy=false}}
function render(){
$('taxExpenseTotal').textContent=money(expenses.reduce((s,e)=>s+total(e),0));
$('taxPaymentTotal').textContent=money(payments.reduce((s,p)=>s+Number(p.amount),0));
$('taxReceiptTotal').textContent=expenses.filter(e=>e.receipt_path).length;
$('taxExpenseList').innerHTML=expenses.length?expenses.map(e=>'<div class="tax-record"><div><strong>'+esc(e.vendor)+'</strong><small>'+esc(e.expense_date)+' · '+esc(e.category)+' · '+esc(e.deductible_status)+'</small><small>Subtotal '+money(e.subtotal)+' · GST '+money(e.gst)+' · PST '+money(e.pst)+'</small></div><div><strong>'+money(total(e))+'</strong> '+(e.receipt_path?'<button type="button" data-receipt="'+esc(e.id)+'">View receipt</button>':'<small>No receipt</small>')+'</div></div>').join(''):'<p class="muted">No expense records yet.</p>';
$('taxPaymentList').innerHTML=payments.length?payments.map(p=>'<div class="tax-record"><div><strong>'+esc(p.employee_name)+'</strong><small>'+esc(p.payment_date)+' · '+esc(p.payment_type)+' · '+esc(p.payment_status)+'</small><small>'+esc(p.note)+'</small></div><strong>'+money(p.amount)+'</strong></div>').join(''):'<p class="muted">No cleaner payments recorded yet.</p>';
}
function number(v){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid non-negative amount');return Math.round(n*100)/100}
function fileCheck(file){if(!file)return;const types=['application/pdf','image/jpeg','image/png','image/webp'];if(!types.includes(file.type)||file.size>10*1024*1024)throw new Error('Receipt must be PDF, JPG, PNG or WebP and smaller than 10 MB')}
$('taxExpenseForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxExpenseStatus');button.disabled=true;status.textContent='Saving…';let uploaded=null;
try{const f=new FormData(form),file=f.get('receipt');if(file?.size){fileCheck(file);const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];uploaded=crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('glemi-tax-receipts').upload(uploaded,file,{contentType:file.type,upsert:false});if(error)throw error}
estimateTax();const included=f.get('tax_basis')==='included';const gstValue=number(f.get('gst')),pstValue=number(f.get('pst')),entered=number(f.get('subtotal'));const calculatedSubtotal=included?Math.max(0,round(entered-gstValue-pstValue)):entered;const row={quantity:f.get('quantity')?number(f.get('quantity')):null,quantity_unit:String(f.get('quantity_unit')||'').trim()||null,tax_basis:f.get('tax_basis'),gst_rate:number(f.get('gst_rate')),pst_rate:number(f.get('pst_rate')),business_use_percent:number(f.get('business_use')),tax_estimated:f.get('tax_basis')!=='manual',expense_date:f.get('expense_date'),vendor:String(f.get('vendor')||'').trim(),category:String(f.get('category')||''),description:String(f.get('description')||''),subtotal:calculatedSubtotal,gst:gstValue,pst:pstValue,other_tax:number(f.get('other_tax')),deductible_status:f.get('deductible_status'),receipt_path:uploaded,receipt_name:file?.size?file.name:null};
const {error}=await db.from('tax_expenses').insert(row);if(error)throw error;form.reset();estimateTax();form.querySelector('[name=expense_date]').value=new Date().toISOString().slice(0,10);status.textContent='Expense saved.';await load();
}catch(err){if(uploaded)await db.storage.from('glemi-tax-receipts').remove([uploaded]);status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxPaymentForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxPaymentStatus');button.disabled=true;status.textContent='Saving…';
try{const f=new FormData(form),employee=employees.find(x=>x.id===f.get('employee_id'));if(!employee)throw new Error('Choose an employee');const row={employee_id:employee.id,employee_name:employee.full_name,appointment_id:f.get('appointment_id')||null,payment_date:f.get('payment_date'),amount:number(f.get('amount')),payment_type:f.get('payment_type'),payment_status:f.get('payment_status'),note:String(f.get('note')||'').trim()};const {error}=await db.from('tax_cleaning_payments').insert(row);if(error)throw error;form.reset();form.querySelector('[name=payment_date]').value=new Date().toISOString().slice(0,10);status.textContent='Cleaner payment recorded.';await load()}catch(err){status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxExpenseList').addEventListener('click',async e=>{const button=e.target.closest('[data-receipt]');if(!button)return;const record=expenses.find(x=>x.id===button.dataset.receipt);if(!record?.receipt_path)return;button.disabled=true;try{const {data,error}=await db.storage.from('glemi-tax-receipts').createSignedUrl(record.receipt_path,120);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}catch(err){alert('Could not open receipt: '+(err.message||err))}finally{button.disabled=false}});
function exportCSV(rows,cols,name){const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>r[c[1]]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('taxExportExpenses').addEventListener('click',()=>exportCSV(expenses,[['Date','expense_date'],['Vendor','vendor'],['Category','category'],['Description','description'],['Subtotal CAD','subtotal'],['GST CAD','gst'],['PST CAD','pst'],['Other tax CAD','other_tax'],['Accountant review','deductible_status'],['Receipt filename','receipt_name']], 'glemi-expenses.csv'));
$('taxExportPayments').addEventListener('click',()=>exportCSV(payments,[['Payment date','payment_date'],['Employee','employee_name'],['Amount CAD','amount'],['Type','payment_type'],['Status','payment_status'],['Booking ID','appointment_id'],['Notes','note']], 'glemi-cleaner-payments.csv'));
document.querySelectorAll('[data-view="taxes"]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,100)));
for(const form of [$('taxExpenseForm'),$('taxPaymentForm')])form.querySelector('input[type=date]').value=new Date().toISOString().slice(0,10);
})();+base.toFixed(2)+' CAD · GST: 
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const total=e=>Number(e.subtotal)+Number(e.gst)+Number(e.pst)+Number(e.other_tax);
async function staff(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !!data?.active&&['owner','admin'].includes(data.role)}
async function load(){if(busy)return;busy=true;try{
if(!await staff())return;
const results=await Promise.all([
db.from('tax_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
db.from('tax_cleaning_payments').select('*').order('payment_date',{ascending:false}).limit(1000),
db.from('cleaning_employees').select('id,full_name').order('full_name'),
db.from('appointments').select('id,client_name,appointment_date,status').order('appointment_date',{ascending:false}).limit(500)
]);for(const x of results)if(x.error)throw x.error;
[expenses,payments,employees,appointments]=results.map(x=>x.data||[]);
$('taxEmployeeSelect').innerHTML='<option value="">Choose employee</option>'+employees.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.full_name)+'</option>').join('');
$('taxAppointmentSelect').innerHTML='<option value="">Not linked to booking</option>'+appointments.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.appointment_date+' · '+a.client_name+' · '+a.status)+'</option>').join('');
render();
}catch(err){$('taxExpenseList').textContent='Could not load accounting data: '+(err.message||err)}finally{busy=false}}
function render(){
$('taxExpenseTotal').textContent=money(expenses.reduce((s,e)=>s+total(e),0));
$('taxPaymentTotal').textContent=money(payments.reduce((s,p)=>s+Number(p.amount),0));
$('taxReceiptTotal').textContent=expenses.filter(e=>e.receipt_path).length;
$('taxExpenseList').innerHTML=expenses.length?expenses.map(e=>'<div class="tax-record"><div><strong>'+esc(e.vendor)+'</strong><small>'+esc(e.expense_date)+' · '+esc(e.category)+' · '+esc(e.deductible_status)+'</small><small>Subtotal '+money(e.subtotal)+' · GST '+money(e.gst)+' · PST '+money(e.pst)+'</small></div><div><strong>'+money(total(e))+'</strong> '+(e.receipt_path?'<button type="button" data-receipt="'+esc(e.id)+'">View receipt</button>':'<small>No receipt</small>')+'</div></div>').join(''):'<p class="muted">No expense records yet.</p>';
$('taxPaymentList').innerHTML=payments.length?payments.map(p=>'<div class="tax-record"><div><strong>'+esc(p.employee_name)+'</strong><small>'+esc(p.payment_date)+' · '+esc(p.payment_type)+' · '+esc(p.payment_status)+'</small><small>'+esc(p.note)+'</small></div><strong>'+money(p.amount)+'</strong></div>').join(''):'<p class="muted">No cleaner payments recorded yet.</p>';
}
function number(v){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid non-negative amount');return Math.round(n*100)/100}
function fileCheck(file){if(!file)return;const types=['application/pdf','image/jpeg','image/png','image/webp'];if(!types.includes(file.type)||file.size>10*1024*1024)throw new Error('Receipt must be PDF, JPG, PNG or WebP and smaller than 10 MB')}
$('taxExpenseForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxExpenseStatus');button.disabled=true;status.textContent='Saving…';let uploaded=null;
try{const f=new FormData(form),file=f.get('receipt');if(file?.size){fileCheck(file);const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];uploaded=crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('glemi-tax-receipts').upload(uploaded,file,{contentType:file.type,upsert:false});if(error)throw error}
const row={expense_date:f.get('expense_date'),vendor:String(f.get('vendor')||'').trim(),category:String(f.get('category')||''),description:String(f.get('description')||''),subtotal:number(f.get('subtotal')),gst:number(f.get('gst')),pst:number(f.get('pst')),other_tax:number(f.get('other_tax')),deductible_status:f.get('deductible_status'),receipt_path:uploaded,receipt_name:file?.size?file.name:null};
const {error}=await db.from('tax_expenses').insert(row);if(error)throw error;form.reset();form.querySelector('[name=expense_date]').value=new Date().toISOString().slice(0,10);status.textContent='Expense saved.';await load();
}catch(err){if(uploaded)await db.storage.from('glemi-tax-receipts').remove([uploaded]);status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxPaymentForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxPaymentStatus');button.disabled=true;status.textContent='Saving…';
try{const f=new FormData(form),employee=employees.find(x=>x.id===f.get('employee_id'));if(!employee)throw new Error('Choose an employee');const row={employee_id:employee.id,employee_name:employee.full_name,appointment_id:f.get('appointment_id')||null,payment_date:f.get('payment_date'),amount:number(f.get('amount')),payment_type:f.get('payment_type'),payment_status:f.get('payment_status'),note:String(f.get('note')||'').trim()};const {error}=await db.from('tax_cleaning_payments').insert(row);if(error)throw error;form.reset();form.querySelector('[name=payment_date]').value=new Date().toISOString().slice(0,10);status.textContent='Cleaner payment recorded.';await load()}catch(err){status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxExpenseList').addEventListener('click',async e=>{const button=e.target.closest('[data-receipt]');if(!button)return;const record=expenses.find(x=>x.id===button.dataset.receipt);if(!record?.receipt_path)return;button.disabled=true;try{const {data,error}=await db.storage.from('glemi-tax-receipts').createSignedUrl(record.receipt_path,120);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}catch(err){alert('Could not open receipt: '+(err.message||err))}finally{button.disabled=false}});
function exportCSV(rows,cols,name){const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>r[c[1]]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('taxExportExpenses').addEventListener('click',()=>exportCSV(expenses,[['Date','expense_date'],['Vendor','vendor'],['Category','category'],['Description','description'],['Subtotal CAD','subtotal'],['GST CAD','gst'],['PST CAD','pst'],['Other tax CAD','other_tax'],['Accountant review','deductible_status'],['Receipt filename','receipt_name']], 'glemi-expenses.csv'));
$('taxExportPayments').addEventListener('click',()=>exportCSV(payments,[['Payment date','payment_date'],['Employee','employee_name'],['Amount CAD','amount'],['Type','payment_type'],['Status','payment_status'],['Booking ID','appointment_id'],['Notes','note']], 'glemi-cleaner-payments.csv'));
document.querySelectorAll('[data-view="taxes"]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,100)));
for(const form of [$('taxExpenseForm'),$('taxPaymentForm')])form.querySelector('input[type=date]').value=new Date().toISOString().slice(0,10);
})();+gst.toFixed(2)+' · PST: 
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const total=e=>Number(e.subtotal)+Number(e.gst)+Number(e.pst)+Number(e.other_tax);
async function staff(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !!data?.active&&['owner','admin'].includes(data.role)}
async function load(){if(busy)return;busy=true;try{
if(!await staff())return;
const results=await Promise.all([
db.from('tax_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
db.from('tax_cleaning_payments').select('*').order('payment_date',{ascending:false}).limit(1000),
db.from('cleaning_employees').select('id,full_name').order('full_name'),
db.from('appointments').select('id,client_name,appointment_date,status').order('appointment_date',{ascending:false}).limit(500)
]);for(const x of results)if(x.error)throw x.error;
[expenses,payments,employees,appointments]=results.map(x=>x.data||[]);
$('taxEmployeeSelect').innerHTML='<option value="">Choose employee</option>'+employees.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.full_name)+'</option>').join('');
$('taxAppointmentSelect').innerHTML='<option value="">Not linked to booking</option>'+appointments.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.appointment_date+' · '+a.client_name+' · '+a.status)+'</option>').join('');
render();
}catch(err){$('taxExpenseList').textContent='Could not load accounting data: '+(err.message||err)}finally{busy=false}}
function render(){
$('taxExpenseTotal').textContent=money(expenses.reduce((s,e)=>s+total(e),0));
$('taxPaymentTotal').textContent=money(payments.reduce((s,p)=>s+Number(p.amount),0));
$('taxReceiptTotal').textContent=expenses.filter(e=>e.receipt_path).length;
$('taxExpenseList').innerHTML=expenses.length?expenses.map(e=>'<div class="tax-record"><div><strong>'+esc(e.vendor)+'</strong><small>'+esc(e.expense_date)+' · '+esc(e.category)+' · '+esc(e.deductible_status)+'</small><small>Subtotal '+money(e.subtotal)+' · GST '+money(e.gst)+' · PST '+money(e.pst)+'</small></div><div><strong>'+money(total(e))+'</strong> '+(e.receipt_path?'<button type="button" data-receipt="'+esc(e.id)+'">View receipt</button>':'<small>No receipt</small>')+'</div></div>').join(''):'<p class="muted">No expense records yet.</p>';
$('taxPaymentList').innerHTML=payments.length?payments.map(p=>'<div class="tax-record"><div><strong>'+esc(p.employee_name)+'</strong><small>'+esc(p.payment_date)+' · '+esc(p.payment_type)+' · '+esc(p.payment_status)+'</small><small>'+esc(p.note)+'</small></div><strong>'+money(p.amount)+'</strong></div>').join(''):'<p class="muted">No cleaner payments recorded yet.</p>';
}
function number(v){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid non-negative amount');return Math.round(n*100)/100}
function fileCheck(file){if(!file)return;const types=['application/pdf','image/jpeg','image/png','image/webp'];if(!types.includes(file.type)||file.size>10*1024*1024)throw new Error('Receipt must be PDF, JPG, PNG or WebP and smaller than 10 MB')}
$('taxExpenseForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxExpenseStatus');button.disabled=true;status.textContent='Saving…';let uploaded=null;
try{const f=new FormData(form),file=f.get('receipt');if(file?.size){fileCheck(file);const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];uploaded=crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('glemi-tax-receipts').upload(uploaded,file,{contentType:file.type,upsert:false});if(error)throw error}
const row={expense_date:f.get('expense_date'),vendor:String(f.get('vendor')||'').trim(),category:String(f.get('category')||''),description:String(f.get('description')||''),subtotal:number(f.get('subtotal')),gst:number(f.get('gst')),pst:number(f.get('pst')),other_tax:number(f.get('other_tax')),deductible_status:f.get('deductible_status'),receipt_path:uploaded,receipt_name:file?.size?file.name:null};
const {error}=await db.from('tax_expenses').insert(row);if(error)throw error;form.reset();form.querySelector('[name=expense_date]').value=new Date().toISOString().slice(0,10);status.textContent='Expense saved.';await load();
}catch(err){if(uploaded)await db.storage.from('glemi-tax-receipts').remove([uploaded]);status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxPaymentForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxPaymentStatus');button.disabled=true;status.textContent='Saving…';
try{const f=new FormData(form),employee=employees.find(x=>x.id===f.get('employee_id'));if(!employee)throw new Error('Choose an employee');const row={employee_id:employee.id,employee_name:employee.full_name,appointment_id:f.get('appointment_id')||null,payment_date:f.get('payment_date'),amount:number(f.get('amount')),payment_type:f.get('payment_type'),payment_status:f.get('payment_status'),note:String(f.get('note')||'').trim()};const {error}=await db.from('tax_cleaning_payments').insert(row);if(error)throw error;form.reset();form.querySelector('[name=payment_date]').value=new Date().toISOString().slice(0,10);status.textContent='Cleaner payment recorded.';await load()}catch(err){status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxExpenseList').addEventListener('click',async e=>{const button=e.target.closest('[data-receipt]');if(!button)return;const record=expenses.find(x=>x.id===button.dataset.receipt);if(!record?.receipt_path)return;button.disabled=true;try{const {data,error}=await db.storage.from('glemi-tax-receipts').createSignedUrl(record.receipt_path,120);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}catch(err){alert('Could not open receipt: '+(err.message||err))}finally{button.disabled=false}});
function exportCSV(rows,cols,name){const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>r[c[1]]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('taxExportExpenses').addEventListener('click',()=>exportCSV(expenses,[['Date','expense_date'],['Vendor','vendor'],['Category','category'],['Description','description'],['Subtotal CAD','subtotal'],['GST CAD','gst'],['PST CAD','pst'],['Other tax CAD','other_tax'],['Accountant review','deductible_status'],['Receipt filename','receipt_name']], 'glemi-expenses.csv'));
$('taxExportPayments').addEventListener('click',()=>exportCSV(payments,[['Payment date','payment_date'],['Employee','employee_name'],['Amount CAD','amount'],['Type','payment_type'],['Status','payment_status'],['Booking ID','appointment_id'],['Notes','note']], 'glemi-cleaner-payments.csv'));
document.querySelectorAll('[data-view="taxes"]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,100)));
for(const form of [$('taxExpenseForm'),$('taxPaymentForm')])form.querySelector('input[type=date]').value=new Date().toISOString().slice(0,10);
})();+pst.toFixed(2)+' · Total: 
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const total=e=>Number(e.subtotal)+Number(e.gst)+Number(e.pst)+Number(e.other_tax);
async function staff(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !!data?.active&&['owner','admin'].includes(data.role)}
async function load(){if(busy)return;busy=true;try{
if(!await staff())return;
const results=await Promise.all([
db.from('tax_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
db.from('tax_cleaning_payments').select('*').order('payment_date',{ascending:false}).limit(1000),
db.from('cleaning_employees').select('id,full_name').order('full_name'),
db.from('appointments').select('id,client_name,appointment_date,status').order('appointment_date',{ascending:false}).limit(500)
]);for(const x of results)if(x.error)throw x.error;
[expenses,payments,employees,appointments]=results.map(x=>x.data||[]);
$('taxEmployeeSelect').innerHTML='<option value="">Choose employee</option>'+employees.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.full_name)+'</option>').join('');
$('taxAppointmentSelect').innerHTML='<option value="">Not linked to booking</option>'+appointments.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.appointment_date+' · '+a.client_name+' · '+a.status)+'</option>').join('');
render();
}catch(err){$('taxExpenseList').textContent='Could not load accounting data: '+(err.message||err)}finally{busy=false}}
function render(){
$('taxExpenseTotal').textContent=money(expenses.reduce((s,e)=>s+total(e),0));
$('taxPaymentTotal').textContent=money(payments.reduce((s,p)=>s+Number(p.amount),0));
$('taxReceiptTotal').textContent=expenses.filter(e=>e.receipt_path).length;
$('taxExpenseList').innerHTML=expenses.length?expenses.map(e=>'<div class="tax-record"><div><strong>'+esc(e.vendor)+'</strong><small>'+esc(e.expense_date)+' · '+esc(e.category)+' · '+esc(e.deductible_status)+'</small><small>Subtotal '+money(e.subtotal)+' · GST '+money(e.gst)+' · PST '+money(e.pst)+'</small></div><div><strong>'+money(total(e))+'</strong> '+(e.receipt_path?'<button type="button" data-receipt="'+esc(e.id)+'">View receipt</button>':'<small>No receipt</small>')+'</div></div>').join(''):'<p class="muted">No expense records yet.</p>';
$('taxPaymentList').innerHTML=payments.length?payments.map(p=>'<div class="tax-record"><div><strong>'+esc(p.employee_name)+'</strong><small>'+esc(p.payment_date)+' · '+esc(p.payment_type)+' · '+esc(p.payment_status)+'</small><small>'+esc(p.note)+'</small></div><strong>'+money(p.amount)+'</strong></div>').join(''):'<p class="muted">No cleaner payments recorded yet.</p>';
}
function number(v){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid non-negative amount');return Math.round(n*100)/100}
function fileCheck(file){if(!file)return;const types=['application/pdf','image/jpeg','image/png','image/webp'];if(!types.includes(file.type)||file.size>10*1024*1024)throw new Error('Receipt must be PDF, JPG, PNG or WebP and smaller than 10 MB')}
$('taxExpenseForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxExpenseStatus');button.disabled=true;status.textContent='Saving…';let uploaded=null;
try{const f=new FormData(form),file=f.get('receipt');if(file?.size){fileCheck(file);const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];uploaded=crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('glemi-tax-receipts').upload(uploaded,file,{contentType:file.type,upsert:false});if(error)throw error}
const row={expense_date:f.get('expense_date'),vendor:String(f.get('vendor')||'').trim(),category:String(f.get('category')||''),description:String(f.get('description')||''),subtotal:number(f.get('subtotal')),gst:number(f.get('gst')),pst:number(f.get('pst')),other_tax:number(f.get('other_tax')),deductible_status:f.get('deductible_status'),receipt_path:uploaded,receipt_name:file?.size?file.name:null};
const {error}=await db.from('tax_expenses').insert(row);if(error)throw error;form.reset();form.querySelector('[name=expense_date]').value=new Date().toISOString().slice(0,10);status.textContent='Expense saved.';await load();
}catch(err){if(uploaded)await db.storage.from('glemi-tax-receipts').remove([uploaded]);status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxPaymentForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxPaymentStatus');button.disabled=true;status.textContent='Saving…';
try{const f=new FormData(form),employee=employees.find(x=>x.id===f.get('employee_id'));if(!employee)throw new Error('Choose an employee');const row={employee_id:employee.id,employee_name:employee.full_name,appointment_id:f.get('appointment_id')||null,payment_date:f.get('payment_date'),amount:number(f.get('amount')),payment_type:f.get('payment_type'),payment_status:f.get('payment_status'),note:String(f.get('note')||'').trim()};const {error}=await db.from('tax_cleaning_payments').insert(row);if(error)throw error;form.reset();form.querySelector('[name=payment_date]').value=new Date().toISOString().slice(0,10);status.textContent='Cleaner payment recorded.';await load()}catch(err){status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxExpenseList').addEventListener('click',async e=>{const button=e.target.closest('[data-receipt]');if(!button)return;const record=expenses.find(x=>x.id===button.dataset.receipt);if(!record?.receipt_path)return;button.disabled=true;try{const {data,error}=await db.storage.from('glemi-tax-receipts').createSignedUrl(record.receipt_path,120);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}catch(err){alert('Could not open receipt: '+(err.message||err))}finally{button.disabled=false}});
function exportCSV(rows,cols,name){const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>r[c[1]]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('taxExportExpenses').addEventListener('click',()=>exportCSV(expenses,[['Date','expense_date'],['Vendor','vendor'],['Category','category'],['Description','description'],['Subtotal CAD','subtotal'],['GST CAD','gst'],['PST CAD','pst'],['Other tax CAD','other_tax'],['Accountant review','deductible_status'],['Receipt filename','receipt_name']], 'glemi-expenses.csv'));
$('taxExportPayments').addEventListener('click',()=>exportCSV(payments,[['Payment date','payment_date'],['Employee','employee_name'],['Amount CAD','amount'],['Type','payment_type'],['Status','payment_status'],['Booking ID','appointment_id'],['Notes','note']], 'glemi-cleaner-payments.csv'));
document.querySelectorAll('[data-view="taxes"]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,100)));
for(const form of [$('taxExpenseForm'),$('taxPaymentForm')])form.querySelector('input[type=date]').value=new Date().toISOString().slice(0,10);
})();+(basis==='included'?amount:base+gst+pst).toFixed(2)+' CAD · Business use: '+(Number(f.business_use.value)||0)+'%';}
expenseForm.elements.category.addEventListener('change',()=>{if(expenseForm.elements.category.value==='Vehicle & fuel'){expenseForm.elements.gst_rate.value='5';expenseForm.elements.pst_rate.value='0';if(!expenseForm.elements.quantity_unit.value)expenseForm.elements.quantity_unit.value='L'}estimateTax()});
['input','change'].forEach(type=>expenseForm.addEventListener(type,e=>{if(e.target.name==='gst'||e.target.name==='pst'){if(expenseForm.elements.tax_basis.value==='manual')estimateTax();return}estimateTax()}));estimateTax();

const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const total=e=>Number(e.subtotal)+Number(e.gst)+Number(e.pst)+Number(e.other_tax);
async function staff(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !!data?.active&&['owner','admin'].includes(data.role)}
async function load(){if(busy)return;busy=true;try{
if(!await staff())return;
const results=await Promise.all([
db.from('tax_expenses').select('*').order('expense_date',{ascending:false}).limit(1000),
db.from('tax_cleaning_payments').select('*').order('payment_date',{ascending:false}).limit(1000),
db.from('cleaning_employees').select('id,full_name').order('full_name'),
db.from('appointments').select('id,client_name,appointment_date,status').order('appointment_date',{ascending:false}).limit(500)
]);for(const x of results)if(x.error)throw x.error;
[expenses,payments,employees,appointments]=results.map(x=>x.data||[]);
$('taxEmployeeSelect').innerHTML='<option value="">Choose employee</option>'+employees.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.full_name)+'</option>').join('');
$('taxAppointmentSelect').innerHTML='<option value="">Not linked to booking</option>'+appointments.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.appointment_date+' · '+a.client_name+' · '+a.status)+'</option>').join('');
render();
}catch(err){$('taxExpenseList').textContent='Could not load accounting data: '+(err.message||err)}finally{busy=false}}
function render(){
$('taxExpenseTotal').textContent=money(expenses.reduce((s,e)=>s+total(e),0));
$('taxPaymentTotal').textContent=money(payments.reduce((s,p)=>s+Number(p.amount),0));
$('taxReceiptTotal').textContent=expenses.filter(e=>e.receipt_path).length;
$('taxExpenseList').innerHTML=expenses.length?expenses.map(e=>'<div class="tax-record"><div><strong>'+esc(e.vendor)+'</strong><small>'+esc(e.expense_date)+' · '+esc(e.category)+' · '+esc(e.deductible_status)+'</small><small>Subtotal '+money(e.subtotal)+' · GST '+money(e.gst)+' · PST '+money(e.pst)+'</small></div><div><strong>'+money(total(e))+'</strong> '+(e.receipt_path?'<button type="button" data-receipt="'+esc(e.id)+'">View receipt</button>':'<small>No receipt</small>')+'</div></div>').join(''):'<p class="muted">No expense records yet.</p>';
$('taxPaymentList').innerHTML=payments.length?payments.map(p=>'<div class="tax-record"><div><strong>'+esc(p.employee_name)+'</strong><small>'+esc(p.payment_date)+' · '+esc(p.payment_type)+' · '+esc(p.payment_status)+'</small><small>'+esc(p.note)+'</small></div><strong>'+money(p.amount)+'</strong></div>').join(''):'<p class="muted">No cleaner payments recorded yet.</p>';
}
function number(v){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid non-negative amount');return Math.round(n*100)/100}
function fileCheck(file){if(!file)return;const types=['application/pdf','image/jpeg','image/png','image/webp'];if(!types.includes(file.type)||file.size>10*1024*1024)throw new Error('Receipt must be PDF, JPG, PNG or WebP and smaller than 10 MB')}
$('taxExpenseForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxExpenseStatus');button.disabled=true;status.textContent='Saving…';let uploaded=null;
try{const f=new FormData(form),file=f.get('receipt');if(file?.size){fileCheck(file);const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];uploaded=crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('glemi-tax-receipts').upload(uploaded,file,{contentType:file.type,upsert:false});if(error)throw error}
const row={expense_date:f.get('expense_date'),vendor:String(f.get('vendor')||'').trim(),category:String(f.get('category')||''),description:String(f.get('description')||''),subtotal:number(f.get('subtotal')),gst:number(f.get('gst')),pst:number(f.get('pst')),other_tax:number(f.get('other_tax')),deductible_status:f.get('deductible_status'),receipt_path:uploaded,receipt_name:file?.size?file.name:null};
const {error}=await db.from('tax_expenses').insert(row);if(error)throw error;form.reset();form.querySelector('[name=expense_date]').value=new Date().toISOString().slice(0,10);status.textContent='Expense saved.';await load();
}catch(err){if(uploaded)await db.storage.from('glemi-tax-receipts').remove([uploaded]);status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxPaymentForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),status=$('taxPaymentStatus');button.disabled=true;status.textContent='Saving…';
try{const f=new FormData(form),employee=employees.find(x=>x.id===f.get('employee_id'));if(!employee)throw new Error('Choose an employee');const row={employee_id:employee.id,employee_name:employee.full_name,appointment_id:f.get('appointment_id')||null,payment_date:f.get('payment_date'),amount:number(f.get('amount')),payment_type:f.get('payment_type'),payment_status:f.get('payment_status'),note:String(f.get('note')||'').trim()};const {error}=await db.from('tax_cleaning_payments').insert(row);if(error)throw error;form.reset();form.querySelector('[name=payment_date]').value=new Date().toISOString().slice(0,10);status.textContent='Cleaner payment recorded.';await load()}catch(err){status.textContent='Could not save: '+(err.message||err)}finally{button.disabled=false}});
$('taxExpenseList').addEventListener('click',async e=>{const button=e.target.closest('[data-receipt]');if(!button)return;const record=expenses.find(x=>x.id===button.dataset.receipt);if(!record?.receipt_path)return;button.disabled=true;try{const {data,error}=await db.storage.from('glemi-tax-receipts').createSignedUrl(record.receipt_path,120);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}catch(err){alert('Could not open receipt: '+(err.message||err))}finally{button.disabled=false}});
function exportCSV(rows,cols,name){const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>r[c[1]]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('taxExportExpenses').addEventListener('click',()=>exportCSV(expenses,[['Date','expense_date'],['Vendor','vendor'],['Category','category'],['Description','description'],['Subtotal CAD','subtotal'],['GST CAD','gst'],['PST CAD','pst'],['Other tax CAD','other_tax'],['Accountant review','deductible_status'],['Receipt filename','receipt_name']], 'glemi-expenses.csv'));
$('taxExportPayments').addEventListener('click',()=>exportCSV(payments,[['Payment date','payment_date'],['Employee','employee_name'],['Amount CAD','amount'],['Type','payment_type'],['Status','payment_status'],['Booking ID','appointment_id'],['Notes','note']], 'glemi-cleaner-payments.csv'));
document.querySelectorAll('[data-view="taxes"]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,100)));
for(const form of [$('taxExpenseForm'),$('taxPaymentForm')])form.querySelector('input[type=date]').value=new Date().toISOString().slice(0,10);
})();