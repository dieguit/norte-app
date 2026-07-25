# Caratula de clasificacion de gastos

## Objetivo

Orientar a la persona antes de cargar pagos fijos para que clasifique cada gasto
en el grupo correcto: fijos, necesarios variables o gustitos.

## Alcance

- Insertar un paso informativo sin campos entre `p7` (ingresos extra) y `p9`
  (pagos fijos).
- Reutilizar el flujo de onboarding existente: progreso, navegacion, persistencia
  del borrador y analitica de pasos.
- No modificar las preguntas, respuestas ni la clasificacion posterior de gastos.

## Contenido

Titulo: `Ahora vamos a los gastos`

Texto:

> Los vamos a mirar en tres grupos: los pagos fijos, que tenes que pagar si o si
> todos los meses, como el alquiler o el colegio; los gastos necesarios que
> cambian segun el mes y tus decisiones, pero siempre estan, como la comida o la
> nafta; y, por ultimo, los gustitos. Esos vienen despues.

El paso usa el boton existente `Continuar`.

## Comportamiento

- Continuar avanza a `p9`.
- Volver desde `p9` regresa a la caratula.
- Al no tener campos, la validacion permite continuar sin datos.
- El paso se cuenta en el progreso y emite los mismos eventos de vista y
  finalizacion que el resto de los pasos.
- Los borradores existentes no quedan detenidos en la caratula: el calculo
  actual del primer paso incompleto la trata como completa porque su validacion
  no produce errores; ese comportamiento se conserva.

## Implementacion y pruebas

- Definir el paso en `src/onboarding/definition.ts` dentro del orden actual del
  onboarding.
- Ampliar las pruebas de definicion y ruta para cubrir el orden, la navegacion y
  la reanudacion de un borrador con gastos ya cargados.
- Verificar con las pruebas del paquete web, chequeo de tipos, build y
  `git diff --check`.
