# Andario Catálogo

Catálogo digital de un solo negocio. El visitante explora, filtra, comparte, arma una lista de interés y pide cotización. El contacto sigue por WhatsApp. No hay pagos, pedidos ni cuentas de comprador.

El producto se llama Andario Catálogo. El nombre comercial que se configura en el administrador es el del negocio, no el del producto.

## Requisitos

- Node.js compatible con Next.js 16.
- PostgreSQL de desarrollo, separado de cualquier otra base Andario.
- Cuenta de Cloudinary para fotos y video.

## Arranque

```bash
npm install
copy .env.example .env
npm run db:setup
npm run dev
```

El servidor local usa el puerto 3020. Sin `DATABASE_URL` la portada explica que falta la base y no muestra productos inventados.

`npm run db:setup` crea las tablas si no existen y, solo si no hay usuarios, el primer administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. No borra filas.

La semilla de demostración es optativa y solo para desarrollo:

```bash
set SEED_DEMO=1
npm run db:seed
```

Se niega si `NODE_ENV` es `production`.

## Comandos

- `npm run dev` — desarrollo en http://localhost:3020
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`

## Documentación

El alcance real, los permisos, el modelo, el despliegue y lo que todavía no está verificado están en `docs/`. El seguimiento está en `docs/IMPLEMENTATION_STATUS.md`.
