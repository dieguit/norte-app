# Columnas del CSV administrativo

La fila se crea con todas las columnas de `csvHeaders` vacías. El exportador escribe los valores presentes en el objeto guardado `answers`; las respuestas ausentes o no reconocidas para una columna y los valores no exportables o no finitos producen celdas vacías. El filtrado por pasos activos ocurre antes de persistir `answers`, en otra parte del flujo; las respuestas condicionales no agregan columnas nuevas.

## Metadatos y contacto

- `timestamp` no es una respuesta del cuestionario: se obtiene de `completedAt.toISOString()`.
- Paso `p0`: respuesta `nombre` -> columna `nombre`.
- Paso `p23`: respuesta `contacto_canal` -> columna `contacto_canal`; respuesta condicional `whatsapp` -> columna `whatsapp`; respuesta condicional `email` -> columna `email`.

## Prioridades y situación

- Paso `p1`: respuesta `p1_pesa` -> columna `p1_pesa`; respuesta `p1_otra` -> columna `p1_otra`.
- Paso `p2`: respuesta `p2_ultimo` -> columna `p2_ultimo`.
- Paso `p3`: respuesta `p3_primero` -> columna `p3_primero`.

## Ingresos

- Paso `p4`: respuesta `ing_total` -> columna `ing_total`.
- Paso `p5`: respuesta `p5_fuentes` -> columna `p5_fuentes`; si es una lista, sus valores se unen en ese orden con el delimitador ` | `.
- Paso `p6`: respuesta condicional `ing_tercero_falla` -> columna `ing_tercero_falla`; respuesta condicional `ing_tercero_monto` -> columna `ing_tercero_monto`.
- Paso `p8a`: respuesta `p8a_tiene_vencimiento` -> columna `p8a_tiene_vencimiento`; respuesta condicional `ing_sueldo_fijo_hasta` -> columna `ing_sueldo_fijo_hasta`; respuesta condicional `ing_trabajos_propios_hasta` -> columna `ing_trabajos_propios_hasta`; respuesta condicional `ing_aportes_tercero_hasta` -> columna `ing_aportes_tercero_hasta`; respuesta condicional `ing_jubilacion_pension_hasta` -> columna `ing_jubilacion_pension_hasta`; respuesta condicional `ing_otro_hasta` -> columna `ing_otro_hasta`.
- Paso `p8`: respuesta `aumento_tipo` -> columna `aumento_tipo`; respuesta condicional `aumento_meses` -> columna `aumento_meses`; respuesta condicional `aumento_pct` -> columna `aumento_pct`; respuesta condicional `aumento_proximo` -> columna `aumento_proximo`.

## Ingresos extra

- Paso `p7`: respuesta `extra_tiene` -> columna `extra_tiene`.
- Paso `p7`: respuesta repetida `ingresos_extra` se aplana por posición, de 1 a 10; cada propiedad `concepto` de `ingresos_extra[i]` -> columna `ingresos_extra{i}_concepto`, cada propiedad `monto` -> `ingresos_extra{i}_monto`, cada propiedad `desde` -> `ingresos_extra{i}_desde` y cada propiedad `hasta` -> `ingresos_extra{i}_hasta`, para `i = 1, 2, ..., 10`.
- Paso `p7`: por tanto, las columnas concretas son `ingresos_extra1_concepto`, `ingresos_extra1_monto`, `ingresos_extra1_desde`, `ingresos_extra1_hasta`, `ingresos_extra2_concepto`, `ingresos_extra2_monto`, `ingresos_extra2_desde`, `ingresos_extra2_hasta`, `ingresos_extra3_concepto`, `ingresos_extra3_monto`, `ingresos_extra3_desde`, `ingresos_extra3_hasta`, `ingresos_extra4_concepto`, `ingresos_extra4_monto`, `ingresos_extra4_desde`, `ingresos_extra4_hasta`, `ingresos_extra5_concepto`, `ingresos_extra5_monto`, `ingresos_extra5_desde`, `ingresos_extra5_hasta`, `ingresos_extra6_concepto`, `ingresos_extra6_monto`, `ingresos_extra6_desde`, `ingresos_extra6_hasta`, `ingresos_extra7_concepto`, `ingresos_extra7_monto`, `ingresos_extra7_desde`, `ingresos_extra7_hasta`, `ingresos_extra8_concepto`, `ingresos_extra8_monto`, `ingresos_extra8_desde`, `ingresos_extra8_hasta`, `ingresos_extra9_concepto`, `ingresos_extra9_monto`, `ingresos_extra9_desde`, `ingresos_extra9_hasta`, `ingresos_extra10_concepto`, `ingresos_extra10_monto`, `ingresos_extra10_desde`, `ingresos_extra10_hasta`.

## Gastos fijos

- Paso `p9`: respuesta `p9_modo` -> columna `p9_modo`.
- Paso `p9`: respuestas condicionales `fijo_alquiler`, `fijo_colegio`, `fijo_prepaga`, `fijo_prestamos`, `fijo_servicios`, `fijo_seguros` y `fijo_ayuda` -> respectivamente las columnas `fijo_alquiler`, `fijo_colegio`, `fijo_prepaga`, `fijo_prestamos`, `fijo_servicios`, `fijo_seguros` y `fijo_ayuda`.
- Paso `p9`: respuesta condicional `fijo_total_directo` -> columna `fijo_total_directo`.
- Paso `p9`/`p10`: respuesta repetida `fijo_otros` se aplana por posición, de 1 a 5; `fijo_otros[i].concepto` -> `fijo_otro{i}_concepto`, `fijo_otros[i].monto` -> `fijo_otro{i}_monto` y `fijo_otros[i].hasta` -> `fijo_otro{i}_hasta`, para `i = 1, 2, 3, 4, 5`.
- Paso `p9`/`p10`: las columnas concretas de esos cinco slots son `fijo_otro1_concepto`, `fijo_otro1_monto`, `fijo_otro1_hasta`, `fijo_otro2_concepto`, `fijo_otro2_monto`, `fijo_otro2_hasta`, `fijo_otro3_concepto`, `fijo_otro3_monto`, `fijo_otro3_hasta`, `fijo_otro4_concepto`, `fijo_otro4_monto`, `fijo_otro4_hasta`, `fijo_otro5_concepto`, `fijo_otro5_monto`, `fijo_otro5_hasta`.
- Paso `p10`: respuesta `p10_tiene_vencimiento` -> columna `p10_tiene_vencimiento`.
- Paso `p10`: respuestas condicionales `fijo_alquiler_hasta`, `fijo_colegio_hasta`, `fijo_prepaga_hasta`, `fijo_prestamos_hasta`, `fijo_servicios_hasta`, `fijo_seguros_hasta` y `fijo_ayuda_hasta` -> respectivamente las columnas `fijo_alquiler_hasta`, `fijo_colegio_hasta`, `fijo_prepaga_hasta`, `fijo_prestamos_hasta`, `fijo_servicios_hasta`, `fijo_seguros_hasta` y `fijo_ayuda_hasta`.
- Compatibilidad: si `fijo_otros` no existe, el exportador usa como fallback legado las respuestas `fijo_otro1_concepto`, `fijo_otro1_monto`, `fijo_otro1_hasta`, `fijo_otro2_concepto`, `fijo_otro2_monto` y `fijo_otro2_hasta` para llenar los slots 1 y 2. Esos IDs no son campos actuales del cuestionario, pero sus columnas sí están en `csvHeaders`.
- Paso `p10` en modo no detallado: respuesta `fin1_concepto` -> columna `fin1_concepto`, `fin1_cuota` -> `fin1_cuota`, `fin1_hasta` -> `fin1_hasta`; el mismo mapeo directo aplica a `fin2_concepto` -> `fin2_concepto`, `fin2_cuota` -> `fin2_cuota`, `fin2_hasta` -> `fin2_hasta`, `fin3_concepto` -> `fin3_concepto`, `fin3_cuota` -> `fin3_cuota`, `fin3_hasta` -> `fin3_hasta`, `fin4_concepto` -> `fin4_concepto`, `fin4_cuota` -> `fin4_cuota` y `fin4_hasta` -> `fin4_hasta`.

## Gastos cotidianos y gustitos

- Paso `p11`: respuestas `var_comida`, `var_transporte`, `var_farmacia` y `var_total_directo` -> respectivamente las columnas `var_comida`, `var_transporte`, `var_farmacia` y `var_total_directo`.
- Paso `p11`: respuestas `var_otro1_concepto`, `var_otro1_monto`, `var_otro2_concepto`, `var_otro2_monto`, `var_otro3_concepto` y `var_otro3_monto` -> las columnas con el mismo nombre.
- Paso `p12`: respuestas `d_salidas`, `d_ropa`, `d_delivery`, `d_susc` y `d_hobbies` -> las columnas con el mismo nombre.
- Paso `p12`: respuestas `d_otro1_concepto`, `d_otro1_monto`, `d_otro2_concepto`, `d_otro2_monto`, `d_otro3_concepto` y `d_otro3_monto` -> las columnas con el mismo nombre.
- Paso `p13`: respuestas condicionales `e13_salidas`, `e13_ropa`, `e13_delivery`, `e13_susc`, `e13_hobbies`, `e13_otro1`, `e13_otro2` y `e13_otro3` -> respectivamente las columnas con el mismo nombre.

## Compras y tarjetas

- Paso `p14`: respuesta `p14_tiene_compras` -> columna `p14_tiene_compras`; respuestas condicionales `n1_concepto`, `n1_monto`, `n2_concepto`, `n2_monto`, `n3_concepto` y `n3_monto` -> las columnas con el mismo nombre.
- Paso `p15`: respuesta `p15_tarjetas` -> columna `p15_tarjetas`.
- Para cada tarjeta `n` de 1 a 5, el paso `t{n}_p16` se activa según `p15_tarjetas`; la respuesta `t{n}_cuotas_modo` -> columna `t{n}_cuotas_modo`.
- Tarjeta 1: `t1_cuotas_modo` -> `t1_cuotas_modo`; `t1_upload_url` -> `t1_upload_url`; `t1_resumen_ars` -> `t1_resumen_ars`; `t1_resumen_usd` -> `t1_resumen_usd`; `t1_cierre_dia` -> `t1_cierre_dia`; `t1_vto_dia` -> `t1_vto_dia`; `t1_cuotas_m1` -> `t1_cuotas_m1`; `t1_cuotas_m2` -> `t1_cuotas_m2`; `t1_cuotas_m3` -> `t1_cuotas_m3`; `t1_cuotas_m4` -> `t1_cuotas_m4`; `t1_cuotas_m5` -> `t1_cuotas_m5`; `t1_cuotas_m6` -> `t1_cuotas_m6`; `t1_cuotas_resto` -> `t1_cuotas_resto`; `t1_cuotas_resto_hasta` -> `t1_cuotas_resto_hasta`; `t1_arrastre` -> `t1_arrastre`; `t1_postcierre` -> `t1_postcierre`; `t1_postcierre_cuotas` -> `t1_postcierre_cuotas`; `t1_postcierre_cuotas_cantidad` -> `t1_postcierre_cuotas_cantidad`; `t1_postcierre_upload` -> `t1_postcierre_upload`.
- Tarjeta 2: `t2_cuotas_modo` -> `t2_cuotas_modo`; `t2_upload_url` -> `t2_upload_url`; `t2_resumen_ars` -> `t2_resumen_ars`; `t2_resumen_usd` -> `t2_resumen_usd`; `t2_cierre_dia` -> `t2_cierre_dia`; `t2_vto_dia` -> `t2_vto_dia`; `t2_cuotas_m1` -> `t2_cuotas_m1`; `t2_cuotas_m2` -> `t2_cuotas_m2`; `t2_cuotas_m3` -> `t2_cuotas_m3`; `t2_cuotas_m4` -> `t2_cuotas_m4`; `t2_cuotas_m5` -> `t2_cuotas_m5`; `t2_cuotas_m6` -> `t2_cuotas_m6`; `t2_cuotas_resto` -> `t2_cuotas_resto`; `t2_cuotas_resto_hasta` -> `t2_cuotas_resto_hasta`; `t2_arrastre` -> `t2_arrastre`; `t2_postcierre` -> `t2_postcierre`; `t2_postcierre_cuotas` -> `t2_postcierre_cuotas`; `t2_postcierre_cuotas_cantidad` -> `t2_postcierre_cuotas_cantidad`; `t2_postcierre_upload` -> `t2_postcierre_upload`.
- Tarjeta 3: `t3_cuotas_modo` -> `t3_cuotas_modo`; `t3_upload_url` -> `t3_upload_url`; `t3_resumen_ars` -> `t3_resumen_ars`; `t3_resumen_usd` -> `t3_resumen_usd`; `t3_cierre_dia` -> `t3_cierre_dia`; `t3_vto_dia` -> `t3_vto_dia`; `t3_cuotas_m1` -> `t3_cuotas_m1`; `t3_cuotas_m2` -> `t3_cuotas_m2`; `t3_cuotas_m3` -> `t3_cuotas_m3`; `t3_cuotas_m4` -> `t3_cuotas_m4`; `t3_cuotas_m5` -> `t3_cuotas_m5`; `t3_cuotas_m6` -> `t3_cuotas_m6`; `t3_cuotas_resto` -> `t3_cuotas_resto`; `t3_cuotas_resto_hasta` -> `t3_cuotas_resto_hasta`; `t3_arrastre` -> `t3_arrastre`; `t3_postcierre` -> `t3_postcierre`; `t3_postcierre_cuotas` -> `t3_postcierre_cuotas`; `t3_postcierre_cuotas_cantidad` -> `t3_postcierre_cuotas_cantidad`; `t3_postcierre_upload` -> `t3_postcierre_upload`.
- Tarjeta 4: `t4_cuotas_modo` -> `t4_cuotas_modo`; `t4_upload_url` -> `t4_upload_url`; `t4_resumen_ars` -> `t4_resumen_ars`; `t4_resumen_usd` -> `t4_resumen_usd`; `t4_cierre_dia` -> `t4_cierre_dia`; `t4_vto_dia` -> `t4_vto_dia`; `t4_cuotas_m1` -> `t4_cuotas_m1`; `t4_cuotas_m2` -> `t4_cuotas_m2`; `t4_cuotas_m3` -> `t4_cuotas_m3`; `t4_cuotas_m4` -> `t4_cuotas_m4`; `t4_cuotas_m5` -> `t4_cuotas_m5`; `t4_cuotas_m6` -> `t4_cuotas_m6`; `t4_cuotas_resto` -> `t4_cuotas_resto`; `t4_cuotas_resto_hasta` -> `t4_cuotas_resto_hasta`; `t4_arrastre` -> `t4_arrastre`; `t4_postcierre` -> `t4_postcierre`; `t4_postcierre_cuotas` -> `t4_postcierre_cuotas`; `t4_postcierre_cuotas_cantidad` -> `t4_postcierre_cuotas_cantidad`; `t4_postcierre_upload` -> `t4_postcierre_upload`.
- Tarjeta 5: `t5_cuotas_modo` -> `t5_cuotas_modo`; `t5_upload_url` -> `t5_upload_url`; `t5_resumen_ars` -> `t5_resumen_ars`; `t5_resumen_usd` -> `t5_resumen_usd`; `t5_cierre_dia` -> `t5_cierre_dia`; `t5_vto_dia` -> `t5_vto_dia`; `t5_cuotas_m1` -> `t5_cuotas_m1`; `t5_cuotas_m2` -> `t5_cuotas_m2`; `t5_cuotas_m3` -> `t5_cuotas_m3`; `t5_cuotas_m4` -> `t5_cuotas_m4`; `t5_cuotas_m5` -> `t5_cuotas_m5`; `t5_cuotas_m6` -> `t5_cuotas_m6`; `t5_cuotas_resto` -> `t5_cuotas_resto`; `t5_cuotas_resto_hasta` -> `t5_cuotas_resto_hasta`; `t5_arrastre` -> `t5_arrastre`; `t5_postcierre` -> `t5_postcierre`; `t5_postcierre_cuotas` -> `t5_postcierre_cuotas`; `t5_postcierre_cuotas_cantidad` -> `t5_postcierre_cuotas_cantidad`; `t5_postcierre_upload` -> `t5_postcierre_upload`.

## Celdas vacías y sanitización

- Las columnas sin respuesta quedan como `''`; esto incluye campos condicionales no visibles, slots repetidos inexistentes y valores de tipos no admitidos.
- Para respuestas escalares, solo se exportan strings y números finitos; booleanos, arrays y números `NaN` o infinitos se convierten en celda vacía.
- En `ingresos_extra[i]`, `concepto`, `desde` y `hasta` solo conservan strings o números finitos; en `fijo_otros[i]`, `concepto` y `hasta` solo conservan strings o números finitos; los demás valores quedan vacíos.
- Los montos repetidos de `ingresos_extra[i].monto` y `fijo_otros[i].monto` aceptan un número finito o un string cuyo contenido, quitando espacios externos, sea un número finito; un string vacío, `NaN`, infinito o cualquier valor inválido queda vacío.
- La sanitización no cambia el conjunto ni el orden de `csvHeaders`; solo determina el contenido de cada celda.
