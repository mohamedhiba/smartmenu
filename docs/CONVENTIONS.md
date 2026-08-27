# Working conventions

Read this before your first PR. It exists so three people can push into one repo
for six hours without stepping on each other.

## File ownership

The single best defence against merge conflicts is that we do not edit the same
files. Stay in your lane; if you need something outside it, ask the owner.

| Owner | Owns | Never touches |
|---|---|---|
| **Abigail** (`@AbigailVincent`) | `components/**`, `app/globals.css`, design tokens | `lib/**`, `app/api/**`, `app/**/page.tsx` |
| **Mohamed** (`@mohamedhiba`) | `app/api/**`, `lib/llm.ts`, `lib/schema.ts`, `lib/fixtures.ts`, prompts | `components/**` |
| **Brandon** (`@IIBrandonII`) | `app/**/page.tsx`, `lib/store.ts`, `lib/scoring.ts`, `lib/image.ts`, Vercel | `lib/llm.ts`, `components/**` |

### The seam between pages and components

Pages own data, routing and state. Components own everything visible.
A page should not contain a Tailwind class beyond layout.

Brandon writes `app/menu/page.tsx`, which reads the store and renders
`<SmartMenuScreen items={...} onSelect={...} />`. Abigail writes that component.
Neither opens the other's file. The props are declared once in
`components/types.ts` and both build against them.

## Branches

```
<area>/<issue-number>-<short-slug>
```

`area` is `ui`, `ai` or `core` - it tells everyone at a glance whose branch it is.

```
ui/8-scan-screen
ai/12-gemini-vision
core/17-wire-e2e
```

## Pull requests

- Title: `[#12] Gemini vision call`
- Body must contain `Closes #12` so the issue closes on merge.
- **CI must be green.** It runs `tsc --noEmit`, `eslint` and `next build`.
- **No approval required.** Merge your own PR once CI passes - nobody should
  ever be blocked waiting on a teammate during the sprint.
- Squash merge. Branches auto-delete.
- Rebase on `main` before opening: `git pull --rebase origin main`.

`main` is protected: no direct pushes, no force pushes.

## Non-negotiables

1. **Every screen renders without an API key.** Use `lib/fixtures.ts`. If your
   screen breaks when the model is down, it is not done.
2. **`lib/schema.ts` is frozen.** Changing a field there means updating
   `fixtures.ts`, `scoring.ts` and `components/types.ts` in the *same* PR.
3. **Mobile-first, 375px.** Check every screen at that width before you open a PR.
4. **No new dependencies** beyond `zod`, `@google/genai`, `openai`, `zustand`,
   `lucide-react` without asking the group.
5. **Never commit a key.** `.env.local` only.

## Local setup

```bash
npm install
cp .env.example .env.local   # add your own GEMINI_API_KEY
npm run dev
```

Node 22 or 24. Node 23 works for Next but eslint refuses to support it.

Without a key everything still runs - the app falls back to fixtures.
