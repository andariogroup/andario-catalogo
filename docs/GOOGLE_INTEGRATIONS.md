# Integraciones de Google y privacidad

Módulo nativo del administrador de Andario Catálogo para TRINITARIAS.

## Arquitectura

- Menú admin: **Google** (`/admin/integraciones/google`) y **Privacidad y cookies** (`/admin/integraciones/privacidad`).
- Permiso: módulo `integrations` (admin `manage`, marketing `write`/`read`).
- Persistencia: tablas `google_integration_settings` y `privacy_consent_settings` (migración `database/003_google_integrations.sql`).
- Tienda pública: `ConsentProvider` + aviso + `GtmLoader` + adaptador `src/lib/analytics.ts` → `dataLayer`.
- SEO existente (metadata, sitemap, robots, OG, JSON-LD) no se reconstruye.

## Configuración administrativa

1. Entrar al admin autenticado.
2. **Google**
   - Revisar dominio/sitemap derivados de la URL pública (SEO).
   - Seguir instrucciones DNS de Search Console (el TXT lo entrega Google).
   - Usar **Comprobar sitemap** (consulta solo el origen configurado; no es aceptación de Google).
   - Guardar `G-…`, opcional ID numérico, `GTM-…`, flags de medición y eventos comerciales.
3. **Privacidad y cookies**
   - Activar aviso, textos, versión de política, vigencia y ruta de política.
4. Publicar en GTM el contenedor con la Google tag de GA4 y los eventos del `dataLayer`. Guardar el ID en admin **no** publica GTM.

## Consent Mode (básico)

- Por defecto: analítica denegada.
- **Aviso automático** (`notice_enabled`): se muestra en primera visita / consentimiento caducado / cambio de versión de política. **No** depende de que GTM o la medición estén activos.
- GTM **sí** depende de: producción (`VERCEL_ENV=production`) + medición habilitada + ID GTM + consentimiento analítico.
- GTM **no** se carga antes del consentimiento.
- Aceptar → se guarda preferencia local + se permite GTM cuando la medición está configurada en producción.
- Rechazar / retirar → no hay nuevas emisiones; si GTM ya estaba cargado se recarga la página.
- Preview (`VERCEL_ENV=preview`) y desarrollo **no** miden en Google real.

## Eventos (`dataLayer`)

| Evento | Disparador |
|---|---|
| `page_view` | Tras consentimiento + navegación |
| `view_item_list` | Disponible vía adaptador (listados) |
| `select_item` | Clic en tarjeta de producto |
| `view_item` | Apertura de ficha |
| `add_to_cart` / `remove_from_cart` / `view_cart` | Carrito |
| `contact_whatsapp` | Enlaces WhatsApp instrumentados |
| `purchase` | Contrato listo; **desactivado** hasta confirmación comercial real |

Moneda: COP. Sin PII (teléfono, mensaje, email, nombre de comprador).

## Activación externa pendiente

1. Aplicar migración `003` en la base (no producción desde este flujo sin autorización).
2. Verificar dominio en Search Console + enviar sitemap.
3. Crear GA4 + GTM y publicar contenedor.
4. Activar medición en admin solo en producción.
5. Validar Tag Assistant / DebugView y aviso de cookies en móvil.

## CSP

`src/proxy.ts` permite scripts de `googletagmanager.com` y `google-analytics.com`. La carga sigue condicionada a consentimiento + producción.
