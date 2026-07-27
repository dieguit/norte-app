# Admin Page UI Refinements Design

**Goal:** Refine the `/admin` row states, layout sequence in expanded rows, report URL visibility, and link targeting.

## Design Details

### 1. Status Column Chips
Update the "Estado" column chip priority:
- If `reportSentOn` is truthy: render green pill `Informe Enviado`.
- Else if `hasReport` is truthy: render pill `Informe Listo`.
- Else: render standard `Completado` (if `status === 'completed'`) or `Borrador` pill.

### 2. Expanded Row Structure
Reorder elements inside `id={`files-container-${device.deviceId}`}`:
1. Header row with `Ver resultados` link and `Descargar CSV` button.
2. File attachments section (`Loading files...`, `No se encontraron archivos.`, or file links list) placed directly below `Ver resultados`.
3. Divider line (`border-t border-[var(--line)]`).
4. Report section:
   - Report status / editor triggers (`Agregar informe` or `Reemplazar informe`).
   - `Ver informe` button configured with `target="_blank" rel="noreferrer"`.
   - Visible text URL display alongside `Copiar enlace` button.
   - `Informe enviado` checkbox.
   - Inline report editor textarea container if active.

### 3. Report Link Text Visibility & Window Targeting
- Render readable URL text (e.g. `${window.location.origin}/informe/${device.deviceId}`) in the report controls bar when a report exists.
- Add `target="_blank" rel="noreferrer"` to the `Ver informe` anchor tag.
