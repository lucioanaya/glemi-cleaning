# GLEMI — Cotizador inteligente sin API de pago

Versión lista para Vercel.

## Qué hace
- No muestra una lista pública de precios ni una tarifa por hora.
- El cliente describe las áreas, tamaños y tipo de limpieza.
- El precio aparece únicamente después de pulsar **Obtener cotización**.
- Muestra un desglose por las áreas seleccionadas y el total estimado.
- Los extras seleccionados se incorporan al total después de cotizar.
- No requiere `OPENAI_API_KEY` ni una API externa de pago.

## Archivos
- `index.html`
- `styles.css`
- `app.js`
- `glemi-logo.png`

## Pendiente para una etapa posterior
- Envío real de confirmaciones por WhatsApp.
- Envío real de confirmaciones por correo.
- Base de datos para guardar reservas.
