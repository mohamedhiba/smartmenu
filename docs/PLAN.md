# SmartMenu - 6-hour build plan

Photograph a menu in any language. Get it translated, nutrition-scored and
ranked against your diet.

## What we are building

A **React web app** (Next.js App Router), mobile-first, deployed to Vercel.
Judges open a URL on their phone - there is no native app to install.

Next.js is React. The components are ordinary React components. The one thing
Next adds that we actually need is a server route: the Gemini key cannot live in
browser JavaScript (anyone can read it) and browsers cannot call the Gemini API
directly anyway. `app/api/analyze/route.ts` is that server side, and it ships in
the same deploy as the UI.

## The one big simplification

The original design had five APIs and six pipeline stages. In six hours that
does not ship. **One multimodal call replaces stages 1-4** - OCR, structuring,
translation and nutrition estimation all happen in a single request with a
strict JSON schema. Same product, quarter of the plumbing.

| Was | Now | Why |
|---|---|---|
| Google Vision OCR | The model reads the image | One less API, one less auth, one less failure |
| Separate structuring call | Same call, `responseSchema` | Free |
| Google Cloud Translation | Same call, "output names in targetLang" | Free |
| FoodData Central / Edamam | Model estimates macros | Fuzzy lookup by Italian dish name is a rabbit hole |
| React Native (Expo) | Next.js web, mobile-first | No native build, works on any phone via URL |
| MongoDB / Postgres | zustand in memory | Nothing needs to persist |
| Firebase / S3 | base64 straight to the route | - |

**Cut entirely:** auth, database, history, preference learning, multi-language
UI, share, tests beyond the CI build.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind v4, Vercel
- **Gemini `gemini-2.5-flash`** via `@google/genai` - vision + `responseSchema`
- **OpenAI `gpt-4o`** as fallback when Gemini errors or rate-limits
- `zod` for the shared contract, `zustand` for client state, `lucide-react` for icons
- Category art is a gradient + icon tile, not a photo library

## The demo, 90 seconds

1. Open on a phone, tap **Scan a menu**, photograph an Italian menu
2. Pick a diet (Keto / Vegan / Gluten-free / None) and toggles (Low carb, High protein, No nuts)
3. Processing screen: Extracting -> Translating -> Analyzing -> Ranking
4. Smart Menu: dishes ranked, score badge, kcal, category tile
5. Tap a dish: translated name, original name, ingredients, macros, why this score

## Timeline

| Time | Mohamed - AI/Backend | Brandon - Core/Integration | Abigail - UI/UX |
|---|---|---|---|
| 0:00-0:30 | Bootstrap on `main`: scaffold, contracts, fixtures, stub API, CI, protection | Vercel access, read the contracts | Palette and layout from the mock |
| 0:30-2:00 | #12 Gemini vision, tested on 3 real photos | #5 routes, #9 downscale, #11 store, #13 scoring, #14 deploy | #7 design system, #8 Scan, #10 Preferences |
| 2:00-3:30 | #18 hardening, #19 fallback, #20 non-menu | #17 **wire end to end** | #15 Processing, #16 Smart Menu |
| 3:30-5:00 | #23 prompt tuning, nutrition sanity | #24 README + pitch, #25 phone run | #21 Dish details, #22 polish |
| 5:00-5:30 | **Feature freeze - bug fixes only** | | |
| 5:30-6:00 | Final deploy, rehearse twice, tag `v0.1-hackathon` | | |

### Hard gates

- **H0.5** all five screens navigate on fixtures
- **H2** one real photo goes through the real model and appears on screen
- **H3.5** a stranger's phone runs the whole flow from the Vercel URL
- **H5** freeze

## Things that will bite us (and what we did about them)

| Risk | Mitigation |
|---|---|
| A phone photo is 3-5MB; base64 adds ~33%; Vercel caps request bodies at 4.5MB | `lib/image.ts` downscales to <=1024px JPEG q0.72 in the browser *before* upload (#9). Also cuts latency and token cost. |
| Model returns malformed JSON | `responseSchema` + zod validate + one repair retry + fixtures fallback (#18) |
| Gemini free tier is ~10 req/min and three of us are testing | Everyone uses their own key locally; OpenAI fallback on 429 (#19) |
| API dies during the demo | `?demo=1` returns fixtures instantly - built in the bootstrap commit, not at hour 5 |
| Wi-Fi dies during the demo | `?demo=1` plus a screen recording taken at H5 |
| iOS camera in the browser | `<input type="file" accept="image/*" capture="environment">` works everywhere; verified at H3.5 |
| Merge conflicts | Strict file ownership - see `docs/CONVENTIONS.md` |
| A 5000-kcal salad | Sanity clamps in the prompt and post-validation (#23) |

## Contracts

`lib/schema.ts` (`Prefs`, `MenuItem`, `AnalyzedMenu`, `Scored`) is the data
contract. `components/types.ts` is the UI contract. Both are frozen after H0.5.
Changing a field means updating every consumer in the same PR.
