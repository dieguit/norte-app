# Gastos post-cierre visibles al elegir archivo

## Objetivo

Pedir los datos opcionales de gastos posteriores al cierre en ambas rutas del último resumen desde que se elige la ruta.

## Comportamiento

En cada tarjeta, la sección post-cierre se muestra al elegir:

- Subir foto o archivo.
- Copiar el renglón mes a mes.

Incluye el gasto aproximado, la indicación de cuotas, la cantidad condicional de cuotas y la captura opcional de movimientos recientes. Ningún campo bloquea el avance.

La ruta de WhatsApp no muestra esta sección. En particular, el camino de archivo ya no espera una carga exitosa del resumen para revelarla.

## Implementación

En `src/onboarding/definition.ts`, la condición compartida de visibilidad de post-cierre depende solo de que la ruta elegida sea archivo o mes a mes. Se conserva el filtrado existente de respuestas activas, por lo que cambiar a WhatsApp elimina las respuestas de estos campos.

## Pruebas

Actualizar las pruebas de definición e interfaz para comprobar que el camino de archivo muestra los campos post-cierre antes de subir el resumen. Conservar cobertura de cantidad de cuotas condicional, avance sin datos opcionales y limpieza al cambiar a WhatsApp.
