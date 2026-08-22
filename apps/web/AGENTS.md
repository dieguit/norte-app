# Behavior

If user asks a question, answer it, do not start work or fix or plan. There are no rhetorical questions, just answer

# Git usage

Do not work with worktrees unless requested, do not commit or push unless user requests it.

# Architecture

- `src/routes/`: URL, layout, loader, and route-to-view composition only. Route-owned UI lives in sibling `-components/` directories.
- `src/features/<domain>/`: domain logic. `*.functions.ts` exports `createServerFn` APIs; `*.server.ts` and `*.repository.server.ts` contain server-only work.
- Client-reachable code imports server functions only from `*.functions.ts`; server implementations import `*.server.ts` modules directly.
- Shared code stays in `components/ui/`, `components/SiteShell.tsx`, `db/`, `lib/`, and `utils/`. Promote UI there only when it serves multiple domains.
- Colocate tests with their modules. `routeTree.gen.ts` is generated; never edit it.
