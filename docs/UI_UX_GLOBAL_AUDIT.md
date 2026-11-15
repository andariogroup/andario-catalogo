# Auditoría visual de la tienda pública

Fecha: 10 de noviembre de 2026. Alcance: experiencia pública. El administrador, la base de datos y la lógica comercial no se modificaron.

## Antes

La portada funcionaba, pero se leía como bloques pegados:

- El banner y la historia eran dos columnas de foto y texto, casi el mismo rectángulo blanco.
- Confianza usaba un título muy grande y una tarjeta de WhatsApp que repetía el cierre de contacto.
- Contacto era una tarjeta blanca más, no un cierre.
- El contenedor estaba en 1120 px y los encabezados no compartían una escala.
- Categoría y subcategoría listaban productos como párrafos.
- La ficha apilaba la foto y la compra sin una composición de lectura.

## Después

Se unificó la presentación en `src/app/public.css`, sin componentes nuevos de negocio.

- Contenedor de referencia a 1280 px.
- Encabezados de sección en una escala fluida que llega a 44 px en 1440 px.
- Banner con la foto completa y el texto apoyado sobre ella.
- Historia con el texto primero y la foto del local después.
- Confianza en texto abierto, sin botón de WhatsApp.
- Contacto como banda en el color de tinta, con el mapa y los datos ya guardados.
- Cuadrícula uniforme en catálogo y categoría; en la portada se conserva la primera pieza más alta.
- Ficha en dos columnas desde 900 px.
- Lista de interés con filas separadas y el formulario acotado.

## Evidencia

Revisión en el navegador del proyecto, en `http://localhost:3020`:

- 360, 390, 768, 1024 y 1440 en la portada: sin scroll horizontal. En 1440 el contenedor mide 1280 px, el título de Confianza mide 44 px y la historia queda en dos columnas.
- 430 en la lista de interés: sin scroll horizontal.
- El banner se vio en 390 px: la foto arriba y el texto montado debajo, no dos mitades iguales.
- El contacto se vio en 390 px: banda oscura, dirección, horario, WhatsApp, llamar y el mapa.
- `/catalogo` conserva filtros, orden y el conteo de publicados.
- `/lista` conserva el aviso de lista vacía, el formulario y el botón de cotización desactivado mientras no hay piezas.

No hay una captura de 430 px de la portada. Ese ancho queda entre 390 y 768, donde no apareció desborde.

## Pendiente

- No hay productos publicados, así que destacados, novedades y la ficha no se recorrieron con datos reales.
- El aviso superior y el carrusel no se redibujaron: siguen los parámetros actuales.
- La retención de cotizaciones y el resto de módulos administrativos quedan fuera de esta auditoría.
