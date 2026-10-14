(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const MAP_CENTER=[49.22,-122.98]; // Metro Vancouver service area
const SERVICE_BOUNDS=[[48.95,-123.55],[49.58,-122.30]]; // Greater Vancouver, including Langley and Maple Ridge
let map=null,layer=null,bookings=[],active=false,loading=false,googleReady=null;
const cached=(()=>{try{return JSON.parse(localStorage.getItem('glemi:geocodes:v1')||'{}')}catch{return {}}})();
const save=()=>{try{localStorage.setItem('glemi:geocodes:v1',JSON.stringify(cached))}catch{}};
const msg=s=>{if(byId('mapMessage'))byId('mapMessage').textContent=s};
const clean=s=>String(s||'').trim();
const addressKey=a=>clean(a).toLowerCase().replace(/\s+/g,' ');
const activeBookings=()=>bookings.filter(b=>(b.status==='pending'||b.status==='confirmed')&&(byId('mapBookingStatus')?.value==='all'||b.status===byId('mapBookingStatus').value)&&[b.client_name,b.address,b.service,b.appointment_date].join(' ').toLowerCase().includes(clean(byId('mapBookingSearch')?.value).toLowerCase()));
const GOOGLE_KEY=(window.GLEMI_GOOGLE_MAPS_KEY||'').trim();
function loadGoogle(){
 if(window.google?.maps)return Promise.resolve();
 if(googleReady)return googleReady;
 if(!GOOGLE_KEY||GOOGLE_KEY==='PASTE_YOUR_RESTRICTED_BROWSER_KEY_HERE')return Promise.reject(Error('Google Maps API key not configured. Follow GOOGLE-MAPS-SETUP.txt.'));
 googleReady=new Promise((resolve,reject)=>{
  const callback='glemiGoogleMapsLoaded';
  window[callback]=()=>{delete window[callback];resolve()};
  const script=document.createElement('script');script.async=true;
  script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(GOOGLE_KEY)+'&v=weekly&callback='+callback+'&region=CA&language=en';
  script.onerror=()=>reject(Error('Google Maps failed to load. Check the API key and allowed domains.'));
  document.head.append(script);
 });return googleReady;
}
function insideBounds(lat,lng){return lat>=SERVICE_BOUNDS[0][0]&&lat<=SERVICE_BOUNDS[1][0]&&lng>=SERVICE_BOUNDS[0][1]&&lng<=SERVICE_BOUNDS[1][1]}
function init(){
 if(map||!window.google?.maps)return;
 map=new google.maps.Map(byId('glemiServiceMap'),{center:{lat:MAP_CENTER[0],lng:MAP_CENTER[1]},zoom:10,restriction:{latLngBounds:{south:SERVICE_BOUNDS[0][0],west:SERVICE_BOUNDS[0][1],north:SERVICE_BOUNDS[1][0],east:SERVICE_BOUNDS[1][1]},strictBounds:true},streetViewControl:false,mapTypeControl:false,fullscreenControl:true});
 layer=[];
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
 btn.addEventListener('click',async()=>{if(cached[key]){map?.setCenter({lat:cached[key].lat,lng:cached[key].lon});map?.setZoom(15);return}await locate(b)});actions.append(btn);
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
 layer.forEach(m=>m.setMap(null));layer=[];const bounds=new google.maps.LatLngBounds();let hasPins=false;
 for(const b of rows){const pt=cached[addressKey(b.address)];if(!pt||!insideBounds(pt.lat,pt.lon))continue;
  const position={lat:pt.lat,lng:pt.lon};bounds.extend(position);hasPins=true;
  const marker=new google.maps.Marker({map,position,title:b.client_name||'Customer',icon:{path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:b.status==='confirmed'?'#17a778':'#f0b74d',fillOpacity:1,strokeColor:b.status==='confirmed'?'#087f5b':'#ba7916',strokeWeight:3}});layer.push(marker);
  const popup=document.createElement('div');popup.className='glemi-map-popup';for(const str of [b.client_name,b.service,b.appointment_date+' '+clean(b.appointment_time).slice(0,5),b.address]){const line=document.createElement('div');line.textContent=str||'';popup.append(line)}const a=document.createElement('a');a.href=route(b.address);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open directions';popup.append(a);
  const info=new google.maps.InfoWindow({content:popup});marker.addListener('click',()=>info.open({anchor:marker,map}));
 }
 if(hasPins){map.fitBounds(bounds,40);if(map.getZoom()>14)map.setZoom(14)}else{map.setCenter({lat:MAP_CENTER[0],lng:MAP_CENTER[1]});map.setZoom(10)}
}
async function locate(b){
 if(loading||!clean(b.address))return;
 loading=true;draw();msg('Locating address with Google Maps…');
 try{
  await loadGoogle();init();
  const geocoder=new google.maps.Geocoder();
  const raw=clean(b.address);
  const query=/\b(?:BC|British Columbia|Canada)\b/i.test(raw)?raw:raw+', Metro Vancouver, British Columbia, Canada';
  const result=await geocoder.geocode({address:query,region:'ca',componentRestrictions:{country:'CA'},bounds:new google.maps.LatLngBounds({lat:SERVICE_BOUNDS[0][0],lng:SERVICE_BOUNDS[0][1]},{lat:SERVICE_BOUNDS[1][0],lng:SERVICE_BOUNDS[1][1]})});
  const hits=(result.results||[]).filter(x=>{const p=x.geometry?.location;return p&&insideBounds(p.lat(),p.lng())});
  const exact=hits.filter(x=>!x.partial_match&&x.geometry.location_type==='ROOFTOP'&&x.types.includes('street_address'));
  if(exact.length!==1){msg(hits.length?'Address needs confirmation. Add the city or postal code to the booking, then locate again.':'Address not found in Metro Vancouver. Check the street and house number.');return}
  const hit=exact[0],lat=hit.geometry.location.lat(),lon=hit.geometry.location.lng();
  cached[addressKey(b.address)]={lat,lon};save();msg('Address located with Google Maps. Verify the marker before assigning a cleaner.');
 }catch(e){msg('Unable to locate address: '+(e.message||'Check Google Maps configuration.'))}
 finally{loading=false;draw()}
}
window.addEventListener('glemi:appointments-loaded',e=>{bookings=Array.isArray(e.detail)?e.detail:[];if(active)draw()});
window.addEventListener('glemi:map-open',async()=>{active=true;try{await loadGoogle();init();draw()}catch(e){msg(e.message||'Google Maps unavailable')}});
byId('mapBookingSearch')?.addEventListener('input',draw);
byId('mapBookingStatus')?.addEventListener('change',draw);
})();
