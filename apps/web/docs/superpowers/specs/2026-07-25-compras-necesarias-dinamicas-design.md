# Compras necesarias dinámicas

## Objetivo

Reemplazar los tres pares de campos fijos de compras necesarias de `p14` por una lista dinámica de hasta cinco compras. Cada compra incluye concepto, monto y fecha mensual. El CSV conserva cinco grupos fijos de columnas.

## Interfaz y datos

- `p14` conserva el selector `¿Tiene compras previstas?` con opciones “Sí” y “No”.
- Con “Sí”, se muestra `compras_necesarias` mediante el componente existente `OnboardingRepeatedItems`; comienza vacío y admite hasta cinco entradas.
- Cada entrada tiene `Concepto`, `Monto ($)` y `Fecha`, usando el selector mensual existente con opciones como `oct-27`.
- El botón dice `Agregar compra`; cada entrada puede eliminarse.
- Con “No”, la lista se oculta y el filtrado de respuestas la elimina.
- Los campos históricos `n1_concepto`, `n1_monto`, `n2_concepto`, `n2_monto`, `n3_concepto` y `n3_monto` se eliminan sin migración ni compatibilidad.

## Validación

- Seleccionar “Sí” sin agregar una compra muestra `Agregá una compra o elegí "No".`
- Una entrada agregada requiere concepto, monto y fecha.
- Los montos inválidos o negativos conservan los mensajes de validación existentes.

## CSV

- Se eliminan las columnas históricas `n1_*` a `n3_*`.
- Se agregan `compra_necesaria_1_{concepto,monto,fecha}` hasta `compra_necesaria_5_{concepto,monto,fecha}`.
- `toAdminCsvRow` aplana `compras_necesarias` por orden de inserción y deja vacías las posiciones no utilizadas.

## Pruebas

- Las pruebas de definición verifican visibilidad, filtrado al elegir “No”, el requisito de al menos una compra con “Sí” y los tres campos requeridos por fila.
- Las pruebas de interfaz verifican agregar, eliminar y el máximo de cinco compras.
- Las pruebas de CSV verifican las quince columnas nuevas, el aplanado de cinco entradas y los valores vacíos de posiciones no utilizadas.
