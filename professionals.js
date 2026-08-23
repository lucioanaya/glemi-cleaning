(() => {
  const form=document.getElementById('professionalQuoteForm');
  const toast=document.getElementById('toast');
  if(!form)return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const data=new FormData(form);
    const subject=encodeURIComponent(`GLEMI Professional Quote Request - ${data.get('company')||data.get('name')}`);
    const body=encodeURIComponent(
`Name: ${data.get('name')}
Company: ${data.get('company')}
Email: ${data.get('email')}
Phone: ${data.get('phone')}
Client Type: ${data.get('clientType')}
Service: ${data.get('service')}
Address: ${data.get('address')}
Approx. Size: ${data.get('size')}
Target Date: ${data.get('date')}

Project Details:
${data.get('details')}`
    );
    if(toast){toast.textContent='Opening your email to send the quote request…';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
    window.location.href=`mailto:baltazaranaya@outlook.com?subject=${subject}&body=${body}`;
  });
})();