from pathlib import Path
p=Path('/mnt/data/glemi_geoapify')
e=(p/'employees.js').read_text()
# Shared authenticated API helper
a="const autoLocations={},lookupPending=new Set(),lookupFailed=new Set(),preferredEmployees=new Map();"
b=a+"\nconst routeCache=new Map(),routeInFlight=new Set();\nasync function geoapi(action,params){const {data,error}=await db.functions.invoke('glemi-geoapify',{body:{action,...params}});if(error||data?.error)throw Error(data?.error||error?.message||'Geoapify unavailable');return data;}"
assert a in e;e=e.replace(a,b)
a='async function geocode(address){\n'
b='''async function geocode(address){
 try{
  const data=await geoapi('geocode',{address});
  const match=(data.candidates||[]).find(c=>bounds(c)&&c.confidence>=0.85&&c.housenumber);
  if(match)return {lat:match.lat,lon:match.lon,score:100,address:match.formatted_address};
  if(data.candidates?.length)throw Error('No confident building match. Include street number, city and postal code.');
 }catch(err){
  if(!String(err.message).includes('GEOAPIFY_NOT_CONFIGURED')&&!String(err.message).includes('Geoapify unavailable'))throw err;
 }
'''
assert a in e;e=e.replace(a,b)
a="   const best=distance||null;"
b='''   const best=distance||null;
   const routeKey=best?JSON.stringify([id,employee.id,Number(p.lat),Number(p.lon),Number(employee.lat),Number(employee.lon)]):null;
   if(routeKey&&!routeCache.has(routeKey)&&!routeInFlight.has(routeKey)){
    routeInFlight.add(routeKey);
    geoapi('route',{from:{lat:employee.lat,lon:employee.lon},to:{lat:p.lat,lon:p.lon}})
     .then(result=>{routeCache.set(routeKey,result)})
     .catch(()=>{routeCache.set(routeKey,null)})
     .finally(()=>{routeInFlight.delete(routeKey);recommend()});
   }
   const driving=routeKey?routeCache.get(routeKey):null;'''
assert a in e;e=e.replace(a,b)
a="""    details.append(text('small','Distance: '+best.d.toFixed(1)+' km (straight line).'+(autoLocations[id]&&!locations[id]?' · Suggested address, not verified.':'')));
    const estimate=Math.max(5,Math.round((best.d*1.4/25*60)/5)*5);
    details.append(text('small','Estimated arrival: ~'+estimate+' min by car (rough estimate, not a real route).'));"""
b="""    if(driving){
     details.append(text('small','Driving distance: '+(driving.distance_m/1000).toFixed(1)+' km'+(autoLocations[id]&&!locations[id]?' · Suggested address, not verified.':'')));
     details.append(text('small','Estimated drive: ~'+Math.ceil(driving.time_s/60)+' min (not live traffic).'));
    }else{
     details.append(text('small','Straight-line distance: '+best.d.toFixed(1)+' km'+(autoLocations[id]&&!locations[id]?' · Suggested address, not verified.':'')));
     details.append(text('small',routeInFlight.has(routeKey)?'Calculating driving route…':'Driving route unavailable; straight-line distance only.'));
    }"""
assert a in e;e=e.replace(a,b)
a="   const u=new URL('https://geocoder.api.gov.bc.ca/addresses.json');"
b="""   let usedGeoapify=false;
   try{
    const result=await geoapi('geocode',{address:b.address});usedGeoapify=true;
    const match=(result.candidates||[]).find(c=>bounds(c)&&c.confidence>=0.85&&c.housenumber);
    if(match)autoLocations[b.id]=match;else lookupFailed.add(b.id);
   }catch(err){if(!String(err.message).includes('GEOAPIFY_NOT_CONFIGURED'))throw err}
   if(usedGeoapify)continue;
   const u=new URL('https://geocoder.api.gov.bc.ca/addresses.json');"""
assert a in e;e=e.replace(a,b)
(p/'employees.js').write_text(e)
s=(p/'service-map.js').read_text()
a="const key=b=>String(b.id),clean=s=>String(s||'').trim();"
b=a+"\nasync function geoSearch(address){const {data,error}=await db.functions.invoke('glemi-geoapify',{body:{action:'geocode',address}});if(error||data?.error)throw Error(data?.error||error?.message||'Geoapify unavailable');return data.candidates||[]}"
assert a in s;s=s.replace(a,b)
a="try{const u=new URL('https://geocoder.api.gov.bc.ca/addresses.json');"
b="""try{
 let candidates=null;
 try{candidates=await geoSearch(clean(b.address))}catch(err){if(!String(err.message).includes('GEOAPIFY_NOT_CONFIGURED'))throw err}
 if(candidates){
  const exact=candidates.find(p=>within(p)&&p.confidence>=0.85&&p.housenumber);
  if(!exact){note('Geoapify could not confirm the building. Check the house number and postal code.');return}
  await persist(b,exact,false);map?.setView([exact.lat,exact.lon],17);
  note('Geoapify found: '+exact.formatted_address+'. Verify the pin before travelling.');adjust(b);return;
 }
 const u=new URL('https://geocoder.api.gov.bc.ca/addresses.json');"""
assert a in s;s=s.replace(a,b)
s=s.replace("note('Searching BC address database…')","note('Searching address with Geoapify…')")
(p/'service-map.js').write_text(s)
h=(p/'admin.html').read_text().replace('service-map.js?v=bc-google5','service-map.js?v=geoapify1').replace('employees.js?v=6','employees.js?v=geoapify1')
(p/'admin.html').write_text(h)
