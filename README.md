# SmartMenu

Photograph a menu in any language. Get it translated, nutrition-scored and
ranked against your diet.

A mobile-first React web app - open it on a phone, no install.

<img width="1536" height="1024" alt="SmartMenu design mock" src="https://github.com/user-attachments/assets/56ed0ce9-97ea-4a71-a17a-7c87a03e7d78" />

![CI](https://github.com/mohamedhiba/smartmenu/actions/workflows/ci.yml/badge.svg)

## How it works

One multimodal model call does OCR, structuring, translation and nutrition
estimation in a single pass, returning strict JSON. A deterministic scoring
function then ranks each dish against the diet you picked.

```
photo -> downscale in browser -> /api/analyze -> gemini-3.6-flash (JSON schema)
      -> zod validate -> scoreDish() -> ranked menu
```

## Quick start

```bash
npm install
cp .env.example .env.local   # add your own GEMINI_API_KEY
npm run dev
```

Needs Node 22 or 24.

**No API key? It still runs.** Every screen renders from `lib/fixtures.ts`, and
`POST /api/analyze?demo=1` returns the demo menu instantly.

## Stack

Next.js 16 (App Router) - TypeScript - Tailwind v4 - zod - zustand -
Gemini `gemini-3.6-flash` with an OpenAI `gpt-4o` fallback - deployed on Vercel.

## Layout

```
app/            routes; pages own data and state
  api/analyze/  the one server endpoint
components/     all visuals
lib/
  schema.ts     the zod contract - frozen
  llm.ts        model call, prompt, retry, fallback
  scoring.ts    scoreDish(item, prefs) -> score, label, reasons
  image.ts      browser-side downscale + base64
  fixtures.ts   the demo menu
  store.ts      client state
docs/           plan, conventions, demo script
```

## Contributing

Read [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) first - file ownership, branch
names and PR rules. The build plan is in [`docs/PLAN.md`](docs/PLAN.md).
