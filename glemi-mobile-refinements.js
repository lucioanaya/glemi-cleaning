document.addEventListener('DOMContentLoaded',function(){const button=document.querySelector('.glemi-cities-toggle');const grid=document.getElementById('glemiCityGrid');if(!button||!grid)return;button.addEventListener('click',function(){const expanded=grid.classList.toggle('is-expanded');button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Show Fewer Cities ↑':'View All Service Areas ↓';});});
(function(){
function syncJourney(){
 const track=document.getElementById('glemiJourneyTrack');if(!track)return;
 const steps=[...track.querySelectorAll('.glemi-journey-step')];
 let index=1;
 const hash=location.hash.toLowerCase();
 if(hash.includes('summary')||hash.includes('confirm'))index=4;
 else if(hash.includes('details'))index=3;
 else if(hash.includes('quote')||hash.includes('cotizar'))index=2;
 steps.forEach((el,i)=>{el.classList.toggle('active',i===index-1);el.classList.toggle('complete',i<index-1);if(i===index-1)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
}
document.addEventListener('DOMContentLoaded',syncJourney);
window.addEventListener('hashchange',syncJourney);
})();