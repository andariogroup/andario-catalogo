# Estado de implementación

Fecha: 12 de noviembre de 2026. Rama `reconstruccion-v4`.

Estados: Pendiente, En desarrollo, Implementado sin verificar, Verificado, Bloqueado.

| ID | Fase | Módulo | Descripción | Estado | Pruebas |
|---|---|---|---|---|---|
| F0 | 1 | Repo | Auditoría y rama nueva, sin tocar otra base | Verificado | Carpeta documentada en RECONSTRUCTION_AUDIT |
| F1 | 1 | Datos | Esquema SQL y Drizzle | Verificado | `db:setup` corre todos los `.sql` de `database/` |
| F2 | 1 | Auth | Login, cookie, cuatro roles, RBAC; sello `ph` al cambiar clave | Verificado | Matriz + login real en admin |
| F3 | 1 | Admin | Dashboard, negocio, apariencia, usuarios (studio) | Verificado | Usuarios con filtros, guards y toast |
| F4 | 1 | Catálogo | Categorías, productos, ficha, WhatsApp, políticas | Verificado | Operación en admin con base local |
| F5 | 1 | Compartir | URL, copiar, QR png/svg | Implementado sin verificar | Unitarias de URL; QR en dominio real pendiente |
| F6 | 2 | Home | Hero imagen, video, carrusel, aviso, secciones, banner | Verificado | Regla de carrusel en unitaria + admin |
| F7 | 2 | Variantes | Atributos (opc. por categoría), variantes, filtros | Verificado | `category_attributes` cableado; unitarias de alcance |
| F8 | 2 | Interés | Lista local y WhatsApp conjunto | Implementado sin verificar | Flujo de código listo; recorrido E2E completo pendiente |
| F9 | 2 | Cotizaciones | Alta, referencia, estados, notas, permisos | Verificado | Unitarias + admin |
| F10 | 3 | Analítica | Eventos, dashboard, UTM, días | Implementado sin verificar | Dashboard listo; volumen de eventos depende del tráfico |
| F11 | 3 | SEO | Metadatos, sitemap, robots, canonical, JSON-LD, redirects | Verificado | Unitarias + proxy; Lighthouse externo sigue en F14 |
| F12 | 3 | Calidad | Build, tipos, lint, Vitest | Verificado | CI GitHub: lint, typecheck, test |
| F13 | 3 | E2E | Playwright smoke (portada, login, robots) | Verificado | Suite completa de 51 flujos sigue como ampliación |
| F14 | 3 | Medición | Lighthouse, CWV, axe | Pendiente | No ejecutado en esta máquina |
| F15 | 3 | Multimedia | Alt, borrar, reemplazar; reordenar fotos de producto | Verificado | Biblioteca + galería de producto |
| F16 | 3 | Atributos | Limitar atributos a categorías | Verificado | Tabla `category_attributes` + UI + filtro en producto |
| F17 | 3 | Privacidad | Purga automática de cotizaciones | Verificado | `/api/cron/purge-quotes` + cron diario en `vercel.json` |

## Notas

- El menú del admin muestra el **nombre** del usuario; el correo queda en el desplegable.
- `CRON_SECRET` (≥16 caracteres) autoriza la ruta de purga. En Vercel el cron envía `Authorization: Bearer …`.
- F13 queda cerrado a nivel **smoke**; ampliar a 51 flujos es trabajo aparte, no bloquea el resto del panel.
