(() => {
const cfg=window.GLEMI_SUPABASE;
const sb=window.supabase.createClient(cfg.url,cfg.key);
const el=id=>document.getElementById(id);
let me=null, profile=null, appointments=[], schedule={}, pricing={}, settings={};

const show=id=>{['loginFriw','appFriw'].forEach(x=>{const n=el(x);if(n)n.classList.add('hidden')});const t=el(id);if(t)t.classList.remove('hidden')};
const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function profileFor(id){const {data,error}=await sb.from('profiles').select('*').eq('id',id).single();return error?null:data}
async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    me=session.user;
    profile=await profileFor(me.id);
    if(profile?.active){show('appFriw');await loadAll();return}
  }
  show('loginFriw');
}
el('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();el('loginError').textContent='';
 const {data,error}=await sb.auth.signInWithPassword({email:el('loginEmail').value.trim(),password:el('loginPassword').value});
 if(error){
   const msg=(error.message||'').toLowerCase();
   el('loginError').textContent=msg.includes('email not confirmed')
     ? 'Your email has not been confirmed yet. Check your email and confirm the account before signing in.'
     : msg.includes('invalid login credentials')
       ? 'Incorrect email or password.'
       : error.message;
   return
 }
 me=data.user;profile=await profileFor(me.id);
 if(!profile?.active){await sb.auth.signOut();el('loginError').textContent='User does not have access.';return}
 show('appFriw');await loadAll();
});
el('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>openFriw(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openFriw(b.dataset.go));
function openFriw(id){document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===id));document.querySelectorAll('.panel-view').forEach(x=>x.classList.toggle('active',x.id===id));el('pageTitle').textContent=({dashboard:'Dashboard',appointments:'Appointments',schedule:'Calendario',pricing:'Pricing',content:'Website',users:'Users'})[id]||id}
async function loadAll(){
 el('roleBadge').textContent=profile.role==='owner'?'Owner':'Admin';el('currentUserName').textContent=profile.display_name||profile.email;el('currentUserRole').textContent=profile.role==='owner'?'Propietario':'Administrador';
 const [a,s,p,c]=await Promise.all([sb.from('appointments').select('*').order('appointment_date'),sb.from('schedule_settings').select('*'),sb.from('pricing_settings').select('*').order('id'),sb.from('site_settings').select('*')]);
 appointments=a.data||[];schedule=Object.fromEntries((s.data||[]).map(x=>[x.day_key,x]));pricing=p.data||[];settings=Object.fromEntries((c.data||[]).map(x=>[x.key,x.value]));
 renderAppointments();renderStats();renderSchedule();renderPricing();renderContent();await renderUsers();
}
function appointmentHTML(a){return `<div class="appointment-item"><div><h4>${esc(a.client_name)}</h4><p>${esc(a.service)}</p></div><div><b>${esc(a.appointment_date)}</b><small>${esc(a.appointment_time?.slice(0,5)||'')}</small></div><div><span class="status ${a.status}">${a.status}</span><small>${a.total_cad?`$${Number(a.total_cad).toFixed(2)} CAD`:''}</small></div><div class="actions"><button data-edit="${a.id}">Editar</button>${a.status!=='confirmed'?`<button data-confirm="${a.id}">Confirm</button>`:''}${a.status!=='cancelled'?`<button data-cancel="${a.id}">Cancel</button>`:''}</div></div>`}
function renderStats(){el('statPending').textContent=appointments.filter(x=>x.status==='pending').length;el('statConfirmed').textContent=appointments.filter(x=>x.status==='confirmed').length;el('statToday').textContent=appointments.filter(x=>x.appointment_date===new Date().toISOString().slice(0,10)).length;el('statTotal').textContent=appointments.length;el('dashboardAppointments').innerHTML=appointments.slice(0,5).map(appointmentHTML).join('')||'<p class="muted">No appointments.</p>'}
function renderAppointments(){const q=(el('appointmentSearch').value||'').toLowerCase(),f=el('appointmentFilter').value;const arr=appointments.filter(a=>(f==='all'||a.status===f)&&`${a.client_name} ${a.service} ${a.appointment_date}`.toLowerCase().includes(q));el('appointmentList').innerHTML=arr.map(appointmentHTML).join('')||'<p class="muted">No hay resultados.</p>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAppointment(b.dataset.edit));document.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>setStatus(b.dataset.confirm,'confirmed'));document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>setStatus(b.dataset.cancel,'cancelled'))}
el('appointmentSearch').oninput=renderAppointments;el('appointmentFilter').onchange=renderAppointments;el('newAppointmentBtn').onclick=()=>openAppointment();
async function setStatus(id,status){await sb.from('appointments').update({status}).eq('id',id);await loadAll()}
function openAppointment(a={}){el('appointmentDialogTitle').textContent=a.id?'Edit appointment':'New appointment';el('appointmentId').value=a.id||'';el('appointmentClient').value=a.client_name||'';el('appointmentService').value=a.service||'Residential Cleaning';el('appointmentDate').value=a.appointment_date||'';el('appointmentTime').value=(a.appointment_time||'').slice(0,5);el('appointmentPhone').value=a.phone||'';el('appointmentEmail').value=a.email||'';el('appointmentAddress').value=a.address||'';el('appointmentTotal').value=a.total_cad||'';el('appointmentStatus').value=a.status||'pending';el('appointmentDialog').showModal()}
function editAppointment(id){openAppointment(appointments.find(x=>x.id===id)||{})}
el('saveAppointmentBtn').onclick=async()=>{const id=el('appointmentId').value;const obj={client_name:el('appointmentClient').value.trim(),service:el('appointmentService').value,appointment_date:el('appointmentDate').value,appointment_time:el('appointmentTime').value,phone:el('appointmentPhone').value.trim(),email:el('appointmentEmail').value.trim(),address:el('appointmentAddress').value.trim(),total_cad:Number(el('appointmentTotal').value||0),status:el('appointmentStatus').value};const r=id?await sb.from('appointments').update(obj).eq('id',id):await sb.from('appointments').insert(obj);if(r.error)return alert(r.error.message);el('appointmentDialog').close();await loadAll()};
function renderSchedule(){const labels={Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};el('scheduleGrid').innerHTML=Object.keys(labels).map(k=>{const v=schedule[k]||{enabled:false,start_time:'08:00',end_time:'17:00'};return `<div class="schedule-row"><b>${labels[k]}</b><label><input type="checkbox" data-day-enabled="${k}" ${v.enabled?'checked':''}> Active</label><input type="time" data-day-start="${k}" value="${(v.start_time||'').slice(0,5)}"><input type="time" data-day-end="${k}" value="${(v.end_time||'').slice(0,5)}"></div>`}).join('')}
el('saveScheduleBtn').onclick=async()=>{for(const k of Object.keys(schedule)){await sb.from('schedule_settings').update({enabled:document.querySelector(`[data-day-enabled="${k}"]`).checked,start_time:document.querySelector(`[data-day-start="${k}"]`).value,end_time:document.querySelector(`[data-day-end="${k}"]`).value}).eq('day_key',k)}alert('Schedule saved.');await loadAll()};
function renderPricing(){const grouped={};pricing.forEach(x=>(grouped[x.room]??=[]).push(x));el('pricingGrid').innerHTML=Object.entries(grouped).map(([room,rows])=>`<div class="price-card"><h4>${room}</h4>${rows.map(x=>`<div class="price-row"><span>${x.room_type}</span><input type="number" step=".01" data-reg="${x.id}" value="${x.regular_cad}"><input type="number" step=".01" data-deep="${x.id}" value="${x.deep_cad}"></div>`).join('')}</div>`).join('')}
el('savePricingBtn').onclick=async()=>{for(const x of pricing){await sb.from('pricing_settings').update({regular_cad:Number(document.querySelector(`[data-reg="${x.id}"]`).value),deep_cad:Number(document.querySelector(`[data-deep="${x.id}"]`).value)}).eq('id',x.id)}alert('Pricing guardados.');await loadAll()};
function renderContent(){el('contentHeroTitle').value=settings.hero_title||'';el('contentHeroSubtitle').value=settings.hero_subtitle||'';el('contentEmail').value=settings.contact_email||'';el('contentQuoteNote').value=settings.quote_note||''}
el('saveContentBtn').onclick=async()=>{const vals={hero_title:el('contentHeroTitle').value,hero_subtitle:el('contentHeroSubtitle').value,contact_email:el('contentEmail').value,quote_note:el('contentQuoteNote').value};for(const [key,value] of Object.entries(vals))await sb.from('site_settings').upsert({key,value});alert('Contenido guardado.');await loadAll()};
async function renderUsers(){
  const {data:users}=await sb.from('profiles').select('*').order('created_at');
  const list=users||[];
  el('usersList').innerHTML=list.map(u=>`<div class="user-card"><div><h4>${esc(u.display_name||u.email)} · ${u.role==='owner'?'Owner':'Admin'}</h4><p>${esc(u.email)}</p></div><div>${u.id===me.id?'<span class="muted">Your account</span>':profile.role==='admin'&&u.role==='owner'?'<button class="secondary" id="requestOwnerRemovalBtn">Request Owner removal</button>':'<span class="muted">Protected account</span>'}</div></div>`).join('');
  const createBox=el('createAdminBox');
  if(createBox) createBox.classList.toggle('hidden', !(profile.role==='owner' && list.length<2));
  const createBtn=el('createAdminBtn');
  if(createBtn) createBtn.onclick=async()=>{
    const display_name=el('newAdminName').value.trim();
    const email=el('newAdminEmail').value.trim().toLowerCase();
    const password=el('newAdminPassword').value;
    if(!display_name||!email||password.length<8){alert('Enter a name, email, and a password of at least 8 characters.');return}
    createBtn.disabled=true; createBtn.textContent='Creando...';
    const {data,error}=await sb.functions.invoke('create-staff-user',{body:{display_name,email,password}});
    createBtn.disabled=false; createBtn.textContent='Crear Admin';
    if(error){alert(error.message||'The Admin user could not be created.');return}
    if(data?.error){alert(data.error);return}
    el('newAdminName').value='';el('newAdminEmail').value='';el('newAdminPassword').value='';
    alert('Admin user created successfully. They can now sign in.');
    await renderUsers();
  };
  const req=el('requestOwnerRemovalBtn');
  if(req) req.onclick=async()=>{
    const r=await sb.from('owner_removal_requests').insert({requested_by:me.id});
    alert(r.error?r.error.message:'Request sent to the Owner.');
    await renderUsers()
  };
  const {data:rqs}=await sb.from('owner_removal_requests').select('*').eq('status','pending');
  const box=el('removalRequestBox');
  if(rqs?.length){box.classList.remove('hidden');box.textContent=profile.role==='owner'?'There is a pending request to remove the Owner account. Review it before taking any action.':'Owner removal request pending.'}else box.classList.add('hidden')
})();