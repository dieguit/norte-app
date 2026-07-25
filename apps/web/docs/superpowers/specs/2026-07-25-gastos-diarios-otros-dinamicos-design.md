# Gastos: adicionales dinámicos

## Objetivo

Reemplazar los tres pares de campos fijos “Otro” de `p11` (“La vida de todos los días”) y `p12` (“Los gustitos”) por colecciones dinámicas de hasta cinco entradas. El CSV conserva una cantidad fija de columnas con nombres semánticos.

## Interfaz y datos

- `p11` declara `var_otros` y `p12` declara `d_otros`, ambas visibles únicamente en el modo “Quiero desglosar”.
- Cada entrada contiene solo `concepto` y `monto`; el botón es “Agregar otro”, muestra la ayuda “No hace falta que llenes todos” y no aparece después de la quinta entrada.
- Se reutiliza `OnboardingRepeatedItems`; no se añade un componente ni una dependencia.
- Las respuestas nuevas persisten las listas de objetos `var_otros` y `d_otros`. No se migran ni se conservan `var_otro1..3` ni `d_otro1..3`.

## Validación

- En modo detallado, cada step exige al menos un gasto positivo, sea una categoría principal o una entrada de su colección.
- Cada entrada con monto positivo requiere concepto.
- Los montos de la colección siguen rechazando valores no numéricos y negativos, como los otros gastos fijos.
- Al cambiar a total directo, el filtrado de respuestas descarta la colección correspondiente; al usar el desglose descarta el total directo correspondiente.

## Decisiones de gustitos

- `p13` conserva una decisión de reducción por cada gustito adicional positivo, hasta cinco, en campos fijos `e13_gustito_adicional1` a `e13_gustito_adicional5`.
- Cada decisión usa el concepto de su fila `d_otros` como etiqueta y se oculta cuando su monto deja de ser positivo.
- En modo total directo, `p13` continúa mostrando solo las cinco categorías principales de gustitos.

## CSV

- El CSV tiene `gasto_diario_adicional_1_{concepto,monto}` a `gasto_diario_adicional_5_{concepto,monto}` y `gustito_adicional_1_{concepto,monto}` a `gustito_adicional_5_{concepto,monto}`.
- Incluye `decision_gustito_adicional_1` a `decision_gustito_adicional_5`.
- `toAdminCsvRow` aplana ambas listas en orden de inserción y deja vacías las posiciones no utilizadas.
- No hay compatibilidad para respuestas persistidas con los campos históricos `var_otro*` ni `d_otro*`.

## Pruebas

- La prueba del onboarding verifica ambos componentes, la eliminación de entradas y que el límite de cinco oculta sus botones.
- La prueba de definición cubre la validación de monto/concepto, el requisito de al menos un gasto detallado y la visibilidad y etiqueta de las decisiones de gustitos adicionales.
- La prueba de CSV confirma las veinticinco cabeceras, el aplanado de cinco entradas de cada colección, sus decisiones y los espacios vacíos de listas cortas.
