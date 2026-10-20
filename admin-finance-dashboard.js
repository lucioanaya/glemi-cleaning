(()=>{
const cfg=window.GLEMI_SUPABASE;if(!cfg||!window.supabase)return;
const $=id=>document.getElementById(id),root=$('dashboardFinance');if(!root)return;
const db=window.supabase.createClient(cfg.url,cfg.key);
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n||0);
let loading=false;
function periodStart(){const p=$('dashboardFinancePeriod').value;if(p==='all')return null;const now=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>now.find(x=>x.type===t)?.value;return p==='year'?get('year')+'-01-01':get('year')+'-'+get('month')+'-01'}
function reset(){['dashboardFinanceExpenses','dashboardFinancePayroll','dashboardFinanceTotal','dashboardFinanceGST','dashboardFinancePST','dashboardFinanceSavings'].forEach(id=>$(id).textContent='—');$('dashboardFinanceReceipts').textContent='—';$('dashboardFinanceReview').textContent='—'}
async function load(){if(loading)return;loading=true;$('dashboardFinanceStatus').textContent='Updating financial summary…';
try{const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Sign in as an authorized administrator.');const {data:profile,error:pe}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();if(pe)throw pe;if(!profile?.active||!['owner','admin'].includes(profile.role))throw Error('Staff authorization required.');
const start=periodStart();let ex=db.from('tax_expenses').select('subtotal,gst,pst,other_tax,receipt_path,deductible_status,estimated_income_tax_savings,expense_date').order('expense_date',{ascending:false}).limit(10000),pay=db.from('tax_cleaning_payments').select('amount,payment_date').order('payment_date',{ascending:false}).limit(10000);if(start){ex=ex.gte('expense_date',start);pay=pay.gte('payment_date',start)}
const [a,b]=await Promise.all([ex,pay]);if(a.error)throw a.error;if(b.error)throw b.error;
const expenses=a.data||[],payments=b.data||[],sum=(arr,key)=>arr.reduce((n,x)=>n+(Number(x[key])||0),0);
const gst=sum(expenses,'gst'),pst=sum(expenses,'pst'),purchases=sum(expenses,'subtotal')+gst+pst+sum(expenses,'other_tax'),payroll=sum(payments,'amount');
$('dashboardFinanceExpenses').textContent=money(purchases);$('dashboardFinancePayroll').textContent=money(payroll);$('dashboardFinanceTotal').textContent=money(purchases+payroll);$('dashboardFinanceGST').textContent=money(gst);$('dashboardFinancePST').textContent=money(pst);$('dashboardFinanceSavings').textContent=money(sum(expenses,'estimated_income_tax_savings'));$('dashboardFinanceReceipts').textContent=expenses.filter(e=>!!e.receipt_path).length;$('dashboardFinanceReview').textContent=expenses.filter(e=>e.deductible_status==='review').length;
$('dashboardFinanceStatus').textContent=(expenses.length>=10000||payments.length>=10000?'Displaying first 10,000 records per category. ':'')+'Estimated figures; accountant verification required. Refreshed '+new Date().toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})+'.';
}catch(err){reset();$('dashboardFinanceStatus').textContent='Unable to load finance summary: '+(err.message||String(err))}finally{loading=false}}
$('dashboardFinancePeriod').addEventListener('change',load);$('dashboardFinanceRefresh').addEventListener('click',load);
$('dashboardFinanceOpen').addEventListener('click',()=>{const nav=document.querySelector('[data-view="taxes"]');if(nav){nav.click();setTimeout(()=>{document.querySelector('#taxes [data-tax-tab="records"]')?.click()},80)}});
document.querySelectorAll('[data-view="dashboard"],[data-go="dashboard"]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,150)));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('dashboard')?.classList.contains('hidden'))load()});
setTimeout(load,1000);
})();