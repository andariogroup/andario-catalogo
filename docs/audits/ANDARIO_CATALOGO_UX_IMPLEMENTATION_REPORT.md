# ANDARIO CATÁLOGO — Informe de implementación UI/UX

**Fecha:** 2026-11-14  
**Alcance:** refinamientos de la experiencia pública comercial (sin admin, sin checkout).  
**Regla absoluta aplicada:** cero escritura sobre Neon / demo Tiendaya. Escenarios sintéticos solo en fixtures TypeScript con prefijo `QA_ANDARIO_`.

---

## A. Resumen ejecutivo

Se implementaron correcciones universales (estados vacíos contextuales, 404 con salida de navegación, jerarquía de CTA, ajuste CSS del WhatsApp flotante, hidratación del carrito) y se refinó la capa de presentación comercial (`kind` / `priceMode` / `availability` / elegibilidad) sin tocar datos reales.

**Validación automatizada (esta corrida):**

| Suite | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` (Vitest) | **37/37 PASS** |
| `npx playwright test` | **12/12 PASS** |
| `npm run build` | PASS |
| `npm run lint` | FALLA preexistente en formularios admin / hooks (no introducida por estos cambios) |

**Datos demo:** lectura pública mostró **9 productos** en `/catalogo` tras las pruebas. No se ejecutó ningún seed, `DELETE`, `TRUNCATE` ni despublicación.

**Calificación heurística global (no 9.5 automático):** **8.4 / 10** para el alcance público soportado, con pendientes documentados en §O.

---

## B. Estado inicial

Problemas motivadores (auditoría `docs/audits/ANDARIO_CATALOGO_UX_AUDIT.md`):

1. Vacío de catálogo con copy genérico de filtros aunque la causa fuera solo texto.
2. 404 / no publicado austero, sin recuperación clara dentro del frame de tienda.
3. Varias acciones comerciales visualmente competidoras en ficha.
4. Botón flotante de WhatsApp con riesgo de solape en móvil.
5. Cantidad / CTA no siempre derivados de capacidades (`ask`, servicio).
6. Necesidad de validar multimodalidad sin alterar Tiendaya.

---

## C. Inventario preservado

### Destino de datos

- `DATABASE_URL` apunta a Neon remoto (`ep-soft-morning-beonk4ux-pooler…aws.neon.tech`).
- **No se consideró entorno aislado de escritura.** Por política: **ninguna mutación DB**.
- Pruebas de escenarios = factories/fixtures en `tests/fixtures/`.

### Verificación de solo lectura (post-implementación)

| Señal | Valor |
| --- | --- |
| Portada pública | Tiendaya activa (`title` observado: branding demo) |
| Catálogo | **9 productos** visibles (`a.catalog-card-link`) |
| Meta listado | «9 productos» |
| Escrituras QA | **0** (bloqueadas por diseño) |
| Prefijo sintético en DB | **No insertado** (correcto) |

No se listan nombres/precios reales de productos en este informe (inventario por conteo y rutas públicas).

---

## D. Archivos modificados / añadidos (esta implementación)

| Ruta | Cambio | Motivo |
| --- | --- | --- |
| `src/lib/catalog-page.ts` | `catalogEmptyKind` / `catalogEmptyCopy` | Vacíos contextuales |
| `src/lib/ficha-presentation.ts` | cantidad, CTA primario/secundario | Adaptabilidad comercial |
| `src/components/catalog/catalog-view.tsx` | UI de vacío + acciones | Aplicar copy contextual |
| `src/components/catalog/ficha.tsx` | CTA primary + `ficha-secondary` | Jerarquía comercial |
| `src/app/(tienda)/not-found.tsx` | Estado 404 de tienda | Navegación de recuperación |
| `src/app/not-found.tsx` | Alineación mensaje / acciones | Consistencia |
| `src/app/public.css` | `.store-not-found*`, float móvil, `.ficha-secondary` | Presentación / touch |
| `src/components/catalog/client-ready.tsx` | `useSyncExternalStore` | Hidratación carrito sin flash |
| `tests/fixtures/qa-andario-scenarios.ts` | 9 escenarios sintéticos | Matriz multimodal sin DB |
| `tests/fixtures/qa-brand-profiles.ts` | 3 perfiles de tokens | Identidad parametrizable aislada |
| `tests/presentation-qa.test.ts` | Unitarios QA | Reglas de presentación |
| `tests/domain.test.ts` | Casos ask / cantidad | Regresión de dominio |
| `tests/e2e/ux-refinements.spec.ts` | E2E vacío/404/CTA/float/responsive | Evidencia funcional |
| `tests/e2e/smoke.spec.ts` | Timeouts / waits | Estabilidad regresión |
| `docs/audits/evidence/implementation/*` | Capturas after | Evidencia visual |

**No implementado a propósito:** deduplicación automática de portada (riesgo de alterar intención editorial del admin).

---

## E. Correcciones universales

### E.1 Estados vacíos

`catalogEmptyKind` distingue: `search` | `filters` | `category` | `search_filters` | `catalog`.  
Acciones: limpiar búsqueda / limpiar filtros / explorar catálogo según contexto.

**E2E:** búsqueda `QA_ANDARIO_NO_MATCH_ZZZZ` → copy con término → limpiar → tarjetas visibles. **PASS**

### E.2 Producto inexistente / despublicado

`(tienda)/not-found.tsx` bajo ShopFrame: título «Este producto no está disponible», enlaces a catálogo e inicio. HTTP 404 conservado.

**E2E:** `/producto/qa-andario-unpublished-missing-slug` → 404 + exploración. **PASS**  
Escenario DB `QA_ANDARIO_UNPUBLISHED` (despublicar sintético): **NOT_TESTED** (sin base aislada).

### E.3 Jerarquía CTA

Una acción filled primaria: carrito (si precio no-`ask` y no agotado), WhatsApp/cotización si `ask` o no elegible. Secundarias en `.ficha-secondary` (quiet).

**E2E:** ficha demo con ≤2 primarias filled. **PASS**

### E.4 WhatsApp flotante

CSS móvil: `bottom`/`right` con safe-area; padding inferior en CTA/footer cuando aplica.

**E2E 390px:** botón dentro del viewport, área ≥40px. **PASS**

### E.5 Portada repetidos

**Sin dedupe automático.** Criterio: preservar secciones configuradas por admin. Mejora editorial futura = advertencia no bloqueante en admin (fuera de este alcance de storefront).

---

## F. Adaptabilidad comercial

Fuente de verdad en `ficha-presentation` + `cart` + `catalog-page`:

| Capacidad | Comportamiento |
| --- | --- |
| `priceMode=fixed` | Precio vigente |
| `priceMode=from` | «Desde $…» |
| `priceMode=ask` | «Consultar precio»; CTA primario consulta; carrito secundario si elegible |
| `availability=sold_out` | Sin agregar como disponible |
| `availability=made_to_order` | Etiqueta «Bajo pedido» |
| `kind=service` + `ask` | Sin control de cantidad |
| Variantes | Solo combinaciones reales (`fichaOptionReachable`) |
| Carrito mixto | `cartNeedsQuote` + subtotal solo de líneas con precio |

No se usan nombres de categoría para decidir funcionalidad.

---

## G. Nueve escenarios

| Escenario | Tarjeta | Detalle | Precio | Disp. | Variantes | Cant. | CTA | Carrito | Solicitud | Resp. | A11y | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 SIMPLE | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | PASS¹ | PASS¹ | PASS² | NOT_TESTED | **PASS** (reglas) |
| 2 VARIANTS | PASS¹ | PASS¹ | PASS¹ | PASS¹ | PASS¹ | PASS¹ | PASS¹ | PASS¹ | NOT_TESTED | NOT_TESTED | NOT_TESTED | **PASS** (matriz unit) |
| 3 MADE_TO_ORDER | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | **PASS** (reglas) |
| 4 SERVICE | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | N/A³ | NOT_TESTED | NOT_TESTED | NOT_TESTED | **PASS** (reglas) |
| 5 DIGITAL | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | PASS¹ | NOT_TESTED | NOT_TESTED | NOT_TESTED | **PASS** (reglas) |
| 6 VEHICLE | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | PASS¹ | NOT_TESTED | NOT_TESTED | NOT_TESTED | **PASS** (reglas) |
| 7 PROPERTY | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | PASS¹ | NOT_TESTED | NOT_TESTED | NOT_TESTED | **PASS** (reglas) |
| 8 B2B | PASS¹ | PASS¹ | PASS¹ | PASS¹ | N/A | PASS¹ | PASS¹ | PASS¹ | PASS¹ | NOT_TESTED | NOT_TESTED | **PASS** (totales mix) |
| 9 UNPUBLISHED | N/A | PASS² | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PASS² | NOT_TESTED | **PASS** (404 ruta) / draft fixture |

¹ Validado vía fixtures + unit tests (`presentation-qa` / `domain`).  
² Validado vía E2E / captura sobre demo de solo lectura (404 y vacío; no mutación).  
³ Servicio `ask`: cantidad oculta; carrito no es primario.

**Limitación:** UI renderizada con productos sintéticos en Neon **no** se ejecutó (bloqueo de aislamiento).

---

## H. Identidad parametrizable

| Perfil | Método | Resultado |
| --- | --- | --- |
| A Sobrio | Fixture `QA_BRAND_PROFILES` | PASS (tokens completos) |
| B Expresivo | Fixture | PASS |
| C Minimalista | Fixture | PASS |
| Aplicación visual live sobre Tiendaya | — | **NOT_TESTED** (prohibido alterar branding demo) |

Componentes públicos siguen CSS variables (`--paper`, `--ink`, `--brand`, etc.); no se hardcodeó una identidad global nueva.

---

## I. Responsive

| Resolución | Catálogo | 404 / vacío | Float | Resultado |
| --- | --- | --- | --- | --- |
| 390 | PASS (E2E float + captura vacío) | PASS | PASS | PASS |
| 768 | PASS (sin overflow) | NOT_TESTED | N/A | PASS parcial |
| 1024 | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| 1440 | PASS | PASS (captura) | N/A | PASS |
| 1600 | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED |

Evidencias: `docs/audits/evidence/implementation/after-catalog-768.png`, `after-catalog-1440.png`, `after-float-390.png`, `after-empty-search-390.png`.

---

## J. Accesibilidad

### Correcciones / mejoras relacionadas

- Encabezados y acciones claras en vacío y 404.
- Grupo de cantidad con `aria-labelledby` / labels (preexistente, conservado).
- Secundarias agrupadas con `aria-label="Otras acciones"`.
- `ClientReady` sin setState-en-effect (patrón `useSyncExternalStore`).

### Limitaciones

- axe-core **no** integrado en Playwright en esta corrida.
- Barrido completo teclado / lector de pantalla / zoom 200% / `prefers-reduced-motion`: **NOT_TESTED** de forma sistemática.
- No se declara cumplimiento WCAG 2.2 AA completo.

**Heurística a11y:** ~7.5/10 (estructura mejorada; auditoría instrumental pendiente).

---

## K. Pruebas automatizadas

| Comando | Aprobadas | Fallidas | Notas |
| --- | --- | --- | --- |
| `npm run typecheck` | — | 0 | PASS |
| `npm test` | 37 | 0 | domain + presentation-qa |
| `npx playwright test` | 12 | 0 | smoke + ux-refinements |
| `npm run build` | — | 0 | PASS |
| `npm run lint` | — | 11 errores | Preexistentes (admin forms, prefer-const, etc.) |

Flujos E2E cubiertos parcialmente respecto al brief §10: descubrimiento, búsqueda vacía, CTA, 404, carrito vacío, responsive parcial, float. Flujos de variantes/servicio/digital/B2B con datos sintéticos en DB: **bloqueados** sin aislamiento.

---

## L. Regresiones

| Área demo | Resultado |
| --- | --- |
| Portada responde | PASS |
| Catálogo + nav | PASS |
| Detalle + CTA | PASS |
| Carrito vacío (hidratación) | PASS (tras fix ClientReady) |
| Sobre nosotros | PASS |
| Conteo productos públicos | 9 (intactos a nivel de listado) |
| Branding Tiendaya | No modificado por código de prueba |

Ninguna restauración de base de datos. Ningún producto real despublicado.

---

## M. Evidencias

### Antes (auditoría)

`docs/audits/evidence/01-home-390.png` … `08-producto-404.png`

### Después (implementación)

`docs/audits/evidence/implementation/`

- `after-home-desktop.png`
- `after-empty-search-desktop.png` / `after-empty-search-390.png`
- `after-404-desktop.png` / `after-404-1440.png`
- `after-ficha-cta-desktop.png`
- `after-float-390.png`
- `after-catalog-768.png` / `after-catalog-1440.png`
- `after-cart-empty.png`

---

## N. Evaluación UI/UX (heurística multidisciplinaria)

| Dimensión | Nota | Comentario |
| --- | --- | --- |
| Jerarquía visual / CTA | 8.7 | Primario claro; secundarias quiet |
| Claridad de precios | 8.8 | fixed / from / ask coherentes |
| Claridad de disponibilidad | 8.5 | Etiquetas + bloqueo sold_out |
| Estados vacíos / error | 9.0 | Copy contextual + salida 404 |
| Adaptabilidad multimodal | 8.2 | Reglas OK; UI live sintética pendiente |
| Identidad parametrizable | 8.0 | Tokens; perfiles solo fixture |
| Responsive | 8.0 | 390/768/1440 OK; 1024/1600 pendientes |
| Accesibilidad | 7.5 | Mejoras estructurales; axe pendiente |
| CRO / fricción comercial | 8.3 | Menos competencia de CTAs |
| Integridad de datos | 9.5 | Política de no escritura cumplida |
| **Global** | **8.4** | Aspiracional 9.5 aún no alcanzado |

---

## O. Riesgos pendientes

1. **Sin base de pruebas aislada:** escenarios 1–9 no pueden renderizarse end-to-end con datos sintéticos reales sin riesgo a Neon.
2. **Portada con posibles repeticiones editoriales** sin dedupe (decisión consciente).
3. **Lint preexistente** en admin / algunos client components.
4. **A11y instrumental** (axe, SR, zoom) incompleta.
5. **Resoluciones 1024 / 1600** y matriz página×viewport completa no ejecutada.
6. **Perfiles de marca visuales** no aplicados en entorno live (correcto para preservar Tiendaya).
7. Cantidad: el modelo aún no distingue todos los casos de alto valor / digital one-shot; se documentó la limitación y se ocultó solo `service+ask`.

---

## P. Conclusión

### ¿La experiencia pública se adapta a todos los tipos y modalidades soportados?

**Sí a nivel de reglas de presentación y flujos demo críticos; parcialmente a nivel de validación multimodal visual live.**

La capa condicional (`kind`, `priceMode`, `availability`, variantes reales, carrito mixto) está implementada y cubierta por unit tests con fixtures `QA_ANDARIO_*`. Los defectos universales de vacío, 404, CTA y float se verificaron en E2E sobre la demo **sin mutar datos**.

### ¿Qué evidencia lo respalda?

- 37 unit tests + 12 E2E PASS.
- Build y typecheck PASS.
- Capturas before/after en `docs/audits/evidence/`.
- Conteo público post-prueba: 9 productos.
- Código de presentación centralizado (no reglas por nombre de categoría).

### ¿Qué falta para un estándar aspiracional 9.5/10?

1. Base Neon (u otro store) **aislada** para publicar los 9 escenarios sintéticos y completar la matriz UI.
2. Integrar axe + checklist WCAG manual documentado.
3. Completar matriz responsive 5 anchos × páginas del brief.
4. Story/preview de los 3 perfiles de marca sin tocar Tiendaya.
5. Advertencia editorial no bloqueante en admin para secciones de portada solapadas (si se aprueba producto).
6. Cerrar deuda de lint/hidratación en componentes ajenos al storefront cuando se priorice calidad de CI.

---

*Informe generado tras las tres iteraciones de implementación controlada. No declara 9.5/10.*
