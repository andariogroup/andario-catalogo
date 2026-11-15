# Roles

Hay cuatro roles fijos. No se crean roles nuevos ni se edita la matriz desde la interfaz.

| Módulo | Admin | Catálogo | Marketing | Comercial |
|---|---|---|---|---|
| Usuarios | Gestión | Ninguno | Ninguno | Ninguno |
| Marca | Gestión | Ninguno | Ninguno | Ninguno |
| Contenido | Gestión | Ninguno | Escritura | Ninguno |
| Categorías, productos, atributos | Gestión | Escritura | Lectura | Lectura |
| Multimedia | Gestión | Escritura | Escritura | Lectura |
| Cotizaciones | Gestión | Ninguno | Ninguno | Gestión |
| Analítica | Gestión | Lectura limitada | Lectura | Lectura |
| SEO | Gestión | Ninguno | Escritura | Ninguno |

La comprobación está en `src/lib/permissions.ts` y `requirePermission`. Ocultar el menú no autoriza la acción.

El gestor de catálogo ve el dashboard sin cifras ni datos de cotizaciones. Marketing y catálogo no leen solicitudes.

No se puede desactivar ni degradar al último administrador activo. No hay registro público. La clave nueva pide al menos 10 caracteres.
