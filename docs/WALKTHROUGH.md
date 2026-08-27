# SmartMenu - what we built and why

A guide to the project for anyone who did not write it. Read top to bottom to
walk a judge through the work.

**Status: mid-build.** The architecture, contracts and the AI pipeline are done.
The five screens are in flight. See [Where we actually are](#where-we-actually-are)
for the honest picture - do not claim more than that section says.

---

## 1. The problem, in one breath

You are in Rome. The menu is in Italian. You are keto, or you have a nut allergy.

Google Translate gives you *words*. It does not tell you that the trofie al pesto
will put you 76g of carbs over your limit, or that pesto contains pine nuts even
though the menu never says so.

**SmartMenu reads the menu, translates it, estimates the nutrition, and ranks
every dish against your diet.** One photo, no typing.

---

## 2. The one idea worth defending

This is the thing to walk a judge through. Everything else is execution.

The obvious way to build this is a pipeline of specialist services:

```
photo -> Google Vision OCR -> GPT structuring -> Google Translate
      -> FoodData Central lookup -> scoring -> UI
```

Five APIs, five sets of credentials, five failure points, and a nutrition lookup
that has to fuzzy-match "Trofie al Pesto Genovese" against a database keyed on
"pasta, cooked". That last step alone is a research project.

**We collapsed stages 1-4 into a single multimodal call.** One request to
`gemini-3.6-flash` returns structured JSON that has already done the OCR, the
structuring, the translation, the ingredient inference and the macro estimation:

```
photo -> downscale in browser -> ONE model call (strict JSON schema)
      -> validate -> score -> ranked menu
```

Why this is the right call, not a shortcut:

- **A vision model reading a menu does not need OCR as a separate step.** It reads
  the image directly. Handing it pre-extracted text would actually *lose*
  information - layout tells you what is a section header and what is a dish.
- **Translation is free when the model is already reading the text.** Asking for
  output in the target language costs nothing extra.
- **Ingredient inference is something only a language model can do.** No database
  knows that carbonara contains egg and pork when the menu just says
  "Spaghetti alla Carbonara". That inference is the actual product.
- **Nutrition estimation is honest about what it is.** A restaurant does not
  publish macros. Any number here is an estimate; a database lookup keyed on a
  fuzzy name match would be an estimate too, just a slower one wearing a lab coat.

The trade: estimated macros instead of looked-up macros. For "should I order
this", an estimate that is directionally right beats a precise number for the
wrong dish.

**The scoring is deliberately NOT AI.** `lib/scoring.ts` is a pure function - same
dish and same preferences always produce the same score, and it can explain
itself. The model handles perception; deterministic code handles judgement.
That split is intentional and worth saying out loud.

---

## 3. How a photo becomes a ranked menu

```
  Scan screen
      |  a File from <input type="file" accept="image/*" capture="environment">
      v
  lib/image.ts            downscale to <=1024px, JPEG q0.72, base64      [#9]
      |
      v
  POST /api/analyze       { imageBase64, mimeType, prefs }
      |
      v
  lib/llm.ts              one gemini-3.6-flash call
      |                   - schema derived from lib/schema.ts
      |                   - rotates across 3 keys on rate limit
      v
  zod validation          AnalyzedMenu, or reject
      |
      v
  lib/scoring.ts          scoreDish(item, prefs) -> score, label, reasons   [#13]
      |
      v
  lib/store.ts            zustand, sorted by score                          [#11]
      |
      v
  Smart Menu  ->  Dish Details
```

Numbers in brackets are the GitHub issues still open on that step.

---

## 4. Decisions a judge might poke at

**"Why is the schema written twice?"** It is not. `lib/schema.ts` is the single
source of truth. The JSON schema we send Gemini is *generated* from it at runtime
via `z.toJSONSchema()`, then sanitised - Gemini's `responseJsonSchema` only
accepts a subset of JSON Schema, so we strip `$schema` and `default` and mark
every property required. Change a field in `schema.ts` and the model request
follows automatically. No drift.

**"What stops the model returning garbage?"** Three layers. The model is
constrained by a strict response schema, so it cannot return free text. The
response is then parsed by zod against the same contract, so a wrong type is
caught before it reaches the UI. And if both fail, the endpoint returns fixtures
rather than a 500 - the rule is *the endpoint never returns a blank error*.

**"Where do the dish ids come from?"** We generate them, not the model. Models are
unreliable at inventing unique ids, and `/menu/[id]` breaks on a collision. We
slugify the original name and de-duplicate with a suffix, so
`Bruschetta al Pomodoro` is always `bruschetta-al-pomodoro`. Deterministic, and
it saves tokens.

**"What happens when you hit the free tier limit?"** Gemini's free tier rate-limits
each key. We run three keys and rotate across them, and the
rotation *starts from a moving offset* so load spreads instead of draining key 1
first. We only rotate on failures another key could survive - quota, rate limit,
5xx - and fail fast on a malformed request, because retrying bad input on two more
keys just makes it slower. When all three are spent the API returns 429 with a
real error code the UI can render.

**"What if the wifi dies during your demo?"** `POST /api/analyze?demo=1` returns a
complete 8-dish menu instantly without touching a model. It was built in the very
first commit, not bolted on at the end, so it is genuinely tested. There is also
a screen recording.

**"Why downscale the image in the browser?"** A phone photo is 3-5MB and base64
inflates it by a third. Vercel caps request bodies at 4.5MB, so an untouched
upload returns 413 - and you would first discover that on stage, with a real
menu. Downscaling to 1024px also cuts model latency and token cost by roughly 5x.

**"Why a web app and not native?"** A judge opens a URL on their own phone. No
install, no TestFlight, no build. It is React either way; Next.js adds the one
server route we need, because a Gemini key in browser JavaScript is readable by
anyone and browsers cannot call the Gemini API directly.

---

## 5. The repo

```
app/
  page.tsx                Scan        - pages own data, routing and state
  preferences/            Preferences
  processing/             Processing
  menu/  menu/[id]/       Smart Menu, Dish Details
  api/analyze/route.ts    the one server endpoint
components/
  types.ts                the UI contract - screen props
  screens/  ui/           all visuals
lib/
  schema.ts               THE CONTRACT - zod, frozen
  llm.ts                  the Gemini call, prompt, key rotation
  scoring.ts              scoreDish() - pure, deterministic
  image.ts                browser-side downscale
  fixtures.ts             the 8-dish demo menu
  store.ts                zustand client state
docs/                     plan, conventions, demo script, this file
```

**Two contracts let three people work in parallel from minute one.**
`lib/schema.ts` fixes the data shape; `components/types.ts` fixes the props each
screen takes. Because both were agreed before anyone wrote a screen, the frontend
could be built against fixtures while the pipeline was still being written, and
neither person had to open the other's files.

Ownership is strict on purpose - Abigail owns `components/`, Mohamed owns the
pipeline, Brandon owns pages, state and deploy. It is the cheapest defence
against merge conflicts in a six-hour sprint.

---

## 6. Engineering process

Worth thirty seconds if a judge asks how a team of three moved this fast.

- **29 issues across 4 time-boxed milestones** (H0.5 skeleton, H2 real pipeline,
  H3.5 end-to-end on a phone, H5 demo-ready), each assigned before the clock
  started.
- **`main` is protected.** No direct pushes, no force pushes, squash merges only,
  branches auto-delete. Every change goes through a PR.
- **CI gates every merge**: `npm ci`, Next route typegen, `tsc --noEmit`, eslint,
  `next build`. The build runs with `DEMO_MODE=1` so it can never depend on a
  real API key.
- **No required reviewer.** In a six-hour sprint a mandatory approval is a
  deadlock, so anyone merges their own PR once CI is green.
- **The typecheck is the real contract enforcement.** If someone changes a field
  in `schema.ts` without updating its consumers, CI fails before it reaches
  anyone else.

---

## 7. Where we actually are

Be straight about this. Judges respond better to an honest status than a bluff.

| Piece | State |
|---|---|
| Repo, CI, branch protection, 29 issues | **Done** |
| `lib/schema.ts` + `components/types.ts` contracts | **Done** |
| `lib/fixtures.ts` 8-dish demo menu | **Done** |
| `/api/analyze` + `?demo=1` short-circuit | **Done** |
| `lib/llm.ts` Gemini call, schema generation, key rotation | **Done - verified live** |
| Design system, five screens | In progress - #7, #8, #10, #15, #16, #21 |
| `lib/image.ts` downscale | Open - #9 |
| `lib/scoring.ts` | Open - #13 |
| `lib/store.ts` | Open - #11 |
| Vercel deploy | Open - #14 |
| Non-menu rejection (server side) | **Done** - #20 needs only the UI message |
| Timeout, retry, item caps | Open - #18 |
| OpenAI cross-provider fallback | Open - #19 |

**Verified on a real call** (printed Italian menu, 12 dishes): all 12 read, language
detected as `it`, translations natural ("Tagliata di Manzo con Rucola" ->
"Sliced Beef with Rocket"), and every allergen trap correct - pesto flagged as
containing nuts, carbonara and fried calamari both flagged as not gluten-free,
sea bass estimated at 420 kcal / 2g carbs. Round trip takes 10-12 seconds against
a 25 second budget. A photo that is not a menu comes back as a 422 with a plain
English reason rather than an error.

What is missing is the front end. `main` still has one placeholder page, so
**there is no clickable end-to-end demo yet** - the pipeline is proven, but you
reach it with curl, not with a phone. That changes when #17 wires the screens to
the endpoint. Until then, what you can show is the architecture, the code, and a
live API call - not the product.

---

## 8. Running it

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
```

Node 22 or 24 (eslint 9 rejects Node 23).

**No API key needed to see the app.** Every screen renders from `lib/fixtures.ts`,
and `POST /api/analyze?demo=1` returns the demo menu instantly. That is a design
rule, not a convenience: if a screen breaks when the model is down, it is not done.

---

## 9. What is next

- **Allergen alerts** - the flags are already in the schema; surface them as a
  warning rather than a score penalty.
- **Real nutrition data** for the dishes common enough to have it, with the model
  as the fallback for everything else.
- **Restaurant partnerships** - a restaurant uploads its menu once and gets a
  QR code, so diners skip the photo entirely.
