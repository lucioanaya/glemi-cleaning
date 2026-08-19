const RATE = 45;
const roomCatalog = [
  {id:'kitchen', label:'Kitchen', sizes:{regular:{label:'Regular', regular:1.5, deep:4}, large:{label:'Large', regular:3, deep:5}}},
  {id:'bathroom', label:'Bathroom', sizes:{regular:{label:'Regular', regular:1.5, deep:2}, large:{label:'Large / Ensuite', regular:2, deep:3}}},
  {id:'bedroom', label:'Bedroom', sizes:{regular:{label:'Regular', regular:0.5, deep:0.75}, large:{label:'Large', regular:0.75, deep:1}}},
  {id:'living', label:'Living Room', sizes:{regular:{label:'Regular', regular:0.75, deep:1.25}, large:{label:'Large', regular:1.25, deep:1.75}}},
  {id:'dining', label:'Dining Area', sizes:{regular:{label:'Regular', regular:0.5, deep:0.75}, large:{label:'Large', regular:0.75, deep:1}}},
  {id:'entry', label:'Entry / Hallway', sizes:{regular:{label:'Regular', regular:0.25, deep:0.5}}}
];

const state={step:1,cleaning:'regular',date:null,time:null,month:new Date().getMonth(),year:new Date().getFullYear(),rooms:{},addons:[]};
roomCatalog.forEach(r=>state.rooms[r.id]={size:'regular',qty:0});

const calendarEl=document.getElementById('calendar');
const timesEl=document.getElementById('times');
const monthTitle=document.getElementById('monthTitle');
const steps=document.querySelectorAll('.form-step');
const progress=document.querySelectorAll('.progress span');

function money(n){return `$${n.toFixed(2)}`}
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
    const sizeOptions=Object.entries(room.sizes).map(([key,val])=>`<option value="${key}" ${current.size===key?'selected':''}>${val.label}</option>`).join('');
    row.innerHTML=`<div class="room-name">${room.label}</div><select data-room-size="${room.id}">${sizeOptions}</select><div class="qty-control"><button type="button" data-dec="${room.id}">−</button><span id="qty-${room.id}">${current.qty}</span><button type="button" data-inc="${room.id}">+</button></div>`;
    host.appendChild(row);
  });
  host.querySelectorAll('[data-room-size]').forEach(sel=>sel.addEventListener('change',e=>{state.rooms[e.target.dataset.roomSize].size=e.target.value;updateQuote()}));
  host.querySelectorAll('[data-inc]').forEach(btn=>btn.addEventListener('click',()=>changeQty(btn.dataset.inc,1)));
  host.querySelectorAll('[data-dec]').forEach(btn=>btn.addEventListener('click',()=>changeQty(btn.dataset.dec,-1)));
}
function changeQty(id,delta){state.rooms[id].qty=Math.max(0,Math.min(20,state.rooms[id].qty+delta));document.getElementById(`qty-${id}`).textContent=state.rooms[id].qty;updateQuote()}

document.querySelectorAll('[data-cleaning]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-cleaning]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.cleaning=btn.dataset.cleaning;updateQuote()}));
document.querySelectorAll('.addon input').forEach(input=>input.addEventListener('change',()=>{state.addons=[...document.querySelectorAll('.addon input:checked')].map(x=>x.value);updateQuote()}));

function quote(){
  let hours=0; const lines=[];
  roomCatalog.forEach(room=>{
    const selected=state.rooms[room.id];
    if(!selected.qty)return;
    const size=room.sizes[selected.size];
    const unitHours=size[state.cleaning];
    const lineHours=unitHours*selected.qty;
    hours+=lineHours;
    lines.push({label:`${room.label} · ${size.label} × ${selected.qty}`,hours:lineHours,price:lineHours*RATE});
  });
  const subtotal=hours*RATE;
  const addonRate=state.addons.length*0.25;
  const addons=subtotal*addonRate;
  return {hours,subtotal,addons,total:subtotal+addons,lines,addonRate};
}
function updateQuote(){
  const q=quote();
  document.getElementById('liveHours').textContent=`${q.hours.toFixed(2)} h`;
  document.getElementById('liveSubtotal').textContent=money(q.subtotal);
  document.getElementById('liveTotal').textContent=`${money(q.total)} USD`;
  document.getElementById('calendarQuote').textContent=`${money(q.total)} USD`;
  const host=document.getElementById('quoteBreakdown');host.innerHTML='';
  if(!q.lines.length){host.innerHTML='<div class="empty-breakdown">Agrega áreas para ver el desglose.</div>'}
  q.lines.forEach(line=>{const div=document.createElement('div');div.className='breakdown-line';div.innerHTML=`<span>${line.label}<small>${line.hours.toFixed(2)} h</small></span><strong>${money(line.price)}</strong>`;host.appendChild(div)});
  if(state.addons.length){const div=document.createElement('div');div.className='breakdown-line addon-line';div.innerHTML=`<span>Add-ons (${state.addons.length} × 25%)</span><strong>+${money(q.addons)}</strong>`;host.appendChild(div)}
  const total=document.createElement('div');total.className='breakdown-total';total.innerHTML=`<span>Total</span><strong>${money(q.total)} USD</strong>`;host.appendChild(total);
}

function setStep(n){state.step=n;steps.forEach(s=>s.classList.toggle('active',+s.dataset.step===n));progress.forEach((p,i)=>p.classList.toggle('active',i<n));if(n===2)renderCalendar();if(n===3)updateSummary();if(n===4)updateFinal();goTo('#cotizar')}
document.querySelectorAll('.next').forEach(btn=>btn.addEventListener('click',()=>{
  if(state.step===1&&quote().hours<=0){toast('Agrega al menos un área para generar la cotización.');return}
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
function updateSummary(){const q=quote();document.getElementById('summaryService').textContent=`Residential · ${cleaningName()}`;document.getElementById('summaryDate').textContent=`${formattedDate()} · ${state.time||'—'}`;document.getElementById('summaryPrice').textContent=`${money(q.total)} USD · ${q.hours.toFixed(2)} h`}
function updateFinal(){const q=quote();document.getElementById('finalService').textContent=`Residential · ${cleaningName()}`;document.getElementById('finalDate').textContent=`${formattedDate()} · ${state.time||'—'}`;document.getElementById('finalName').textContent=document.getElementById('name').value||'—';document.getElementById('finalHours').textContent=`${q.hours.toFixed(2)} h`;document.getElementById('finalPrice').textContent=`${money(q.total)} USD`;document.getElementById('finalBreakdown').textContent=`Base ${money(q.subtotal)}${q.addons?` + add-ons ${money(q.addons)}`:''}`}

document.getElementById('bookingForm').addEventListener('submit',e=>{e.preventDefault();const q=quote();const code='GL-'+Math.random().toString(36).slice(2,7).toUpperCase();document.getElementById('bookingCode').textContent=code;document.getElementById('successText').textContent=`Tu solicitud de ${cleaningName()} por ${money(q.total)} USD quedó registrada para el ${formattedDate()} a las ${state.time}.`;document.getElementById('modal').classList.add('show')});
document.getElementById('modalClose').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
document.getElementById('modalDone').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
document.getElementById('contactForm').addEventListener('submit',e=>{e.preventDefault();e.target.reset();toast('Solicitud enviada. Gracias por contactar a GLEMI.')});

renderRooms();updateQuote();setStep(1);
