const roomCatalog = [
  {id:'kitchen', label:'Kitchen', sizes:{regular:'Regular', large:'Large'}},
  {id:'bathroom', label:'Bathroom', sizes:{regular:'Regular', large:'Large / Ensuite'}},
  {id:'bedroom', label:'Bedroom', sizes:{regular:'Regular', large:'Large'}},
  {id:'living', label:'Living Room', sizes:{regular:'Regular', large:'Large'}},
  {id:'dining', label:'Dining Area', sizes:{regular:'Regular', large:'Large'}},
  {id:'entry', label:'Entry / Hallway', sizes:{regular:'Regular'}}
];

const state={step:1,cleaning:'regular',date:null,time:null,month:new Date().getMonth(),year:new Date().getFullYear(),rooms:{},addons:[]};
roomCatalog.forEach(r=>state.rooms[r.id]={size:'regular',qty:0});

const calendarEl=document.getElementById('calendar');
const timesEl=document.getElementById('times');
const monthTitle=document.getElementById('monthTitle');
const steps=document.querySelectorAll('.form-step');
const progress=document.querySelectorAll('.progress span');

function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function goTo(sel){document.querySelector(sel)?.scrollIntoView({behavior:'smooth'})}
document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.scroll)));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav').classList.remove('open')));
document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('nav').classList.toggle('open'));

function renderRooms(){
  const host=document.getElementById('roomRows');
  host.innerHTML='';
  roomCatalog.forEach(room=>{
    const current=state.rooms[room.id];
    const row=document.createElement('div');
    row.className='room-row';
    const sizeOptions=Object.entries(room.sizes).map(([key,label])=>`<option value="${key}" ${current.size===key?'selected':''}>${label}</option>`).join('');
    row.innerHTML=`<div class="room-name">${room.label}</div><select data-room-size="${room.id}">${sizeOptions}</select><div class="qty-control"><button type="button" data-dec="${room.id}">−</button><span id="qty-${room.id}">${current.qty}</span><button type="button" data-inc="${room.id}">+</button></div>`;
    host.appendChild(row);
  });
  host.querySelectorAll('[data-room-size]').forEach(sel=>sel.addEventListener('change',e=>{state.rooms[e.target.dataset.roomSize].size=e.target.value;updateRequest()}));
  host.querySelectorAll('[data-inc]').forEach(btn=>btn.addEventListener('click',()=>changeQty(btn.dataset.inc,1)));
  host.querySelectorAll('[data-dec]').forEach(btn=>btn.addEventListener('click',()=>changeQty(btn.dataset.dec,-1)));
}
function changeQty(id,delta){state.rooms[id].qty=Math.max(0,Math.min(20,state.rooms[id].qty+delta));document.getElementById(`qty-${id}`).textContent=state.rooms[id].qty;updateRequest()}

document.querySelectorAll('[data-cleaning]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-cleaning]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.cleaning=btn.dataset.cleaning;updateRequest()}));
document.querySelectorAll('.addon input').forEach(input=>input.addEventListener('change',()=>{state.addons=[...document.querySelectorAll('.addon input:checked')].map(x=>x.value);updateRequest()}));

function selectedAreas(){
  return roomCatalog.filter(room=>state.rooms[room.id].qty>0).map(room=>{
    const selected=state.rooms[room.id];
    return {label:room.label,size:room.sizes[selected.size],qty:selected.qty};
  });
}
function totalAreaCount(){return selectedAreas().reduce((sum,item)=>sum+item.qty,0)}
function updateRequest(){
  const areas=selectedAreas();
  document.getElementById('liveAreas').textContent=totalAreaCount();
  document.getElementById('liveAddons').textContent=state.addons.length;
  const host=document.getElementById('quoteBreakdown');host.innerHTML='';
  if(!areas.length){host.innerHTML='<div class="empty-breakdown">Agrega áreas para ver el resumen.</div>';return}
  areas.forEach(item=>{const div=document.createElement('div');div.className='breakdown-line';div.innerHTML=`<span>${item.label}<small>${item.size}</small></span><strong>× ${item.qty}</strong>`;host.appendChild(div)});
  if(state.addons.length){const div=document.createElement('div');div.className='breakdown-line addon-line';div.innerHTML=`<span>Servicios adicionales</span><strong>${state.addons.length}</strong>`;host.appendChild(div)}
}

function setStep(n){state.step=n;steps.forEach(s=>s.classList.toggle('active',+s.dataset.step===n));progress.forEach((p,i)=>p.classList.toggle('active',i<n));if(n===2)renderCalendar();if(n===3)updateSummary();if(n===4)updateFinal();goTo('#cotizar')}
document.querySelectorAll('.next').forEach(btn=>btn.addEventListener('click',()=>{
  if(state.step===1&&totalAreaCount()<=0){toast('Agrega al menos un área para continuar.');return}
  if(state.step===2&&(!state.date||!state.time)){toast('Selecciona un día y horario disponible.');return}
  if(state.step===3){const inputs=document.querySelectorAll('.form-step[data-step="3"] input[required]');for(const input of inputs){if(!input.reportValidity())return}}
  if(state.step<4)setStep(state.step+1)
}));
document.querySelectorAll('.back').forEach(btn=>btn.addEventListener('click',()=>setStep(state.step-1)));

function dayStatus(day){if(day%7===0)return 'blocked';if(day%5===0)return 'limited';return 'available'}
function renderCalendar(){const month=new Date(state.year,state.month,1);monthTitle.textContent=month.toLocaleDateString('es-MX',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());calendarEl.innerHTML='';const first=month.getDay();const total=new Date(state.year,state.month+1,0).getDate();for(let i=0;i<first;i++){const e=document.createElement('div');e.className='day empty';calendarEl.appendChild(e)}for(let d=1;d<=total;d++){const cell=document.createElement('button');const status=dayStatus(d);cell.type='button';cell.className=`day ${status}`;cell.innerHTML=`${d}<i class="dot"></i>`;if(status==='blocked'){cell.disabled=true}else{cell.addEventListener('click',()=>selectDay(d,status,cell))}calendarEl.appendChild(cell)}}
function selectDay(d,status,cell){document.querySelectorAll('.day').forEach(x=>x.classList.remove('selected'));cell.classList.add('selected');state.date=new Date(state.year,state.month,d);state.time=null;const base=status==='limited'?['10:00 AM','2:00 PM']:['9:00 AM','10:00 AM','12:00 PM','2:00 PM','4:00 PM'];timesEl.innerHTML='';base.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='time';b.textContent=t;b.addEventListener('click',()=>{document.querySelectorAll('.time').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.time=t});timesEl.appendChild(b)})}
document.getElementById('prevMonth').addEventListener('click',()=>{state.month--;if(state.month<0){state.month=11;state.year--}renderCalendar()});
document.getElementById('nextMonth').addEventListener('click',()=>{state.month++;if(state.month>11){state.month=0;state.year++}renderCalendar()});
function formattedDate(){return state.date?state.date.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'—'}
function cleaningName(){return state.cleaning==='deep'?'Deep Cleaning':'Regular Cleaning'}
function updateSummary(){document.getElementById('summaryService').textContent=`Residential · ${cleaningName()}`;document.getElementById('summaryDate').textContent=`${formattedDate()} · ${state.time||'—'}`;document.getElementById('summaryAreas').textContent=`${totalAreaCount()} área(s) · ${state.addons.length} adicional(es)`}
function updateFinal(){document.getElementById('finalService').textContent=`Residential · ${cleaningName()}`;document.getElementById('finalDate').textContent=`${formattedDate()} · ${state.time||'—'}`;document.getElementById('finalName').textContent=document.getElementById('name').value||'—';document.getElementById('finalAreas').textContent=`${totalAreaCount()} área(s)`}

document.getElementById('bookingForm').addEventListener('submit',e=>{e.preventDefault();const code='GL-'+Math.random().toString(36).slice(2,7).toUpperCase();document.getElementById('bookingCode').textContent=code;document.getElementById('successText').textContent=`Tu solicitud de ${cleaningName()} quedó registrada para el ${formattedDate()} a las ${state.time}. GLEMI podrá contactarte para confirmar los detalles y la cotización.`;document.getElementById('modal').classList.add('show')});
document.getElementById('modalClose').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
document.getElementById('modalDone').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
document.getElementById('contactForm').addEventListener('submit',e=>{e.preventDefault();e.target.reset();toast('Solicitud enviada. Gracias por contactar a GLEMI.')});

renderRooms();updateRequest();setStep(1);
