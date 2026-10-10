const menuBtn=document.getElementById('menuBtn');
if(menuBtn){const nav=document.getElementById('nav');menuBtn.setAttribute('aria-expanded','false');menuBtn.addEventListener('click',()=>{const open=nav?.classList.toggle('open')||false;menuBtn.setAttribute('aria-expanded',String(open));menuBtn.textContent=open?'×':'☰';menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu')});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');menuBtn.textContent='☰';menuBtn.setAttribute('aria-label','Open menu')}))}
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav')?.classList.remove('open')));

function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)}

const contactForm=document.getElementById('contactForm');
if(contactForm){contactForm.addEventListener('submit',e=>{e.preventDefault();e.target.reset();toast('Request sent. Thank you for contacting GLEMI.')})}

const commercialForm=document.getElementById('commercialForm');
if(commercialForm){commercialForm.addEventListener('submit',e=>{e.preventDefault();toast('Thank you. Your commercial request is ready for review.');e.target.reset()})}

const bookingForm=document.getElementById('bookingForm');
if(bookingForm){
 const roomCatalog=[{id:'kitchen',label:'Kitchen',types:[['regular','Regular'],['large','Large']]},{id:'bathroom',label:'Bathroom',types:[['regular','Regular'],['half','Half'],['large','Large / Ensuite']]},{id:'bedroom',label:'Bedroom',types:[['regular','Regular'],['large','Large']]},{id:'living',label:'Living Room',types:[['regular','Regular'],['large','Large']]}];
 const cleaningTypes={regular:'Regular',deep:'Deep',move:'Move In / Move Out',airbnb:'Airbnb'};
 let quoteRules={kitchen:{regular:{regular:67.5},large:{regular:135}},bathroom:{regular:{regular:67.5},half:{regular:30},large:{regular:90}},bedroom:{regular:{regular:22.5},large:{regular:33.75}},living:{regular:{regular:33.75},large:{regular:56.25}}};
 const specialRules={kitchen:{regular:112.50,large:180},bathroom:{regular:90,half:90,large:135},bedroom:{regular:67.50,large:135},living:{regular:67.50,large:90}};
 function emptyRooms(){const x={};roomCatalog.forEach(r=>{x[r.id]={};r.types.forEach(([t])=>x[r.id][t]=0)});return x}
 const state={city:'',step:1,date:null,time:null,month:new Date().getMonth(),year:new Date().getFullYear(),activeCleaningType:'regular',roomsByType:{regular:emptyRooms(),deep:emptyRooms(),move:emptyRooms(),airbnb:emptyRooms()},quote:null,promo:{code:null,discountPercent:0,eligible:false,verified:false}};
 const sb=(window.supabase&&window.GLEMI_SUPABASE)?window.supabase.createClient(window.GLEMI_SUPABASE.url,window.GLEMI_SUPABASE.key):null, money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n), pad=n=>String(n).padStart(2,'0');
 const steps=document.querySelectorAll('.form-step'),progress=document.querySelectorAll('.progress span'),calendarEl=document.getElementById('calendar'),timesEl=document.getElementById('times'),monthTitle=document.getElementById('monthTitle');
 function icon(id){return `<img src="room-${id}.png" alt="">`}
 function activeRooms(){return state.roomsByType[state.activeCleaningType]}
 function count(id,type=state.activeCleaningType){return Object.values(state.roomsByType[type][id]).reduce((a,b)=>a+(+b||0),0)}
 function typeCount(type){return roomCatalog.reduce((n,r)=>n+count(r.id,type),0)}
 function updateTypeBadges(){Object.keys(cleaningTypes).forEach(type=>{const e=document.querySelector(`[data-count-for="${type}"]`);if(e){const n=typeCount(type);e.textContent=n?`${n} selected`:''}})}
 function renderRooms(){const h=document.getElementById('roomRows');h.innerHTML='';const rooms=activeRooms();roomCatalog.forEach(r=>{const d=document.createElement('div');d.className='room-accordion';d.innerHTML=`<button type="button" class="room-accordion-toggle"><span class="room-icon">${icon(r.id)}</span><span class="room-title-wrap"><strong class="room-name">${r.label}</strong><small id="summary-${r.id}">${count(r.id)} selected</small></span><span class="room-chevron">⌄</span></button><div class="room-accordion-body" hidden>${r.types.map(([t,l])=>`<div class="room-type-counter"><span class="room-type-label">${l}</span><div class="qty-control"><button type="button" data-r="${r.id}" data-t="${t}" data-d="-1">−</button><span id="qty-${r.id}-${t}">${rooms[r.id][t]}</span><button type="button" data-r="${r.id}" data-t="${t}" data-d="1">+</button></div></div>`).join('')}</div>`;h.appendChild(d)});h.querySelectorAll('.room-accordion-toggle').forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;body.hidden=!body.hidden});h.querySelectorAll('[data-r]').forEach(b=>b.onclick=e=>{e.stopPropagation();const r=b.dataset.r,t=b.dataset.t;rooms[r][t]=Math.max(0,Math.min(20,rooms[r][t]+(+b.dataset.d)));document.getElementById(`qty-${r}-${t}`).textContent=rooms[r][t];document.getElementById(`summary-${r}`).textContent=`${count(r)} selected`;updateTypeBadges();state.quote=null;updateLiveEstimate()})}
 function selectCleaningType(type){if(!cleaningTypes[type])return;state.activeCleaningType=type;document.getElementById('cleaningType').value=cleaningTypes[type];document.querySelectorAll('[data-service-type]').forEach(b=>{const on=b.dataset.serviceType===type;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on?'true':'false')});renderRooms();updateTypeBadges();updateLiveEstimate()}
 document.querySelectorAll('[data-service-type]').forEach(b=>b.onclick=()=>selectCleaningType(b.dataset.serviceType));
 async function loadPricing(){if(!sb)return;const {data}=await sb.from('pricing_settings').select('room,room_type,regular_cad');(data||[]).forEach(x=>{let r=String(x.room||'').toLowerCase(),t=String(x.room_type||'').toLowerCase();if(quoteRules[r]?.[t])quoteRules[r][t].regular=+x.regular_cad||0})}
 function calculate(){let total=0,items=[];Object.keys(cleaningTypes).forEach(serviceType=>{const rooms=state.roomsByType[serviceType];roomCatalog.forEach(r=>r.types.forEach(([t,l])=>{let q=+rooms[r.id][t]||0;if(q){const price=serviceType==='regular'?(quoteRules[r.id]?.[t]?.regular||0):(specialRules[r.id]?.[t]??specialRules[r.id]?.regular??0);total+=price*q;items.push({serviceType,serviceLabel:cleaningTypes[serviceType],room:r.id,label:r.label,type:l,qty:q,price})}}))});return {total:Math.round(total*100)/100,items}}
 function updateLiveEstimate(){const card=document.getElementById('liveEstimateCard'),totalEl=document.getElementById('liveEstimateTotal'),discountEl=document.getElementById('liveEstimateDiscount');if(!card)return;const city=document.getElementById('serviceCity')?.value||'';card.hidden=!Object.keys(cleaningTypes).some(t=>typeCount(t)>0);if(card.hidden)return;const q=calculate(),discount=state.promo.eligible?Number(state.promo.discountPercent||0):0,final=q.total*(1-discount/100);if(totalEl)totalEl.textContent=`${money(final)} CAD`;if(discountEl)discountEl.textContent=discount?`${state.promo.code}: ${discount}% discount${state.promo.verified?'':' (will be verified with your address)'}`:''}
 renderRooms();updateTypeBadges();
 function setStep(n){const journeyStage=n;try{sessionStorage.setItem('glemiBookingStage',String(journeyStage))}catch(e){};state.step=n;document.querySelectorAll('#residentialJourney .residential-journey-step').forEach((el,i)=>{el.classList.toggle('active',i===journeyStage-1);el.classList.toggle('complete',i<journeyStage-1);el.querySelector('b').textContent=i<journeyStage-1?'✓':String(i+1)});steps.forEach(x=>x.classList.toggle('active',+x.dataset.step===n));progress.forEach((x,i)=>x.classList.toggle('active',i<n));document.getElementById('stepBadge').textContent=`STEP ${n} OF 4`;document.getElementById('stepTitle').textContent=n===1?'Choose what you need':n===2?'Get a free quote':n===3?'Your details':'Booking summary';if(n===2){renderCalendar();updateLiveEstimate()}if(n===4){renderReview()}document.querySelector('#cotizar')?.scrollIntoView({behavior:'smooth'})}
 const citySelect=document.getElementById('serviceCity');citySelect?.addEventListener('change',()=>{state.city=citySelect.value;state.quote=null;updateLiveEstimate()});
 document.getElementById('continueQuote').onclick=()=>{if(!Object.keys(cleaningTypes).some(t=>typeCount(t)>0)){toast('Select at least one area.');return}if(!citySelect?.value){toast('Select your city to continue.');citySelect?.focus();return}state.city=citySelect.value;if(!validateSchedule())return;state.quote=calculate();setStep(3)};
 document.querySelectorAll('.back').forEach(b=>b.onclick=()=>setStep(state.step-1));
 const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,slots=[['9:00 AM','09:00'],['10:00 AM','10:00'],['12:00 PM','12:00'],['2:00 PM','14:00'],['4:00 PM','16:00']];let availability={};
 async function renderCalendar(){let m=new Date(state.year,state.month,1);monthTitle.textContent=m.toLocaleDateString('en-CA',{month:'long',year:'numeric'});availability={};if(sb){const {data}=await sb.rpc('get_calendar_availability',{p_start_date:iso(m),p_end_date:iso(new Date(state.year,state.month+1,0))});(data||[]).forEach(x=>availability[x.day]=x)}calendarEl.innerHTML='';for(let i=0;i<m.getDay();i++)calendarEl.innerHTML+='<div class="day empty"></div>';let total=new Date(state.year,state.month+1,0).getDate(),today=new Date();today.setHours(0,0,0,0);for(let d=1;d<=total;d++){let date=new Date(state.year,state.month,d),info=availability[iso(date)],bookings=+(info?.booking_count||0),blocked=date<today||info?.enabled===false||bookings>=5,b=document.createElement('button');b.type='button';b.className=`day ${blocked?'blocked':bookings>=3?'limited':'available'}`;if(state.date&&iso(state.date)===iso(date))b.classList.add('selected');b.disabled=blocked;b.innerHTML=`${d}<i class="dot"></i>`;if(!blocked)b.onclick=()=>selectDay(date,info,b);calendarEl.appendChild(b)}}
 function selectDay(date,info,b){calendarEl.querySelectorAll('.day').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.date=date;state.time=null;let booked=new Set((info?.booked_times||[]).map(x=>String(x).slice(0,5))),start=String(info?.start_time||'08:00').slice(0,5),end=String(info?.end_time||'17:00').slice(0,5),now=new Date();timesEl.innerHTML='';slots.filter(([l,v])=>v>=start&&v<end&&!booked.has(v)).filter(([l,v])=>iso(date)!==iso(now)||(+v.slice(0,2)*60+ +v.slice(3))>(now.getHours()*60+now.getMinutes())).forEach(([l,v])=>{let x=document.createElement('button');x.type='button';x.className='time';x.textContent=l;x.onclick=()=>{timesEl.querySelectorAll('.time').forEach(y=>y.classList.remove('selected'));x.classList.add('selected');state.time=l};timesEl.appendChild(x)});if(!timesEl.children.length)timesEl.innerHTML='<span class="empty">No times available for this day</span>'}
 document.getElementById('prevMonth').onclick=()=>{let now=new Date(),c=new Date(state.year,state.month-1,1),cur=new Date(now.getFullYear(),now.getMonth(),1);if(c<cur)return;state.month--;if(state.month<0){state.month=11;state.year--}renderCalendar()};document.getElementById('nextMonth').onclick=()=>{state.month++;if(state.month>11){state.month=0;state.year++}renderCalendar()};
 function val(name){return document.querySelector(`input[name=${name}]:checked`)?.value||''}

 async function applyPromo(){
  const input=document.getElementById('promoCode');
  const msg=document.getElementById('promoCodeMessage');
  if(!input||!msg)return;

  const code=input.value.trim().toUpperCase();
  const address=(document.getElementById('address')?.value||'').trim();
  const pt=null;
  const unit=(document.getElementById('unitApt')?.value||'').trim();

  if(!address){
    if(code==='WELCOME'){
      state.promo={code:'WELCOME',discountPercent:10,eligible:true,verified:false};
      msg.textContent='WELCOME applied — 10% discount. We will verify eligibility after you enter the property address.';
      msg.className='promo-code-message success';
      updateLiveEstimate();
      return true;
    }
    msg.textContent='Enter your street address to verify this promotional code.';
    msg.className='promo-code-message error';
    return false;
  }

  const btn=document.getElementById('applyPromoCode');
  if(btn){btn.disabled=true;btn.textContent='CHECKING…';}

  try{
    const cfg=window.GLEMI_SUPABASE||{};
    const supabaseUrl=(cfg.url||'https://gkhrkomqrlzwbegbsxcr.supabase.co').replace(/\/+$/,'');
    const publishableKey=cfg.key||'sb_publishable_Vt691jJ2s0p6V2lMKRTwPw_TciY0uJJ';

    const response=await fetch(
      supabaseUrl+'/rest/v1/rpc/check_address_promo_eligibility',
      {
        method:'POST',
        mode:'cors',
        cache:'no-store',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json',
          'apikey':publishableKey
        },
        body:JSON.stringify({
          p_code:code,
          p_address:address,
          p_property_type:pt,
          p_unit_number:unit||null
        })
      }
    );

    const raw=await response.text();
    let data=null;
    try{data=raw?JSON.parse(raw):null;}catch(_){}

    if(!response.ok){
      console.error('WELCOME RPC failed:',response.status,raw);
      throw new Error('RPC '+response.status+': '+raw);
    }

    if(data?.eligible){
      state.promo={
        code:data.code||code,
        discountPercent:Number(data.discount_percent||10),
        eligible:true,
        verified:true
      };
      msg.textContent=`${state.promo.code} applied — ${state.promo.discountPercent}% discount.`;
      msg.className='promo-code-message success';
    }else{
      state.promo={code:null,discountPercent:0,eligible:false};
      const reasons={
        already_used:'This address/unit has already used the WELCOME discount.',
        invalid_code:'Invalid promotional code.',
        address_required:'Enter the property address first.',
        unit_required:'Enter the unit/apartment number first.'
      };
      msg.textContent=reasons[data?.reason]||'This promotional code cannot be applied.';
      msg.className='promo-code-message error';
    }

    updateLiveEstimate();
    if(state.step===3)renderReview();
    return !!state.promo.eligible;
  }catch(err){
    console.error('WELCOME verification error:',err);
    state.promo={code:null,discountPercent:0,eligible:false};
    msg.textContent='Unable to verify the promotional code right now.';
    msg.className='promo-code-message error';
    updateLiveEstimate();
    return false;
  }finally{
    if(btn){btn.disabled=false;btn.textContent='APPLY';}
  }
 }
 const promoBtn=document.getElementById('applyPromoCode');if(promoBtn)promoBtn.onclick=applyPromo;
 ['address','unitApt'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{
  if(state.promo.eligible&&state.promo.verified){state.promo={code:null,discountPercent:0,eligible:false,verified:false};const m=document.getElementById('promoCodeMessage');if(m){m.textContent='Address changed — apply the promotional code again.';m.className='promo-code-message'}}
 }));
 function validateSchedule(){if(!state.date||!state.time){toast('Select a date and time.');return false}return true}
 function renderFreeQuote(){const el=document.getElementById('freeQuoteSummary');if(!el)return;const q=state.quote||calculate();el.innerHTML=q.items.map(i=>`<div class="review-line"><span>${i.serviceLabel} — ${i.label} (${i.type}) × ${i.qty}</span></div>`).join('')+`<div class="review-line"><strong>Estimated total</strong><strong>${money(q.total)} CAD</strong></div>`}
 document.getElementById('chooseServiceNext').onclick=()=>setStep(2);
 document.getElementById('continueContact').onclick=async()=>{for(const id of ['name','email','address','phone']){if(!document.getElementById(id).reportValidity())return}if(state.promo.eligible&&!state.promo.verified){const ok=await applyPromo();if(!ok)return}setStep(4)};
 function renderReview(){const appointment=document.getElementById('appointmentSummary');if(appointment)appointment.textContent=state.date&&state.time?`Date: ${state.date.toLocaleDateString('en-CA')} · Time: ${state.time}`:'';let a=document.getElementById('selectedAreas');a.innerHTML='';Object.keys(cleaningTypes).forEach(type=>{const items=state.quote.items.filter(i=>i.serviceType===type);if(!items.length)return;const group=document.createElement('div');group.className='cleaning-review-group';group.innerHTML=`<div class="review-line"><strong>${cleaningTypes[type]}</strong><span>${items.reduce((n,i)=>n+i.qty,0)} selected</span></div>`+items.map(i=>`<div class="selected-area">${icon(i.room)}<span>${i.label}${i.qty>1?` (${i.qty})`:''} · ${i.type}</span></div>`).join('');a.appendChild(group)});const summary=document.getElementById('propertySummary');const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));summary.innerHTML=[['Full name',document.getElementById('name').value],['Email',document.getElementById('email').value],['Phone',document.getElementById('phone').value],['City',state.city],['Street address',document.getElementById('address').value],['Unit / Apt',document.getElementById('unitApt').value],['Special instructions',document.getElementById('specialInstructions').value]].filter(x=>x[1]).map(([k,v])=>`<div class="review-line"><span>${k}</span><span>${safe(v)}</span></div>`).join('');{const base=state.quote.total,discount=state.promo.eligible?state.promo.discountPercent:0,final=base*(1-discount/100);document.getElementById('finalPriceLarge').textContent=`${money(final)} CAD`;let promoLine=document.getElementById('promoReviewLine');if(!promoLine){promoLine=document.createElement('div');promoLine.id='promoReviewLine';promoLine.className='review-line';document.querySelector('.final-price-card')?.appendChild(promoLine)}promoLine.innerHTML=discount?`<span>${state.promo.code} discount</span><span>−${discount}% (${money(base-final)})</span>`:''}}
 document.getElementById('editAreas').onclick=()=>setStep(2);document.getElementById('editDetails').onclick=()=>setStep(3);
 bookingForm.onsubmit=async e=>{e.preventDefault();if(!val('payment')){toast('Select a payment method.');return}let btn=bookingForm.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Submitting…';try{if(!sb)throw Error('Connection unavailable');if(!validateSchedule())return;let details={service_city:state.city,rooms_by_cleaning_type:state.roomsByType,items:state.quote.items,cleaning_types:Object.keys(cleaningTypes).filter(t=>typeCount(t)>0).map(t=>cleaningTypes[t]),payment_method:val('payment'),unit_apt:(document.getElementById('unitApt')?.value||'').trim(),special_instructions:(document.getElementById('specialInstructions')?.value||'').trim()};let {data,error}=await sb.rpc('create_residential_booking',{p_client_name:document.getElementById('name').value.trim(),p_date:iso(state.date),p_time:state.time,p_email:document.getElementById('email').value.trim(),p_phone:document.getElementById('phone').value.trim(),p_address:document.getElementById('address').value.trim(),p_original_total:state.quote.total,p_discount_code:state.promo.eligible?state.promo.code:null,p_quote_details:details});if(error)throw error;if(!data?.ok){if(data?.reason==='already_used'){state.promo={code:null,discountPercent:0,eligible:false};throw Error('PROMO_ALREADY_USED')}throw Error('Booking failed');}document.getElementById('bookingCode').textContent='GL-'+String(data.appointment_id||'').split('-')[0].toUpperCase();document.getElementById('successText').textContent=`Your request for ${money(Number(data.final_total||state.quote.total))} CAD was submitted for ${state.date.toLocaleDateString('en-CA')} at ${state.time}. Payment will be made at the property.`;document.getElementById('modal').classList.add('show')}catch(err){console.error(err);toast(err?.message==='PROMO_ALREADY_USED'?'The WELCOME discount has already been used for this address/unit.':'We could not submit the request. Please try again.')}finally{btn.disabled=false;btn.textContent='FINISH'}};
 document.getElementById('modalClose').onclick=()=>document.getElementById('modal').classList.remove('show');document.getElementById('modalDone').onclick=()=>document.getElementById('modal').classList.remove('show');renderRooms();loadPricing().then(updateLiveEstimate);updateLiveEstimate();setStep(1);
}

/* Keep the homepage booking progress synchronized with real form activity. */
(function(){
 const calendar=document.querySelector('.calendar-section');
 if(!calendar)return;
 calendar.addEventListener('click',function(e){
  if(e.target.closest('button[data-date],.calendar-day,.day.available,[data-day]')){
   try{sessionStorage.setItem('glemiBookingStage','3')}catch(err){}
  }
 });
})();
