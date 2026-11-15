# Refinamiento del encabezado y del pie

Fecha: 10 de noviembre de 2026. Solo se tocó el encabezado público, el pie público y los estilos necesarios. No se cambió el administrador, la autenticación, los roles ni la base de datos.

## Problemas

El logo principal se pintaba a 36 × 36 px, debajo del nombre. El archivo real mide 2172 × 724 y es horizontal. Además trae margen transparente: unos 182 px a la izquierda, 176 px a la derecha, 147 px arriba y 140 px abajo. Con ese margen, el dibujo ocupaba cerca del 60 % de la altura del archivo.

El encabezado era una fila que se partía. En el teléfono el nombre, los tres enlaces y el buscador se apilaban. El buscador no tenía icono. En escritorio el logo, el menú y WhatsApp no formaban tres zonas claras.

El pie no ofrecía una entrada al administrador.

## Componentes

- `src/components/catalog/tienda.tsx`: composición del encabezado y enlace del pie.
- `src/components/catalog/shop-nav.tsx`: botón Menú, panel y estado activo. Es el único componente nuevo, y solo abre enlaces que ya existían.
- `src/app/public.css`: medidas del logo, rejilla del encabezado, buscador, WhatsApp del menú y el enlace discreto.
- `src/app/nav.css`: la raya de Catálogo se queda quieta si el sistema pide menos movimiento.

## Logo

Se sigue usando el logo principal guardado. No se reemplazó el archivo.

Si la URL es de Cloudinary, la página pide la entrega con `e_trim`. Eso recorta el margen transparente en la respuesta, sin borrar el original. Después del recorte el archivo mide 1814 × 437.

El logo usa `object-fit: contain`. En escritorio la caja mide 52 px de alto y como máximo 190 px de ancho. En el teléfono, 40 px de alto y como máximo 148 px de ancho. En la tienda publicada se midió 190 × 52 en 1440 px y 148 × 40 en 390 px.

Mostrar logo y Mostrar nombre siguen siendo las opciones de Apariencia:

- Las dos activas: logo y nombre en la misma fila. El nombre baja a 1.15 rem para no tapar el logo.
- Solo logo: se ve el archivo y el nombre del negocio queda en el texto alternativo.
- Solo nombre, o ninguna de las dos: se usa la tipografía de marca. Si no hay logo ni nombre, sigue apareciendo «Catálogo».

En Tiendaya las dos opciones están activas y el PNG ya contiene la palabra Tiendaya. No se ocultó el nombre a propósito: el sistema no lee el texto de la imagen. Para quitar la repetición hay que desactivar Mostrar nombre en Apariencia.

## Encabezado

Escritorio, desde 900 px: tres columnas. Logo y nombre a la izquierda, Catálogo, Interés y El negocio al centro, buscador y WhatsApp a la derecha. La altura medida en 1440 y 1024 px es 88 px. El botón Menú no se muestra.

El buscador conserva `action="/catalogo"` y el campo `q`. Se le añadió un icono, 44 px de alto, radio de píldora y foco con el color primario. Una búsqueda de prueba llegó a `/catalogo?q=prueba`.

WhatsApp del encabezado conserva el enlace, el número y la condición de visibilidad. En 1440 px el botón mide 44 px de alto y no lleva sombra. Si el flotante también está activo, en pantallas menores de 900 px sigue oculto el del menú y visible el flotante.

Por debajo de 900 px la primera fila es logo o nombre y el botón Menú. La segunda es el buscador. El menú cerrado no muestra los enlaces. Al abrirlo aparecen Catálogo, Interés y El negocio, el foco pasa al primer enlace y Escape cierra. En 390 px el encabezado cerrado mide 113 px. No hubo scroll horizontal en 360, 390, 430, 768, 1024 ni 1440.

El enlace de la página actual lleva `aria-current="page"`. En `/catalogo` se comprobó sobre Catálogo. El encabezado sticky sigue dependiendo de la opción ya guardada.

## Administrar tienda

El enlace está en la franja inferior del pie, junto a la firma y a «Catálogo por andariogroup». Texto de 12.8 px, color al 58 % del papel, sin botón ni subrayado, con un candado de `lucide-react`, que ya era dependencia del proyecto.

La ruta reutilizada es `/admin`. No hay otro login.

- Sin cookie, el layout del panel ejecuta `requireUser()` y la respuesta lleva la redirección existente a `/admin/login`.
- El navegador de esta revisión ya tenía sesión. Abrir `/admin` mostró el dashboard actual, no un acceso nuevo.
- Los permisos por rol no se modificaron. El panel sigue filtrando el menú con `allows()` y las páginas siguen usando `requirePermission()`, que envía a `/admin/sin-acceso` cuando el rol no alcanza. No se crearon usuarios para repetir esa prueba.

El enlace es visible para cualquier visitante. La sesión sigue siendo obligatoria en el servidor.

## Pruebas

| Comprobación | Resultado |
| --- | --- |
| TypeScript | `tsc --noEmit` salió en 0 |
| Pruebas | 8 pruebas de `tests/domain.test.ts` pasaron |
| Build | `next build` compiló |
| Lint | `shop-nav.tsx` y `tienda.tsx` quedaron limpios. El lint completo sigue con 5 errores previos en formularios del administrador (`setState` dentro de efectos). No se tocaron. |
| 1440 y 1024 | Encabezado de 88 px, logo 190 × 52, menú centrado, buscador y WhatsApp a la derecha, sin solapes |
| 768, 430, 390 y 360 | Menú en botón, buscador en la segunda fila, encabezado de 113 px, sin scroll horizontal |
| Menú móvil | Abre Catálogo, Interés y El negocio y mueve el foco |
| WhatsApp | Mismo enlace `wa.me` en menú, contacto, pie y flotante |
| Administrar tienda | Visible en el pie. Sin sesión redirige a `/admin/login`. Con la sesión ya abierta entra al dashboard |

## Pendiente

Desactivar Mostrar nombre en Apariencia si no se quiere la palabra Tiendaya repetida al lado del logo. Esa opción no se cambió desde aquí.

No se probaron los cuatro roles con usuarios distintos. La regla de acceso del servidor quedó como estaba.

Las tarjetas de producto y la ficha siguen sin revisión visual: no hay productos publicados.
