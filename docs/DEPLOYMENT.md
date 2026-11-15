# Despliegue

Preparado para Vercel. No se desplegó desde esta reconstrucción.

Variables:

- `DATABASE_URL` de una base nueva. No reutilices la base del piloto anterior ni la de otro producto.
- `AUTH_SECRET` de al menos 32 caracteres.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` solo para el primer `db:setup`.
- `NEXT_PUBLIC_APP_URL` con el https público, sin barra final.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `CRON_SECRET` de al menos 16 caracteres (purga diaria de cotizaciones vencidas).
- `BUSINESS_NAME` opcional en el alta inicial.

En Vercel el comando de build es `npm run build`. Después del primer despliegue, corre `npm run db:setup` contra esa base desde una máquina que tenga las variables, o el equivalente en el entorno. No corras `db:seed` en producción.

`vercel.json` define el cron diario `0 5 * * *` hacia `/api/cron/purge-quotes`. Next publica `sitemap.xml` y `robots.txt`.

Comprobaciones antes de abrir el dominio: login, un producto activo, una ficha con canonical https, un QR que no diga localhost, y una política publicada solo si el texto es el del negocio.
