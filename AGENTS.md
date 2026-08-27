<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SmartMenu

Mobile-first React web app: photograph a menu, get it translated, scored and
ranked for your diet.

Before changing anything, read `docs/CONVENTIONS.md` (file ownership, branch and
PR rules) and `docs/PLAN.md` (what we are building and why).

Two rules that override everything else:

1. `lib/schema.ts` is the frozen contract. Changing a field there means updating
   `lib/fixtures.ts`, `lib/scoring.ts` and `components/types.ts` in the same PR.
2. Every screen must render with no API key present, using `lib/fixtures.ts`.
