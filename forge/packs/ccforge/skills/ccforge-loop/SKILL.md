---
name: ccforge-loop
description: >-
  Improves a Claude Code setup against an on-disk ledger: measures what went wrong in real sessions, turns each
  recurring friction into one durable artifact (a rule, hook, subagent, or skill), runs setup gates, and stops on
  named conditions. Unlike the bundled /loop it carries a ledger, real gates, and stop conditions. Use when asked
  to keep improving a setup, even when the user does not name it. Not for product code; use webforge-loop.
metadata:
  pack: ccforge
  kind: loop
  domain: meta,workflow
  version: "1.0.0"
---

# CCForge Loop

Turns observed session friction into durable setup artifacts, one per iteration, against a ledger on disk.
Runs inline in this session, not as a background fork, so every iteration's receipt and checkpoint is visible.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-loop only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-loop (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Degradation watch

Standing rule. Emit a `/clear` nudge when any one of these is true:

1. Your previous reply in this session should have carried a `[skills: ...]` line and did not.
2. A compaction happened this session and you can no longer state, from context, what this skill's
   stopping rules or routing rules are.
3. The same defect has been corrected twice and reappeared.
4. You are about to start a task unrelated to the one this session started with.

The nudge is exactly one short line, placed directly above the receipt line, and never repeated more than
once per session:

    note: skill context is degrading - /clear, then re-run this request.

Do not explain the nudge. Do not soften it. Do not emit it when none of the four conditions hold.

## Interop

If a project-local skill already owns part of the work an iteration touches, invoke it for that part and take
its output as fixed. This loop supplies the ledger, the gates, and the stop conditions; it never overrides or
silently duplicates a skill the user wrote, and it names every skill it routed to in the receipt line.

## Hard rules this loop never breaks

1. Never delete, skip, comment out, or weaken a test to make a gate pass. If a gate-defining file
   (test, snapshot, lint config, budget config) changed in the same iteration the gate flipped from fail to
   pass, that iteration is rejected and logged as a BLOCKER, whatever the exit code says.
2. Never report a gate result you did not run this iteration. A remembered pass is not a pass.
3. Never invent a score. Report named gate results and a defect count by severity. Nothing else is a
   quality signal.
4. Never widen scope silently. A file outside the declared scope is either added to scope with a written
   reason, or reverted.
5. Never grandfather a late addition. Anything added after the first full gate pass gets its own fresh gate
   run before it is accepted.
6. Never keep iterating on a broken build with an unclear cause. Reset to the last good commit and narrow
   the next step.
7. A review cycle that changes nothing must record "clean pass" in the ledger. Going quiet is not an option.
8. When a stop condition fires, stop - including mid-polish.

Two more that are specific to editing a setup rather than a product:

9. Never write `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, or
   `skillOverrides` from inside the loop. Produce the snippet, put it in `DECISIONS.md`, and hand it to the
   user. Settings files are user-owned.
10. Never delete or rewrite a skill, agent, hook, or command the user authored. Propose it in `TODO.md` with
    the evidence and let the user decide.

## Preconditions

- Declare `scope` and `non_goals` in `state.json` before iteration 1. For this loop `scope` is a list of setup
  paths, for example `[".claude/skills/**", ".claude/rules/**", "CLAUDE.md"]`.
- **No evidence, no iteration.** This loop converts observed friction into artifacts. If nobody can name what
  went wrong, iteration 0 is collection: ask the user for one concrete transcript, error, or repeated
  correction, or read `PROGRESS.md` history. Building setup against imagined friction is how a CLAUDE.md gets
  to 400 lines.
- Iteration 0 for an existing setup is characterization: record the current gate vector and current memory
  line counts, and commit that. Without a pin, every later regression is an unanswerable "did I break it".
- Choose enforcement strength up front: in-prompt for a bounded run, a Stop hook for anything running with
  less supervision. Any Stop hook must check `stop_hook_active` and exit 0 if true, or it fights the
  consecutive-block cap.

## Ledger - exact files, exact path

```
.claude/ccforge-loop/
  state.json      # machine state: iteration, gates, progress history, caps
  PROGRESS.md     # append-only, one block per iteration
  DEFECTS.md      # open/closed defect table
  DECISIONS.md    # what was chosen, what was rejected, why - plus any settings snippet for the user
  TODO.md         # remaining work, markdown checkboxes, BLOCKED: prefix for deps
```

Do not use `TodoWrite` or the Task tools as the ledger. They live only in context; a fresh session or a
subagent cannot read them, and the whole point of this loop is surviving a `/clear`.

`state.json` field names, do not rename:

```json
{
  "task": "one-sentence goal",
  "scope": [".claude/skills/**", "CLAUDE.md"],
  "non_goals": ["do not touch the user's own deploy skill"],
  "iteration": 7,
  "max_iterations": 25,
  "started_at": "2026-08-18T14:02:00Z",
  "gates": {
    "plugin_validate": {"cmd": "claude plugin validate ./ccforge --strict", "last_exit": 0, "last_run_iteration": 7},
    "memory_budget":   {"cmd": "wc -l CLAUDE.md",                            "last_exit": 0, "last_run_iteration": 7}
  },
  "progress_history": [
    {"iteration": 7, "gates_newly_passing": [], "defects_closed": 0, "defects_opened": 0}
  ],
  "no_progress_streak": 1,
  "status": "running"
}
```

`PROGRESS.md` block shape - real output, never a paraphrase:

```markdown
## Iteration 7 - 2026-08-18T14:31:00Z
Goal: stop the repeated "run the tests from the package dir, not the root" correction
GATE: plugin_validate | CMD: claude plugin validate ./ccforge --strict | EXIT: 0 |
GATE: memory_budget   | CMD: wc -l CLAUDE.md                           | EXIT: 0 | 118 CLAUDE.md
Changed: .claude/rules/testing.md
Result: converted the correction into a paths-scoped rule instead of a CLAUDE.md line, because it only
applies under packages/api/**. Kept CLAUDE.md at 118 lines.
Next: watch for the same correction once more before adding a PostToolUse hook.
```

`DEFECTS.md` uses the defect-log columns plus `STATUS` (`OPEN` / `FIXED (iter N)`). A defect `OPEN` for 3 or
more iterations without being touched is surfaced at escalation: it needs a decision, not another attempt.

## Gates

Register these before iteration 1. Record exit code and captured output every iteration.

| Gate | Command | Pass condition |
|---|---|---|
| plugin_validate | `claude plugin validate ./<pack> --strict` | exit 0. Run once per pack directory being edited |
| frontmatter | for each changed `SKILL.md`, confirm the file starts with `---`, the block closes, and `name:` matches the directory name | zero mismatches |
| trigger_alive | restart with `claude --debug` and grep the startup output for a skill parse error | no parse error naming a changed skill |
| memory_budget | `wc -l CLAUDE.md .claude/CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null` | every file under 200 lines |
| index_integrity | every `source_path` in `.claude/forge/skills-index.json` resolves | zero misses |
| hook_handler | run each changed hook handler standalone with sample JSON on stdin | expected exit code, and executable bit set |

Distinguish "the gate failed" from "the gate is broken". A validator that cannot find the directory is a setup
bug, not a fail. A `claude` binary not on PATH means the gate did not run; record that, do not record a pass.

`trigger_alive` needs a session restart, which this loop cannot perform. When an iteration changes frontmatter,
write the gate as `DEFERRED: needs restart` in the ledger and surface it at delivery. A deferred gate is never
a pass.

## Loop body, per iteration

1. Read `state.json`, the last 3 `PROGRESS.md` entries only, and open `DEFECTS.md` rows. Never re-read the
   full history.
2. Pick **one** item: highest severity, or the one blocking the most others. One focus per iteration.
3. Choose the artifact kind before writing anything. Use this table; it maps observed friction to the cheapest
   durable fix:

| Observed friction | Artifact |
|---|---|
| Claude gets a convention or command wrong twice | one CLAUDE.md line |
| That convention applies only under some paths | a `.claude/rules/*.md` file with `paths:` |
| You keep typing the same prompt to start a task | a user-invocable skill |
| You paste the same multi-step procedure a third time | a skill |
| You keep copying data from a tool Claude cannot see | an MCP server, or a CLI it can call |
| Claude reads many files just to find where a symbol lives | a code-intelligence plugin |
| A side task floods the conversation with output you will not reuse | route it through a subagent |
| Something must happen every time without asking | a hook. Prose is a request; a hook is enforcement |
| A second repository needs the same setup | package it as a plugin |

   Reach for the smallest artifact that fully covers the friction. A CLAUDE.md line costs context on every
   unrelated request forever; a skill costs only its description until invoked; a hook costs nothing until it
   fires. Escalate only when the smaller artifact has already failed once, and log that it failed.
4. Make the change. Do not touch files outside `scope`.
5. Run every registered gate. Capture exit code and output verbatim.
6. Diff the gate-defining files specifically. If a gate flipped to pass in the same iteration a gate-defining
   file changed, stop: that is a BLOCKER, not a pass.
7. Update `DEFECTS.md`, `DECISIONS.md`, `TODO.md`, `state.json` (`gates_newly_passing`, `defects_closed`,
   `defects_opened`, `no_progress_streak`).
8. Append the `PROGRESS.md` block with real output.
9. `git commit` when the touched area's gates pass. If the setup is broken and the cause is unclear,
   `git reset --hard` to the last commit whose gates passed and resume with a narrower step. Never amend a
   commit already reported as a passed gate; that erases the evidence trail.
10. Check stop conditions in order.

## Stop conditions, checked in order

| Order | Condition | Trigger | Action |
|---|---|---|---|
| a | Clean pass | every registered gate exits 0 in one iteration | stop, report success with evidence |
| b | Impossible | the goal cannot be satisfied as stated | stop immediately, escalate with the reason - do not burn the remaining cap |
| c | Regression | a previously-passing gate now fails from this loop's own change | stop, escalate; this outranks the original task |
| d | No progress | `no_progress_streak >= 2`: two consecutive iterations with zero gates newly passing, zero defects closed, zero defects opened | stop, escalate: converged without succeeding |
| e | Thrash | same file set touched in consecutive iterations and the gate vector at N equals the gate vector at N-2 | stop, escalate: the scope is wrong, not the implementation |
| f | Scope violation | a file outside `scope` was modified without a logged reason | stop, flag, revert or widen scope explicitly |
| g | Iteration cap | `iteration == max_iterations` | stop, escalate with the full ledger |

`no_progress_streak` increments when an iteration produces no newly-passing gate, no closed defect, and no
newly-discovered defect. It resets to 0 the moment any of the three is non-empty.

Iteration caps: default 10 for a single bounded task, 25 for a multi-file change. Always overridable by the
user. The cap is a backstop, never the primary stop signal; a loop that only ever stops at the cap cannot tell
converging early from giving up late.

Escalation is a handoff, not silence. On any stop other than (a), the final `PROGRESS.md` entry names the stop
condition that fired, and the open BLOCKER and MAJOR rows in `DEFECTS.md` are the handoff artifact. A human or
a post-`/clear` session reads that, not a prose summary.

## Pathology to signal

| Pathology | Detection signal |
|---|---|
| Reward hacking the gate | gate flips to pass while a gate-defining file changed in the same iteration |
| Test deletion or weakening | test file line count drops, assertion loosened, `.skip` added |
| Scope creep | files touched outside `scope`, or diff grows with no new defect entry justifying it |
| Over-refactoring | gate vector unchanged for 2 iterations while diff size keeps growing |
| Verification theater | a ledger `PASS` with no attached exit code from this iteration |
| Sandbagging | 3 or more iterations of surface patches to the same root defect - re-plan, do not patch again |
| Novelty drift | a late diff touches files never mentioned in earlier `PROGRESS.md` or `TODO.md` |
| Critique ritualism | review runs every iteration but `FIXED` count never increments |
| Score theater | any self-assigned number presented as quality |
| Perfectionist non-delivery | iteration count far past the task's evident size |
| Setup bloat | memory line count rises every iteration while the friction list does not shrink |

## Relationship to the bundled loop primitives

`/loop` repeats a prompt on an interval and carries no state; pair them if you want interval repetition:
`/loop 10m /ccforge:ccforge-loop` when installed as a plugin, `/loop 10m /ccforge-loop` when installed
as a plain skill directory. `/goal` sets a session-scoped completion condition checked by a small model from
the transcript alone, with no tool access of its own. This skill is neither: it holds state on disk, runs real
commands, and stops on named conditions.

## Quality checklist

- [ ] `state.json` exists with `scope` and `non_goals` set before iteration 1.
- [ ] Every gate in `state.json` ran this iteration and its exit code is recorded.
- [ ] Every `PROGRESS.md` block contains real captured output, not a paraphrase.
- [ ] No user-owned settings file was written by the loop.
- [ ] No user-authored skill, agent, hook, or command was deleted or rewritten by the loop.
- [ ] Each iteration produced exactly one artifact, or an explicit "clean pass" line.
- [ ] The stop condition that fired is named in the final `PROGRESS.md` entry.
