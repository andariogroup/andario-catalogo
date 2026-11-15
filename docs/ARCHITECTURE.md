# Arquitectura

Una instalación, un negocio, varios usuarios internos. No hay multitenant.

## Capas

- `src/app/(tienda)` renderiza el catálogo público en el servidor.
- `src/app/admin` exige sesión. El diseño del menú oculta módulos, y cada acción vuelve a comprobar el permiso.
- `src/actions` valida y escribe. Los archivos `"use server"` solo exportan funciones asíncronas.
- `src/lib/store.ts` lee. `src/lib/db` abre Drizzle sobre Neon serverless.
- `src/proxy.ts` añade cabeceras de seguridad. No autentica: la sesión se lee en el servidor de la página.

## Render

`src/app/layout.tsx` exporta `dynamic = "force-dynamic"`. El catálogo, el administrador, `sitemap.xml` y `robots.txt` se generan en cada solicitud con la base configurada en ese entorno. Así un build sin `DATABASE_URL` no congela una portada vacía.

La plantilla traía `cacheComponents`. Se desactivó porque los metadatos de categoría leen PostgreSQL en `generateMetadata` y Next 16 bloquea esa prerenderización. La caché de escritura sigue siendo `revalidatePath` después de guardar.

## Sesión

Cookie `andario_session`, JWT HS256 con `jose`, 12 horas, HttpOnly, SameSite Lax y Secure en producción. La clave sale de `AUTH_SECRET` (mínimo 32 caracteres). Cada lectura vuelve a consultar `users`, rechaza cuentas inactivas y compara un sello `ph` del hash de clave: si alguien cambia la contraseña, las sesiones anteriores dejan de valer.

## Precios y cotizaciones

Los importes son `numeric(14,0)`, pesos enteros. Una cotización guarda nombre, SKU, variante y precio publicado en el ítem. Cambiar el producto después no reescribe la solicitud. La referencia es `AC-año-XXXXXX`. Los estados son nueva, en gestión, atendida y cerrada.

## Multimedia

La subida se firma en el servidor hacia Cloudinary. El formulario no acepta una URL escrita por el visitante. Imágenes png, jpeg o webp hasta 5 MB. Video mp4 o webm hasta 8 MB, el límite del body de las server actions.

## Lista de interés

Vive en `localStorage` con la clave `andario-interes`. No es un carrito y no crea una cuenta.

## Carrito comercial

Vive en `localStorage` (`andario-cart`, versión 1) aislado por `storeId`. Los precios del navegador son de presentación; el formulario de solicitud envía solo `productId`, `variantId` y `quantity`, y el servidor vuelve a validar producto, variante, disponibilidad y precio.

## Lectura del shell

`loadShell()` está envuelto en `React.cache()` para deduplicar consultas de negocio/branding/settings dentro del mismo request. No se usa caché compartida entre requests mientras el layout raíz mantenga `force-dynamic`.
