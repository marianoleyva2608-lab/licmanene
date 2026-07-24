# licmanene

Sitio web de un despacho jurídico (licenciado), con sistema de agendamiento de citas y cobro online.

## Stack

- **Frontend**: HTML/CSS/JS estático puro (sin framework, sin build step). Cada página es un `.html` independiente con su JS embebido.
- **Despliegue**: Docker con `nginx:alpine` (ver [Dockerfile](Dockerfile)) sirviendo los archivos estáticos directo desde `/usr/share/nginx/html`. Se despliega en EasyPanel.
- **Base de datos / auth**: Supabase, instancia propia self-hosted en EasyPanel (`https://licmanene-supabase.vms1bk.easypanel.host`). Se usa para login (`auth.signInWithPassword`), y tablas como `citas`, `checkins`, `lugares`.
- **Backend de citas**: Google Apps Script (Web App) actúa como intermediario para crear eventos en Google Calendar/Meet. La URL del script está hardcodeada en varios HTML (`central.html`, `dashboard.html`, `panel-citas.html`, `mercadopago-*.html`). Fuente del script en [google-apps-script.js](google-apps-script.js) / [google-apps-script-fixed.js](google-apps-script-fixed.js).
- **Pagos**: Mercado Pago (Wallet Brick), integrado en [mercadopago-checkout.html](mercadopago-checkout.html) y [mercadopago-retorno.html](mercadopago-retorno.html). **Se migró desde PayPal** — PayPal quedó completamente reemplazado, no convivir ambas integraciones si se retoma el tema de pagos.

## Páginas principales

- `index.html` — landing pública del despacho.
- `central.html` — login/checkin de clientes vía Supabase.
- `dashboard.html` — panel del abogado: calendario, alta/baja de citas, toggle de modo prueba.
- `panel-citas.html` — vista de citas agendadas.
- `mercadopago-checkout.html` / `mercadopago-retorno.html` — flujo de cobro y retorno post-pago.
- `checkout-dummy.html` — checkout de prueba (no confundir con el flujo real de Mercado Pago).

## Convenciones de commits

Conventional commits (`feat:`, `fix:`, `chore:`), en español, describiendo el qué cambió. Ejemplos del historial:
- `feat(mercadopago): generar el boton de pago automaticamente`
- `fix: forzar redirectMode self en Wallet Brick de Mercado Pago`
- `chore(paypal): rotate live client-id`

## Notas

- No hay `.env` ni gestión de secretos por variables de entorno: las claves/URLs (Supabase, Apps Script) están hardcodeadas directo en los HTML. Tenerlo en cuenta antes de commitear nuevas claves — si son sensibles, avisar en vez de subirlas tal cual.
- No hay tests ni linter configurados.
