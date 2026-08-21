(() => {
  const DB_KEY='glemiAdminDataV1';
  const SESSION_KEY='glemiAdminSessionV1';

  const defaultData=()=>({
    users:[],
    appointments:[
      {id:crypto.randomUUID(),client:'Demo Client',service:'Residential Cleaning',date:new Date().toISOString().slice(0,10),time:'10:00',phone:'',email:'demo@example.com',address:'',total:191.25,status:'pending'}
    ],
    schedule:{
      Mon:{enabled:true,start:'08:00',end:'17:00'},Tue:{enabled:true,start:'08:00',end:'17:00'},Wed:{enabled:true,start:'08:00',end:'17:00'},Thu:{enabled:true,start:'08:00',end:'17:00'},Fri:{enabled:true,start:'08:00',end:'17:00'},Sat:{enabled:true,start:'09:00',end:'15:00'},Sun:{enabled:false,start:'09:00',end:'15:00'}
    },
    pricing:{
      Kitchen:{Regular:[67.5,180],Large:[135,225]},
      Bathroom:{Regular:[67.5,90],Half:[30,45],'Large / Ensuite':[90,135]},
      Bedroom:{Regular:[22.5,33.75],Large:[33.75,45]},
      'Living Room':{Regular:[33.75,56.25],Large:[56.25,78.75]}
    },
    content:{
      heroTitle:'Elige el servicio que necesitas. Nosotros nos encargamos del resto.',
      heroSubtitle:'Ahora cada servicio tiene su propia sección para que encuentres exactamente la información que necesitas.',
      email:'baltazaranaya@outlook.com',
      quoteNote:'All prices and estimates are subject to verification upon arrival at the property.'
    },
    ownerRemovalRequest:null
  });

  const el=id=>document.getElementById(id);
  let data=loadData();
  let session=loadSession();

  function loadData(){try{return JSON.parse(localStorage.getItem(DB_KEY))||defaultData()}catch{return defaultData()}}
  function saveData(){localStorage.setItem(DB_KEY,JSON.stringify(data))}
  function loadSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY))}catch{return null}}
  function saveSession(v){session=v;if(v)sessionStorage.setItem(SESSION_KEY,JSON.stringify(v));else sessionStorage.removeItem(SESSION_KEY)}

  async function hash(text){
    const bytes=new TextEncoder().encode(text);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function show(id){['setupView','loginView','appView'].forEach(x=>el(x).classList.add('hidden'));el(id).classList.remove('hidden')}
  function currentUser(){return data.users.find(u=>u.id===session?.userId)}
  function init(){
    if(!data.users.length){show('setupView');return}
    if(!session||!currentUser()){show('loginView');return}
    show('appView');renderAll()
  }

  el('setupForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const ownerEmail=el('ownerEmail').value.trim().toLowerCase();
    const adminEmail=el('adminEmail').value.trim().toLowerCase();
    if(ownerEmail===adminEmail){alert('Los dos usuarios deben usar correos distintos.');return}
    data.users=[
      {id:crypto.randomUUID(),name:el('ownerName').value.trim(),email:ownerEmail,passwordHash:await hash(el('ownerPassword').value),role:'owner',active:true},
      {id:crypto.randomUUID(),name:el('adminName').value.trim(),email:adminEmail,passwordHash:await hash(el('adminPassword').value),role:'admin',active:true}
    ];
    saveData();show('loginView');
  });

  el('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();el('loginError').textContent='';
    const email=el('loginEmail').value.trim().toLowerCase(),ph=await hash(el('loginPassword').value);
    const u=data.users.find(x=>x.email===email&&x.passwordHash===ph&&x.active);
    if(!u){el('loginError').textContent='Correo o contraseña incorrectos.';return}
    saveSession({userId:u.id});show('appView');renderAll();
  });
  el('logoutBtn').onclick=()=>{saveSession(null);show('loginView')};

  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>openView(b.dataset.view));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
  function openView(id){
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===id));
    document.querySelectorAll('.panel-view').forEach(x=>x.classList.toggle('active',x.id===id));
    const labels={dashboard:'Dashboard',appointments:'Citas',schedule:'Calendario',pricing:'Precios',content:'Página web',users:'Usuarios'};
    el('pageTitle').textContent=labels[id]||id;
  }

  function renderAll(){
    const u=currentUser();
    el('roleBadge').textContent=u.role==='owner'?'Owner':'Admin';
    el('currentUserName').textContent=u.name;
    el('currentUserRole').textContent=u.role==='owner'?'Propietario':'Administrador';
    renderAppointments();renderStats();renderSchedule();renderPricing();renderContent();renderUsers();
  }

  function renderStats(){
    const a=data.appointments;
    el('statPending').textContent=a.filter(x=>x.status==='pending').length;
    el('statConfirmed').textContent=a.filter(x=>x.status==='confirmed').length;
    el('statToday').textContent=a.filter(x=>x.date===new Date().toISOString().slice(0,10)).length;
    el('statTotal').textContent=a.length;
    el('dashboardAppointments').innerHTML=a.slice().sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time)).slice(0,5).map(appointmentHTML).join('')||'<p class="muted">No hay citas.</p>';
  }

  function appointmentHTML(a){
    const statusLabel={pending:'Pending',confirmed:'Confirmed',cancelled:'Cancelled'}[a.status];
    return `<div class="appointment-item"><div><h4>${esc(a.client)}</h4><p>${esc(a.service)}</p></div><div><b>${esc(a.date)}</b><small>${esc(a.time)}</small></div><div><span class="status ${a.status}">${statusLabel}</span><small>${a.total?`$${Number(a.total).toFixed(2)} CAD`:''}</small></div><div class="actions"><button data-edit="${a.id}">Editar</button>${a.status!=='confirmed'?`<button data-confirm="${a.id}">Confirmar</button>`:''}${a.status!=='cancelled'?`<button data-cancel="${a.id}">Cancelar</button>`:''}</div></div>`
  }

  function renderAppointments(){
    const q=(el('appointmentSearch')?.value||'').toLowerCase(),f=el('appointmentFilter')?.value||'all';
    const arr=data.appointments.filter(a=>(f==='all'||a.status===f)&&`${a.client} ${a.service} ${a.date}`.toLowerCase().includes(q));
    el('appointmentList').innerHTML=arr.map(appointmentHTML).join('')||'<p class="muted">No hay resultados.</p>';
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAppointment(b.dataset.edit));
    document.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>setStatus(b.dataset.confirm,'confirmed'));
    document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>setStatus(b.dataset.cancel,'cancelled'));
  }
  el('appointmentSearch').addEventListener('input',renderAppointments);
  el('appointmentFilter').addEventListener('change',renderAppointments);
  el('newAppointmentBtn').onclick=()=>openAppointment();

  function setStatus(id,status){const a=data.appointments.find(x=>x.id===id);if(a){a.status=status;saveData();renderAppointments();renderStats()}}
  function openAppointment(a={}){
    el('appointmentDialogTitle').textContent=a.id?'Editar cita':'Nueva cita';el('appointmentId').value=a.id||'';el('appointmentClient').value=a.client||'';el('appointmentService').value=a.service||'Residential Cleaning';el('appointmentDate').value=a.date||'';el('appointmentTime').value=a.time||'';el('appointmentPhone').value=a.phone||'';el('appointmentEmail').value=a.email||'';el('appointmentAddress').value=a.address||'';el('appointmentTotal').value=a.total||'';el('appointmentStatus').value=a.status||'pending';el('appointmentDialog').showModal()
  }
  function editAppointment(id){const a=data.appointments.find(x=>x.id===id);if(a)openAppointment(a)}
  el('saveAppointmentBtn').onclick=()=>{
    const id=el('appointmentId').value;const obj={id:id||crypto.randomUUID(),client:el('appointmentClient').value.trim(),service:el('appointmentService').value,date:el('appointmentDate').value,time:el('appointmentTime').value,phone:el('appointmentPhone').value.trim(),email:el('appointmentEmail').value.trim(),address:el('appointmentAddress').value.trim(),total:Number(el('appointmentTotal').value||0),status:el('appointmentStatus').value};
    if(!obj.client||!obj.date||!obj.time){alert('Completa cliente, fecha y hora.');return}
    const i=data.appointments.findIndex(x=>x.id===obj.id);if(i>=0)data.appointments[i]=obj;else data.appointments.push(obj);saveData();el('appointmentDialog').close();renderAppointments();renderStats()
  };

  function renderSchedule(){
    const labels={Mon:'Lunes',Tue:'Martes',Wed:'Miércoles',Thu:'Jueves',Fri:'Viernes',Sat:'Sábado',Sun:'Domingo'};
    el('scheduleGrid').innerHTML=Object.entries(data.schedule).map(([k,v])=>`<div class="schedule-row"><b>${labels[k]}</b><label><input type="checkbox" data-day-enabled="${k}" ${v.enabled?'checked':''}> Activo</label><input type="time" data-day-start="${k}" value="${v.start}"><input type="time" data-day-end="${k}" value="${v.end}"></div>`).join('')
  }
  el('saveScheduleBtn').onclick=()=>{Object.keys(data.schedule).forEach(k=>{data.schedule[k].enabled=document.querySelector(`[data-day-enabled="${k}"]`).checked;data.schedule[k].start=document.querySelector(`[data-day-start="${k}"]`).value;data.schedule[k].end=document.querySelector(`[data-day-end="${k}"]`).value});saveData();alert('Horarios guardados.')};

  function renderPricing(){
    el('pricingGrid').innerHTML=Object.entries(data.pricing).map(([room,types])=>`<div class="price-card"><h4>${room}</h4>${Object.entries(types).map(([type,vals])=>`<div class="price-row"><span>${type}</span><input type="number" step=".01" data-price="${room}|${type}|0" value="${vals[0]}" title="Regular"><input type="number" step=".01" data-price="${room}|${type}|1" value="${vals[1]}" title="Deep"></div>`).join('')}</div>`).join('')
  }
  el('savePricingBtn').onclick=()=>{document.querySelectorAll('[data-price]').forEach(inp=>{const [r,t,i]=inp.dataset.price.split('|');data.pricing[r][t][Number(i)]=Number(inp.value||0)});saveData();alert('Precios guardados en el panel.')};

  function renderContent(){el('contentHeroTitle').value=data.content.heroTitle;el('contentHeroSubtitle').value=data.content.heroSubtitle;el('contentEmail').value=data.content.email;el('contentQuoteNote').value=data.content.quoteNote}
  el('saveContentBtn').onclick=()=>{data.content.heroTitle=el('contentHeroTitle').value;data.content.heroSubtitle=el('contentHeroSubtitle').value;data.content.email=el('contentEmail').value;data.content.quoteNote=el('contentQuoteNote').value;saveData();alert('Contenido guardado en el panel.')};

  function renderUsers(){
    const me=currentUser();
    el('usersList').innerHTML=data.users.map(u=>`<div class="user-card"><div><h4>${esc(u.name)} · ${u.role==='owner'?'Owner':'Admin'}</h4><p>${esc(u.email)}</p></div><div>${u.id!==me.id?(me.role==='owner'?`<button class="secondary" data-remove-user="${u.id}">Eliminar usuario</button>`:`${u.role==='owner'?'<button class="secondary" id="requestOwnerRemovalBtn">Solicitar eliminar Owner</button>':'<span class="muted">Sin acción</span>'}`):'<span class="muted">Tu cuenta</span>'}</div></div>`).join('');
    document.querySelectorAll('[data-remove-user]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este usuario?')){data.users=data.users.filter(u=>u.id!==b.dataset.removeUser);saveData();renderUsers()}});
    const req=el('requestOwnerRemovalBtn');if(req)req.onclick=()=>{data.ownerRemovalRequest={requestedBy:me.id,createdAt:new Date().toISOString(),status:'pending'};saveData();renderUsers()};
    const box=el('removalRequestBox');
    if(data.ownerRemovalRequest?.status==='pending'){
      const requester=data.users.find(u=>u.id===data.ownerRemovalRequest.requestedBy);
      box.classList.remove('hidden');
      if(me.role==='owner'){
        box.innerHTML=`<b>Solicitud pendiente:</b> ${esc(requester?.name||'Admin')} solicitó eliminar la cuenta Owner. <button id="denyRemoval" class="secondary">Rechazar</button>`;
        setTimeout(()=>{const d=el('denyRemoval');if(d)d.onclick=()=>{data.ownerRemovalRequest={...data.ownerRemovalRequest,status:'denied'};saveData();renderUsers()}},0);
      }else box.textContent='Solicitud enviada al Owner. El Admin no puede eliminar directamente al propietario.';
    } else box.classList.add('hidden');
  }

  function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  init();
})();