# Banned patterns

The cluster test decides pass or fail: pick any 150-word stretch; more than one hit from this file and it is
not done. Presence of a single item is normal human writing. Density is the signature.

## Contents

1. Words
2. Phrases
3. Sentence constructions
4. Structural habits
5. Tone
6. Punctuation
7. UI and product copy
8. Why this list is not a matter of taste

## 1. Words

delve, leverage, foster, robust, seamless, seamlessly, vibrant, crucial, pivotal, tapestry, realm, testament,
myriad, synergy, stakeholders, holistic, nuanced, multifaceted, underscore, showcase, showcasing, garnered,
grappling, meticulous, meticulously, intricate, intricately, comprehensive, invaluable, notably, elevate,
empower, unlock, harness, navigate (figurative), landscape (figurative), journey (figurative), ecosystem
(non-biological), game-changer, cutting-edge, state-of-the-art, best-in-class, world-class.

Replace with the specific thing. "Robust error handling" says nothing; "retries twice on a 502 and gives up on
a 400" says what it does.

## 2. Phrases

**Openers:** "In today's fast-paced world", "In the ever-evolving landscape of", "As we navigate", "Gone are
the days", "Picture this", "Let's dive in", "Buckle up".

**Middles:** "It's important to note", "It's worth noting", "That being said", "At the end of the day",
"When it comes to", "In order to" (use "to"), "The fact of the matter is", "Needless to say", "As previously
mentioned".

**Closers:** "In conclusion", "To sum up", "Ultimately", "The bottom line is", "Only time will tell",
"One thing is certain", "The possibilities are endless", "Whether you're a beginner or a pro".

**Framing:** "This raises an important question", "But here's the thing", "Here's why that matters",
"Let that sink in".

## 3. Sentence constructions

These survive vocabulary swaps and are the deepest tells.

| Construction | Example | Fix |
|---|---|---|
| Negative parallelism | "It's not just a tool, it's a platform." | State the claim once, positively |
| Participial tail | "Sales rose 12%, highlighting the strategy's success." | Split into two sentences, or drop the tail. Instruction-tuned models produce this at several times the human rate |
| Rule of three | "fast, flexible, and powerful" | Pick the one that is true and specific |
| Vague attribution | "Experts say", "Studies show", "It is widely believed" | Name the source, or drop the claim |
| Equivocation seesaw | "While X presents challenges, it also offers opportunities." | Take a position |
| Setup sentence | "There are several things to consider here." | Deliver the content instead of announcing it |
| Elegant variation | rotating synonyms for the same noun across a paragraph | Repeat the word. Readers track repetition better than synonyms |
| Mirroring the prompt | restating the request as the first sentence of the answer | Start with the answer |
| Triple hedging | "may potentially help to possibly improve" | Hedge once, plainly, or not at all |

## 4. Structural habits

- Every paragraph the same length, usually three or four sentences.
- Bullet points where prose would carry the argument better.
- Bold-term-colon lists as a substitute for sentences.
- A heading every two paragraphs.
- An introduction summarizing what the piece will say, followed by the piece saying it.
- A conclusion restating the introduction.
- Emoji in headings, anywhere.

## 5. Tone

- Puffery about the subject or the reader.
- Uniform politeness that never varies with the content.
- Scripted empathy: "I understand how frustrating that can be."
- False authority through hedged triples.
- The register where every noun gets a value-laden adjective.
- Praising the user's question, the user's code, or the assistant's own output.

## 6. Punctuation

- **Em dash: budget zero.** It is currently the single most recognized tell. Use a comma, a colon, a period,
  or parentheses.
- Exclamation points in technical writing.
- Semicolons used decoratively rather than to join two independent clauses.
- Quotation marks around a word to signal irony.
- Ellipses for dramatic pause.

## 7. UI and product copy

| Surface | Tell | Fix |
|---|---|---|
| Button | "Get Started Now", "Unlock Your Potential", "Supercharge Your Workflow" | The literal action and object: "Create project", "Export CSV" |
| Empty state | "Looks like it's a little quiet here!" | What is missing and the one action that fixes it: "No projects yet. Create one." |
| Error | "Oops! Something went wrong on our end." | Name the failure and the next action: "Upload failed: file exceeds 25 MB." |
| Onboarding | "Whether you're a beginner or a pro, our seamless onboarding..." | One sentence, the actual first step |
| Landing copy | "Revolutionize the way you X", three adjectives in a row | One real number or named capability: "Cut deploy time from 40 minutes to 90 seconds" |
| Toast | "Success! Your changes have been saved seamlessly." | "Saved." |
| CLI output | a banner, a summary of what is about to happen, decorative separators | The result, or an exit code |

## 8. Why this list is not a matter of taste

A vocabulary analysis of more than 15 million biomedical abstracts from 2010 to 2024 found an abrupt,
discipline-crossing spike in exactly these words after late 2022, larger than the effect of major world
events. At least 13.5% of 2024 abstracts carry the signature, reaching 40% in some subfields. Measured
fold-increases include "delves" at 28 times, "underscores" at 13.8 times, and "showcasing" at 10.7 times,
alongside a 291-word excess-style list that overlaps almost exactly with section 1 above, arrived at by an
independent method.

The code-side claims have their own evidence. Code churn, meaning lines reverted or rewritten within two weeks
of being authored, was projected to double in 2024 against a 2021 baseline across roughly 153 million changed
lines. Refactoring fell from about 25% of changes in 2021 to under 10% in 2024, and duplication rose about
fourfold. A study of 1,689 generated programs across 89 scenarios found roughly 40% contained a
top-25-class vulnerability. A later analysis reported generated code carrying 2.74 times the vulnerabilities
of human-written code, and a 2025 review found functional correctness improving sharply over three years while
security did not improve at all. Treat these as convergent evidence of direction and magnitude rather than as
precise constants.
