(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const MAP_CENTER=[49.22,-122.98]; // Metro Vancouver service area
const SERVICE_BOUNDS=[[48.95,-123.55],[49.58,-122.30]]; // Greater Vancouver, including Langley and Maple Ridge
let map=null,layer=null,bookings=[],active=false,loading=false;
const cached=(()=>{try{return JSON.parse(localStorage.getItem('glemi:geocodes:v1')||'{}')}catch{return {}}})();
const save=()=>{try{localStorage.setItem('glemi:geocodes:v1',JSON.stringify(cached))}catch{}};
const msg=s=>{if(byId('mapMessage'))byId('mapMessage').textContent=s};
const clean=s=>String(s||'').trim();
const addressKey=a=>clean(a).toLowerCase().replace(/\s+/g,' ');
const activeBookings=()=>bookings.filter(b=>(b.status==='pending'||b.status==='confirmed')&&(byId('mapBookingStatus')?.value==='all'||b.status===byId('mapBookingStatus').value)&&[b.client_name,b.address,b.service,b.appointment_date].join(' ').toLowerCase().includes(clean(byId('mapBookingSearch')?.value).toLowerCase()));
function init(){
 if(map||!window.L)return;
 map=L.map('glemiServiceMap',{scrollWheelZoom:false,minZoom:9,maxBounds:SERVICE_BOUNDS,maxBoundsViscosity:1}).setView(MAP_CENTER,10);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);
 layer=L.layerGroup().addTo(map);
}
function route(address){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address+', British Columbia, Canada');}
function item(b){
 const card=document.createElement('article');card.className='glemi-map-booking';
 const name=document.createElement('strong');name.textContent=b.client_name||'Customer';card.append(name);
 const badge=document.createElement('span');badge.className='glemi-map-status '+b.status;badge.textContent=b.status;card.append(badge);
 for(const txt of [b.service,[b.appointment_date,clean(b.appointment_time).slice(0,5)].filter(Boolean).join(' · '),b.address]){const p=document.createElement('p');p.textContent=txt||'Address not provided';card.append(p)}
 const actions=document.createElement('div');actions.className='glemi-map-actions';
 const key=addressKey(b.address),point=cached[key];
 const btn=document.createElement('button');btn.type='button';btn.textContent=point?'Show on map':'Locate address';btn.disabled=!clean(b.address)||loading;
 btn.addEventListener('click',async()=>{if(cached[key]){map?.setView([cached[key].lat,cached[key].lon],14);return}await locate(b)});actions.append(btn);
 if(clean(b.address)){const a=document.createElement('a');a.href=route(b.address);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Directions ↗';actions.append(a)}
 card.append(actions);return card;
}
function draw(){
 const rows=activeBookings();
 byId('mapPendingCount').textContent=bookings.filter(b=>b.status==='pending').length+' pending';
 byId('mapConfirmedCount').textContent=bookings.filter(b=>b.status==='confirmed').length+' confirmed';
 byId('mapLocatedCount').textContent=bookings.filter(b=>cached[addressKey(b.address)]).length+' located';
 const list=byId('mapBookingList');list.replaceChildren();
 if(!rows.length){const p=document.createElement('p');p.className='muted';p.textContent='No active bookings match these filters.';list.append(p)}
 rows.forEach(b=>list.append(item(b)));
 if(!map||!layer)return;
 layer.clearLayers();const bounds=[];
 for(const b of rows){const pt=cached[addressKey(b.address)];if(!pt||pt.lat<SERVICE_BOUNDS[0][0]||pt.lat>SERVICE_BOUNDS[1][0]||pt.lon<SERVICE_BOUNDS[0][1]||pt.lon>SERVICE_BOUNDS[1][1])continue;const pos=[pt.lat,pt.lon];bounds.push(pos);
 const marker=L.circleMarker(pos,{radius:9,color:b.status==='confirmed'?'#087f5b':'#ba7916',weight:3,fillColor:b.status==='confirmed'?'#17a778':'#f0b74d',fillOpacity:.9}).addTo(layer);
 const popup=document.createElement('div');popup.className='glemi-map-popup';for(const str of [b.client_name,b.service,b.appointment_date+' '+clean(b.appointment_time).slice(0,5),b.address]){const line=document.createElement('div');line.textContent=str||'';popup.append(line)}const a=document.createElement('a');a.href=route(b.address);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open directions';popup.append(a);marker.bindPopup(popup);
 }
 if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:13});
 else map.setView(MAP_CENTER,10);
}
let lastLookup=0;
async function locate(b){
 if(loading||!clean(b.address))return;
 loading=true;draw();msg('Locating address…');
 try{
  // OpenStreetMap Nominatim: explicit one-address-at-a-time lookup, no autocomplete or bulk requests.
  const wait=Math.max(0,1200-(Date.now()-lastLookup));if(wait)await new Promise(r=>setTimeout(r,wait));lastLookup=Date.now();
  const q=clean(b.address)+', British Columbia, Canada';
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ca&q='+encodeURIComponent(q);
  const response=await fetch(url,{headers:{'Accept':'application/json'}});
  if(!response.ok)throw Error('Map service unavailable ('+response.status+').');
  const hits=await response.json();if(!Array.isArray(hits)||!hits.length){msg('Address not found. Verify its spelling or use Directions to check it in Google Maps.');return}
  const hit=hits[0];const lat=Number(hit.lat),lon=Number(hit.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Invalid map coordinates');
  if(lat<SERVICE_BOUNDS[0][0]||lat>SERVICE_BOUNDS[1][0]||lon<SERVICE_BOUNDS[0][1]||lon>SERVICE_BOUNDS[1][1]){msg('Address is outside the Metro Vancouver service map. Verify the address before adding it.');return}
  cached[addressKey(b.address)]={lat,lon};save();msg('Address located. Verify the marker before assigning a cleaner.');
 }catch(e){msg('Unable to locate this address. '+(e.message||'Please try again.'))}
 finally{loading=false;draw()}
}
window.addEventListener('glemi:appointments-loaded',e=>{bookings=Array.isArray(e.detail)?e.detail:[];if(active)draw()});
window.addEventListener('glemi:map-open',()=>{active=true;if(!window.L){msg('Map library could not load. Check your connection and try again.');return}init();draw();setTimeout(()=>map?.invalidateSize(),120)});
byId('mapBookingSearch')?.addEventListener('input',draw);
byId('mapBookingStatus')?.addEventListener('change',draw);
})();
