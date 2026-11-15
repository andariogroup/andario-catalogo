# Pruebas

Fecha de la última actualización: 12 de noviembre de 2026.

## Unitarias

`npm test` con Vitest ejecuta `tests/domain.test.ts`.

Cubren permisos, pesos, slugs, WhatsApp, cotizaciones (incluye corte de retención), hero, SEO, contraste, usuarios (validación, last-admin, sello de sesión) y alcance de atributos por categoría.

## Extremo a extremo

`npm run test:e2e` con Playwright (Chromium). Smoke:

- portada `/`
- `/admin/login`
- `robots.txt` niega `/admin`

En CI el job `smoke` hace `build` y luego Playwright, que arranca `next start` en el puerto 3020.

La especificación histórica de 51 flujos sigue como ampliación; no está automatizada entera.

## CI

`.github/workflows/ci.yml`:

1. `lint` + `typecheck` + `vitest`
2. `build` + Playwright smoke

## Build local

`npm run typecheck`, `npm run lint`, `npm test` y `npm run build` deben pasar antes de abrir un PR.
