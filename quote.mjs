const PRICE = {
  kitchen:{regular:{regular:67.50,deep:180},large:{regular:135,deep:225}},
  bathroom:{regular:{regular:67.50,deep:90},large:{regular:90,deep:135}},
  bedroom:{regular:{regular:22.50,deep:33.75},large:{regular:33.75,deep:45}},
  living:{regular:{regular:33.75,deep:56.25},large:{regular:56.25,deep:78.75}},
  dining:{regular:{regular:22.50,deep:33.75},large:{regular:33.75,deep:45}},
  entry:{regular:{regular:11.25,deep:22.50}}
};
const LABELS={kitchen:'Kitchen',bathroom:'Bathroom',bedroom:'Bedroom',living:'Living Room',dining:'Dining Area',entry:'Entry / Hallway'};
const SIZE={regular:'Regular',large:'Large'};
const ADDON_LABELS={appliances:'Interior of appliances',windows:'Interior windows',walls:'Interior walls',laundry:'Laundry wash & fold'};
function round(n){return Math.round((n+Number.EPSILON)*100)/100}
function calculate(body){const cleaning=body.cleaning==='deep'?'deep':'regular';const rooms=Array.isArray(body.rooms)?body.rooms:[];const addons=Array.isArray(body.addons)?body.addons.filter(x=>ADDON_LABELS[x]):[];let subtotal=0;const breakdown=[];for(const r of rooms){if(!PRICE[r.id])continue;const size=PRICE[r.id][r.size]?r.size:'regular';const qty=Math.max(0,Math.min(20,Number(r.qty)||0));if(!qty)continue;const unit=PRICE[r.id][size][cleaning];const amount=round(unit*qty);subtotal=round(subtotal+amount);breakdown.push({item:`${LABELS[r.id]} · ${SIZE[size]} × ${qty}`,amount})}if(!breakdown.length)throw new Error('Agrega al menos un área.');const addonsAmount=round(subtotal*(addons.length*0.25));const total=round(subtotal+addonsAmount);return {cleaning,breakdown,subtotal,addons,addonsAmount,total}}
async function aiMessage(calc){const key=process.env.OPENAI_API_KEY;if(!key)return `Cotización personalizada para ${calc.cleaning==='deep'?'Deep Cleaning':'Regular Cleaning'} con ${calc.breakdown.length} áreas seleccionadas${calc.addons.length?` y ${calc.addons.length} servicios adicionales`:''}.`;
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6',store:false,instructions:'Eres el asistente de cotizaciones de GLEMI Cleaning & Building Services Ltd. Redacta una explicación breve, profesional y amable en español. Nunca menciones tarifas por hora, reglas internas, fórmulas, porcentajes internos ni cómo se calculó el precio. No cambies el precio proporcionado.',input:`Tipo: ${calc.cleaning}. Total fijo autorizado: $${calc.total.toFixed(2)} USD. Áreas: ${calc.breakdown.map(x=>x.item).join(', ')}. Add-ons: ${calc.addons.map(x=>ADDON_LABELS[x]).join(', ')||'ninguno'}. Devuelve solo 1-2 frases para el cliente.`})});
  if(!response.ok)throw new Error('AI unavailable');const json=await response.json();return json.output_text?.trim()||`Tu cotización personalizada está lista.`}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});try{const calc=calculate(req.body||{});let message;try{message=await aiMessage(calc)}catch{message=`Tu cotización personalizada está lista para ${calc.cleaning==='deep'?'Deep Cleaning':'Regular Cleaning'}.`}
return res.status(200).json({total:calc.total,subtotal:calc.subtotal,addonsAmount:calc.addonsAmount,breakdown:calc.breakdown,message,generatedByAI:Boolean(process.env.OPENAI_API_KEY)});}catch(e){return res.status(400).json({error:e.message||'No se pudo generar la cotización.'})}}
