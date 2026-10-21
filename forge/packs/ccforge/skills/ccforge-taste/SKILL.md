---
name: ccforge-taste
description: >-
  Judges workflow decisions in Claude Code: whether a proposed skill, hook, rule, agent, or MCP server should
  exist at all, whether to delegate or do it inline, whether to plan or act, whether a hook beats a reminder, and
  when to stop and clear. Use before adding anything to a setup, when a setup feels heavy or noisy, or when a
  session stops behaving. Use this even when the user does not name it. Not for visual design; use webforge-taste.
metadata:
  pack: ccforge
  kind: taste
  domain: meta,workflow
  version: "1.0.0"
---

# CCForge Taste

Decides whether a piece of setup should exist, and how it should read. Called by `ccforge-orchestrator` before
a builder specialist, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-taste only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-taste (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If the user's own skills encode a house style for setup, that style wins. This skill supplies judgment for
decisions their conventions do not already settle.

## When called by the orchestrator

Take the setup posture and the assumption ledger as given. Rule on the specific decision in front of you and
hand back a verdict plus its criterion, in two lines. Do not re-open decisions the orchestrator already made.

## When invoked directly

Name the artifact being judged and the setup it would join before ruling. If the setup was never read, read
it: a ruling on whether a thing should exist is worthless without knowing what already exists.

## The governing bias

Every addition is permanent until someone deletes it, and most people never delete. A setup gets worse the way
a codebase does: one reasonable addition at a time. Default to not adding. When you do add, add the smallest
thing that fully covers the case.

**Deleting a dead skill, rule, or hook is a win and should be reported as one.** Not a cleanup chore, not a
consolation prize when a feature request is refused. A shorter setup with the same behavior is strictly
better, and saying so out loud is part of the job.

## Gate: should this exist

Applies to every proposed skill, hook, MCP server, subagent, rule file, output style, and memory line.
Answer all three in one line each. If any one is unanswerable, do not add it, and say which one failed.

1. **What recurring task or failure does it replace?** Name the instances. Two is a pattern, one is an
   anecdote, zero is a preference.
2. **What goes wrong if it does not exist?** If the honest answer is "nothing, it would just be tidier",
   stop here.
3. **What does it cost, forever?** Context per request, latency per tool call, a file someone maintains, or a
   new failure mode. Every artifact has one; state it.

## Rulings

These are opinions with reasons, not a menu. Take the default unless the named escape hatch applies.

### Delegate or do it inline

**Default: inline.** A subagent starts cold, re-gathers context, and returns only a summary you then have to
trust.

Delegate when the task produces verbose output you will never reference again: a broad search, a log dump, a
sweep across many files. That is the actual criterion, and it is about output volume, not task size or
importance.

Stay inline when the work needs back-and-forth, when several phases share heavy context, when the change is
small and targeted, or when latency matters. "It feels like a separate job" is not a reason; a separate job
that needs three clarifications is worse delegated.

### Plan or act

**Default: act,** for anything you could describe as a one-sentence diff.

Plan first when the change touches more than one subsystem, when a wrong initial direction would be expensive
to unwind, or when you cannot name the files that will change. Plan mode's value is preventing rework, so its
value scales with the cost of being wrong, not with the size of the task.

The failure mode on each side is real. Planning a two-line fix wastes a turn and a lot of tokens. Acting on a
schema change without a plan produces a migration nobody reviewed.

### A hook or a reminder

**Default: prose, in a skill or a memory line.** It is cheap, editable, and visible.

Use a hook when the behavior must happen every time and a miss is expensive. Prose is a request; a hook is
enforcement. The dividing question is not "how important is this" but "what happens the one time it is
skipped". If the answer is "nothing much", it stays prose.

Second consideration: a hook costs nothing until it fires, while a memory line costs context on every request
forever. For a rule that fires often and reads cheaply, a hook can be the cheaper artifact as well as the
stronger one.

Never encode the same rule in both. When they drift, the model has two contradictory sources and picks one.

### A skill, a rule, or a memory line

| The thing is | Make it |
|---|---|
| a fact every request in this repo needs | a memory line |
| a rule that applies only under certain paths | a `.claude/rules/*.md` with `paths:` |
| a multi-step procedure needed occasionally | a skill |
| a procedure needed in a second repo | a plugin |
| something Claude could learn by reading the repo | nothing |

### An MCP server or a CLI

**Default: the CLI.** `gh`, `aws`, `gcloud`, and their kind cost nothing in context, and Claude learns an
unfamiliar one from `--help`. An MCP server's tool names sit in context whether or not you use it.

Add a server when no CLI exposes the data, or when the interaction is genuinely structured rather than
textual. Then audit it monthly and remove what went unused.

### When to stop and clear

Clear, do not push through, when any of these is true:

- An unrelated task got mixed into this session. Clear between tasks.
- You have corrected the same issue twice. The context now contains two failed approaches that keep pulling
  the model back toward them.
- Instruction adherence is visibly degrading: earlier constraints being dropped, more small mistakes.
- The receipt line stopped appearing when it should have.

`/clear` costs nothing. `/compact` re-reads the whole conversation to summarize it, so compacting a huge
context is itself a large request. Prefer `/clear` plus a re-prompt carrying what you learned. Reach for
`/compact <focus>` only when the conversation genuinely needs to continue, and always give it the focus.

Rewinding is the third option and the most precise one: `/rewind` restores code, conversation, or both to a
prompt checkpoint, and can summarize forward or backward from a point. Use it when one specific turn went
wrong, rather than throwing away everything after it.

### Effort

**Default: leave it alone.** The default level is chosen well. Raising effort on a simple task buys thinking
tokens you pay for and do not need; the highest levels are prone to over-thinking.

Raise it deliberately for a genuinely hard reasoning step, then put it back. `ultrathink` in one prompt asks
for depth on that turn only, which is usually what people actually want.

## Naming and legibility

- Names say what the thing does to what: `release-checklist`, not `helper`. Never `utils`, `tools`, `data`,
  `files`, or `documents`. A vague name does not trigger and does not remind its author what it was for.
- One default with one named escape hatch. A skill offering five libraries has made the reader do the work
  the skill existed to do.
- Output the user reads in under a second: a status line, a receipt line, an exit code. Not a banner, not a
  summary of what was about to happen, not a restatement of the request.
- Prefer the short word unless the long word is the right one. That applies to names, descriptions, commit
  subjects, and hook messages equally.

## Reviewing an existing setup

Walk it in this order, because each step makes the next cheaper:

1. **Delete.** Anything whose source no longer exists, whose rule is no longer true, or whose job another
   artifact took over. Report the count.
2. **Demote.** A memory line that only matters under some paths becomes a scoped rule. A rule that is really
   a procedure becomes a skill.
3. **Merge.** Two skills with overlapping descriptions compete for the same trigger and both under-fire.
4. **Sharpen.** A description that does not name when to use it, or a rule no diff could show violated.
5. **Only then add.** Anything still missing after the first four steps has earned the Gate.

## Quality checklist

- [ ] The three Gate questions were answered in one line each for every proposed artifact.
- [ ] Anything refused names the failing question rather than being softened into a maybe.
- [ ] Every ruling given cites its criterion, not a preference.
- [ ] The ongoing cost of every addition is stated in the delivery.
- [ ] Any deletion made is reported as a result, with a count.
- [ ] No rule was encoded in two places.
- [ ] Nothing proposed carries a name that could be `utils`.
