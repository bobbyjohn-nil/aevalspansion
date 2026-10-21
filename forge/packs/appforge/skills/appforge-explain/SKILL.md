---
name: appforge-explain
description: >-
  Explains an app decision, system, or diff at the altitude the reader needs, with calibrated confidence:
  mental model before mechanics, two disclosure levels at most, a decision record or trade-off table where one
  belongs, and an explicit statement of what was not done. Use when asked how something works, why an approach
  was chosen, or for an ADR, design doc, or PR description. Use this even when unnamed. Not for writing the
  code.
metadata:
  pack: appforge
  kind: explain
  domain: docs,communication
  version: "1.0.0"
---

# AppForge Explain

Turns a decision, a system, or a diff into something a specific reader can act on. Standalone: it assumes
nothing else in this session ran.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-explain only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-explain (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Explain what was built and what it cost. Reuse the assumption tags already assigned; do not re-derive them.

## When invoked directly

Ask who reads this and what they do differently after reading, then write. Assume no shared state exists.

## Altitude first

Before writing a word, answer three questions:

1. **Who reads this, and what do they already know?** The answer changes the whole shape, not the vocabulary.
2. **What do they do differently after reading?** If nothing, do not write it.
3. **Mental model or mechanics?** Always the model first: what kind of thing is this, what does it do, what
   does it talk to. Mechanics only after the model has landed.

**Two levels of disclosure, never three.** Level one is a paragraph that stands alone. Level two is the full
detail: the trade-off table, the sequence, the code. A third level loses the reader between levels more often
than it helps.

**Worked examples are for readers without an existing model.** One concrete example first, then a second only
if it is meaningfully different in kind. A third of the same shape adds nothing measurable. If the reader has
already used this pattern in this repo, skip the example and give the terse mechanic: for an expert, the
worked example actively slows reading down.

**Analogies land once, then get dropped.** One sharp analogy makes an abstract mechanism visible. Extending it
for a paragraph turns it into a crutch, and every analogy leaks exactly where the source domain stops mapping.
State it, use it for one specific point, then finish in the real domain's own terms.

## Format selection

| Situation | Format |
|---|---|
| A choice was made that a future reader will question | Decision record |
| Options were weighed against goals | Trade-off table: rows are the options including "do nothing", columns are the two to four goals that matter |
| A change needs review | Change brief |
| Topology, flow, hierarchy, a state machine | Diagram. Mermaid where it renders, ASCII where it does not. |
| More than two discrete dimensions being compared | Table. Do not force a flowchart onto a comparison. |
| The reader has to act | One-paragraph summary with the conclusion or ask in sentence one |

Full templates are in `references/templates.md`.

## Calibrated confidence

Attach confidence to the specific claim, never as a blanket disclaimer at the end. A trailing "this may not be
accurate" degrades every sentence equally, which is the same as saying nothing.

Use the three-tag ledger rather than probability words. It maps to an action, which is what makes it stick:

| Tag | Meaning | What the reader should do |
|---|---|---|
| `[VERIFIED]` | Confirmed by a file read, a command run this session, or the user's own words | Build on it |
| `[INFERRED]` | Derived from something verified, not directly checked | Reasonable to act on, cheap to confirm |
| `[ASSUMED]` | Unverified convention or default | Check before anything expensive depends on it |

When a probability word is genuinely the right register, keep the bands coarse and consistent: almost certain
around 95 percent or more, very likely 80 to 95, likely 60 to 80, unclear 40 to 60, unlikely 20 to 40, very
unlikely under 20. Do not mix a band with a hedge word; that is triple hedging with extra steps.

Every load-bearing claim gets a flip condition: "this holds unless X". A position with no flip condition is
dogma, and a reader cannot check it.

## What was not done

This is a required section, not a caveat paragraph. Two parts:

- **Non-goals**: things that could reasonably have been goals and were deliberately excluded. State them as
  specific, falsifiable claims.
- **Alternatives considered**: the options that lost, and what they lost on. Name each one specifically enough
  that someone who preferred it would recognize their own position, then say why it lost.

This is not both-sides hedging. "While there are trade-offs on both sides" is exactly the pattern to avoid.

## Reviewing and being reviewed

Review comments use a label, then the subject: `praise`, `nitpick`, `suggestion`, `issue`, `todo`, `question`,
`thought`, `chore`, `note`. `nitpick`, `thought`, and `note` are non-blocking by convention, and saying so
saves an argument about whether a comment blocks the merge.

The bar for approving is that the change definitely improves the overall health of the system, not that it is
perfect. Hold your own output to the same standard: better, not perfect, and say what is still unfinished.

## App-specific explanations that usually go wrong

| Question | The explanation that actually helps |
|---|---|
| "Why is this screen slow?" | Name the phase: startup init, frame render, JS thread work, or network wait. A phase, not an adjective. |
| "Why do I need a migration for this?" | Show the current shape, the new shape, and what happens to rows that exist today. |
| "Why can't this ship over the air?" | The concrete boundary: this change touches native code, a permission, or the SDK version, so it needs a new binary. |
| "Why did the store reject us?" | The guideline number, the reviewer's actual path, and the specific artifact that failed it. |
| "Why is this state in two places?" | Server state and client state are different problems. Name which one this is and who owns it. |
| "Why does it work on my phone?" | Name the difference: OS version, device class, permission already granted, warm cache, or a debug build. |

## Quality checklist

- [ ] The reader and what they do differently after reading are both named, at least to yourself.
- [ ] The mental model comes before the mechanics.
- [ ] There are at most two levels of disclosure.
- [ ] Each checkable claim carries `[VERIFIED]`, `[INFERRED]`, or `[ASSUMED]`, or is plainly common knowledge.
- [ ] Every load-bearing claim has a flip condition.
- [ ] Non-goals and rejected alternatives are stated, each with what it lost on.
- [ ] No blanket disclaimer at the end, and no triple hedging anywhere.
- [ ] Any analogy is used once and dropped.

## Reference files

| File | Read when |
|---|---|
| `references/templates.md` | Writing a decision record, change brief, trade-off table, or design doc |
