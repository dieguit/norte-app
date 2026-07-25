# Gastos post-cierre en archivo y cuotas mes a mes

## Objetivo

Completar la Capa 2 de la posición real: después del último cierre, registrar los gastos vigentes de cada tarjeta en las rutas de archivo y cuotas mes a mes.

## Alcance

Cada tarjeta declarada conserva su paso actual y muestra una sección común de gastos post-cierre:

- Monto aproximado, opcional.
- Indicación de si alguna compra fue en cuotas.
- Cantidad de cuotas, solo si la respuesta anterior es "Sí".
- Captura opcional de los movimientos desde el cierre.

El campo vacío significa que no se informó el dato. No equivale a $0 y no se agrega una opción explícita para declarar cero.

## Visibilidad

La sección aparece en dos caminos de cuotas:

- Subir foto o archivo.
- Copiar el renglón mes a mes.

La ruta "No lo tengo a mano, que Norte me lo pida después por WhatsApp" conserva su comportamiento actual: no muestra datos de post-cierre.

En la ruta de archivo, se revela solo tras una carga exitosa del resumen. Si la carga falla, la sección queda oculta hasta que exista un archivo válido.

En la ruta mes a mes, se muestra al seleccionar el camino.

## Datos y validación

Se reutilizan los campos ya persistidos por tarjeta:

- `t{n}_postcierre`
- `t{n}_postcierre_cuotas`
- `t{n}_postcierre_cuotas_cantidad`
- `t{n}_postcierre_upload`

No hay migración ni nuevas columnas. Ningún campo post-cierre bloquea el avance del formulario. La cantidad de cuotas solo se muestra cuando se eligió "Sí"; si se oculta por cambiar esa respuesta o la ruta, se limpia junto con las demás respuestas inactivas.

## Implementación

En `apps/web/src/onboarding/definition.ts`, extraer la condición de visibilidad común de post-cierre de la condición exclusiva del camino manual. La condición especial del upload requiere además que `t{n}_upload_url` tenga un valor válido. El resto del formulario y el guardado continúan usando el filtrado existente de respuestas activas.

## Pruebas

Actualizar pruebas de definición e interfaz para cubrir:

- Post-cierre visible en las rutas de archivo y cuotas mes a mes, y ausente en WhatsApp.
- Post-cierre oculto hasta completar el upload del resumen y visible luego.
- Controles de cuotas post-cierre condicionales.
- Avance permitido cuando todos los datos post-cierre se omiten.
- Limpieza de respuestas post-cierre al ocultarse por cambio de ruta.
