const menuBtn=document.getElementById('menuBtn');
if(menuBtn){menuBtn.addEventListener('click',()=>document.getElementById('nav')?.classList.toggle('open'))}
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav')?.classList.remove('open')));

function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)}

const contactForm=document.getElementById('contactForm');
if(contactForm){contactForm.addEventListener('submit',e=>{e.preventDefault();e.target.reset();toast('Request sent. Thank you for contacting GLEMI.')})}

const commercialForm=document.getElementById('commercialForm');
if(commercialForm){commercialForm.addEventListener('submit',e=>{e.preventDefault();toast('Thank you. Your commercial request is ready for review.');e.target.reset()})}

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
  const state={step:1,cleaning:'regular',date:null,time:null,month:new Date().getMonth(),year:new Date().getFullYear(),rooms:{},addons:[],quote:null,promoCode:'',promoEligible:false,promoPercent:0,promoFinalTotal:null};
  roomCatalog.forEach(r=>{state.rooms[r.id]={};r.types.forEach(([type])=>state.rooms[r.id][type]=0)});
  const calendarEl=document.getElementById('calendar'),timesEl=document.getElementById('times'),monthTitle=document.getElementById('monthTitle'),steps=document.querySelectorAll('.form-step'),progress=document.querySelectorAll('.progress span');
  const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  const goTo=sel=>document.querySelector(sel)?.scrollIntoFriw({behavior:'smooth'});

  function roomIcon(id){
    const icons={
      kitchen:'room-kitchen.png',
      bathroom:'room-bathroom.png',
      bedroom:'room-bedroom.png',
      living:'room-living.png'
    };
    return icons[id]?`<img src="${icons[id]}" alt="" aria-hidden="true">`:'';
  }
  function selectedRoomCount(id){
    return Object.values(state.rooms[id]||{}).reduce((sum,n)=>sum+(Number(n)||0),0);
  }
  function renderRooms(){
    const host=document.getElementById('roomRows');host.innerHTML='';
    roomCatalog.forEach(room=>{
      const row=document.createElement('div');
      row.className='room-accordion';
      row.dataset.room=room.id;
      const counters=room.types.map(([type,label])=>`<div class="room-type-counter"><span class="room-type-label">${label}</span><div class="qty-control"><button type="button" aria-label="Quitar ${label}" data-room="${room.id}" data-type="${type}" data-delta="-1">−</button><span id="qty-${room.id}-${type}">${state.rooms[room.id][type]}</span><button type="button" aria-label="Agregar ${label}" data-room="${room.id}" data-type="${type}" data-delta="1">+</button></div></div>`).join('');
      row.innerHTML=`<button type="button" class="room-accordion-toggle" aria-expanded="false"><span class="room-icon room-icon-${room.id}">${roomIcon(room.id)}</span><span class="room-title-wrap"><strong class="room-name">${room.label}</strong><small id="summary-${room.id}">0 selected</small></span><span class="room-chevron">⌄</span></button><div class="room-accordion-body" hidden>${counters}</div>`;
      host.appendChild(row)
    });
    host.querySelectorAll('.room-accordion-toggle').forEach(toggle=>toggle.addEventListener('click',()=>{
      const card=toggle.closest('.room-accordion');
      const body=card.querySelector('.room-accordion-body');
      const isOpen=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',String(!isOpen));
      body.hidden=isOpen;
      card.classList.toggle('open',!isOpen);
    }));
    host.querySelectorAll('[data-room][data-type][data-delta]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();changeQty(b.dataset.room,b.dataset.type,Number(b.dataset.delta))}));
    roomCatalog.forEach(room=>updateRoomSummary(room.id));
  }
  function updateRoomSummary(id){
    const el=document.getElementById(`summary-${id}`);if(!el)return;
    const count=selectedRoomCount(id);
    el.textContent=`${count} ${count===1?'selected':'selected'}`;
  }
  function changeQty(id,type,d){state.rooms[id][type]=Math.max(0,Math.min(20,(Number(state.rooms[id][type])||0)+d));document.getElementById(`qty-${id}-${type}`).textContent=state.rooms[id][type];updateRoomSummary(id);state.quote=null}
  document.querySelectorAll('[data-cleaning]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-cleaning]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.cleaning=btn.dataset.cleaning;state.quote=null}));
  document.querySelectorAll('.addon input').forEach(i=>i.addEventListener('change',()=>{state.addons=[...document.querySelectorAll('.addon input:checked')].map(x=>x.value);state.quote=null}));
  const hasRooms=()=>roomCatalog.some(room=>room.types.some(([type])=>(Number(state.rooms[room.id][type])||0)>0));

  
  const glemiSb=(window.supabase&&window.GLEMI_SUPABASE)?window.supabase.createClient(window.GLEMI_SUPABASE.url,window.GLEMI_SUPABASE.key):null;
  const discountTotal=(total,percent)=>round(total*(1-(percent||0)/100));

  async function verifyPromo(showToast=true){
    const input=document.getElementById('promoCode'),msg=document.getElementById('promoMessage');
    if(!input)return true;
    const code=input.value.trim().toUpperCase();
    state.promoCode='';state.promoEligible=false;state.promoPercent=0;state.promoFinalTotal=null;
    if(!code){msg.innerHTML='New customer? Use <b>WELCOME20</b> for 20% off your first cleaning.';msg.className='promo-message';return true}
    const email=document.getElementById('email')?.value.trim()||'',phone=document.getElementById('phone')?.value.trim()||'';
    if(!email&&!phone){msg.textContent='Add your email or phone first so we can verify the promo code.';msg.className='promo-message error';return false}
    if(!glemiSb){msg.textContent='Promo verification is temporarily unavailable.';msg.className='promo-message error';return false}
    msg.textContent='Checking code…';msg.className='promo-message';
    const {data,error}=await glemiSb.rpc('check_promo_eligibility',{p_code:code,p_email:email||null,p_phone:phone||null});
    if(error){msg.textContent='We could not verify the code. Please try again.';msg.className='promo-message error';return false}
    if(!data?.eligible){
      const reasons={already_used:'WELCOME20 has already been used with this contact information.',existing_customer:'WELCOME20 is only available for a customer’s first cleaning.',invalid_code:'That promo code is not valid.',contact_required:'Add an email or phone to verify the code.'};
      msg.textContent=reasons[data?.reason]||'This promo code cannot be applied.';
      msg.className='promo-message error';return false
    }
    state.promoCode=data.code||code;state.promoEligible=true;state.promoPercent=Number(data.discount_percent)||20;
    state.promoFinalTotal=state.quote?discountTotal(state.quote.total,state.promoPercent):null;
    msg.innerHTML=`✓ <b>${state.promoCode}</b> applied — ${state.promoPercent}% off your first cleaning.`;
    msg.className='promo-message success';
    if(showToast)toast(`${state.promoCode} applied.`);
    return true
  }
function calculateQuote(){
    const cleaning=state.cleaning==='deep'?'deep':'regular';let subtotal=0;const breakdown=[];
    for(const room of roomCatalog){for(const [type,label] of room.types){const qty=Math.max(0,Math.min(20,Number(state.rooms[room.id][type])||0));if(!qty)continue;const unit=quoteRules[room.id][type][cleaning],amount=round(unit*qty);subtotal=round(subtotal+amount);breakdown.push({item:`${room.label} · ${label} × ${qty}`,amount})}}
    const addons=state.addons.filter(a=>addonLabels[a]),addonsAmount=round(subtotal*(addons.length*0.25)),total=round(subtotal+addonsAmount);
    return {cleaning,breakdown,subtotal,addons,addonsAmount,total,message:'All prices and estimates are subject to verification upon arrival at the property. The final price may be adjusted if the size, condition of the space, or scope of work differs from the information provided when the estimate was requested.'};
  }

  function setStep(n){state.step=n;steps.forEach(s=>s.classList.toggle('active',+s.dataset.step===n));progress.forEach((p,i)=>p.classList.toggle('active',i<n));document.body.classList.toggle('quote-modal-open',n===2);if(n===3){renderCalendar();document.getElementById('calendarQuote').textContent=state.quote?`${money(state.quote.total)} CAD`:'—'}if(n===4)updateFinal();if(n!==2)goTo('#cotizar')}

  async function generateQuote(){if(!hasRooms()){toast('Add at least one area to generate an estimate.');return}setStep(2);const loading=document.getElementById('aiLoading'),result=document.getElementById('aiResult');loading.classList.remove('hidden');result.classList.add('hidden');await new Promise(r=>setTimeout(r,500));const data=calculateQuote();state.quote=data;document.getElementById('aiTotal').textContent=`${money(data.total)} CAD`;document.getElementById('aiMessage').textContent=data.message;const host=document.getElementById('aiBreakdown');host.innerHTML='';
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
  document.getElementById('applyPromo')?.addEventListener('click',()=>verifyPromo(true));
  document.querySelectorAll('.next').forEach(btn=>btn.addEventListener('click',async()=>{if(state.step===2&&!state.quote){toast('Generate your estimate first.');return}if(state.step===3){if(!state.date||!state.time){toast('Select an available day and time.');return}const name=document.getElementById('name'),address=document.getElementById('address'),email=document.getElementById('email'),phone=document.getElementById('phone');if(!name.reportValidity()||!address.reportValidity())return;if(!email.value.trim()&&!phone.value.trim()){toast('Add an email address or phone/WhatsApp number.');return}if(email.value&&!email.reportValidity())return;const entered=document.getElementById('promoCode')?.value.trim();if(entered){const ok=await verifyPromo(false);if(!ok)return}}if(state.step<4)setStep(state.step+1)}));
  document.querySelectorAll('.back').forEach(btn=>btn.addEventListener('click',()=>setStep(state.step-1)));
  const dayStatus=day=>day%7===0?'blocked':day%5===0?'limited':'available';
  function renderCalendar(){const m=new Date(state.year,state.month,1);monthTitle.textContent=m.toLocaleDateString('es-MX',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());calendarEl.innerHTML='';const first=m.getDay(),total=new Date(state.year,state.month+1,0).getDate();for(let i=0;i<first;i++){const e=document.createElement('div');e.className='day empty';calendarEl.appendChild(e)}for(let d=1;d<=total;d++){const cell=document.createElement('button'),status=dayStatus(d);cell.type='button';cell.className=`day ${status}`;cell.innerHTML=`${d}<i class="dot"></i>`;if(status==='blocked')cell.disabled=true;else cell.addEventListener('click',()=>selectDay(d,status,cell));calendarEl.appendChild(cell)}}
  function selectDay(d,status,cell){document.querySelectorAll('.day').forEach(x=>x.classList.remove('selected'));cell.classList.add('selected');state.date=new Date(state.year,state.month,d);state.time=null;const slots=status==='limited'?['10:00 AM','2:00 PM']:['9:00 AM','10:00 AM','12:00 PM','2:00 PM','4:00 PM'];timesEl.innerHTML='';slots.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='time';b.textContent=t;b.addEventListener('click',()=>{document.querySelectorAll('.time').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.time=t});timesEl.appendChild(b)})}
  document.getElementById('prevMonth').addEventListener('click',()=>{state.month--;if(state.month<0){state.month=11;state.year--}renderCalendar()});
  document.getElementById('nextMonth').addEventListener('click',()=>{state.month++;if(state.month>11){state.month=0;state.year++}renderCalendar()});
  const formattedDate=()=>state.date?state.date.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'—';
  const cleaningName=()=>state.cleaning==='deep'?'Deep Cleaning':'Regular Cleaning';
  function updateFinal(){
    document.getElementById('finalService').textContent=`Residential · ${cleaningName()}`;
    document.getElementById('finalDate').textContent=`${formattedDate()} · ${state.time||'—'}`;
    document.getElementById('finalName').textContent=document.getElementById('name').value||'—';
    const original=state.quote?.total||0;
    const finalTotal=state.promoEligible?discountTotal(original,state.promoPercent):original;
    state.promoFinalTotal=finalTotal;
    const priceText=state.quote?`${money(finalTotal)} CAD`:'—';
    document.getElementById('finalPrice').textContent=priceText;
    document.getElementById('finalPriceLarge').textContent=priceText;
    const promoLine=document.getElementById('promoFinalLine');
    if(promoLine){
      promoLine.classList.toggle('hidden',!state.promoEligible);
      promoLine.textContent=state.promoEligible?`${state.promoCode}: ${state.promoPercent}% OFF · Regular total ${money(original)} CAD`:'';
    }
    document.getElementById('finalBreakdown').textContent=state.quote?.message||'';
  }
  bookingForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const submitBtn=bookingForm.querySelector('button[type="submit"]');
    if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Registrando…'}
    try{
      if(!glemiSb)throw new Error('Connection unavailable');
      const email=document.getElementById('email').value.trim(),phone=document.getElementById('phone').value.trim();
      const quoteDetails={cleaning:state.cleaning,rooms:state.rooms,items:state.quote?.breakdown||[]};
      const dateISO=state.date?`${state.date.getFullYear()}-${String(state.date.getMonth()+1).padStart(2,'0')}-${String(state.date.getDate()).padStart(2,'0')}`:null;
      const {data,error}=await glemiSb.rpc('create_residential_booking',{
        p_client_name:document.getElementById('name').value.trim(),
        p_date:dateISO,
        p_time:state.time,
        p_email:email||null,
        p_phone:phone||null,
        p_address:document.getElementById('address').value.trim(),
        p_original_total:state.quote.total,
        p_discount_code:state.promoEligible?state.promoCode:null,
        p_quote_details:quoteDetails
      });
      if(error)throw error;
      if(!data?.ok){
        const reasons={already_used:'WELCOME20 has already been used with this contact information.',existing_customer:'WELCOME20 is only available for a customer’s first cleaning.',invalid_code:'The promo code is no longer valid.',contact_required:'Add an email or phone number.'};
        toast(reasons[data?.reason]||'We could not register the booking.');
        if(state.promoEligible){state.promoEligible=false;state.promoCode='';state.promoPercent=0}
        return
      }
      const finalTotal=Number(data.final_total||state.quote.total);
      const shortId=String(data.appointment_id||'').split('-')[0].toUpperCase();
      const code='GL-'+(shortId||Math.random().toString(36).slice(2,7).toUpperCase());
      document.getElementById('bookingCode').textContent=code;
      document.getElementById('successText').textContent=`Your request for ${cleaningName()} por ${money(finalTotal)} CAD was submitted for ${formattedDate()} at ${state.time}.${Number(data.discount_percent)>0?' A '+data.discount_percent+'% discount was applied with '+data.discount_code+'.':''}`;
      document.getElementById('modal').classList.add('show');
    }catch(err){
      console.error(err);toast('We could not submit the request. Please try again.');
    }finally{
      if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Request booking →'}
    }
  });
  document.getElementById('modalClose').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
  document.getElementById('modalDone').addEventListener('click',()=>document.getElementById('modal').classList.remove('show'));
  renderRooms();setStep(1);
}
