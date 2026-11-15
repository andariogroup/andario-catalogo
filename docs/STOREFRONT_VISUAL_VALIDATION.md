# Validación visual de la tienda pública

Fecha: 10 de noviembre de 2026. No hubo rediseño ni cambios de datos. Se revisó la portada en el navegador a 390, 768 y 1440 px, el listado `/catalogo` y el mapa del sitio.

No hay productos ni categorías publicados. El mapa público solo incluye la portada, el catálogo, la historia y dos políticas. No se insertaron productos de prueba: eso habría escrito en la base del negocio. Por eso destacados, novedades, la cuadrícula de catálogo y la ficha no se pudieron ver con piezas reales.

## Qué sí responde a la configuración

El nombre, el aviso, el hero, el banner, la historia, el mensaje comercial, la dirección, el horario, el mapa, el teléfono y las redes salen de lo guardado. En el elemento de la tienda los tokens medidos son papel `#ffffff`, tinta `#19232E`, primario `#243D57` y acento `#D85C4A`.

En escritorio el WhatsApp del menú se ve y el flotante se oculta. En 390 px ocurre al revés. Confianza no agrega otro botón.

## Hallazgos

### Alta

1. El fondo de la página no usa el papel configurado. El cuerpo sigue en el crema de fábrica, `rgb(247, 241, 232)`, porque la variable se aplica dentro de la tienda y el fondo está en `body`. El encabezado y la ficha del banner salen blancos sobre ese crema. La marca no pinta el lienzo.

   Corrección: pintar el fondo de la tienda con el papel del negocio, sin cambiar el valor guardado.

2. El banner no equilibra foto y texto. A 1440 px la foto mide 1280 × 460 y el texto cabe en un panel blanco de 512 × 222. En el teléfono la foto baja a 240 px y el texto ocupa 232 px: el bloque de lectura pesa casi tanto como la imagen.

   Corrección: en escritorio, foto y texto en la misma fila y a la misma altura. En el teléfono, foto a 16/10 y texto debajo, a todo el ancho, sin ficha flotante.

3. La historia deja un hueco. A 1440 px la foto del local mide 681 × 520 y el título de la historia, 32 px en una línea. La columna de texto no llena esa altura.

   Corrección: foto a 4/3, recortada a la altura del relato, con el texto a la izquierda y la imagen a la derecha.

4. Confianza no tiene peso. A 1440 y a 768 px el bloque mide 105 px de alto, entre secciones de cientos de píxeles. Se lee como un párrafo suelto.

   Corrección: franja con el título de sección, el mensaje comercial y los tres datos en columnas, sobre un fondo suave del color principal.

5. Contacto y pie no cierran juntos. Los dos usan la tinta `#19232E`, pero entre la banda y el pie hay 72 px de crema. El mapa mide 180 px de alto.

   Corrección: eliminar ese margen y dejar el pie pegado a la banda. Subir el mapa a unos 320 px en escritorio y 240 px en el teléfono.

### Media

6. El título del hero mide 80 px a 1440 px. La foto queda por debajo del tipo. En 390 px baja a 45 px y en 768 px a 49 px, tamaños más comerciales.

   Corrección: tope de 68 px en escritorio.

7. En escritorio hay tres llamadas de WhatsApp a la vez: «Escribir» en el menú, «Escribir por WhatsApp» en el contacto y otra igual en el pie. En el teléfono el flotante sustituye a la del menú, y quedan la del contacto y la del pie.

   Corrección: mantener una persistente y la del contacto como cierre. La del pie puede quedar en el mismo fondo, sin parecer otra campaña.

8. El encabezado móvil mide 198 px antes de verse el hero: nombre, menú y buscador en bloque. Come la primera pantalla.

   Corrección: alinear nombre y menú en una fila y dejar el buscador compacto, sin quitar esas piezas.

### Baja

9. El catálogo dice «0 publicados» y aun así muestra la página 1. El vacío no explica que todavía no hay piezas.

   Corrección: ocultar la paginación cuando no hay resultados y dejar una frase de catálogo vacío. No cambia los filtros.

10. Tarjetas de producto y ficha. El estilo existe, pero no hay una pieza publicada para juzgar foto, nombre, precio ni la compra. No se evalúan aquí.

## Medidas

Sin scroll horizontal en 390, 768 ni 1440.

| Pieza | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| Título del hero | 45 px | 49 px | 80 px |
| Título de sección | 32 px | 32 px | 44 px |
| Foto del banner | 358 × 240 | 721 × 353 | 1280 × 460 |
| Texto del banner | 338 × 232 | 512 × 208 | 512 × 222 |
| Foto de la historia | 358 × 448 | 721 × 520 | 681 × 520 |
| Confianza | 224 px de alto | 105 px | 105 px |
| Mapa | 299 × 180 | 320 × 180 | 296 × 180 |

La separación entre secciones es de 44 px en el teléfono y 86 px en escritorio. El contacto usa un poco menos. El problema no es esa separación: es el hueco dentro de la historia, la delgadez de Confianza y los 72 px entre el contacto y el pie.

## Evidencia

Se vieron el encabezado y el aviso en 390 px: el texto del aviso entra completo y Catálogo lleva la raya corta. También se vio el banner en 390 px: la foto arriba y una ficha blanca con el título encima del borde de la imagen.

La captura de página completa a 1440 px no sirve como prueba: la herramienta repitió el mismo recuadro del hero en una cuadrícula. Las cifras de esa anchura salen de la medición del diseño en vivo, no de esa imagen.

## Siguiente paso

Estas correcciones son de presentación y coinciden con `docs/STOREFRONT_ART_DIRECTION.md`. No se aplican en esta validación. Cuando se aprueben, el cambio vive en el estilo público y, si hace falta una clase, en la portada. Hace falta publicar al menos una categoría y una pieza para poder juzgar tarjetas y ficha.
