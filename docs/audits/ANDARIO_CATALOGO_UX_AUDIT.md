# Andario Catálogo — Auditoría integral multidisciplinaria (UX / UI / psicología / adaptabilidad comercial)

**Fecha:** 2026-11-14  
**Alcance:** Experiencia pública del cliente únicamente (no admin).  
**Entorno observado:** `http://localhost:3021` (demo Tiendaya).  
**Método:** Inspección de código + documentación oficial + recorrido con navegador real + capturas.  
**Restricción:** Sin modificaciones de código en esta fase.

**Evidencias:** `docs/audits/evidence/`

| Archivo | Contenido |
|---|---|
| `01-home-390.png` | Portada móvil |
| `02-catalogo-390.png` | Catálogo móvil |
| `03-ficha-simple-390.png` | Ficha producto simple |
| `04-ficha-variantes-390.png` | Ficha con variantes |
| `05-carrito-390.png` | Carrito con ítem |
| `06-busqueda-vacia-390.png` | Búsqueda sin resultados |
| `07-home-1440.png` | Portada escritorio |
| `08-producto-404.png` | Producto inexistente / no publicado |

---

## A. Resumen ejecutivo

Andario Catálogo es una **plataforma de catálogo comercial configurable** (un negocio por instalación). El visitante explora, filtra, ve precio/disponibilidad, elige variantes reales, arma **carrito de solicitud** o **lista de interés**, cotiza por formulario y consulta por WhatsApp. **No hay checkout ni pago en línea** (`docs/FUNCTIONAL_SCOPE.md`, `docs/ARCHITECTURE.md`).

La demo **Tiendaya** es un caso de prueba de moda/hogar con 9 productos físicos de precio fijo. **No debe confundirse con el alcance de la plataforma.**

**Diagnóstico:** La base visual y de componentes es sólida (tipografía expresiva parametrizable, ficha/carrito claros en el modelo “solicitud”, variantes con estados alcanzables). El estándar aspiracional **9.5/10 no se alcanza aún**. Los principales frenos son: (1) **ruido cognitivo** por canales paralelos (carrito + cotización + WhatsApp + lista), (2) **portada configurable que puede repetir surtido** y copy genérico, (3) **cobertura de fixtures insuficiente** para evaluar en vivo `ask`, `service`, `sold_out`, `made_to_order`, (4) **terminología y CTAs** aún sesgados a “producto/compra” en algunos estados, (5) **identidad admin** que puede duplicar marca o usar `metaTitle` tipo slug.

**Nota global ponderada (modalidades realmente soportadas por código):** **7.4 / 10**.

---

## B. Arquitectura comercial real

### Fuentes de verdad

- `docs/FUNCTIONAL_SCOPE.md`, `docs/ARCHITECTURE.md`
- `src/lib/db/schema.ts`
- `src/components/admin/productos-form.tsx` (enums admin)
- `src/lib/cart.ts`, `src/lib/ficha-presentation.ts`, `src/lib/catalog-page.ts`
- `src/components/catalog/*` (tienda pública)

### Modelo de datos comercial

| Dimensión | Valores implementados | Evidencia |
|---|---|---|
| Tipo (`kind`) | `physical`, `digital`, `service` | admin select + schema |
| Precio (`price_mode`) | `fixed`, `from`, `ask` | admin + `fichaPriceLabel` |
| Disponibilidad | `available`, `sold_out`, `made_to_order` | admin + labels catálogo/ficha |
| Variantes | Combinaciones reales (atributo→opción), precio/disponibilidad/media por variante | `product_variants`, `variant_*` |
| Atributos | Definibles; `filterable` / `visible` / `required` | `attribute_definitions` |
| Categorías | Jerarquía padre/hijo | `categories.parent_id` |
| Canales | WhatsApp (mensajes configurables), float, formulario cotización, lista interés, carrito solicitud | settings + componentes |
| Identidad | Colores, tipografía (`fraunces`/`newsreader`), radio, logo, showLogo/showName/showSearch, float | `business_branding` / settings |

### Fuera de alcance (no implementado)

Checkout, pasarela, factura, inventario numérico, CRM, reseñas, cupones, usuarios compradores, agenda/reservas, aforo/tiquetes, financiación, contratos inmobiliarios, WhatsApp Cloud API (`FUNCTIONAL_SCOPE.md`).

---

## C. Matriz de capacidades

| Capacidad | Implementada | Parcial | No soportada | Evidencia |
|---|---|---|---|---|
| Producto simple | ✅ | | | Publicación + ficha sin grupos de opción |
| Producto con variantes | ✅ | | | Variantes + `fichaOptionReachable` |
| Producto sin precio público (`ask`) | ✅ | | | `priceMode=ask` → “Consultar precio”; sin $0 forzado en labels |
| Producto cotizable | ✅ | | | Formulario cotización ficha/lista/carrito + admin cotizaciones |
| Producto bajo pedido | ✅ | | | `made_to_order` + label “Bajo pedido” |
| Producto agotado | ✅ | | | `sold_out`; carrito bloqueado (`cartEligible`) |
| Servicio (`kind=service`) | | ✅ | | Modelo + copy parcial (“Ver detalles”, contador “servicios”); **misma UI de cantidad/carrito**; sin agenda |
| Digital (`kind=digital`) | | ✅ | | Label “Digital”; sin entrega digital automática |
| Carrito multi-ítem | ✅ | | | `andario-cart`, cantidades, WA + formulario |
| Consulta individual WhatsApp | ✅ | | | `productAsk` / float / footer |
| Solicitud por formulario | ✅ | | | `createQuoteAction` |
| Lista de interés | ✅ | | | `andario-interes` (no es carrito) |
| Filtros por atributos filtrables | ✅ | | | Facetas solo si `filterable` |
| Imagen por variante | ✅ | | | `variantMedia` / álbum por signature |
| Checkout / pago | | | ✅ | Scope explícito |
| Inventario numérico / stock units | | | ✅ | Solo estados de disponibilidad |
| Agenda / reservas (servicios) | | | ✅ | — |
| Módulo inmobiliario/automotriz | | | ✅ | Publicable como producto/atributos, sin flujos sectoriales |

**Limitación de evidencia en demo Tiendaya:** el catálogo vivo observado (~9 ítems) es casi todo `physical` + `fixed` + `available`. Modalidades `ask`, `service`, `sold_out`, `made_to_order` están en código/admin/seed DEMO, **no evaluadas con fixtures vivos en esta instancia**.

---

## D. Evaluación multidisciplinaria (14 especialistas)

| Especialista | Hallazgo clave | Tipo |
|---|---|---|
| UX / Product Design | Modelo “solicitud ≠ compra” bien enunciado en carrito; ficha aún compite con 3–4 vías de conversión | Defecto demostrado / Hipótesis UX |
| UI senior | Tipografía y radio de marca fuertes; cards y ficha premium en moda; portada puede verse “template” | Preferencia estética + defecto |
| Psicólogo cognitivo | Carga alta: carrito + cotización + WA + lista + float | Defecto demostrado |
| Atención / eye-tracking* | Precio y CTA primario visibles en ficha; en home el hero y anuncio compiten; float WA compite con CTA | Hipótesis UX (*sin estudio real) |
| Psicólogo del consumidor | Demo moda OK; alto valor/servicio necesitan más specs y menos “cantidad/carrito” por defecto | Hipótesis UX |
| Behavioral UX | Variantes disabled/agotado bien; botón “Elige opciones…” reduce error | Correcto |
| CRO | Demasiados CTAs diluyen la acción primaria | Defecto demostrado |
| Arquitectura de información | Categorías + búsqueda + orden OK; home repite surtido (favoritos / news / colección) | Defecto demostrado |
| UX Research | Falta contraste con fixtures no-moda y con usuarios reales | Limitación / validación futura |
| UX Writing | Buen disclaimer carrito; empty search habla de “categoría/filtros” aunque la query sea búsqueda; admin attribute names crudos en UI | Defecto demostrado |
| Accesibilidad WCAG 2.2 AA | Estructura semántica razonable; 404 pobre; posible contraste hero overlay según imagen | Problema probable |
| Design Systems | Tokens de marca coherentes; componentes reutilizables; falta “modo presentación” por `kind`/`priceMode` | Mejorable |
| Experiencia móvil | Header denso (logo+nombre+carrito+menú+search); float puede tapar | Defecto demostrado |
| Rendimiento percibido | Skeleton carrito/lista ayuda; `force-dynamic` mantiene sensación de carga en navegación | Limitación funcional / NFR |

---

## E. Auditoría por componente y página

### E1. Header y navegación

**Observado:** Logo + nombre (si admin `showName`), búsqueda (si `showSearch`), carrito con badge, menú (Explorar catálogo / Carrito / El negocio), float WhatsApp si activo.

| Criterio | Evaluación |
|---|---|
| Identidad | Correcto si admin configura bien; **duplicación logo+nombre** si ambos activos (Tiendaya) |
| Carrito siempre visible | Mejorable: no se oculta cuando el negocio solo cotiza / sin piezas carrito-elegibles |
| Terminología | “Catálogo / Carrito / El negocio” es suficientemente universal |
| Móvil | Denso; search siempre presente en demo |

**Evidencia:** `01-home-390.png`, `07-home-1440.png`.

### E2. Portada

**Observado:** Anuncio, hero, categorías, favoritos, recién llegados, banner promo, colección completa, historia, trust, contacto/mapa.

| Criterio | Evaluación |
|---|---|
| Composición | Hero fuerte; secciones habilitadas pueden **repetir los mismos 9 productos** |
| Copy | Genérico (“Descubre algo que va contigo”) — depende 100% del admin; la plataforma no corrige |
| Servicios / B2B / alto valor | Misma plantilla sirve si el contenido admin es bueno; no hay layout condicional por tipo de negocio |
| Confianza | Bloques dirección/horarios/WhatsApp útiles cuando hay local | 

**Clasificación:** problema de **adaptabilidad de contenido + IA de home**, no de CSS aislado.

### E3. Catálogo

**Observado:** Chips de categoría, conteo, orden, grid de cards, empty state.

| Criterio | Evaluación |
|---|---|
| Catálogo pequeño (9) | Correcto y legible |
| Empty search | “Sin resultados” + chips; copy dice “categoría o filtros” aunque sea `q=` → **defectuoso** |
| Filtros | Facetas por atributos filtrables (correcto arquitectónicamente); en demo Tiendaya poco visibles en la home del listado observado |
| Cards | Nombre + precio + badge disponibilidad; meta `kind` cuando no es físico |

**Evidencia:** `02-catalogo-390.png`, `06-busqueda-vacia-390.png`.

### E4. Categorías / buscador

Breadcrumbs en ficha; categorías en home y catálogo. Buscador header → `/catalogo?q=`. Sin búsqueda semántica (fuera de alcance). Empty state recuperable (`Limpiar`, `Ver catálogo completo`).

### E5. Tarjetas

| Caso | Estado en demo / código |
|---|---|
| Título corto/largo | Demo OK; truncado visual probable en títulos muy largos (no forzado en evidencia) |
| Precio fijo | Correcto |
| Precio `from` / `ask` | Implementado en labels; **no visto en demo viva** |
| Agotado / bajo pedido | Badge en card si aplica; **no visto en demo viva** |
| Sin imagen | Placeholder `.ph` |
| Una sola card | Grid CSS por viewport (no densidad por count) — correcto |

**Universalidad:** La tarjeta es reutilizable. Riesgo: badge “Servicio/Digital” sutil; no hay CTA en card (solo enlace) — adecuado y neutro.

### E6. Detalle (ficha)

**Simple (bolso):** Agregar al carrito + cotización + WA + lista + compartir; disclaimer de precio referencia y “no es pago en línea”.  
**Variantes (camiseta):** Opciones; CTA primario disabled “Elige opciones para agregar”; hint claro.

| Criterio | Evaluación |
|---|---|
| Variantes reales | Correcto (reachability / sold) |
| Cantidad | Siempre visible (`fichaShowQuantity` → true) — **parcialmente inadecuado para servicios** |
| Multi-CTA | Mejorable (competencia) |
| Tags múltiples | Puede diluir (nuevo+destacado+oferta) |
| Specs | Región descripción/características cuando hay datos |

**Evidencia:** `03`, `04`.

### E7. Carrito

Copy excelente: “No es un checkout ni un pago en línea.” Subtotal de referencia; WA primario; formulario contacto colapsado; persistencia localStorage; skeleton de hidratación.

| Criterio | Evaluación |
|---|---|
| Mix precio + `ask` | Código soporta `quoteCount` / notas — **no ejercitado en demo** |
| Elegibilidad | No agrega `sold_out` |
| Flash vacío | Mitigado con `ClientReady` |

**Evidencia:** `05-carrito-390.png`.

### E8. Solicitudes comerciales

WhatsApp con mensaje armado; cotización con consentimiento privacidad; referencia AC-…; estados admin. Visitante entiende “solicitud” en carrito; en ficha el mensaje WA aún puede sonar a interés/consulta (config admin).

### E9. El negocio / footer / políticas

`/sobre-nosotros` condicional a datos; footer omite políticas no publicadas. Demo muestra local físico — correcto para Tiendaya. Negocios 100% remotos dependen de no llenar dirección (omitible).

### E10. Estados excepcionales

| Estado | Observado |
|---|---|
| Producto no publicado | “No está publicado” + Volver al inicio — **mínimo, sin chrome de tienda** (`08`) |
| Búsqueda vacía | Recuperable pero copy impreciso (`06`) |
| Carrito vacío | CTA a catálogo + explicación modelo |
| Variante inválida | Prevención UI (opciones unreachable) |

---

## F. Auditoría psicológica

### Atención

- **Ficha:** precio y CTA concentran atención (bien).
- **Home:** anuncio + hero + float + múltiples grids diluyen.
- **Catálogo:** precio en card es el ancla correcto.

### Carga cognitiva

Alta en ficha por canales paralelos. Media en catálogo. Baja-media en carrito gracias al copy de modelo.

### Confianza

Reforzada por disclaimer de solicitud y políticas. Debilitada por: título documento `trinitarias` vs marca Tiendaya; copy home genérico; 404 sin marca.

### Comportamiento (hipótesis)

1. Descubrir (home/catálogo) → 2. Evaluar ficha → 3. Elegir variante → 4. Agregar → 5. Enviar WA/form.  
Para **alto valor / servicio**, el paso 4 (carrito/cantidad) puede sentirse artificial; la consulta debería ganar jerarquía **por capacidad**, no por sector hardcodeado.

---

## G. Auditoría de adaptabilidad comercial (escenarios)

| Negocio (escenario) | Capacidades necesarias | ¿Código las soporta? | Evaluación diseño (sobre lo soportado) | Limitación |
|---|---|---|---|---|
| Ropa / calzado / accesorios | Variantes talla-color, precio, carrito | Sí | Bueno en demo | Nombres de atributo admin crudos |
| Hogar / muebles | Specs, bajo pedido, medidas | Sí (atributos + `made_to_order`) | Bueno si hay facts | No visto `made_to_order` en vivo |
| Cosmética / tech / repuestos | Specs + filtros | Sí | Correcto | Depende de datos admin |
| Vehículos / inmuebles | Fotos, precio/`ask`, specs, consulta | Publicable; `ask` sí | Parcial: misma ficha/cantidad | Sin visita/financiación (fuera alcance) |
| Servicios profesionales | Descripción, precio/`ask`, contacto | `kind=service` parcial | Mejorable (cantidad/carrito) | Sin agenda |
| B2B cotizable | `ask` + multi-ítem quote | Sí | Carrito/lista aptos | Demo no lo muestra |

---

## H. Matriz transversal de componentes

| Componente | Físico precio | Variantes | Cotizable (`ask`) | Servicio | Alto valor |
|---|---|---|---|---|---|
| Tarjeta | Correcto | Correcto | Mejorable* | Mejorable* | Mejorable* |
| Detalle | Correcto | Correcto | No evaluado en vivo | Mejorable (qty/cart) | Mejorable (jerarquía consulta) |
| Precio | Correcto | Correcto | Correcto en código | Correcto en código | Correcto en código |
| Disponibilidad | Correcto | Correcto | N/A | Parcial | Parcial |
| CTA | Mejorable (multi) | Correcto (gated) | Debe priorizar consulta* | Debe priorizar consulta* | Debe priorizar consulta* |
| Carrito | Correcto | Correcto | Parcial (mix) | Según elegibilidad | Según elegibilidad |
| Solicitud WA/form | Correcto | Correcto | Correcto | Correcto | Correcto |

\*Sin fixture vivo en Tiendaya; evaluación basada en código + hipótesis UX explícita.

---

## I. Identidad parametrizable

**Controles reales:** colores (bg/ink/muted/line/primary/accent/button), `fontPair`, `radius`, logo, `showLogo`/`showName`, `showSearch`, sticky, float WA, anuncio, hero, secciones home.

| Escenario | Resultado esperado | Riesgo |
|---|---|---|
| Marca sobria | Tokens oscuros + Fraunces/Newsreader | Contraste botón/texto si mal configurado |
| Marca expresiva | Acento fuerte | Anuncio + primary pueden pelear |
| Marca minimalista | Fondo claro, menos secciones | Home vacía si admin desactiva bloques |

**No se alteró branding en esta auditoría** (sin cambios). Evidencia de demo plum: `01`, `07`.  
**Hallazgo:** duplicación visual logo+wordmark cuando admin activa ambos; `metaTitle=trinitarias` rompe coherencia de marca en pestaña.

---

## J. Auditoría responsive

| Resolución | Páginas | Hallazgos |
|---|---|---|
| 390 | Home, catálogo, ficha, carrito, empty, 404 | Header denso; float; 404 sin shell |
| 1440 | Home | Nav horizontal “Explorar”; anuncio; hero full |

No se detectaron desbordamientos graves en las vistas capturadas. Pendiente formal: 768 / 1024 / 1600 con fixtures no-moda (limitación de datos).

---

## K. Matriz de hallazgos

| ID | Página | Componente | Modalidades | Especialista | Problema | Evidencia | Impacto visitante | Impacto comercial | Causa probable | Solución sugerida | Pri | Esfuerzo | Riesgo regresión | Aceptación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H01 | Ficha | CTA cluster | Todas | CRO / cognitivo | 3–4 vías de conversión compiten | `03`,`04` | Indecisión | Menos envíos | Diseño multi-canal | 1 primario según capacidades; resto en “otros canales” | P1 | M | Medio | Solo un CTA filled por estado |
| H02 | Home | Secciones | Retail demo | IA | Repetición de productos en favoritos/news/colección | Snapshot home | Fatiga | Scroll sin valor | Secciones enabled + mismos IDs | Deduplicar en render **o** guía admin; no hardcode nicho | P1 | M | Bajo | Ítem no se lista 2+ veces salvo intención |
| H03 | Global | Header marca | Todas | UI / móvil | Logo + nombre duplicados si admin lo pide | `01`,`07` | Ruido | Marca diluida | Respeta admin (correcto) pero UX frágil | Mejorar guía admin / preview; no silenciar params | P2 | S | Bajo | Preview muestra densidad |
| H04 | Global | `<title>` | Todas | UX Writing / confianza | `metaTitle` slug (`trinitarias`) | Document title | Desconfianza | SEO/marca | Admin SEO libre | Validación/preview SEO; respetar valor | P2 | S | Bajo | Title coherente con marca o advertencia admin |
| H05 | Catálogo | Empty search | Todas | UX Writing | Copy habla de categoría/filtros con solo `q` | `06` | Confusión | Abandono | Template único empty | Copy condicional a `q` vs filtros | P1 | S | Bajo | Mensaje menciona búsqueda |
| H06 | 404 producto | Estado | Todas | Accesibilidad / trust | Página mínima sin chrome | `08` | Callejón sin salida | Bounce | `not-found` austero | Mantener ShopFrame + links catálogo/WhatsApp | P1 | S | Bajo | 404 con nav y CTA catálogo |
| H07 | Ficha | Cantidad | Servicio / alto valor | Product / consumer | Cantidad siempre on | Código `fichaShowQuantity` | Modelo raro | Fricción | Flag fijo true | Condicionar por `kind`/capacidad real | P1 | M | Medio | Service sin qty o qty opcional |
| H08 | Header | Carrito | Negocios solo-cotización | Product | Badge carrito siempre | Header | Expectativa de compra | Confusión | Carrito como feature global | Mostrar según settings/capacidades si existen; si no, documentar | P2 | M | Medio | Regla explícita documentada |
| H09 | Ficha | Atributos | Variantes | UX Writing | Labels admin (“Talla de ropa”) | Camiseta | Fricción leve | — | Nombre atributo = admin | Educación admin; no reescribir en storefront | P3 | S | Nulo | — |
| H10 | Global | Float WA | Ficha/carrito | Móvil / CRO | Puede tapar CTA | Observado | Mis-tap | Menos conversión | Float siempre si setting | Respetar setting; opcional “ocultar en rutas de conversión” como **setting admin** | P2 | S | Bajo | Setting o CSS documentado |
| H11 | Fixtures | Cobertura | ask/service/sold_out/mto | Research | No evaluable en vivo Tiendaya | Catálogo 9 ítems | Auditoría incompleta | — | Dataset demo moda | Fixture set multimodal en staging | P0 (proceso) | M | Nulo | Checklist modalidades con URLs |
| H12 | Carrito | Modelo | Todas elegibles | UX Writing | Claridad solicitud | `05` | Confianza | Menos expectativa falsa | Copy reciente | Mantener | — | — | — | — |

---

## L. Calificaciones

### Por dimensión (0–10)

| Dimensión | Nota | Notas |
|---|---|---|
| Diseño visual | 7.8 | Premium en demo; depende de fotos admin |
| Jerarquía | 7.0 | Ficha OK; home y multi-CTA bajan |
| Atención | 6.8 | Competencia home/float |
| Carga cognitiva | 6.5 | Canales paralelos |
| Navegación | 7.7 | Clara y universal |
| Descubrimiento | 7.2 | Search+cats OK; home redundante |
| Tarjetas | 7.6 | Neutras y reutilizables |
| Detalle | 7.5 | Variantes fuertes; multi-CTA |
| Carrito | 8.2 | Mejor módulo de claridad comercial |
| Solicitudes | 7.8 | WA+form sólidos |
| Confianza comercial | 7.4 | Disclaimers buenos; title/404 restan |
| Accesibilidad | 6.9 | Base OK; 404 y contraste hero variables |
| Responsive | 7.5 | 390/1440 OK en demo |
| Identidad parametrizable | 7.3 | Potente; trampas de config |
| Adaptabilidad comercial | 6.8 | Arquitectura sí; presentación condicional incompleta |
| Consistencia entre negocios | 6.5 | Inferida; falta fixtures |
| Reutilización de componentes | 8.0 | Buena base universal |

### Por modalidad soportada

| Modalidad | Nota | Comentario |
|---|---|---|
| A. Simple con precio | 7.8 | Demo fuerte |
| B. Variantes reales | 8.0 | Reachability + gated CTA |
| C. Sin precio (`ask`) | 6.5* | Código OK; sin UI viva |
| D. Bajo pedido | 6.5* | Label OK; sin UI viva |
| E. Agotado | 7.0* | Reglas cart OK; sin UI viva |
| F. Servicio | 6.2* | Kind parcial; qty/cart |
| G. Alto valor | 6.4* | Publicable; sin flujos sectoriales (OK fuera alcance) |

\*Penaliza falta de evidencia viva, no la ausencia de módulos sectoriales.

### Nota global

**7.4 / 10** (ponderación: detalle 15%, adaptabilidad 15%, carrito/solicitudes 15%, cards/catálogo 15%, home/nav 10%, confianza/a11y 10%, identidad 10%, responsive 10%).

**No se declara 9.5** — faltan fixtures multimodales, reducción de competencia de CTAs y pulido de estados/empty/404.

---

## M. Tres iteraciones sugeridas (sin implementar)

### Iteración 1 — Experiencia universal

1. Empty states copy-aware (`q` vs filtros vs categoría).  
2. 404/despublicado dentro del shell de tienda.  
3. Home: prevenir repetición de IDs entre secciones (regla de plataforma o warning admin).  
4. Jerarquía CTA: un primario según estado; secundarios agrupados.  
5. Previews admin de densidad header (logo+nombre) y SEO title.

### Iteración 2 — Adaptabilidad comercial

1. Presentación condicional por `priceMode` / `availability` / `kind` (cantidad, énfasis consulta vs carrito) **sin plantillas por industria**.  
2. Fixtures staging: `ask`, `from`, `sold_out`, `made_to_order`, `service`, `digital`, mix carrito.  
3. Claridad visual de “Consultar precio” en cards.  
4. Regla documentada de visibilidad del icono carrito si se añade setting.

### Iteración 3 — Consistencia y validación

1. Barrido 390/768/1024/1440/1600 con fixtures.  
2. Pase WCAG 2.2 AA (contraste hero, focus, 404).  
3. Pruebas de tarea con 3 perfiles (retail, servicio, B2B ask).  
4. Regresión de variantes/carrito/cotización.

---

## N. Riesgos de regresión

| Cambio sugerido | Riesgo |
|---|---|
| Condicionar cantidad/CTA por `kind` | Romper demos físicas si mal gated |
| Deduplicar home | Admin espera ver mismo producto en 2 bloques |
| Agrupar CTAs | Menos clics WA directos (medir) |
| 404 con shell | Depender de `loadShell` en edge cases |
| Settings nuevos carrito/float | Migración defaults |

---

## O. Validaciones futuras (usuarios reales)

1. Test de primera visita: ¿entienden que no hay pago online?  
2. Comparar tasa de envío WA vs formulario vs carrito.  
3. Tarea variantes: tiempo a combinación válida.  
4. Tarea servicio/`ask`: ¿buscan “comprar” o “consultar”?  
5. Preferencia header: logo solo vs logo+nombre.  
6. Eye-tracking real solo si hay presupuesto; hoy las afirmaciones de atención son **hipótesis**.

---

## P. Conclusión

### ¿Andario Catálogo ofrece una experiencia visual y comercial universal de alta calidad para todos los tipos de negocios y productos que realmente soporta?

**Parcialmente sí en arquitectura; aún no en excelencia de presentación condicional.**  
El modelo categoría → atributo → variante → precio/disponibilidad → solicitud es genuinamente transversal y está bien documentado. La UI actual rinde **muy bien para retail físico con precio** (caso Tiendaya). Para **servicio, ask, agotado y alto valor**, el código existe pero la experiencia pública **no está suficientemente diferenciada ni validada con datos vivos**.

### ¿Qué ajustes específicos permitirían aspirar a 9.5/10 sin crear interfaces por nicho?

1. **Un sistema de presentación condicional** basado solo en capacidades (`kind`, `priceMode`, `availability`, `cartEligible`, presencia de variantes) — no en “moda vs inmobiliaria”.  
2. **Una jerarquía de conversión** (1 primario + secundarios colapsados) coherente en ficha/carrito.  
3. **Home y empty/404** sin ruido ni callejones sin salida.  
4. **Fixture multimodal + pruebas de tarea** para demostrar universalidad más allá de Tiendaya.  
5. **Respeto estricto a parámetros admin** con mejores previews/validaciones (no overrides silenciosos).

Con eso, el techo 9.5 es creíble **dentro del alcance real** (catálogo + solicitud, sin checkout ni módulos sectoriales).

---

## Apéndice — Clasificación de evidencia

- **Defecto demostrado:** H01, H02, H05, H06, H03/H04 (config viva).  
- **Problema probable:** contraste hero, float vs CTA.  
- **Hipótesis UX:** jerarquía ideal para alto valor/servicio.  
- **Limitación funcional / fuera de alcance:** checkout, agenda, financiación, etc.  
- **Preferencia estética:** densidad tipográfica home.

*Fin del informe. Sin cambios de código realizados en esta auditoría.*
