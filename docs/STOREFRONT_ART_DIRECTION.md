# Dirección de arte de la portada pública

Contemporary Premium Commerce. Propuesta, sin cambios de código.

Fecha: 10 de noviembre de 2026. La portada se midió en el navegador a 1440 px, con la tienda de prueba y sus parámetros actuales. No se codifican sus colores, textos ni fotos: el diseño usa los tokens y los campos que el negocio ya guarda.

Esta etapa no modifica componentes. La implementación queda para cuando se apruebe esta dirección.

## Dirección

Una tienda para un público adulto, de unos 25 a 55 años. Fotografía grande, tipo editorial contenido, mucho aire útil y poco adorno. El lujo está en la proporción, no en efectos.

Se alternan tres fondos, siempre con tokens del negocio:

1. Papel, para el hero, los productos y la historia.
2. Una franja suave, mezcla de papel y color principal, para la confianza.
3. Tinta, para el contacto y el pie, como un solo cierre.

Las tarjetas se reservan a categorías y productos. El banner, la historia, la confianza y el contacto no van dentro de una tarjeta flotante.

## Lo que se midió

En 1440 px, con contenedor de 1280 px:

| Pieza | Medida actual | Lectura |
| --- | --- | --- |
| Título del hero | 80 px | Pasa el techo de 68 px. Compite con la foto. |
| Hero | 1280 × 702 | Protagonista correcto. |
| Foto del banner | 1280 × 460 | Bien de ancha. |
| Texto del banner | panel de 512 × 222, título 34 px | El texto queda como una ficha pequeña sobre la foto. |
| Historia | foto 681 × 520 junto a un título de 32 px | La foto es un retrato alto y el texto no la acompaña. Queda aire vacío. |
| Confianza | bloque de 105 px de alto | Una franja tímida entre dos bloques grandes. |
| Separación entre secciones | 86 px; el contacto, 68 px | Está en rango. El vacío está dentro de las secciones, no entre ellas. |
| Mapa | 296 × 180 | Pequeño para un cierre comercial. |
| Pie | ancho completo, 363 px de alto | El salto de color respecto al contacto lo separa del cierre. |

Categorías, destacados, novedades y la muestra de catálogo no se renderizan: no hay piezas publicadas. Cuando existan, deben usar la tarjeta de producto, no un diseño aparte.

WhatsApp aparece en el menú (escritorio), en el botón flotante (móvil), en el contacto y en el pie. Confianza ya no lo repite. Siguen siendo varias llamadas en la misma página.

## Escala que se propone

Tipografía fluida, con las fuentes que el negocio eligió. En escritorio:

- Hero: 48–68 px. Un solo botón.
- Título de sección: 34–46 px.
- Título de historia o de banner: 32–40 px, nunca el tamaño del hero.
- Título de tarjeta de producto: 20–28 px.
- Texto: 16–18 px.
- Dato auxiliar: 14–16 px.

No se reduce el tipo para que quepa. Si el texto es largo, crece el bloque o pasa a dos líneas.

Espacio entre secciones: 64–96 px. Dentro de una franja, el relleno es el de la propia franja, para que no quede un párrafo suelto en medio del papel.

Contenedor: 1280 px. En escritorio, las composiciones anchas usan una grilla de 12 columnas. Fotos con `object-fit: cover` y una proporción fija. Botón principal de al menos 48 px. Un solo botón primario por zona: el del hero, y más abajo el de contacto. El del menú y el flotante siguen como acceso persistente, uno por tamaño de pantalla, como ya está. El del pie se mantiene, pero sobre la misma tinta del contacto, para que se lea como continuación y no como otra campaña.

## Composiciones

### Banner

Una sola pieza, no una ficha encima de la foto.

Escritorio, 12 columnas: la fotografía ocupa 7 y el texto 5, en la misma fila y con la misma altura, cerca de 520 px. El título del banner usa presencia de sección. El subtítulo, 18 px. El enlace, un botón. Si no hay enlace, no hay botón.

Móvil: la foto a 16/10, a todo el ancho, y el texto debajo, también a todo el ancho. Sin panel flotante.

### El negocio

Distinta del banner: el texto va a la izquierda (5 columnas) y la foto del local a la derecha (7). La foto usa proporción 4/3 y se recorta a la altura del texto, para que un relato corto no deje un retrato vacío al lado. El título de la historia es secundario. El párrafo, 18 px. Un enlace secundario, no un botón primario.

Móvil: foto arriba, en 16/10, y el relato debajo.

### Confianza

Una franja, no una página dentro de la página.

Arriba, el título de sección ya configurado, en 34–46 px. Debajo, el mensaje comercial a 18 px y, si existe, el alcance en 16 px y color secundario. En escritorio, tres datos en columnas iguales, con una línea fina entre ellos: atención personalizada, la ciudad guardada del negocio, e información transparente. No se inventan garantías. No hay botón de WhatsApp.

La franja usa un fondo mezclado con el color principal, a baja intensidad, para separarla del papel sin parecer otra tarjeta.

Móvil: los tres datos se apilan, con la misma línea como separador horizontal.

### Contacto y pie

Un cierre único.

La banda de contacto usa el color de tinta y llega, sin franja de papel, hasta el pie, que ya es de tinta. A la izquierda: la dirección en tipo de sección, ciudad, horario y un solo botón primario de WhatsApp. Llamar queda como acción secundaria. A la derecha: el mapa, de unos 320 px de alto y cerca del 40 % del ancho, con esquinas suaves. «Cómo llegar» sigue bajo el mapa.

Móvil: texto, botón y después el mapa a todo el ancho, con la misma altura de 240 px. El pie continúa en el mismo fondo.

## Wireframe de escritorio

```
HERO · foto a 1280, alto contenido
título 56–68 · subtítulo 18 · un botón

BANNER · 12 columnas, una sola altura
[ foto 7 ][ título 36–40 · texto 18 · botón 5 ]

EL NEGOCIO · inverso al banner
[ relato 5 ][ foto del local 7, alto del texto ]

CONFIANZA · franja suave
título de sección
mensaje comercial
[ dato ] | [ ciudad ] | [ dato ]

CONTACTO + PIE · una sola tinta
[ dirección · horario · WhatsApp ][ mapa ~320 ]
nombre · explorar · escribir · redes
```

## Qué se ajustaría después, y solo eso

Si se aprueba esta dirección, el cambio es de presentación:

- `src/app/public.css`: banner, historia, franja de confianza, banda de contacto, unión con el pie y techo del título del hero.
- `src/app/(tienda)/page.tsx`: solo si hace falta una clase para la franja. Los textos, la imagen, el mapa y el enlace siguen saliendo de lo ya guardado.

No se toca el administrador, la base de datos, el orden de las secciones ni la lógica de WhatsApp. Categorías y productos no cambian de componente: cuando haya datos, usan la tarjeta que ya existe, con el título entre 20 y 28 px.

## Qué no se hace

No se generan fotos. No se agregan formas decorativas. No se achica el texto para disimular un hueco. No se repite el esquema del banner en la historia. No se declara lista la portada solo porque compile: la segunda etapa se revisa en 1440, 768 y 390 antes de cerrarse.
