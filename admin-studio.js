(()=>{
const paths={
dashboard:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
appointments:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3M8 18h6"/>',
history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
inventory:'<path d="m3 7 9-4 9 4v10l-9 4-9-4Z M3 7l9 5 9-5M12 12v9"/>',
taxes:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z M8 8h8M8 12h8M8 16h5"/>',
complaints:'<path d="M4 5h16v12H9l-5 4Z M8 9h8M8 13h5"/>',
schedule:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M14 14h3"/>',
'service-map':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15M15 6v15"/><circle cx="15" cy="11" r="2"/>',
pricing:'<path d="M3 6h12l6 6-9 9-9-9Z"/><circle cx="9" cy="10" r="1"/>',
content:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M7 14h5M7 17h9"/>',
users:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
employees:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a6 6 0 0 1 4 6"/>',
promotions:'<rect x="3" y="10" width="18" height="11" rx="2"/><path d="M2 7h20v4H2zM12 7v14M12 7c-5 0-7-2-5-4s5 1 5 4Zm0 0c5 0 7-2 5-4s-5 1-5 4Z"/>',
'rewards-visits':'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>'
};
const svg=(path,view='0 0 24 24')=>'<svg viewBox="'+view+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
const labels={
appointments:['BOOKING STUDIO','Every appointment, beautifully coordinated.'],
history:['SERVICE JOURNAL','A clear record of every completed visit.'],
inventory:['SUPPLY STUDIO','Everything your cleaning team needs.'],
taxes:['FINANCE STUDIO','Track expenses, receipts and estimates.'],
complaints:['CUSTOMER CARE','Thoughtful service from start to finish.'],
schedule:['TEAM CALENDAR','Make every cleaning day count.'],
'service-map':['SERVICE COVERAGE','Your team, connected across Metro Vancouver.'],
pricing:['SERVICE VALUE','Thoughtful pricing for exceptional care.'],
content:['WEB EXPERIENCE','Your digital storefront, beautifully managed.'],
users:['ACCESS STUDIO','The right access for every team member.'],
employees:['PEOPLE & CULTURE','The people behind every sparkling space.'],
promotions:['CAMPAIGN STUDIO','Little moments that make customers smile.'],
'rewards-visits':['LOYALTY STUDIO','Celebrate every returning customer.']
};
function decorate(){
document.querySelectorAll('#appFriw #sideNav .nav-btn[data-view]').forEach(btn=>{if(btn.querySelector('.studio-nav-icon'))return;const key=btn.dataset.view;const icon=document.createElement('span');icon.className='studio-nav-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=svg(paths[key]||paths.dashboard);btn.prepend(icon);btn.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace(/^[\s📚📦🧾🎁✓]+/u,'')})});
for(const [id,copy] of Object.entries(labels)){const section=document.getElementById(id);if(!section||section.querySelector('.studio-illustration'))continue;const banner=document.createElement('div');banner.className='studio-illustration';banner.innerHTML='<div class="studio-illustration-copy"><small>GLEMI · '+copy[0]+'</small><strong>'+copy[1]+'</strong><p>Organized with care. Designed for your team.</p></div><div class="studio-illustration-art" aria-hidden="true">'+svg(paths[id]||paths.dashboard)+'</div>';section.prepend(banner)}
document.querySelectorAll('#appFriw .card-head h3').forEach(h=>{if(h.querySelector('.studio-section-icon'))return;const section=h.closest('.panel-view');const key=section?.id||'dashboard';const icon=document.createElement('span');icon.className='studio-section-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=svg(paths[key]||paths.dashboard);h.prepend(icon)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate);else decorate();
})();