(()=>{
'use strict';
const $=id=>document.getElementById(id),cfg=window.GLEMI_SUPABASE;
const db=window.supabase?.createClient(cfg.url,cfg.key);
const bounds=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))&&Number(p.lat)>=48.95&&Number(p.lat)<=49.58&&Number(p.lon)>=-123.55&&Number(p.lon)<=-122.30;
let employees=[],locations={},photos={},loaded=false,rendering=false,rerenderRequested=false,bookings=[],assignments=[];
const autoLocations={},lookupPending=new Set(),lookupFailed=new Set(),preferredEmployees=new Map();
const routeCache=new Map(),routeInFlight=new Set();
async function geoapi(action,params){const {data,error}=await db.functions.invoke('glemi-geoapify',{body:{action,...params}});if(error||data?.error)throw Error(data?.error||error?.message||'Geoapify unavailable');return data;}
const msg=s=>{$('employeeMessage').textContent=s};
const text=(tag,s)=>{const el=document.createElement(tag);el.textContent=s||'';return el};
function reset(){ $('employeeForm').reset();$('employeeId').value='';}
$('employeeReset').onclick=reset;
async function geocode(address){
 try{
  const data=await geoapi('geocode',{address});
  const match=(data.candidates||[]).find(c=>bounds(c)&&c.confidence>=0.85&&c.housenumber);
  if(match)return {lat:match.lat,lon:match.lon,score:100,address:match.formatted_address};
  if(data.candidates?.length)throw Error('No confident building match. Include street number, city and postal code.');
 }catch(err){
  if(!String(err.message).includes('GEOAPIFY_NOT_CONFIGURED'))throw err;
 }
 const url=new URL('https://geocoder.api.gov.bc.ca/addresses.json');
 url.searchParams.set('addressString',address);url.searchParams.set('maxResults','5');url.searchParams.set('provinceCode','BC');
 const res=await fetch(url);if(!res.ok)throw Error('BC address search is unavailable');
 const data=await res.json();
 const candidates=(data.features||[]).map(f=>({lat:+f.geometry?.coordinates?.[1],lon:+f.geometry?.coordinates?.[0],score:+f.properties?.score||0,address:f.properties?.fullAddress||''})).filter(bounds).sort((a,b)=>b.score-a.score);
 if(!candidates.length)throw Error('Address not found in Metro Vancouver. Add the city and try again.');
 if(candidates[0].score<65)throw Error('Address match is uncertain. Include the city and postal code.');
 return candidates[0];
}
async function refresh(){
 if(!db)return;
 const [e,l,a]=await Promise.all([db.from('cleaning_employees').select('*').order('full_name'),db.from('service_map_locations').select('appointment_id,lat,lon,verified'),db.from('booking_employee_assignments').select('appointment_id,employee_id,service_date')]);
 if(e.error){msg('Cannot load employees: '+e.error.message);return}
 if(a.error){msg('Cannot load employee availability: '+a.error.message);loaded=false;return}employees=e.data||[];assignments=a.data||[];
 if(l.error){console.warn('GLEMI map coordinates:',l.error.message);msg('Map coordinates could not be loaded: '+l.error.message)}
 for(const p of l.data||[])if(bounds(p))locations[String(p.appointment_id)]=p;
 await Promise.all(employees.filter(e=>e.photo_path).map(async e=>{
   const {data}=await db.storage.from('glemi-employee-photos').createSignedUrl(e.photo_path,3600);
   if(data?.signedUrl)photos[e.id]=data.signedUrl;
 }));
 loaded=true;drawEmployees();recommend();autoLocate();
}
function drawEmployees(){
 const list=$('employeeList');list.replaceChildren();
 if(!employees.length){list.append(text('p','No employees registered yet.'));return}
 for(const e of employees){
   const card=document.createElement('article');card.className='glemi-employee-card';
   const pic=e.photo_path?document.createElement('img'):text('div','👤');
   pic.className='glemi-employee-avatar';
   if(e.photo_path){pic.src=photos[e.id]||'';pic.alt='Employee photo'}
   card.append(pic);
   const info=document.createElement('div');info.className='glemi-employee-info';
   for(const s of [e.full_name,e.job_role||'Cleaner',e.email,e.phone,e.address])info.append(text('p',s));
   if(!bounds(e))info.append(text('small','Address not located yet'));
   card.append(info);
   const edit=text('button','Edit');edit.type='button';edit.onclick=()=>{
     $('employeeId').value=e.id;$('employeeName').value=e.full_name;$('employeeEmail').value=e.email;$('employeePhone').value=e.phone;$('employeeAddress').value=e.address;$('employeeRole').value=e.job_role||'Cleaner';
     $('employeeForm').scrollIntoView({behavior:'smooth',block:'start'});
   };
   const remove=text('button','Remove');remove.type='button';remove.onclick=async()=>{
     if(!confirm('Remove this employee?'))return;
     const {error}=await db.from('cleaning_employees').delete().eq('id',e.id);
     if(error)return msg(error.message);
     if(e.photo_path)await db.storage.from('glemi-employee-photos').remove([e.photo_path]);
     msg('Employee removed.');await refresh();
   };
   const actions=document.createElement('div');actions.className='glemi-employee-actions';actions.append(edit,remove);card.append(actions);list.append(card);
 }
}
$('employeeForm').addEventListener('submit',async ev=>{
 ev.preventDefault();const submit=$('employeeForm').querySelector('[type=submit]');submit.disabled=true;
 try{
   const id=$('employeeId').value,photo=$('employeePhoto').files[0];
   if(!id&&!photo)throw Error('Please select one employee photo.');
   if(photo&&(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>2*1024*1024))throw Error('Use one JPG, PNG or WebP photo smaller than 2 MB.');
   const address=$('employeeAddress').value.trim();
   const previous=employees.find(e=>e.id===id);
   let position;
   if(previous?.address===address&&bounds(previous))position={lat:previous.lat,lon:previous.lon};
   else {msg('Finding employee address in BC…');position=await geocode(address)}
   let photo_path=previous?.photo_path||null;
   if(photo){
     photo_path=`${crypto.randomUUID()}.${photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg'}`;
     const upload=await db.storage.from('glemi-employee-photos').upload(photo_path,photo,{contentType:photo.type});
     if(upload.error)throw Error(upload.error.message);
   }
   const record={job_role:$('employeeRole').value,full_name:$('employeeName').value.trim(),email:$('employeeEmail').value.trim(),phone:$('employeePhone').value.trim(),address,lat:position.lat,lon:position.lon,photo_path,updated_at:new Date().toISOString()};
   const result=id?await db.from('cleaning_employees').update(record).eq('id',id):await db.from('cleaning_employees').insert(record);
   if(result.error)throw Error(result.error.message);
   if(previous?.photo_path&&photo&&previous.photo_path!==photo_path)await db.storage.from('glemi-employee-photos').remove([previous.photo_path]);
   reset();msg('Employee saved. Available employees will be suggested for pending and confirmed bookings.');await refresh();
 }catch(e){msg(e.message)}finally{submit.disabled=false}
});
function km(a,b){const rad=x=>x*Math.PI/180,R=6371,dlat=rad*(b.lat-a.lat),dlon=rad*(b.lon-a.lon);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
 return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
async function recommend(){
 if(!loaded||rendering){if(rendering)rerenderRequested=true;return;}rendering=true;
 try{
  const cards=[...document.querySelectorAll('[data-employee-booking]')];
  const active=employees.filter(e=>e.active!==false);
  for(const card of cards){
   const id=card.dataset.employeeBooking,p=locations[id]||autoLocations[id];card.replaceChildren();
   const booking=bookings.find(b=>String(b.id)===id);
   if(!booking){card.append(text('small','Loading booking information…'));continue}
   const current=assignments.find(a=>String(a.appointment_id)===id);
   const available=active.filter(e=>e.id===current?.employee_id||!assignments.some(a=>a.employee_id===e.id&&a.service_date===booking.appointment_date&&String(a.appointment_id)!==id));
   if(!active.length){card.append(text('small','No employees registered yet. Add an employee in Employees.'));continue}
   if(!available.length){card.append(text('small','No employees available for this date.'));continue}
   const canCompare=bounds(p);
   const ranked=canCompare?available.filter(bounds).map(e=>({e,d:km(p,e)})).filter(item=>Number.isFinite(item.d)).sort((a,b)=>a.d-b.d):[];
   const suggested=ranked[0]?.e||available[0];
   const selectedId=preferredEmployees.get(id);
   const employee=available.find(e=>e.id===current?.employee_id)||available.find(e=>e.id===selectedId)||suggested;
   const best=ranked.find(item=>item.e.id===employee.id)||null;
   const routeKey=best?JSON.stringify([id,employee.id,Number(p.lat),Number(p.lon),Number(employee.lat),Number(employee.lon)]):null;
   if(routeKey&&!routeCache.has(routeKey)&&!routeInFlight.has(routeKey)){
    routeInFlight.add(routeKey);
    geoapi('route',{from:{lat:employee.lat,lon:employee.lon},to:{lat:p.lat,lon:p.lon}})
     .then(result=>routeCache.set(routeKey,result))
     .catch(()=>routeCache.set(routeKey,null))
     .finally(()=>{routeInFlight.delete(routeKey);recommend()});
   }
   const driving=routeKey?routeCache.get(routeKey):null;
   const line=document.createElement('div');line.className='glemi-nearby-line';
   if(employee.photo_path&&photos[employee.id]){
    const img=document.createElement('img');img.src=photos[employee.id];img.alt='Photo of '+employee.full_name;line.append(img);
   }else{
    const fallback=text('span','👤');fallback.className='glemi-nearby-placeholder';line.append(fallback);
   }
   const details=document.createElement('div');
   details.append(text('strong',employee.full_name));
   const role=text('span',employee.job_role||'Cleaner');role.className='glemi-role-badge';details.append(role);
   if(best){
    if(driving&&Number.isFinite(+driving.distance_m)&&Number.isFinite(+driving.time_s)){
     details.append(text('small','Driving distance: '+(driving.distance_m/1000).toFixed(1)+' km'+(autoLocations[id]&&!locations[id]?' · Suggested address, not verified.':'')));
     details.append(text('small','Estimated drive: ~'+Math.ceil(driving.time_s/60)+' min (not live traffic).'));
    }else{
     details.append(text('small','Straight-line distance: '+best.d.toFixed(1)+' km'+(autoLocations[id]&&!locations[id]?' · Suggested address, not verified.':'')));
     details.append(text('small',routeInFlight.has(routeKey)?'Calculating driving route…':'Driving route unavailable; straight-line distance only.'));
    }
    details.append(text('small',current?'Assigned to this booking.':'Available on this date · not assigned.'));
   }else if(!canCompare){
    details.append(text('small','Registered employee · not assigned.'));
    details.append(text('small',lookupPending.has(id)?'Finding the client address automatically…':lookupFailed.has(id)?'Could not confidently locate this address. Please verify it on Service Map.':'Looking up the client address…'));
   }else{
    details.append(text('small','Registered employee · not assigned.'));
    details.append(text('small',bounds(employee)?'Employee coordinates ready; client location unavailable.':'Employee coordinates unavailable in this session. Open Employees and check address.'));
   }
   line.append(details);card.append(line);
   const controls=document.createElement('div');controls.className='glemi-employee-choice';
   const label=text('label','View another employee');label.htmlFor='employee-choice-'+id;
   const select=document.createElement('select');select.id='employee-choice-'+id;
   for(const e of (ranked.length?[...ranked.map(x=>x.e),...available.filter(e=>!ranked.some(x=>x.e.id===e.id))]:available)){
    const option=document.createElement('option');option.value=e.id;
    const match=ranked.find(item=>item.e.id===e.id);
    option.textContent=e.full_name+(match?' · '+match.d.toFixed(1)+' km':' · location unavailable');
    option.selected=e.id===employee.id;select.append(option);
   }
   select.addEventListener('change',()=>{preferredEmployees.set(id,select.value);recommend()});
   controls.append(label,select);card.append(controls);
   const action=document.createElement('button');action.type='button';action.className='glemi-assignment-button';
   action.textContent=current?'Remove assignment':'Assign employee';
   action.addEventListener('click',async()=>{
    action.disabled=true;
    try{
     if(current){
      const result=await db.from('booking_employee_assignments').delete().eq('appointment_id',id);
      if(result.error)throw result.error;
     }else{
      const result=await db.from('booking_employee_assignments').insert({appointment_id:id,employee_id:select.value,service_date:booking.appointment_date});
      if(result.error)throw result.error;
     }
     await refresh();
    }catch(err){alert('Could not update assignment: '+(err.code==='23505'?'Employee already booked for this date.':err.message));await refresh()}
    finally{action.disabled=false}
   });card.append(action);
   const note=text('small',current?'Assigned · Not available for other bookings on this date.':'Available suggestion · Not assigned yet.');
   note.className='glemi-not-assigned';card.append(note);
  }
 }finally{rendering=false;if(rerenderRequested){rerenderRequested=false;queueMicrotask(recommend)}}
}
window.addEventListener('glemi:employees-open',refresh);
window.addEventListener('glemi:recommendations-refresh',()=>{if(loaded){recommend();}else refresh()});
async function autoLocate(){
 if(!loaded||!bookings.length)return;
 const pending=bookings.filter(b=>['pending','confirmed'].includes(b.status)&&b.address&&!bounds(locations[b.id])&&!bounds(autoLocations[b.id])&&!lookupPending.has(b.id)&&!lookupFailed.has(b.id)).slice(0,12);
 for(const b of pending){
  lookupPending.add(b.id);recommend();
  try{
   let usedGeoapify=false;
   try{
    const result=await geoapi('geocode',{address:b.address});usedGeoapify=true;
    const match=(result.candidates||[]).find(c=>bounds(c)&&c.confidence>=0.85&&c.housenumber);
    if(match)autoLocations[b.id]=match;else lookupFailed.add(b.id);
   }catch(err){if(!String(err.message).includes('GEOAPIFY_NOT_CONFIGURED'))throw err}
   if(usedGeoapify)continue;
   const u=new URL('https://geocoder.api.gov.bc.ca/addresses.json');
   u.searchParams.set('addressString',b.address);u.searchParams.set('provinceCode','BC');u.searchParams.set('maxResults','3');
   const res=await fetch(u);if(!res.ok)throw Error('Geocoder unavailable');
   const json=await res.json();
   const matches=(json.features||[]).map(f=>({lat:+f.geometry?.coordinates?.[1],lon:+f.geometry?.coordinates?.[0],score:+f.properties?.score||0,precision:f.properties?.precision||''})).filter(bounds).sort((a,b)=>b.score-a.score);
   // Only suggest a coordinate for strong, unambiguous address matches.
   if(matches.length&&matches[0].score>=85&&(matches.length===1||matches[0].score-matches[1].score>=8)){
    autoLocations[b.id]=matches[0];
   }else lookupFailed.add(b.id);
  }catch(e){lookupFailed.add(b.id)}
  finally{lookupPending.delete(b.id);recommend()}
 }
}
window.addEventListener('glemi:appointments-loaded',event=>{bookings=Array.isArray(event.detail)?event.detail:[];refresh().then(autoLocate)});

window.addEventListener('glemi:map-open',()=>refresh());
window.addEventListener('glemi:map-points',event=>{for(const p of event.detail||[])if(bounds(p))locations[String(p.appointment_id)]=p;recommend()});
})();
