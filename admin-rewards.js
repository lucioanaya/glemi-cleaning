(()=>{
const cfg=window.GLEMI_SUPABASE;if(!cfg||!window.supabase)return;
const sb=window.supabase.createClient(cfg.url,cfg.key);
const $=id=>document.getElementById(id);
const visits=$('rewardsAdminList'),history=$('rewardsVisitHistory'),promos=$('promotionsAdminList'),form=$('promotionForm');
if(!visits||!promos||!form)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'}):'No date';
let allowed=false;
async function checkStaff(){const {data:{user}}=await sb.auth.getUser();if(!user)return false;const {data,error}=await sb.from('profiles').select('role,active').eq('id',user.id).maybeSingle();return !error&&!!data?.active&&['owner','admin'].includes(data.role)}
function card(body,actions=''){return '<article class="glemi-rewards-entry"><div>'+body+'</div>'+actions+'</article>'}
async function loadVisits(){if(!allowed)return;const [{data:customers,error},{data:recent,error:historyError}]=await Promise.all([
sb.from('reward_customers').select('user_id,full_name,email,phone,completed_visits').order('created_at',{ascending:false}),
sb.from('reward_customer_visits').select('user_id,service_date,service_label,appointment_id').order('service_date',{ascending:false}).limit(40)
]);
if(error){visits.textContent='Unable to load customers: '+error.message;return}
const list=customers||[];$('rewardsSummary').innerHTML='<span>'+list.length+' registered customers</span><span>'+list.reduce((n,c)=>n+Number(c.completed_visits||0),0)+' verified visits</span>';
visits.innerHTML=list.length?list.map(c=>card('<strong>'+esc(c.full_name||'Customer')+'</strong><p>'+esc(c.email||'No email')+'</p><small>'+Number(c.completed_visits||0)+' completed visits'+(c.phone?' · '+esc(c.phone):'')+'</small>','<button type="button" data-customer-email="'+esc(c.email||'')+'">View bookings →</button>')).join(''):'No Rewards customers registered yet.';
visits.querySelectorAll('[data-customer-email]').forEach(b=>b.onclick=()=>{document.querySelector('#sideNav [data-view="appointments"]')?.click();const search=$('appointmentSearch');if(search){search.value=b.dataset.customerEmail;search.dispatchEvent(new Event('input'))}});
if(historyError){history.textContent='Unable to load verified history: '+historyError.message;return}
const names=new Map(list.map(c=>[c.user_id,c.full_name||c.email||'Customer']));
history.innerHTML=recent?.length?recent.map(v=>card('<strong>'+esc(names.get(v.user_id)||'Customer')+'</strong><p>'+esc(v.service_label||'Cleaning')+'</p><small>'+esc(date(v.service_date))+(v.appointment_id?' · Linked booking':' · Manual record')+'</small>')).join(''):'No verified visits yet. Confirm a finished booking in Appointments to credit it.';
}
async function loadPromos(){if(!allowed)return;const {data,error}=await sb.from('reward_promotions').select('*').order('created_at',{ascending:false});if(error){promos.textContent='Unable to load promotions: '+error.message;return}
promos.innerHTML=data?.length?data.map(p=>card('<strong>'+esc(p.title)+'</strong><p>'+esc(p.description||'No description')+'</p><small>'+(p.is_active?'🟢 Published':'⚪ Draft')+' · '+esc(date(p.starts_on))+' — '+esc(date(p.ends_on))+(p.promo_code?' · Code: '+esc(p.promo_code):'')+'</small>','<button type="button" data-toggle="'+esc(p.id)+'" data-active="'+p.is_active+'">'+(p.is_active?'Unpublish':'Publish')+'</button> <button type="button" class="danger" data-remove="'+esc(p.id)+'">Delete</button>')).join(''):'No promotions created yet.';
promos.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{b.disabled=true;const {error}=await sb.from('reward_promotions').update({is_active:b.dataset.active!=='true',updated_at:new Date().toISOString()}).eq('id',b.dataset.toggle);if(error)alert(error.message);await loadPromos()});
promos.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this promotion permanently?'))return;b.disabled=true;const {error}=await sb.from('reward_promotions').delete().eq('id',b.dataset.remove);if(error)alert(error.message);await loadPromos()});
}
form.addEventListener('submit',async e=>{e.preventDefault();if(!allowed)return;const button=form.querySelector('[type="submit"]');button.disabled=true;const f=new FormData(form);const starts_on=f.get('starts_on')||null,ends_on=f.get('ends_on')||null;if(starts_on&&ends_on&&ends_on<starts_on){$('promotionStatus').textContent='End date cannot be before start date.';button.disabled=false;return}const payload={title:String(f.get('title')||'').trim(),description:String(f.get('description')||'').trim(),promo_code:String(f.get('promo_code')||'').trim()||null,starts_on,ends_on,is_active:f.get('is_active')==='on'};const {error}=await sb.from('reward_promotions').insert(payload);$('promotionStatus').textContent=error?'Could not save promotion: '+error.message:'Promotion saved successfully.';if(!error){form.reset();await loadPromos()}button.disabled=false});
$('promotionsRefresh').addEventListener('click',loadPromos);$('rewardsRefresh').addEventListener('click',loadVisits);
async function init(){allowed=await checkStaff();for(const id of ['promotions','rewards-visits']){const button=document.querySelector('#sideNav [data-view="'+id+'"]');if(button)button.hidden=!allowed}if(allowed){await Promise.all([loadVisits(),loadPromos()])}}
sb.auth.onAuthStateChange(()=>setTimeout(init,300));setTimeout(init,1200);
})();