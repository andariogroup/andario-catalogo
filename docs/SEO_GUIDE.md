# SEO

Rutas públicas:

- `/`
- `/catalogo`
- `/categoria/[slug]`
- `/categoria/[slug]/[hijo]`
- `/producto/[slug]`
- `/sobre-nosotros`
- `/politicas/privacidad`, `terminos`, `envios`, `cambios`

`/lista` y `/admin` no se indexan. El sitemap incluye portada, catálogo, categorías activas, productos activos y políticas publicadas. Excluye borradores, administración y filtros.

Si se cambia el slug de un producto o categoría, `slug_redirects` guarda la ruta anterior y la ficha responde con redirección permanente.

Cada ficha arma title, description, canonical y Open Graph. El JSON-LD de producto incluye Offer solo cuando hay precio publicado y el modo no es consultar. Un servicio se marca como Service. No se inventan reseñas ni valoraciones. La portada incluye Organization o LocalBusiness si hay ciudad.

La URL canónica sale de `public_url` en ajustes, si no de `NEXT_PUBLIC_APP_URL`, si no de `VERCEL_URL`, y en local de `http://localhost:3020`. En producción hay que definir la URL real: si no, el QR y las tarjetas sociales apuntan a localhost.

La paginación conserva los filtros en la URL y no canonicaliza todas las páginas a la primera. La canonical del listado base es `/catalogo`.
