# Auditoría de interfaz

Fecha: 10 de noviembre de 2026. No es una nota 10. Falta recorrer los flujos con una base cargada y con fotos reales.

## Lo que está construido

La portada es editorial: hero a pantalla, grilla de piezas, tipografía de título distinta del cuerpo y colores del negocio en variables. El administrador comparte campos, botones y una barra lateral.

La ficha deja elegir variante, cantidad, WhatsApp, lista, compartir, QR y cotización. La lista vive en el navegador y permite pedir las piezas juntas. El aviso se cierra. El carrusel tiene anterior, siguiente, indicadores y flechas del teclado, y se detiene si el sistema pide menos movimiento.

## Hallazgos

- La biblioteca de multimedia no reordena, no reemplaza y no borra. Solo muestra lo subido desde otros formularios.
- El hero móvil usa la misma imagen que el de escritorio.
- El intervalo del carrusel está fijo en 6 segundos. El administrador solo enciende o apaga el autoplay.
- Los atributos no se limitan por categoría.
- El contraste se calcula con los colores guardados, no mientras se edita el campo.
- No se recorrió el flujo en 360, 768 y 1440 px con contenido real. La grilla y los controles de 48 px están en CSS, sin captura de esta sesión sobre un catálogo lleno.

Esos puntos impiden tratar la experiencia como cerrada.
