# Banned patterns, with replacements

Contents: 1. Words. 2. Phrases. 3. Constructions. 4. Structural habits. 5. Tone. 6. Punctuation.
7. UI strings by surface. 8. Code smells with the exact fix. 9. What is not slop.

## 1. Words

delve, leverage (as a verb), foster, robust, seamless, vibrant, crucial, tapestry, realm, testament, myriad,
synergy, stakeholders (outside actual governance), meticulous, meticulously, intricate, intricately, pivotal,
garnered, grappling, notably, comprehensive, invaluable, underscores, showcasing, elevate, empower,
streamline, supercharge, unlock, revolutionize, world-class, cutting-edge, game-changing.

Measured evidence, not preference: an analysis of 15 million-plus biomedical abstracts found an abrupt
cross-discipline spike in exactly this vocabulary after late 2022, with at least 13.5 percent of 2024 abstracts
carrying the signature and up to 40 percent in some subfields. "Delves" rose roughly 28-fold, "underscores"
roughly 14-fold, "showcasing" roughly 11-fold.

Replacement rule: name the specific verb or noun for what literally happens. "Leverage our API" becomes "call
the API". "Robust error handling" becomes "retries on 5xx, fails fast on 4xx".

## 2. Phrases

| Position | Banned | Replacement |
|---|---|---|
| Opener | "In today's fast-paced world", "In the ever-evolving landscape of" | Start with the most interesting true thing |
| Mid-text | "It's important to note that", "It's worth mentioning", "When it comes to" | Delete. Say the thing. |
| Closer | "In conclusion", "At the end of the day", "Only time will tell" | End on the last real point |
| Hedge stack | "may potentially help to possibly improve" | Hedge once, plainly, or not at all |
| Attribution | "experts say", "studies show", "many believe" | Name the source, or drop the claim |

## 3. Constructions

These survive vocabulary swaps, which is why they are the deepest tells.

| Construction | Example | Fix |
|---|---|---|
| Negative parallelism | "It's not a database, it's a way of thinking about data." | State the real claim directly |
| Participial tail | "Latency dropped 40%, highlighting the value of caching." | Split it. Say what happened, then say why it matters, if it does. |
| Reflexive rule of three | "fast, flexible, and powerful" | One specific claim beats three adjectives |
| Equivocation seesaw | "While the approach has drawbacks, it also offers benefits." | Say which drawbacks, and whether they matter here |
| Setup sentence | "This raises an important question." | Ask the question, or answer it |
| Elegant variation | Rotating "app", "application", "product", "solution" for the same thing | Repeat the right word |
| Mirroring the prompt | Opening by restating what was asked | Answer it |

## 4. Structural habits

- Uniform paragraph lengths down a whole document.
- Bullet points where prose belongs. A list of three sentences that depend on each other is a paragraph.
- Bold-term-colon lists used as a substitute for structure.
- Header mania: a heading for every two sentences.
- Emoji in headers, or anywhere in shipped output.
- A summary section that repeats the document with fewer words.

## 5. Tone

Puffery, uniform politeness, scripted empathy ("I completely understand how frustrating that must be"),
false-authority triple hedging, and LinkedIn voice. Also the two overcorrections: fake-casual ("look, here's
the thing") and confidence sanded into mush.

## 6. Punctuation

Em dash budget: **zero**. It is the single most recognized tell. Replacements, in order of preference: a
period, a colon when the second clause explains the first, a comma, parentheses for a genuine aside.

Also: no exclamation point in product copy, no ellipsis standing in for a thought that was not finished, no
scare quotes around a word you could simply pick better.

## 7. UI strings by surface

| Surface | Banned shape | Correct shape |
|---|---|---|
| Button | Slogan, gerund, "Now" | Imperative verb plus object: "Create project" |
| Empty state | Personality, apology, "Looks like" | Status, then the one action: "No invoices yet. Create one." |
| Error | "Oops", "Something went wrong", "Please try again" alone | Cause plus next action: "Card declined. Try another payment method." |
| Loading | "Please wait while we work our magic" | Nothing under 1s. A named action after: "Uploading 3 files." |
| Offline | "Connection issues detected" | "Offline. Your changes will sync when you reconnect." |
| Permission | "We need access to continue" | The specific reason for this specific permission |
| Toast | "Success!" plus an adverb | "Saved." |
| Destructive confirm | "Are you sure?" alone | Name what is lost: "Delete 12 photos? This cannot be undone." |

## 8. Code smells with the exact fix

| Smell | Grep-able signature | Fix |
|---|---|---|
| Speculative generality | An interface, protocol, or abstract class with exactly one implementation | Inline it. Add the seam when a second real implementation exists, or when a test needs it. |
| Silent catch | `catch` or `except` with an empty body, a bare `pass`, or a lone log line | Catch the specific type at a boundary that can act. Comment which failure it exists for. |
| Comment restating code | Comment and code say the same thing | Delete the comment, or replace it with the reason |
| Unused parameter | A parameter no call site passes differently | Remove it |
| Config with one call site | A key read in exactly one place, never set to a non-default | Make it a constant |
| Dead export | An exported symbol with zero call sites and zero test references | Delete it |
| Dead compatibility shim | An old path kept "just in case", with nothing calling it | Delete it, or give it a deprecation date and a tracked removal |
| Verbose identifier | Names that describe their own type | Shorten to the shortest name that stays precise |
| Swallowed write failure | A catch around a mutation with no rollback and no user-visible outcome | Roll back the optimistic state and surface a named error |

The two-sided evidence, both of which belong in the same review: generated code trends stylistically
over-defensive (broad catches, excess null checks) while being substantively under-defensive. One study of
roughly 1,689 generated programs across 89 scenarios found around 40 percent contained a vulnerability in the
MITRE CWE Top 25. Independent analyses of change data over the same period show code duplication rising
roughly fourfold and the refactoring share of changes falling from about 25 percent to under 10. Generated
code accretes instead of consolidating. The sweep exists to push back on that specific drift.

## 9. What is not slop

Do not sand off these while sweeping:

- A genuinely uncertain claim, stated once, plainly.
- A technical term with no shorter accurate substitute.
- Repetition of the correct word rather than a synonym rotation.
- A long identifier that buys real precision.
- A defensive check at a real trust boundary.
- The activation receipt line. It is a log line, not prose, and it is exempt from every sweep here.
