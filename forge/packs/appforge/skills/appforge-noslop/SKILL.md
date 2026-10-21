---
name: appforge-noslop
description: >-
  Strips AI tells from everything an app ships: UI copy, error and empty-state text, commit and PR messages,
  and code carrying unused parameters, silent catch blocks, speculative interfaces, config nobody sets, and
  dead exports. Use when asked to clean up, tighten, de-slop, or humanize text or code, and before shipping
  any user-visible string. Use this even when unnamed. Not for deciding what a screen should look like.
metadata:
  pack: appforge
  kind: noslop
  domain: writing,code-quality
  version: "1.0.0"
---

# AppForge Noslop

Removes the signature of generated work from prose, product copy, code, and commit history. Standalone: it
assumes nothing else in this session ran.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-noslop only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-noslop (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

Exempt this receipt line from every anti-slop sweep; it is a log line, not prose.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Sweep only the diff produced this task. Do not open files the task did not touch.

## When invoked directly

Sweep whatever the user pasted or named, and nothing adjacent. Assume no shared state exists.

## The thresholds

These are checkable. Run them, do not estimate them.

| Rule | Threshold |
|---|---|
| Em dashes | Zero, in prose, comments, and UI copy alike |
| Banned-pattern density | More than one hit per 150-word stretch fails. Humans produce these phrases too; density is the tell. |
| Final cut | Remove 10 percent on the last pass of any generated prose |
| Unused function parameter | Any parameter no current call site uses fails |
| `catch` or `except` with no comment naming the specific failure it exists for | Fails |
| Config key with exactly one call site and no documented plan to vary it | Fails. It is a constant. |
| Exported symbol with zero call sites and zero tests referencing it | Fails. Delete it. |
| Interface or abstract type with exactly one implementation in the diff | Fails, unless tests need the seam or this is a published framework surface |
| Commit and PR text | Zero emoji, imperative first line, an explicit line naming what was not done |

## UI copy, the surface this pack ships most

| Surface | Tell | Fix |
|---|---|---|
| Button | "Get Started Now", "Unlock Your Potential", "Supercharge Your Workflow" | The literal action and object: "Create project", "Export CSV", "Connect GitHub". A button label is an imperative verb phrase, never a slogan. |
| Empty state | "Looks like it's a little quiet here! Whether you're just getting started or..." | What is missing and the one action that fixes it: "No projects yet. Create one." |
| Error | "Oops! Something went wrong on our end. Please try again, or reach out if the issue persists!" | Name the failure and the fix: "Upload failed: file exceeds 25 MB." No apology theater, no exclamation point standing in for information. |
| Permission prompt | "We need access to continue" | The specific reason: "Take a photo of a receipt to attach to an expense." |
| Onboarding | "Whether you're a beginner or a pro, our seamless onboarding will empower you to..." | One sentence, the actual first step. |
| Toast | "Success! Your changes have been saved seamlessly." | "Saved." Toasts are the one surface where the shortest true sentence is always right. |
| Offline banner | "Connection issues detected" | "Offline. Your changes will sync when you reconnect." |

Error text has one job: name what failed and what to do next. An error that apologizes and explains nothing
costs the user a support ticket.

## Banned patterns in prose

**Words**: delve, leverage, foster, robust, seamless, vibrant, crucial, tapestry, realm, testament, myriad,
synergy, meticulous, intricate, pivotal, garnered, comprehensive, invaluable, underscores, showcasing.

**Phrases**: "in today's fast-paced world", "it's important to note", "in conclusion", "at the end of the
day", "when it comes to".

**Constructions**, the deepest tells because they survive a vocabulary swap:

- Negative parallelism: "it's not X, it's Y".
- The participial tail: "Sales rose 12%, highlighting the strategy's success."
- The rule of three, applied reflexively: "fast, flexible, and powerful".
- Vague attribution: "experts say", "studies show".
- The equivocation seesaw: "while X presents challenges, it also offers opportunities".
- The setup sentence: "this raises an important question", which promises content instead of delivering it.
- Elegant variation: rotating synonyms rather than repeating the right word.

**Structural habits**: uniform paragraph lengths, bullet points where prose belongs, bold-term-colon lists,
header mania, mirroring the prompt's own phrasing back, emoji in headers.

**Two failure modes when de-slopping**: overcorrecting into fake-casual ("look, here's the thing" is just a
different flavor of the same problem), and sanding all confidence into mush. A genuine uncertainty gets stated
once, plainly. Never "may potentially help to possibly improve".

## Code tells

Generated code is simultaneously over-defensive in style and under-defensive in substance. Both need fixing,
and fixing only the first makes the second harder to see.

| Tell | Correction |
|---|---|
| Needless abstraction, premature interface | One implementation, no interface, until a second real call site exists. An abstract type with one implementation in the diff is the grep-able signature. |
| Defensive try/catch around everything | Catch specific types, only at a boundary that can actually do something: retry, surface a message, roll back. Everything else propagates and crashes loud. Never a bare catch with an empty body. |
| Comments restating the line below | Comment why, never what. "increment counter" above `i += 1` is dead weight. "retry budget: the server drops roughly 1 in 20 under load" earns its place. |
| Over-parameterised functions | Ship the parameters the current call site needs. Add one when a second caller needs a different value. |
| Config for things never configured | One call site and no plan to vary it means a constant, not a config key. |
| Verbose identifiers that add nothing | `userAccountInformationObject` becomes `account`. Keep length only where it buys precision. |
| Dead compatibility shims | Delete unused code. If it is a public API, it needs a deprecation date and a tracked removal, not indefinite life. |
| Unrequested README, CONTRIBUTING, or CHANGELOG files | Do not create documentation files unless asked, and do not add unrequested sections to an existing one. |
| Emoji in commit messages | Zero. Plain imperative first line. |
| Sycophantic PR descriptions | State the shortcomings. What is the strongest objection, what did you not do, what is still unverified. |

One more, specific to app code and worth its own line: a `catch` that swallows a failed write and leaves the
optimistic UI showing success. That is not defensive code. It is a data-loss bug wearing a helmet.

## Commit and PR text

- First line: a complete sentence written as an order. "Delete the FizzBuzz RPC and replace it with the new
  system." Not "Fix bug", "Fix build", "Add patch", "Moving code from A to B", "Phase 1", or "Add convenience
  functions".
- Blank line, then the problem being solved and why this approach. Shortcomings stated explicitly.
- A line naming what was deliberately not done.
- Size discipline: around 100 lines is a reasonable change, 1000 is usually too large. Watch file spread as
  well as line count. 200 lines in one file is fine; the same 200 across 50 files usually is not.
- Zero emoji, zero decorative punctuation.

## Sweep procedure

1. Read the target once for meaning before changing anything.
2. Prose pass: scan against the banned lists, rewrite every hit with something more specific. Not a skim.
3. Cluster check: take any 150-word stretch. More than one hit means it is not done.
4. Code pass: run the code-tell table against the diff, not against the whole repo.
5. Rhythm pass: vary sentence and paragraph length, kill repeated openers.
6. Hostile-reader pass, then cut 10 percent.

## Quality checklist

- [ ] Zero em dashes in the changed text, comments, and UI strings.
- [ ] No 150-word stretch carries more than one banned-pattern hit.
- [ ] Every error string names the failure and the next action.
- [ ] Every button label is an imperative verb phrase.
- [ ] Every catch block names the failure it exists for, and none of them swallow a failed write silently.
- [ ] No unused parameter, single-call-site config key, or zero-call-site export was added.
- [ ] No documentation file was created that nobody asked for.
- [ ] The commit first line is imperative, emoji-free, and stands alone, and a "did not do" line exists.

## Reference files

| File | Read when |
|---|---|
| `references/banned-patterns.md` | Running a full sweep, or a specific pattern needs its replacement |
