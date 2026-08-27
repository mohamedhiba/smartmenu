# SmartMenu — the pitch

Three slides. Read the speaker notes, do not read the slides aloud.

---

## Slide 1 — The problem

> # You are in Rome.
> # The menu is in Italian.
> # You are keto.

**Speaker notes (20s)**

Google Translate gives you *words*. It tells you that *trofie al pesto* is
"trofie with pesto". It does not tell you that it is 76 grams of carbs, or that
pesto contains pine nuts even though the menu never says so.

Anyone eating to a rule — keto, coeliac, vegan, a nut allergy — is doing two
translations at once: the language, and then the ingredients. The second one is
the one that actually matters, and it is the one no tool does.

---

## Slide 2 — The demo

> # One photo. No typing.
>
> *(live, on a phone)*

**Speaker notes (60s)**

Take the photo live. Do not narrate the wait — let the processing stages do it.

1. **Scan** — "One photo of the menu."
2. **Preferences** — "I'm keto, and no nuts." Three taps.
3. **Smart Menu** — "Twelve dishes, read in Spanish, ranked against my diet.
   Green I can eat, red I should skip."
4. **Dish details** — tap the top dish. "Here are the macros, the real
   ingredients, and — this is the part that matters — *why* it scored that way."

The line to land on: **the ranking is not a translation, it is a decision.**

---

## Slide 3 — How it works, and what is next

> # One model call. Deterministic ranking.
>
> ```
> photo → downscale → one multimodal call → validate → score → ranked menu
> ```

**Speaker notes (25s)**

The obvious build is five services: OCR, structuring, translation, a nutrition
database, then ranking. We collapsed the first four into **one** call. A vision
model reading a menu does not need OCR as a separate step — and handing it
pre-extracted text would actually lose the layout that tells you what is a
section and what is a dish.

The part worth stressing: **the scoring is deliberately not AI.** The model does
perception; a pure function does judgement. Same dish and same preferences always
produce the same score, and the score can explain itself. That is why the app can
tell you *why*, and why it cannot quietly change its mind.

**What is next:** allergen alerts rather than score penalties; real nutrition data
for the dishes common enough to have it; and restaurants uploading a menu once to
get a QR code, so the diner skips the photo entirely.

---

## If a judge pushes

**"The nutrition is estimated."** Yes, and we say so. A restaurant does not
publish macros; a database lookup on a fuzzy Spanish dish name would be an
estimate too, just slower. We sanity-check every number — a 5000 kcal salad or a
steak with no protein is rejected and re-asked. For *should I order this*, a
directionally right estimate beats a precise number for the wrong dish.

**"What if the model is wrong?"** Three layers. A strict response schema, so it
cannot return prose. Runtime validation against the same contract that types the
app. And a repair pass before anything reaches the screen.

**"What if it fails on stage?"** Three tiers behind one 40-second budget: a
second Gemini model on a different rate-limit bucket, then another provider. Add
`?demo=1` to the URL and it answers from fixtures in under half a second. That
was built in the first commit, not bolted on at the end.

**"Why a web app?"** You are holding the demo. No install, no TestFlight.
