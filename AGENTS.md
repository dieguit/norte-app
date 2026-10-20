## Agent skills

When reviewing work, always run /ponytail-review and /code-review skills.
When reviewing work, always use fallow skills.
Minimize the use of useless comments, only add comments explaining domain decisions.
If user asks a question, answer it, do not start work or fix or plan. There are no rhetorical questions, just answer
When working with superpowers, use current session model for brainstorming, Anthropic Opus for planning and specs, Google Agy Gemini 3.8 flash for implementation, and OpenAI Sol for review. Always use medium effort unless user requests otherwise.

## Instruction routing

- For `apps/web/**`, also follow `apps/web/AGENTS.md`.
- For `apps/api/**`, also follow `apps/api/AGENTS.md`.
- For shared or cross-app work, follow every applicable nested `AGENTS.md`.

Nested instructions supplement this file; they do not replace repository-wide rules.

### Git behavior

Do not create worktrees unless user specifies, check branch and if it is main ask confirmation (or switch branch)
Do not commit or push unless user requests it.

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Uses the multi-context domain documentation layout. See `docs/agents/domain.md`.
<!-- fallow:setup-hooks:start -->

## Fallow local gate

Before any `git commit` or `git push`, run `pnpm fallow:audit`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to...                                     | Run                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| delete an "unused" export or file                                 | `pnpm fallow dead-code --trace <file>:<export>`                                      |
| prove a TypeScript symbol's exact consumers before refactoring    | `pnpm fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>` |
| delete an "unused" dependency                                     | `pnpm fallow dead-code --trace-dependency <name>`                                    |
| commit or open a PR                                               | `pnpm fallow audit --base <ref>`                                                     |
| prioritize refactoring                                            | `pnpm fallow health --hotspots --targets`                                            |
| ask who owns code                                                 | `pnpm fallow health --ownership`                                                     |
| check untested-but-reachable code                                 | `pnpm fallow health --coverage-gaps`                                                 |
| consolidate duplication                                           | `pnpm fallow dupes --trace dup:<fingerprint>`                                        |
| find feature flags                                                | `pnpm fallow flags`                                                                  |
| check which architecture rules apply to a file before changing it | `pnpm fallow guard <files>`                                                          |
| surface security candidates                                       | `pnpm fallow security`                                                               |
| understand a finding                                              | `pnpm fallow explain <issue-type>`                                                   |
| scope a monorepo                                                  | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |

<!-- fallow:setup-hooks:end -->
