const menuBtn=document.getElementById('menuBtn');
if(menuBtn){menuBtn.addEventListener('click',()=>document.getElementById('nav')?.classList.toggle('open'))}
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav')?.classList.remove('open')));

function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)}

const contactForm=document.getElementById('contactForm');
if(contactForm){contactForm.addEventListener('submit',e=>{e.preventDefault();e.target.reset();toast('Solicitud enviada. Gracias por contactar a GLEMI.')})}

const commercialForm=document.getElementById('commercialForm');
if(commercialForm){commercialForm.addEventListener('submit',e=>{e.preventDefault();toast('Gracias. Tu solicitud comercial quedó lista para revisión.');e.target.reset()})}

const bookingForm=document.getElementById('bookingForm');
if(bookingForm){
  const roomCatalog=[
    {id:'kitchen',label:'Kitchen',types:[['regular','Regular'],['large','Large']]},
    {id:'bathroom',label:'Bathroom',types:[['regular','Regular'],['half','Half'],['large','Large / Ensuite']]},
    {id:'bedroom',label:'Bedroom',types:[['regular','Regular'],['large','Large']]},
    {id:'living',label:'Living Room',types:[['regular','Regular'],['large','Large']]}
  ];
  const quoteRules={
    kitchen:{
      regular:{regular:67.50,deep:180},
      large:{regular:135,deep:225}
    },
    bathroom:{
      regular:{regular:67.50,deep:90},
      half:{regular:30,deep:45},
      large:{regular:90,deep:135}
    },
    bedroom:{
      regular:{regular:22.50,deep:33.75},
      large:{regular:33.75,deep:45}
    },
    living:{
      regular:{regular:33.75,deep:56.25},
      large:{regular:56.25,deep:78.75}
    }
  };
  const roomCatalog=[
    {id:'kitchen',label:'Kitchen',types:[['regular','Regular'],['large','Large']]},
    {id:'bathroom',label:'Bathroom',types:[['regular','Regular'],['half','Half'],['large','Large / Ensuite']]},
    {id:'bedroom',label:'Bedroom',types:[['regular','Regular'],['large','Large']]},
    {id:'living',label:'Living Room',types:[['regular','Regular'],['large','Large']]}
  ];
  const state={step:1,cleaning:'regular',date:null,time:null,month:new Date().getMonth(),year:new Date().getFullYear(),rooms:{},addons:[],quote:null};
  roomCatalog.forEach(r=>{state.rooms[r.id]={};r.types.forEach(([type])=>state.rooms[r.id][type]=0)});
  const calendarEl=document.getElementById('calendar'),timesEl=document.getElementById('times'),monthTitle=document.getElementById('monthTitle'),steps=document.querySelectorAll('.form-step'),progress=document.querySelectorAll('.progress span');
  const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  const goTo=sel=>document.querySelector(sel)?.scrollIntoView({behavior:'smooth'});

  function renderRooms(){
    const host=document.getElementById('roomRows');host.innerHTML='';
    roomCatalog.forEach(room=>{
      const row=document.createElement('div');row.className='room-row room-type-row';
      const counters=room.types.map(([type,label])=>`<div class="room-type-counter"><span class="room-type-label">${label}</span><div class="qty-control"><button type="button" data-room="${room.id}" data-type="${type}" data-delta="-1">−</button><span id="qty-${room.id}-${type}">${state.rooms[room.id][type]}</span><button type="button" data-room="${room.id}" data-type="${type}" data-delta="1">+</button></div></div>`).join('');
      row.innerHTML=`<div class="room-name">${room.label}</div><div class="room-type-counters">${counters}</div>`;host.appendChild(row)
    });
    host.querySelectorAll('[data-room][data-type][data-delta]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.room,b.dataset.type,Number(b.dataset.delta))));
  }
  function changeQty(id,type,d){state.rooms[id][type]=Math.max(0,Math.min(20,(Number(state.rooms[id][type])||0)+d));document.getElementById(`qty-${id}-${type}`).textContent=state.rooms[id][type];state.quote=null}
  document.querySelectorAll('[data-cleaning]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-cleaning]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.cleaning=btn.dataset.cleaning;state.quote=null}));
  document.querySelectorAll('.addon input').forEach(i=>i.addEventListener('change',()=>{state.addons=[...document.querySelectorAll('.addon input:checked')].map(x=>x.value);state.quote=null}));
  const hasRooms=()=>roomCatalog.some(room=>room.types.some(([type])=>(Number(state.rooms[room.id][type])||0)>0));

  function calculateQuote(){
    const cleaning=state.cleaning==='deep'?'deep':'regular';let subtotal=0;const breakdown=[];
    for(const room of roomCatalog){for(const [type,label] of room.types){const qty=Math.max(0,Math.min(20,Number(state.rooms[room.id][type])||0));if(!qty)continue;const unit=quoteRules[room.id][type][cleaning],amount=round(unit*qty);subtotal=round(subtotal+amount);breakdown.push({item:`${room.label} · ${label} × ${qty}`,amount})}}
    const addons=state.addons.filter(a=>addonLabels[a]),addonsAmount=round(subtotal*(addons.length*0.25)),total=round(subtotal+addonsAmount);
    return {cleaning,breakdown,subtotal,addons,addonsAmount,total,message:'All prices and estimates are subject to verification upon arrival at the property. The final price may be adjusted if the size, condition of the space, or scope of work differs from the information provided when the estimate was requested.'};
  }

  function setStep(n){state.step=n;steps.forEach(s=>s.classList.toggle('active',+s.dataset.step===n));progress.forEach((p,i)=>p.classList.toggle('active',i<n));document.body.classList.toggle('quote-modal-open',n===2);if(n===3){renderCalendar();document.getElementById('calendarQuote').textContent=state.quote?`${money(state.quote.total)} CAD`:'—'}if(n===4)updateFinal();if(n!==2)goTo('#cotizar')}

  async function generateQuote(){if(!hasRooms()){toast('Agrega al menos un área para generar la cotización.');return}setStep(2);const loading=document.getElementById('aiLoading'),result=document.getElementById('aiResult');loading.classList.remove('hidden');result.classList.add('hidden');await new Promise(r=>setTimeout(r,500));const data=calculateQuote();state.quote=data;document.getElementById('aiTotal').textContent=`${money(data.total)} CAD`;document.getElementById('aiMessage').textContent=data.message;const host=document.getElementById('aiBreakdown');host.innerHTML='';
    data.breakdown.forEach(row=>{
      const el=document.createElement('div');
      el.className='breakdown-row';
      el.innerHTML=`<span>${row.item}</span>`;
      host.appendChild(el);
    });
    data.addons.forEach(addon=>{
      const el=document.createElement('div');
      el.className='breakdown-row';
      el.innerHTML=`<span>${addonLabels[addon]}</span>`;
      host.appendChild(el);
    });
    loading.classList.add('hidden');result.classList.remove('hidden')}
  document.getElementById('generateQuote').addEventListener('click',generateQuote);
  document.querySelectorAll('.next').forEach(btn=>btn.addEventListener('click',()=>{if(state.step===2&&!state.quote){toast('Primero genera tu cotización.');return}if(state.step===3){if(!state.date||!state.time){toast('Selecciona un día y horario disponible.');return}const name=document.getElementById('name'),address=document.getElementById('address'),email=document.getElementById('email'),phone=document.getElementById('phone');if(!name.reportValidity()||!address.reportValidity())return;if(!email.value.trim()&&!phone.value.trim()){toast('Agrega un correo o un teléfono/WhatsApp.');return}if(email.value&&!email.reportValidity())return}if(state.step<4)setStep(state.step+1)}));
  document.querySelectorAll('.back').forEach(btn=>btn.addEventListener('click',()=>setStep(state.step-1)));
  const dayStatus=day=>day%7===0?'blocked':day%5===0?'limited':'available';
  function renderCalendar(){const m=new Date(state.year,state.month,1);monthTitle.textContent=m.toLocaleDateString('es-MX',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());calendarEl.innerHTML='';const first=m.getDay(),total=new Date(state.year,state.month+1,0).getDate();for(let i=0;i<first;i++){const e=document.createElement('div');e.className='day empty';calendarEl.appendChild(e)}for(let d=1;d<=total;d++){const cell=document.createElement('button'),status=dayStatus(d);cell.type='button';cell.className=`day ${status}`;cell.innerHTML=`${d}<i class="dot"></i>`;if(status==='blocked')cell.disabled=true;else cell.addEventListener('click',()=>selectDay(d,status,cell));calendarEl.appendChild(cell)}}
  function selectDay(d,status,cell){document.querySelectorAll('.day').forEach(x=>x.classList.remove('selected'));cell.classList.add('selected');state.date=new Date(state.year,state.month,d);state.time=null;const slots=status==='limited'?['10:00 AM','2:00 PM']:['9:00 AM','10:00 AM','12:00 PM','2:00 PM','4:00 PM'];timesEl.innerHTML='';slots.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='time';b.textContent=t;b.addEventListener('click',()=>{document.querySelectorAll('.time').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.time=t});timesEl.appendChild(b)})}
  document.getElementById('prevMonth').addEventListener('click',()=>{state.month--;if(state.month<0){state.month=11;state.year--}renderCalendar()});
  document.getElementById('nextMonth').addEventListener('click',()=>{state.month++;if(state.month>11){state.month=0;state.year++}renderCalendar()});
  const formattedDate=()=>state.date?state.date.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'—';
  const cleaningName=()=>state.cleaning==='deep'?'Deep Cleaning':'Regular Cleaning';
  function updateFinal(){document.getElementById('finalService').textContent=`Residential · ${cleaningName()}`;document.getElementById('finalDate').textContent=`${formattedDate()} · ${state.time||'—'}`;document.getElementById('finalName').textContent=document.getElementById('name').value||'—';const p=state.quote?`${money(state.quote.total)} CAD`:'—';document.getElementById('finalPrice').textContent=p;document.getElementById('finalPriceLarge').textContent=p;document.getElementById('finalBreakdown').textContent=state.quote?.message||''}
  bookingForm.addEventListener('submit',e=>{e.preventDefault();const code='GL-'+Math.random().toString(36).slice(2,7).toUpperCase();document.getElementById('bookingCode').textContent=code;document.getElementById('successText').textContent=`Tu solicitud de ${cleaningName()} por ${money(state.quote.total)} CAD quedó registrada para el ${formattedDate()} a las ${state.time}.`;document.getElementById('modal').classList.add('show')});
  document.getElementById('modalClose').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
  document.getElementById('modalDone').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
  renderRooms();setStep(1);
}
