# Mohamed Hiba — what I worked on

*Three lengths. Use whichever fits the field.*

---

## Short (one line, for a role field)

Built the AI pipeline and the backend — the single multimodal call that reads,
translates and analyses a menu, plus the validation, fallback and timeout layers
that keep it standing up on a stranger's phone.

---

## Medium (a paragraph, for a team-member field)

I owned the AI pipeline and the backend. That meant designing the single Gemini
call that replaces four services — OCR, structuring, translation and nutrition
estimation happen together, in one request, against a JSON schema generated from
our zod contract so the two can never drift apart.

The larger half of the work was everything around that call. A dish's macros get
sanity-checked and re-asked when they are implausible. Three API keys rotate from
a moving start point, and a second Gemini model sits behind them because rate
limits are per model, not per project. Every failure maps to a distinct status
code the UI can act on, so a photo of someone's face becomes "that doesn't look
like a menu" rather than a spinner that never stops. The whole thing runs inside
one wall-clock budget, because a demo that fails at 40 seconds beats one that
succeeds at 90.

I also set up the repo, the contracts and CI on day one, which is what let three
of us work in parallel without stepping on each other.

---

## Long (for the "how we built it" or an individual write-up)

**I built the AI pipeline and the backend, and set up the engineering scaffolding
the three of us worked inside.**

### The core decision

The obvious build for this product is five services chained together: Vision OCR,
a structuring pass, Cloud Translation, a nutrition database, then scoring. I
collapsed the first four into **one multimodal call**.

That is a defensible architecture, not a shortcut. A vision model reading a menu
does not need OCR as a separate step — handing it pre-extracted text actually
*loses* the layout that tells you which line is a section header and which is a
dish. Translation is free once the model is already reading. And ingredient
inference — knowing that carbonara contains egg and pork when the menu only says
"Spaghetti alla Carbonara" — is something no database can do. That inference is
the product.

The response schema is **generated from our zod contract at runtime**, then
sanitised for the subset of JSON Schema the provider actually accepts. Change a
field in one file and the model request follows automatically.

### Making it survive contact with reality

Most of the work was not the call. It was everything that happens when the call
misbehaves:

- **Validation and repair.** Output is parsed against the same contract that
  types the app. Implausible nutrition — a 5000 kcal salad, a steak with no
  protein — is rejected and re-asked once, because the scorer reads those numbers
  directly and one absurd value distorts the whole ranking.
- **A three-tier fallback ladder** inside a single 40-second budget: three keys
  rotated from a moving offset, then a second Gemini model (rate limits are per
  model, so it is a different bucket), then another provider. It deliberately
  does *not* fall back on a blown deadline or a malformed request, because
  neither is fixed by asking someone else.
- **Honest failure.** Every situation maps to its own status code and a sentence
  a person can read. The endpoint never returns a blank 500, and when it degrades
  to sample data, the screen says so — showing someone else's menu as though it
  were their photo is worse than showing an error.

### Things that broke, and what I did about them

- **The model I planned on was retired mid-build.** `gemini-2.5-flash` began
  returning 404 for new keys. Gemini 3.x had also replaced `thinkingBudget` with
  `thinkingLevel`, and the error for getting that wrong is a bare "Request
  contains an invalid argument" with no field name — I bisected the config to
  find it. Setting thinking to LOW cut a menu read from 21 seconds to 9.
- **A 39-dish menu timed out.** We were paying to generate 19 dishes we then
  discarded at our own display cap. Moving the cap *into the prompt* turned a 504
  into 20 dishes in 11 seconds.
- **Production started failing on a real phone.** The logs showed one key
  exhausted on the primary model, so every request burned time rotating before it
  began. I promoted the faster model to primary on measured evidence — identical
  output, roughly half the time — and typical requests went from 15–25s to 8–11s.
- **Our keto scoring was confidently wrong.** It keyed on the dish category, so
  risotto at 78g of carbohydrate was shown to a keto user as "Recommended". It
  now keys on grams of carbohydrate, which is what keto actually means.

### The scaffolding

I set up the repo in the first half hour: the two frozen contracts, the demo
menu, a stubbed endpoint that returned real-shaped data from minute one, branch
protection, and CI that typechecks, lints and builds every pull request with demo
mode forced on so the build can never depend on a live API key.

That is the part I would keep if we did it again. Because both contracts were
agreed before anyone wrote a screen, the frontend could be built against fixtures
while the pipeline was still being written — and when the two halves were finally
connected, **the contract needed zero changes.**

**18 pull requests, every one CI-gated, zero direct pushes to `main`.**
