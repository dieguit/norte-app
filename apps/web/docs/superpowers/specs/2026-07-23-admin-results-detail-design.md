# Admin Result Detail Design

## Goal

Let an authenticated admin inspect every onboarding answer for a selected device at `/admin/resultados/$deviceId`.

## Route And Access

- Add the file-based route `/admin/resultados/$deviceId`.
- Apply the same admin-session check used by `/admin`.
- Validate `deviceId` as a UUID before querying the database.
- Render a Spanish not-found state when no draft exists for the ID.

## Data

- Add an authenticated server function that returns the onboarding draft for the validated device ID.
- Reuse the existing `onboarding_drafts.answers` JSON record and onboarding definition; no database change is needed.
- Produce signed download URLs for uploaded files on demand.

## Page

- Show a `Resultados` heading, respondent name when available, the device ID, and a `Volver a administración` control targeting `/admin`.
- Render every onboarding step in its existing order.
- Render every field in each step, including conditional fields that were not applicable.
- Display missing, empty, and inapplicable values as `Sin respuesta`.
- Use definition labels and type-aware formatting for select values, booleans, money, numbers, dates, months, and uploads.
- Render repeatable answers as their own labeled blocks within their parent step.
- Render present uploads as signed download links and absent uploads as `Sin respuesta`.
- Use existing admin styling and supply loading and error states in Spanish.

## Admin List Change

- In each expanded result row on `/admin`, add `Ver resultados` for completed results and drafts.
- Link it to the selected device's detail route without changing CSV or existing file-download behavior.

## Verification

- Test the list link and device ID passed to the detail route.
- Test authenticated draft retrieval, invalid/missing IDs, and the not-found state.
- Test step and field rendering, including formatted values, `Sin respuesta`, repeatable values, and signed upload links.
