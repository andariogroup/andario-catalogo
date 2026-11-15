# Reglas de diseño de la tienda pública

Referencia obligatoria para el frontend público de Andario Catálogo. No aplica al administrador.

La tienda debe sentirse como una sola experiencia editorial: moderna, equilibrada y comercial. Los colores, la tipografía y los textos salen de la parametrización del negocio. No se fijan los colores de una tienda de prueba en componentes reutilizables.

## Dirección

Priorizar fotografía, composición y proporción. El visitante tiene que reconocer una tienda, no un panel ni una plantilla genérica.

Correcto: una portada con ritmo, donde cada sección cambia de composición y comparte alineación, tipo y botones.

Incorrecto: todas las secciones dentro de tarjetas blancas iguales, títulos gigantes en cada bloque, o el mismo esquema de dos columnas repetido.

## Armonía

La alineación y la escala son compartidas. La simetría de cada bloque no es obligatoria. Se puede alternar foto y texto, texto y foto, cuadrícula, banda abierta y un cierre de contraste. No se inventa una composición distinta solo por variar.

## Contenedor

Ancho de referencia: 1280 px. Márgenes laterales de `calc(100% - 2rem)` en pantallas menores. El aviso, el hero y el pie pueden ocupar el ancho de la página. El resto vive en el contenedor.

## Espaciado

Entre secciones de la portada: cerca de 72–104 px en escritorio y 40–64 px en móvil, con `clamp`, sin huecos vacíos grandes.

Separar el título de su subtítulo, el texto del botón y las imágenes entre sí con la misma escala. No mezclar paddings arbitrarios en secciones vecinas.

## Tipografía

Usar el par que el negocio eligió en Apariencia (`--font-display` y `--font-body`). No declarar una familia concreta en los componentes públicos.

- Hero: el único encabezado protagonista.
- Secciones: 36–48 px en escritorio, fluido con `clamp` en móvil.
- Títulos secundarios, como la historia: 24–32 px.
- Descripciones: 16–18 px.
- Notas y datos auxiliares: 14–16 px.

No tratar todos los encabezados como si fueran el hero.

## Color

Usar solo los tokens del negocio: `--paper`, `--ink`, `--muted`, `--line`, `--primary`, `--primary-ink`, `--accent` y `--radius`.

Un cierre comercial puede invertir papel y tinta. El botón sobre ese fondo debe seguir leyéndose.

## Botones

Una altura mínima de 48 px, radio de píldora, el mismo padding y el mismo foco visible. Primario para la acción principal. Secundario (borde, sin relleno) para la acción de apoyo. No mezclar estilos de botón distintos en la misma sección.

## Imágenes

Proporción estable y `object-fit: cover`. No deformar. No generar fotografías nuevas: usar las que el negocio ya cargó.

## Tarjetas de producto

La misma tarjeta en destacados, novedades, catálogo, categoría y relacionados: foto 4/5, nombre, precio. En la portada, la primera pieza puede ocupar más alto. En el listado, la cuadrícula es uniforme.

## Secciones de la portada

- Banner: la imagen manda y el texto se apoya encima, no como dos rectángulos iguales.
- El negocio: el texto va primero y la foto del local después. No copiar el banner.
- Confianza: texto y datos reales, sin tarjeta y sin un segundo botón de WhatsApp. El cierre de contacto ya escribe.
- Contacto: banda contrastada con dirección, horario, WhatsApp, teléfono y el mapa ya configurado.

## Responsive

Revisar 360, 390, 430, 768, 1024 y 1440. Sin scroll horizontal, sin títulos que se salgan, sin botones fuera de pantalla y sin imágenes deformadas.

## Accesibilidad

El foco visible se conserva. El movimiento decorativo se apaga con `prefers-reduced-motion`. Los encabezados siguen un orden real. No se esconde el texto del título para lograr un efecto visual.

## Qué no cambia con estas reglas

Autenticación, roles, administrador, base de datos, cotizaciones, disponibilidad, WhatsApp, analítica y SEO se mantienen. Un ajuste de presentación no abre un módulo nuevo.
