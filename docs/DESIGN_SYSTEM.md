# Sistema visual

Los colores del negocio viven en variables CSS: `--paper`, `--ink`, `--muted`, `--line`, `--primary`, `--primary-ink` y `--accent`. `ShopFrame` las pinta desde `business_branding`. Cambiar la apariencia no exige editar componentes.

La tipografía es Fraunces con Outfit, o Newsreader con Source Sans 3. El par se elige en Apariencia y el `html` recibe `data-font`.

Escala usada en la portada: display en el hero, H1 y H2 con clamp, cuerpo en la fuente de texto, precio en la fuente de títulos. El radio llega desde el administrador, entre 0 y 28.

El administrador usa una barra lateral verde oscuro (`.admin`, `.side`) y los mismos campos, botones y tablas.

El movimiento del carrusel y del video se apaga con `prefers-reduced-motion`. El CSS global también anula animaciones en ese caso. El aviso se puede cerrar en la sesión.

Breakpoints de la grilla: una columna en móvil y tres desde 1024 px. Los controles táctiles usan 48 px de alto mínimo.

No hay una medición de contraste en el navegador del visitante. El administrador muestra el contraste de los colores ya guardados y avisa del umbral 4.5.
