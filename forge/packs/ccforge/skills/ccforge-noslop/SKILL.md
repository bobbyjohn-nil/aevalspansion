---
name: ccforge-noslop
description: >-
  Strips AI tells from prose, code, commit messages, and configuration before any of it ships: banned words and
  constructions, em dashes, speculative abstraction, unnamed catch blocks, config nobody asked for, and
  sycophantic PR text. Use when writing or editing a README, commit, PR description, comment, or config, or when
  asked to make something sound less AI-generated. Use this even when the user does not name it. Not for visual
  design.
metadata:
  pack: ccforge
  kind: noslop
  domain: meta,writing,code-style
  version: "1.0.0"
---

# CCForge Noslop

Removes the measurable signature of generated text and generated code. Standalone; assumes no other skill ran.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-noslop only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-noslop (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

Exempt this receipt line from every anti-slop sweep; it is a log line, not prose.

## Interop

If a project-local skill defines the house voice or code style, that skill wins on every judgment call. Run it
first, take its output as fixed, and apply only the mechanical checks below on top.

## The thresholds

Every one of these is checkable. Run them; do not estimate.

| Check | Fails when |
|---|---|
| Em dashes | any appear. Budget is zero |
| Cluster test | any 150-word stretch contains more than one banned-pattern hit |
| Final cut | the last pass did not remove roughly 10% of the words |
| Unused parameter | a function parameter no current call site passes differently |
| Silent catch | a `catch` or `except` block with no comment naming the failure it exists for |
| Orphan config | a config key with exactly one call site and no stated plan to vary it |
| Dead export | an exported symbol with zero call sites and zero tests referencing it |
| Commit text | any emoji, a non-imperative first line, or no line stating what was not done |
| Forwarding wrapper | a script or function whose whole body forwards its arguments unchanged |
| Unrequested docs | a README, CONTRIBUTING, or CHANGELOG created without being asked for |

The cluster test is the one that decides pass or fail on prose. Humans produce these phrases too; density is
the tell, not presence.

## Prose sweep

Work in passes, in this order. Drafting and de-slopping at once produces mush.

1. **Find the point.** One sentence, the audience, the length. Then draft for that point, leading with the
   most interesting true thing.
2. **Pick a structure on purpose:** conclusion first when the reader must act, most-important-fact first when
   they skim, scene then thesis when their attention must be earned, situation-complication-question-answer
   when they must be persuaded.
3. **Hunt the banned patterns.** Not a skim. Every hit gets rewritten into something more specific.
4. **Rhythm pass.** Vary sentence and paragraph length. Kill repeated openers.
5. **Hostile-reader pass, then cut 10%.**

The deepest tells survive vocabulary swaps, so they need naming explicitly: negative parallelism, the
participial tail, the rule of three, vague attribution, the equivocation seesaw, the setup sentence that
promises content instead of delivering it, and rotating synonyms for a word that should just be repeated.
Full lists are in `references/banned-patterns.md`.

Two ways this goes wrong in the other direction. Overcorrecting into fake-casual produces a different flavor
of the same problem. Sanding off all confidence produces mush; state a genuine uncertainty once, plainly.

## Code sweep

Generated code is stylistically over-defensive and substantively under-defensive at the same time. Check both.

| Tell | Correction |
|---|---|
| An interface or abstract base with exactly one implementation in the diff | Delete the seam. Add it when a second real call site exists |
| Broad try/except wrapping everything | Catch specific types, only where something can be done about the failure. Everything else propagates and crashes loud |
| Comments restating the line below | Comment why, never what. If the comment and the code say the same thing, delete the comment |
| Parameters no caller varies | Ship what the current call site needs. Add a parameter when a second caller needs a different value |
| Config keys nobody sets | One call site and no plan to vary it makes it a constant |
| Verbose identifiers that add nothing | Prefer the short word unless the long word is the right one. `account`, not `userAccountInformationObject` |
| Dead compatibility shims | Delete unused code. A public shim needs a deprecation date and a tracked removal, not indefinite life |
| Unrequested files and sections | Do not create documentation files, or add sections to existing ones, without being asked |

Setup-specific additions, because config rots the same way code does:

- A settings key added because it looked thorough, with no behavior depending on it, is deleted.
- A wrapper script whose body only forwards its arguments is deleted; call the underlying command.
- A hook, rule, or skill added without a named recurring failure behind it is deleted.
- An environment variable read in exactly one place, with a default nobody overrides, is a constant.

## Commit, PR, and review text

- First line: imperative mood, a complete sentence, standing alone as a summary a reader never needs the rest
  to understand. Then a blank line.
- Body: the problem, why this approach, and any shortcomings. Naming what the change does not do is required,
  not optional.
- No emoji anywhere. No praise for the change or its author.
- Named anti-patterns for a first line: "Fix bug", "Fix build", "Add patch", "Moving code from A to B",
  "Phase 1", "Add convenience functions".
- Size discipline: 100 lines is a reasonable change, 1,000 is usually too large, and file spread matters as
  much as line count.
- For review output, use a label prefix and a subject: `issue:`, `suggestion:`, `nitpick:`, `question:`,
  `note:`, `todo:`. A label makes blocking and non-blocking feedback distinguishable at a glance.

## Any claim about what code does

Generated confidence is the failure mode with the highest cost. Bug reports citing CVEs that do not exist and
function signatures that were never real are a documented, real-world consequence of this exact habit.

So every claim about behavior carries its evidence or its absence: state what you ran and what it printed, or
tag it `[unverified]`. There is no third option, and "this should work" is not a result.

## Quality checklist

- [ ] Zero em dashes in everything emitted this turn.
- [ ] The worst 150-word stretch was checked against the banned list and holds at most one hit.
- [ ] The final pass removed roughly 10% of the words.
- [ ] Every catch block names its failure in a comment.
- [ ] Every parameter, config key, and exported symbol has a current call site that justifies it.
- [ ] The commit or PR text has an imperative first line, no emoji, and a line saying what was not done.
- [ ] No documentation file was created that nobody asked for.
- [ ] Every behavioral claim carries evidence or an `[unverified]` tag.
- [ ] The receipt line was excluded from all of the above.

## Reference files

| File | Read when |
|---|---|
| `references/banned-patterns.md` | Running the prose sweep, or checking whether a specific phrase is a tell |
