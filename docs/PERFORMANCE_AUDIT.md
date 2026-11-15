# Rendimiento

Fecha: 10 de noviembre de 2026.

No hay medición de LCP, INP ni CLS. No se ejecutó Lighthouse. Los objetivos de 2,5 s, 200 ms, 0,1 y los puntajes 95/100 quedan como referencia, no como resultado.

## Decisiones que sí están en el código

- Las páginas públicas importantes renderizan título, precio y enlaces en el servidor.
- Las fuentes se cargan con `next/font`.
- `cacheComponents` se apagó para no prerenderizar metadatos que dependen de PostgreSQL. El costo es que cada visita lee la base.
- Las consultas del dashboard y del listado traen filas a memoria y cuentan ahí. Con mucho tráfico o muchos productos eso va a pesar. No hay índice de analítica más allá de la tabla, ni agregación en SQL.
- El video del hero no se descarga si el visitante pide movimiento reducido: se muestra el poster.
- La imagen de portada y de ficha usa `img` con dimensiones reservadas en la grilla (`aspect-ratio: 4/5`), no el optimizador `next/image`, salvo el aviso de lint que se evitó en el QR generado.

Hasta no medir en el dominio real, el rendimiento no está verificado.
