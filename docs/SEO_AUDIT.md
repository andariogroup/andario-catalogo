# Auditoría SEO

Fecha: 10 de noviembre de 2026. No es una posición en Google. No se corrió Lighthouse ni un validador externo de resultados enriquecidos.

## Revisado en el código y en el build

- Las fichas, categorías y políticas generan title, description y canonical en el servidor.
- Open Graph de producto usa el título editorial y la primera foto si existe.
- `sitemap.ts` y `robots.ts` leen la base en cada solicitud. Sin base, el sitemap solo lista portada, catálogo y sobre nosotros.
- Borradores e inactivos no entran al sitemap. Las políticas entran solo publicadas.
- `/admin`, `/qr` y `/lista` quedan fuera de la indexación cuando el sitio es indexable. Si el negocio apaga la indexación, `robots` no permite `/`.
- Un slug viejo redirige con `permanentRedirect` si está en `slug_redirects`.
- JSON-LD de producto omite Offer cuando el precio es consultar o no hay número. No hay `aggregateRating`.
- La portada emite Organization o LocalBusiness con los datos guardados.
- El HTML de la ficha incluye nombre, precio y descripción antes de la hidratación del selector de variantes.

## No verificado

- Respuesta HTTP real de una ficha inexistente contra un servidor con datos.
- Tarjeta social descargada por un depurador de Open Graph.
- Que el QR de producción use el dominio final: depende de `NEXT_PUBLIC_APP_URL` o de la URL pública guardada.
- Core Web Vitals y el puntaje Lighthouse. No hay medición.
