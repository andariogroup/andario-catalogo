# Seguridad

Fecha: 10 de noviembre de 2026. Revisión del código, no una prueba de intrusión.

## Presente

- Contraseñas con bcrypt, costo 12. El correo inexistente compara contra un hash fijo para no adelantar la respuesta.
- Cookie de sesión HttpOnly, Secure en producción, SameSite Lax.
- Permisos revalidados en cada server action.
- El último administrador activo no se puede apagar ni cambiar de rol; el chequeo va en transacción con bloqueo de filas admin.
- Cambiar la clave invalida sesiones JWT previas (`ph` en el token).
- Consultas por Drizzle, parámetros en el SQL de setup.
- Límite de intentos de login, de cotización, de subida y de cambios en Usuarios.
- Usuarios no carga `password_hash` en el panel; la lista usa columnas seguras.
- Honeypot y consentimiento en la cotización.
- Subida comprobada en el servidor. El secreto de Cloudinary no sale al cliente.
- Cabeceras: nosniff, Referrer-Policy, frame denial, Permissions-Policy, CSP y HSTS en producción.
- Los errores públicos no dependen de imprimir la URL de la base.
- Cotizaciones y usuarios no están en el sitemap.

## Límites

- La CSP permite `script-src 'unsafe-inline'` porque el JSON-LD y Next lo necesitan en esta configuración. En desarrollo también se permite `unsafe-eval`, que React usa para reconstruir stacks. Producción no lo incluye. No es la política más estricta.
- No hay prueba automatizada de que un rol lea una cotización ajena a su permiso. La acción lo impide; no se ejecutó contra la base.
- No hay cifrado de aplicación sobre el teléfono guardado en la cotización. Queda en PostgreSQL y solo lo leen admin y comercial.
- La retención está en `quote_retention_days` (365 por defecto). La purga corre al abrir cotizaciones en admin y cada día vía `/api/cron/purge-quotes` protegida con `CRON_SECRET`.
