# Base de datos

La fuente de verdad son los archivos `database/*.sql` (hoy `001_init.sql` y `002_quote_manager.sql`). Drizzle refleja esas tablas en `src/lib/db/schema.ts`. `npm run db:setup` ejecuta todos los `.sql` en orden, con `CREATE`/`ALTER` idempotentes, y siembra filas estructurales: negocio 1, marca, ajustes, hero, aviso, ocho secciones, cuatro políticas sin publicar y cinco redes vacías.

Cualquier cambio de esquema futuro debe ser un archivo SQL nuevo numerado, no una edición destructiva de `001_init.sql` sobre una base que ya tiene datos.

## Grupos

- Usuarios: `users`.
- Negocio: `business`, `business_branding`, `business_settings`, `business_social_links`.
- Contenido: `media_assets`, `hero_settings`, `hero_slides`, `announcement_bar`, `home_sections`, `promotional_banners`, `content_pages`.
- Catálogo: `categories`, `products`, `product_media`, `product_tags`, `attribute_definitions`, `attribute_options`, `category_attributes`, `product_attribute_values`, `product_variants`, `variant_attribute_values`.
- Cotizaciones: `quote_requests`, `quote_request_items`, `quote_request_notes` (`managed_by` en `002_quote_manager.sql`).
- Analítica: `analytics_events`.
- SEO: `slug_redirects`.
- Operación: `rate_limits`, `audit_events`.

Los atributos pueden ser globales (sin filas en `category_attributes`) o limitados a una o más categorías.

`quote_request_items.product_id` puede quedar nulo si el producto se elimina. El texto del ítem permanece.

## Semilla

`scripts/seed-demo.mjs` inserta cinco piezas marcadas DEMO (ropa, café, vehículo, electrónica y digital), cada una con un atributo de selección y una variante. Solo corre con `SEED_DEMO=1`, fuera de producción, y se detiene si ya hay productos.
