# Cotizaciones

El formulario está en la ficha y en `/lista`. Pide nombre y al menos teléfono o correo. El consentimiento es obligatorio y queda en `consent`. Un campo oculto `website` descarta envíos automáticos. Hay límite de intentos.

Al guardar se valida que el producto esté activo y, si viene variante, que pertenezca a ese producto. La cantidad va de 1 a 20. Se crea `AC-año-XXXXXX` y se copian nombre, SKU, variante y precio publicado.

La confirmación es en pantalla. Ofrece seguir por WhatsApp con la referencia. No se envía correo.

En el administrador los estados son Nueva, En gestión, Atendida y Cerrada. La nota interna no se muestra al visitante. El asesor comercial y el administrador pueden gestionarlas. Catálogo y marketing no entran al módulo.

Los datos de contacto no se escriben en `analytics_events`. La lista de interés no se indexa.
