(()=>{
'use strict';
const $=id=>document.getElementById(id),cfg=window.GLEMI_SUPABASE;
const db=window.supabase?.createClient(cfg.url,cfg.key);
const bounds=p=>p&&p.lat>=48.95&&p.lat<=49.58&&p.lon>=-123.55&&p.lon<=-122.30;
let employees=[],locations={},photos={},loaded=false,rendering=false;
const msg=s=>{$('employeeMessage').textContent=s};
const text=(tag,s)=>{const el=document.createElement(tag);el.textContent=s||'';return el};
function reset(){ $('employeeForm').reset();$('employeeId').value='';}
$('employeeReset').onclick=reset;
async function geocode(address){
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
 const [e,l]=await Promise.all([db.from('cleaning_employees').select('*').order('full_name'),db.from('service_map_locations').select('appointment_id,lat,lon,verified')]);
 if(e.error){msg('Cannot load employees: '+e.error.message);return}
 employees=e.data||[];locations={};
 for(const p of l.data||[])if(bounds(p))locations[p.appointment_id]=p;
 await Promise.all(employees.filter(e=>e.photo_path).map(async e=>{
   const {data}=await db.storage.from('glemi-employee-photos').createSignedUrl(e.photo_path,3600);
   if(data?.signedUrl)photos[e.id]=data.signedUrl;
 }));
 loaded=true;drawEmployees();recommend();
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
   for(const s of [e.full_name,e.email,e.phone,e.address])info.append(text('p',s));
   if(!bounds(e))info.append(text('small','Address not located yet'));
   card.append(info);
   const edit=text('button','Edit');edit.type='button';edit.onclick=()=>{
     $('employeeId').value=e.id;$('employeeName').value=e.full_name;$('employeeEmail').value=e.email;$('employeePhone').value=e.phone;$('employeeAddress').value=e.address;
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
   const record={full_name:$('employeeName').value.trim(),email:$('employeeEmail').value.trim(),phone:$('employeePhone').value.trim(),address,lat:position.lat,lon:position.lon,photo_path,updated_at:new Date().toISOString()};
   const result=id?await db.from('cleaning_employees').update(record).eq('id',id):await db.from('cleaning_employees').insert(record);
   if(result.error)throw Error(result.error.message);
   if(previous?.photo_path&&photo&&previous.photo_path!==photo_path)await db.storage.from('glemi-employee-photos').remove([previous.photo_path]);
   reset();msg('Employee saved. Suggested matches will appear on confirmed bookings with located addresses.');await refresh();
 }catch(e){msg(e.message)}finally{submit.disabled=false}
});
function km(a,b){const rad=x=>x*Math.PI/180,R=6371,dlat=rad*(b.lat-a.lat),dlon=rad*(b.lon-a.lon);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
 return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
async function recommend(){
 if(!loaded||rendering)return;rendering=true;
 try{
 const cards=[...document.querySelectorAll('[data-employee-booking]')];
 for(const card of cards){
  const id=card.dataset.employeeBooking,p=locations[id];card.replaceChildren();
  if(!bounds(p)){card.append(text('small','Nearby employee: locate this booking on Service Map first.'));continue}
  const ranked=employees.filter(e=>e.active&&bounds(e)).map(e=>({e,d:km(p,e)})).sort((a,b)=>a.d-b.d);
  if(!ranked.length){card.append(text('small','No employees with a located home address yet.'));continue}
  const best=ranked[0],line=document.createElement('div');line.className='glemi-nearby-line';
  if(best.e.photo_path&&photos[best.e.id]){const img=document.createElement('img');img.src=photos[best.e.id];img.alt='Employee photo';line.append(img)}
  const details=document.createElement('div');
  details.append(text('strong','Nearby: '+best.e.full_name));
  details.append(text('small',best.d.toFixed(1)+' km straight-line distance · availability not checked'));
  line.append(details);card.append(line);
 }
 }finally{rendering=false}
}
window.addEventListener('glemi:employees-open',refresh);
window.addEventListener('glemi:recommendations-refresh',()=>{if(loaded)recommend();else refresh()});
window.addEventListener('glemi:appointments-loaded',()=>refresh());
window.addEventListener('glemi:map-open',()=>refresh());
})();
