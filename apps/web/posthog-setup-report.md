<wizard-report>
# PostHog post-wizard report

The wizard has completed a full PostHog integration for **Norte** — a financial onboarding app built with TanStack Start. The integration covers client-side tracking via `@posthog/react`, server-side tracking via `posthog-node`, a reverse proxy via Vite, and a PostHog dashboard with five insights covering the onboarding conversion funnel.

## Files changed

| File | Change |
|------|--------|
| `vite.config.ts` | Added `/ingest` reverse proxy for PostHog (static, array, and events routes) |
| `src/routes/__root.tsx` | Wrapped app in `PostHogProvider` with token, host, and exception capture enabled |
| `src/utils/posthog-server.ts` | **Created** — singleton `posthog-node` client for server-side event capture |
| `src/routes/onboarding.tsx` | Added `usePostHog()`, `posthog.identify(deviceId)`, and 5 capture calls |
| `src/components/onboarding-upload.tsx` | Added `usePostHog()` and 2 capture calls for file upload success/failure |
| `src/onboarding/server.ts` | Added server-side capture for draft saves and upload URL creation |

## Events instrumented

| Event | Description | File |
|-------|-------------|------|
| `onboarding_welcome_continued` | User dismisses the welcome screen and starts the financial questionnaire | `src/routes/onboarding.tsx` |
| `onboarding_step_completed` | User successfully validates and advances through a step | `src/routes/onboarding.tsx` |
| `onboarding_step_back` | User navigates back to a previous step | `src/routes/onboarding.tsx` |
| `onboarding_completed` | User completes the full financial onboarding questionnaire (primary conversion event) | `src/routes/onboarding.tsx` |
| `onboarding_validation_failed` | Validation errors prevented the user from advancing past a step | `src/routes/onboarding.tsx` |
| `onboarding_save_failed` | Saving the onboarding draft to the server failed | `src/routes/onboarding.tsx` |
| `file_upload_completed` | User successfully uploaded a credit card statement photo or PDF | `src/components/onboarding-upload.tsx` |
| `file_upload_failed` | File upload to R2 failed after the presigned URL was obtained | `src/components/onboarding-upload.tsx` |
| `onboarding_draft_saved` | Server persisted the onboarding draft (with completed flag) | `src/onboarding/server.ts` |
| `onboarding_upload_created` | Server generated a presigned R2 URL for a credit card statement upload | `src/onboarding/server.ts` |

## Next steps

We've built a dashboard and five insights to track onboarding behavior:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/514220/dashboard/1855076)
- **Onboarding funnel**: [A0nICKpH](https://us.posthog.com/project/514220/insights/A0nICKpH) — conversion from welcome → step completed → onboarding complete
- **Completions over time**: [wxWvsBfn](https://us.posthog.com/project/514220/insights/wxWvsBfn) — daily trend of starts and completions
- **Validation failures by step**: [1G6fJ56S](https://us.posthog.com/project/514220/insights/1G6fJ56S) — where users get stuck in the questionnaire
- **File upload success vs failure**: [QPEpWvUU](https://us.posthog.com/project/514220/insights/QPEpWvUU) — credit card statement upload reliability
- **Draft saves over time**: [JK7tJFZd](https://us.posthog.com/project/514220/insights/JK7tJFZd) — server save volume and failure rate

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any monorepo bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `posthog.identify(deviceId)` fires on mount when the deviceId is resolved from localStorage, which covers both new and returning visitors correctly. Verify this holds after any future auth layer is added.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-tanstack-start/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
</wizard-report>
