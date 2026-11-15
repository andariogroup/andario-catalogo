# Auditoría de reconstrucción

Fecha: 10 de noviembre de 2026. Rama: `reconstruccion-v4`.

## Estado actual

Antes de esta especificación, el usuario pidió borrar el proyecto. La carpeta `andario_catalogo` quedó vacía y sin repositorio Git. No había código, migraciones, componentes ni variables de entorno que reutilizar.

Esta reconstrucción empieza en un Next.js 16.4 nuevo. No se inspeccionó ni se migró la base de Neon del piloto anterior. No se tocó ningún otro producto Andario.

La base de esta versión es la que indique `DATABASE_URL`. Tiene que ser una base de desarrollo aislada. `npm run db:setup` solo crea tablas que no existan y, si no hay usuarios, crea el primer administrador. No borra datos.

## Componentes reutilizables

Ninguno en el árbol. Las decisiones que sí se conservan, porque siguen siendo válidas para esta especificación, son de criterio y no de archivos:

- Un solo negocio por instalación.
- Precios en pesos enteros, guardados en `numeric`, nunca en coma flotante.
- Imágenes elegidas en el computador y subidas firmadas a Cloudinary. El navegador no escribe la URL.
- WhatsApp por `wa.me`, sin API de WhatsApp.
- Sesión en cookie HttpOnly.

## Componentes incompatibles

El piloto anterior mezclaba la marca del negocio con el nombre del producto, no tenía roles, atributos, variantes, cotizaciones, analítica ni SEO administrativo. No se reconstruye encima de esa estructura.

## Riesgos

- Sin `DATABASE_URL`, `AUTH_SECRET` y Cloudinary el catálogo no persiste ni sube fotos. La aplicación lo dice en pantalla y no inventa un catálogo.
- `db:seed` escribe productos de demostración. No debe apuntar a producción. El script se niega si `NODE_ENV` es `production` o si `SEED_DEMO` no es `1`.
- El objetivo Lighthouse y las 51 pruebas de extremo a extremo de la especificación no se dan por cumplidos hasta que se ejecuten contra una base aislada. El estado real está en `docs/IMPLEMENTATION_STATUS.md`.

## Arquitectura propuesta

Next.js App Router, TypeScript estricto, Tailwind 4 y un sistema de diseño en tokens CSS. PostgreSQL con Drizzle y migraciones SQL versionadas. Cuatro roles fijos, comprobados en el servidor. Catálogo universal por categorías, atributos y variantes. Conversión por WhatsApp, lista de interés y solicitudes de cotización. SEO en la ruta, los metadatos, el sitemap, `robots` y JSON-LD.

## Estrategia

1. Base, usuarios y permisos.
2. Negocio, apariencia, catálogo público y ficha.
3. Hero, atributos, variantes, filtros, lista y cotizaciones.
4. Analítica, redirecciones de slug, pruebas de dominio y documentación honesta.

No hay multiempresa, pagos, pedidos ni CRM.
