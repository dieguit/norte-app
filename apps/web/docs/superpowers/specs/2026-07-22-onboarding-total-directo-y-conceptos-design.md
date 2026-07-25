# Total directo y conceptos de gastos

## Alcance

Extender el patrón de modo de pagos fijos a las pantallas de vida diaria (`p11`) y gustitos (`p12`): cada una permite elegir entre `Tengo el total en la cabeza` y `Quiero desglosar`.

## Comportamiento

- Cada pantalla muestra solo los campos del modo elegido.
- Al cambiar de modo, el filtro existente elimina las respuestas del modo oculto.
- En modo total directo, el total es obligatorio y debe ser mayor que cero.
- En modo desglosado, debe existir al menos un monto positivo.
- No se migran borradores anteriores porque el producto todavía no está en producción.

## Recortes de gustitos

- Con gustitos en modo total directo, `p13` se mantiene y muestra las cinco categorías fijas: Salidas, Ropa, Delivery, Suscripciones y Hobbies.
- En modo desglosado, `p13` muestra únicamente categorías con monto positivo.
- Los otros gastos con monto positivo toman su etiqueta del concepto ingresado. Por ejemplo, `d_otro1_concepto: Regalos` se muestra como `Regalos`, no como `Otro 1`.
- Los otros gastos no se muestran cuando solo tienen concepto y no un monto positivo.

## Validación

- Cualquier otro gasto de vida diaria o gustitos con monto positivo exige concepto.

## Implementación y cobertura

- Definir los modos, campos condicionales y reglas de validación en `src/onboarding/definition.ts`, siguiendo el patrón de `p9_modo`.
- Adaptar la derivación de etiquetas y visibilidad de `p13`.
- Cubrir los modos, el filtrado de respuestas inactivas, las etiquetas declaradas y las validaciones en pruebas de definición e interfaz.
- Actualizar el contrato y las pruebas CSV para exportar ambos modos y el nuevo total directo de gustitos; el total directo de vida diaria ya tiene columna.
