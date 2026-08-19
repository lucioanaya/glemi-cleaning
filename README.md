# GLEMI — Cotizador con IA

Esta versión oculta los precios antes de que el cliente complete la configuración del servicio. El cliente selecciona las áreas, tamaños, tipo de limpieza y add-ons, y luego pulsa **Obtener cotización con IA**.

## Cómo funciona
- El navegador NO contiene la tabla de precios.
- `/api/quote.mjs` calcula el precio en el servidor.
- Si `OPENAI_API_KEY` está configurada, OpenAI redacta la explicación personalizada de la cotización.
- La respuesta muestra total y desglose solamente después de pedir la cotización.
- Nunca se muestra una tarifa por hora en la página pública.

## Configuración en Vercel
1. Sube todos los archivos manteniendo la carpeta `api`.
2. En Vercel: **Project > Settings > Environment Variables**.
3. Agrega `OPENAI_API_KEY` con tu API key de OpenAI para Production, Preview y Development según necesites.
4. Opcional: agrega `OPENAI_MODEL` si quieres elegir otro modelo. Si no, usa `gpt-5.6`.
5. Haz un nuevo Deploy después de agregar o cambiar variables.

## WhatsApp y correo
El formulario ya acepta teléfono/WhatsApp o correo. El envío automático de confirmaciones requiere conectar un proveedor de WhatsApp Business y un proveedor de correo; no se incluyen credenciales en este ZIP.
