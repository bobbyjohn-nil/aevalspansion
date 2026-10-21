---
name: ccforge-explain
description: >-
  Explains a mechanism, a failure, a trade-off, or a diff at the altitude the reader needs, separating documented
  behavior from inferred behavior and attaching calibrated confidence to each claim. Use when asked how something
  works, why a decision was made, what a change does, or to write a decision record, PR description, or review
  comment. Use this even when the user does not name it. Not for authoring skills; use ccforge-authoring.
metadata:
  pack: ccforge
  kind: explain
  domain: meta,communication
  version: "1.0.0"
---

# CCForge Explain

Turns an understanding into an explanation a specific reader can act on. Standalone; assumes no other skill ran.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-explain only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-explain (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill defines how this team documents decisions, use its format. This skill supplies the
altitude and calibration rules that a house format usually leaves open.

## Decide the altitude first

Explanation is a series of disclosure decisions. Two questions settle almost everything:

1. **What does this reader already have?** Someone who has used the pattern before needs the terse mechanic.
   Someone who has not needs one worked example first. This reverses with expertise: a worked example actively
   slows down a reader who already has the schema.
2. **What will they do with it?** Deciding, debugging, and learning need different shapes.

Then hold to two rules:

- **Mental model before mechanics.** One or two sentences of how the thing behaves, then the details. A reader
  who has the model can reconstruct details; a reader with details and no model cannot.
- **Two disclosure levels, never three.** Level 1 is the one-paragraph summary that stands alone. Level 2 is
  the full detail. Designs past two levels lose people between the levels.

## Worked examples, in the right dose

One example is often not enough; add a second, more complex one. A third of the same shape adds nothing
measurable. Variety beats repetition and returns diminish quickly. The strongest sequence is a full worked
example, then a partially worked one, then the reader does it.

An analogy is used once and dropped. Land one specific point with it, then finish in the real domain's own
terms. Every analogy leaks, and the parts of the source that do not map are exactly where a reader who leans
on it gets misled.

## Documented, inferred, observed

In this domain the same sentence can be a documented guarantee or somebody's guess, and the reader cannot tell
by reading it. Mark which:

| Tag | Means | Reader's action |
|---|---|---|
| documented | stated in official documentation you can point at | rely on it |
| observed | you ran it this session and saw the output | rely on it for this version and setup |
| inferred | consistent with documented behavior but not stated | verify before depending on it |
| unverified | you cannot support it | treat as a hypothesis, or delete it |

Version-gate anything version-dependent rather than stating it flatly. "Since v2.1.x, X" is a claim someone can
check. "X works like this" quietly becomes false and nobody notices. When you do not know the version boundary,
say which version you observed it on.

## Calibrated confidence

Attach confidence to the specific claim, never as a blanket disclaimer at the end.

| Phrase | Rough band |
|---|---|
| almost certain | 95% and above |
| very likely | 80 to 95% |
| likely | 60 to 80% |
| unclear | 40 to 60% |
| unlikely | 20 to 40% |
| very unlikely | below 20% |

Pair a load-bearing claim with its flip condition: "this holds unless the repo has a nested skills directory".
A position with no flip condition is dogma, and a reader cannot test it.

Hedge once, plainly, or not at all. Triple hedging conveys less than a plain uncertainty and costs more words.

## Shapes, by what the reader needs

| Reader need | Shape |
|---|---|
| Decide, now | Conclusion or ask in sentence one, everything after it skippable |
| Understand a past decision | Decision record: context, decision, consequences both directions |
| Choose between options | Trade-off table: rows are options including doing nothing, columns are the two to four goals that matter |
| Review a change | Change brief: imperative first line, then problem, approach, shortcomings, and what was not done |
| Give feedback on someone's work | Labeled comments: `issue:`, `suggestion:`, `nitpick:`, `question:`, `note:` |
| See a structure | A diagram for topology, flow, or hierarchy. A table for comparing more than two dimensions |

Do not force a flowchart onto a comparison, or a table onto a sequence. Templates are in
`references/templates.md`.

## Say what you did not do

The honest version of a trade-off is a non-goals section: things that could reasonably have been goals and
were deliberately excluded. That is a specific, falsifiable claim, unlike a caveat paragraph. Pair it with the
alternatives considered, and state plainly why each lost, in terms someone who preferred it would recognize.

Applied to a change: a description that only lists what the change does is incomplete. Name the shortcomings
and the deliberate omissions. The reviewer standard to hold yourself to is that the change clearly improves
things, not that it is perfect.

## Quality checklist

- [ ] The reader and what they will do with this are named, at least to yourself, before writing.
- [ ] A mental model appears before any mechanism.
- [ ] No more than two disclosure levels exist.
- [ ] Every behavioral claim is marked documented, observed, inferred, or unverified.
- [ ] Every version-dependent claim is version-gated, or names the version observed.
- [ ] Confidence phrases attach to specific claims, not to the whole answer.
- [ ] Every load-bearing claim carries a flip condition.
- [ ] What was deliberately not done is stated.
- [ ] At most one analogy, used once and dropped.

## Reference files

| File | Read when |
|---|---|
| `references/templates.md` | Writing a decision record, change brief, trade-off table, or review comment |
