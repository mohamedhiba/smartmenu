# About the project

*Paste each section into the matching Devpost field.*

---

## Inspiration

You are in Rome. The menu is in Italian. You are keto.

Google Translate gives you *words*. It tells you that *trofie al pesto* is
"trofie with pesto". It does not tell you that it is 76 grams of carbohydrate, or
that pesto contains pine nuts even though the menu never says so.

That gap is the whole idea. Anyone eating to a rule — keto, coeliac, vegan, a nut
allergy — is doing two translations at once: the language, and then the
ingredients. The second one is the one that actually matters, and it is the one
no tool does. You end up either interrogating a waiter across a language barrier
or guessing and hoping.

We wanted the answer to the question people are actually asking, which is not
*what is this dish called* but **what should I order**.

---

## What it does

Photograph a menu in any language. Pick your diet in three taps. Every dish comes
back translated, with estimated macros, allergen flags, a score out of 100, and a
plain-English reason for that score.

On a Spanish menu we photographed — laminated, with glare, 39 dishes — it read
the language as Spanish, translated *"Patatas a lo pobre"* as "Poor Man's
Potatoes", and correctly flagged *migas* as not gluten-free because it is made
from breadcrumbs. The menu never says that.

On an Argentine menu that marks gluten-free dishes with a **crossed-wheat icon
instead of text**, it flagged exactly the five marked dishes and correctly left
the pasta, the pastry and the empanadas alone. It read a symbol, not a word.

The ranking is not a translation. It is a decision.

---

## How we built it

**One multimodal call replaces four pipeline stages.**

The obvious build is five services: Vision OCR → GPT structuring → Cloud
Translate → a nutrition database → scoring. Five APIs, five sets of credentials,
five failure points, and a nutrition lookup that has to fuzzy-match "Trofie al
Pesto Genovese" against a row called "pasta, cooked".

We collapsed the first four into a single Gemini call with a strict JSON schema.
That is not a shortcut, and we can defend every part of it:

- A vision model reading a menu **does not need OCR as a separate step**. Handing
  it pre-extracted text would actually lose information — layout is what tells
  you which line is a section header and which is a dish.
- Translation is free once the model is already reading the image.
- **Ingredient inference is the product**, and only a language model can do it.
  No database knows carbonara contains egg and pork when the menu just says
  "Spaghetti alla Carbonara".

**The half that is deliberately not AI.** Scoring is a pure function. Same dish,
same preferences, same score — always — and it can explain itself. The model does
perception; deterministic code does judgement. That split is why the app can tell
you *why*, and why it cannot quietly change its mind between two people asking
the same question.

**Stack:** Next.js on Vercel, TypeScript, Tailwind, `gemini-3.1-flash-lite` with
a second Gemini model and OpenAI behind it, zod for the contract, zustand for
state. No database — nothing needs to persist.

**Two contracts let three people work in parallel.** Before anyone wrote a
screen, we froze two files: a zod schema for the data, and a props file for the
five screens. One of us built every component against those props. Another built
the pages and the state against the same props. Neither opened the other's files.
When the two halves were finally connected, **the contract needed zero changes.**
They fit on the first try.

Every change went through a pull request with CI — typecheck, lint and a
production build — and the build runs with demo mode forced on, so it can never
depend on a live API key. Zero direct pushes to `main`.

---

## Challenges we ran into

**The model we planned on was retired mid-build.** `gemini-2.5-flash` started
returning 404 for new API keys — "no longer available to new users" — hours into
the hackathon. Then Gemini 3.x turned out to have replaced `thinkingBudget` with
`thinkingLevel`, and the error for getting it wrong is just
`"Request contains an invalid argument"` with no field name. We had to bisect the
config to find it. Setting thinking to `LOW` took a menu read from 21 seconds to
9, with identical output.

**Our first real photo would have killed the demo.** A phone photo is 3–5MB, and
base64 inflates it by a third. Vercel rejects request bodies over 4.5MB *before
your code runs*. We would have found that on stage, with a judge's menu. We now
downscale in the browser first: 12.9MB → 194KB, about 400ms, and it cuts model
latency roughly fivefold as a bonus.

**A 39-dish menu timed out.** Gemini returned `DEADLINE_EXCEEDED` because
generating 39 dishes does not fit a 25-second budget — and we were paying to
generate 19 dishes we then discarded at our own display cap. Moving the cap
*into the prompt* took that menu from a 504 to 20 dishes in 11 seconds. Separately
we learned Gemini rejects any manually set deadline under 10 seconds outright.

**Our keto scoring was confidently wrong.** It keyed on `category === "pasta"`,
so risotto at 78g of carbohydrate, bruschetta at 30g and tiramisu at 46g all
escaped unpenalised. A keto user was shown *Porcini Risotto* as "Recommended" —
the exact opposite of the product's promise. It now keys on grams of
carbohydrate, which is what keto actually means.

**Then it was wrong in a subtler way.** On a menu where nothing fits the diet,
every dish was pinned to the same score — twelve identical red cards in arbitrary
order, with the dish *closest* to acceptable buried in the middle. On a menu with
no compliant dish, that least-bad dish is the entire reason someone opened the
app. Blocked dishes now spread by how badly they break the rule.

**The processing screen lied.** It advanced its stages on a timer and navigated
after about four seconds. The real call takes 10–20. So the user photographed a
menu, waited, and was shown our *sample* menu as though it were their own — and
an error could never appear, because the page had already left. Only the result
drives navigation now.

**Rate limits are per model, per day, per key.** We ran three keys and rotated
them, then discovered the daily limit is per *model*, so we added a second Gemini
model as a fallback tier because that is a different bucket. When production
started returning 504s to a real phone, the Vercel logs showed one key exhausted
on the primary model — so we promoted the faster model to primary and cut typical
requests from 15–25s to 8–11s.

**And one we could not fix.** Image generation for the dish photos is on its own
daily quota, and all our keys were spent on it. The original implementation could
never have worked anyway — it used an Imagen method that only exists on Vertex,
not on the API key we had. The code is fixed and the images are one command away;
the app falls back to gradient tiles, which honestly look deliberate.

---

## What we learned

**Testing the API is not testing the product.** Almost every serious bug we found
— the timer navigation, the wall of identical scores, raw field names like "No
containsNuts" leaking into the UI, real data labelled as "fixture menu data" on
screen — was invisible from the endpoint and obvious the moment we drove the real
flow in a browser at phone width.

**Green CI does not mean safe to merge.** One pull request would have deleted our
entire model integration — 564 lines — and reverted the keto fix, because it was
branched from an old commit. CI passed, because reverted code still compiles.

**Make the model do perception and keep judgement in code.** It is the difference
between an app that can explain itself and one that cannot.

**Say when you are showing sample data.** Our API degrades to a demo menu rather
than erroring. We had the flag for it and rendered it nowhere, which meant a user
could be shown someone else's menu as though it were their photo. That is worse
than an error, and it took someone actually looking at the screen to notice.

**Fix the format of the ask, not just the parsing.** Capping dishes in the prompt
rather than trimming the response afterwards turned a timeout into a fast success.

---

## What's next for SmartMenu

- **Allergen alerts** rather than score penalties. The flags are already in the
  schema; a nut allergy deserves a warning, not a lower number.
- **Real nutrition data** for the dishes common enough to have it, with the model
  as the fallback for everything else — best of both, instead of choosing.
- **Restaurant partnerships.** A restaurant uploads its menu once and gets a QR
  code, so the diner skips the photo entirely. That is also the business model.
