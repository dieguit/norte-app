# Norte Landing Page Migration Design

## Scope

Replace the TanStack Start root route (`/`) with the Norte coming-soon landing page from `~/norte/website/index.html`. Keep `/onboarding` unchanged.

## Architecture

- Rewrite `apps/web/src/routes/index.tsx` as the landing page in semantic React JSX.
- Keep page-specific header and footer in the root-route component so `/onboarding` does not inherit the marketing shell.
- Remove the global starter header, footer, theme initialization script, and dark-mode behavior from `apps/web/src/routes/__root.tsx`.
- Move the source page metadata and SoftwareApplication JSON-LD into the root route's `head` configuration.

## Styling And Assets

- Replace the starter sea palette with the website palette: primary `#3a6e54`, secondary `#14202d`, and background `#f6f0e2`.
- Make the site light-only and retain the source's subtle 42px grid background and route-card connector line.
- Use the existing Tailwind build rather than the source page's CDN Tailwind script.
- Copy `~/norte/website/images/logo.png` and `compass.jpg` to `apps/web/public/images/`, referenced as `/images/...`.

## Behavior And Accessibility

- Preserve the navigation anchors, responsive layouts, skip link, alt text, and coming-soon content from the source page.
- Remove the starter root route's placeholder API request and all TODO content.
- No app links or form behavior are introduced; the page remains a static marketing page.

## Error Handling

No new asynchronous or user-input behavior is added. Static assets are served from the application public directory.

## Verification

- Add or update a focused root-route rendering test that verifies the Norte hero and source content render without the placeholder API request.
- Run `pnpm --filter @repo/web lint`, `pnpm --filter @repo/web test`, and `pnpm --filter @repo/web build`.
