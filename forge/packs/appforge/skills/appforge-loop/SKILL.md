---
name: appforge-loop
description: >-
  Drives continuous build-verify-fix cycles on an app against an on-disk ledger until every gate passes or a
  stop condition fires: typecheck, lint, unit, device E2E, platform build, and startup timing. Use when asked
  to keep going until it works, fix all the failures, or iterate until tests pass, even when unnamed. Unlike
  the bundled /loop, this carries a ledger, real gates, and stop conditions. Not for a single bounded edit.
metadata:
  pack: appforge
  kind: loop
  domain: mobile,desktop,backend
  version: "1.0.0"
---

# AppForge Loop

Runs iterative build-verify-fix cycles on an app with an on-disk ledger, machine gates, and stop conditions
that fire before the loop burns its cap. Runs inline in this session, not as a background fork, so every
iteration's evidence is visible.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-loop only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-loop (<missing-skill> absent)]`.

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

When a project-local skill in `.claude/skills/` owns the kind of change an iteration needs, invoke it for that
iteration and defer to it on what is correct in this repo. This skill still owns the ledger, the gates, and
the stop conditions, which are the parts nothing else tracks. Never duplicate work a user skill already owns.
Name every skill that fired in the receipt line.

## When called by the orchestrator

Take `scope`, `non_goals`, and the pre-registered gates from PLAN as given. Do not re-frame the task.

## When invoked directly

Write `state.json` first: task, scope, non_goals, gates, cap. A loop with no declared scope has no scope
violation to detect, which removes stop condition (f). Assume no shared state exists.

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

## Preconditions, before iteration 1

- **No test coverage on the code being changed means iteration 0 is characterization.** Pin current behavior
  with golden-master tests, commit that pin, and only then start the improve-and-verify loop. Without a pin,
  every later failure is an unanswerable "did I break it or was it already broken?"
- Declare `scope` and `non_goals` in `state.json`. On an Expo project, `ios/` and `android/` belong in
  `non_goals` unless the task is explicitly native: they are generated, and hand-patching them is a change
  that disappears on the next prebuild.
- Register gates from `appforge-verify`. If that skill is absent, register what the repo's own `scripts`
  block defines, and say in the receipt that gates were derived rather than dispatched.
- Set the iteration cap: 10 for a single bounded task, 25 for a multi-file feature. The user may override it.
  The cap is a backstop, never the primary stop signal.
- Device and emulator gates need a target. Confirm one is running (`adb devices`, or a booted simulator)
  before registering a gate that depends on it. A gate that cannot run is not a gate that passes.

## Ledger

`.claude/appforge-loop/`, namespaced so three packs never collide:

```
.claude/appforge-loop/
  state.json      # machine state: iteration, gates, progress history, caps
  PROGRESS.md     # append-only, one block per iteration
  DEFECTS.md      # open/closed defect table
  DECISIONS.md    # what was chosen, what was rejected, why
  TODO.md         # remaining work, markdown checkboxes, BLOCKED: prefix for deps
```

Do not use `TodoWrite` or the Task tools as the ledger. They live only in context, and a fresh session or a
subagent cannot read them.

`state.json`, exact field names:

```json
{
  "task": "one-sentence goal",
  "scope": ["app/**", "src/api/**", "tests/**"],
  "non_goals": ["do not touch ios/ or android/", "do not change the billing schema"],
  "iteration": 7,
  "max_iterations": 25,
  "started_at": "2026-08-18T14:02:00Z",
  "gates": {
    "typecheck": {"cmd": "npx tsc --noEmit", "last_exit": 0, "last_run_iteration": 7},
    "lint":      {"cmd": "npx eslint .",     "last_exit": 1, "last_run_iteration": 7}
  },
  "progress_history": [
    {"iteration": 7, "gates_newly_passing": [], "defects_closed": 0, "defects_opened": 0}
  ],
  "no_progress_streak": 1,
  "status": "running"
}
```

`PROGRESS.md` block shape, with real output and never a paraphrase:

```markdown
## Iteration 7 - 2026-08-18T14:31:00Z
Goal: fix the 3 remaining lint errors in src/auth.ts
GATE: typecheck | CMD: npx tsc --noEmit | EXIT: 0 |
GATE: lint      | CMD: npx eslint .     | EXIT: 1 | 3 errors (src/auth.ts:42,:88,:103)
Changed: src/auth.ts
Result: 2 of 3 fixed. The third needs a design decision - see DECISIONS.md. Not fixed blind.
Next: resolve the design question before touching line 88.
```

`DEFECTS.md` uses the defect-log columns (LOCATION, DEFECT, SEVERITY, CLASS) plus a STATUS column, either
`OPEN` or `FIXED (iter N)`. A defect that has been OPEN for three or more iterations without being touched is
surfaced at escalation: it needs a decision, not another attempt.

## Gates, in run order

| # | Gate | Typical command |
|---|---|---|
| 1 | typecheck | `npx tsc --noEmit` |
| 2 | lint | `npx eslint .` (exit 1 is lint errors, exit 2 is a broken gate) |
| 3 | unit | the repo's own script, else `npx jest --ci` or `npx vitest run` |
| 4 | device E2E | `maestro test .maestro/` or `detox test` |
| 5 | platform build | `eas build --platform android --local` or `npx tauri build` |
| 6 | startup or perf benchmark | `adb shell am start -S -W <pkg>/<Activity> ...` compared to the registered budget |

Gates 5 and 6 are expensive. Run them every iteration only when the change touches native config,
dependencies, or startup path; otherwise run them at least at the first iteration, at any iteration that
touches those surfaces, and at the final iteration before reporting success. State which policy is in force in
`state.json`, and never report a build gate as passing from an earlier iteration's run.

## Iteration body

1. Read `state.json`, the **last 3** `PROGRESS.md` entries only, and the open `DEFECTS.md` rows. Never re-read
   the full history.
2. Pick **one** item: highest severity, or the one blocking the most others. One focus per iteration.
3. Make the change. Do not touch files outside `scope`.
4. Run every registered gate. Capture exit code and output verbatim.
5. **Diff test and gate-definition files specifically.** If any test file lost lines, loosened an assertion,
   or gained a skip in the same iteration a gate flipped to pass, stop. That is a BLOCKER, not a pass.
6. Update `DEFECTS.md`, `DECISIONS.md`, `TODO.md`, and `state.json` (`gates_newly_passing`, `defects_closed`,
   `defects_opened`, `no_progress_streak`).
7. Append the `PROGRESS.md` block with real output.
8. `git commit` when the touched area's gates pass. If the build is broken and the cause is unclear,
   `git reset --hard` to the last commit whose gates passed and resume with a narrower step. Never amend a
   commit already reported as a passed gate; that erases the evidence trail.
9. Check stop conditions in order.

## Stop conditions, checked in this order

| Order | Condition | Trigger | Action |
|---|---|---|---|
| a | Clean pass | every registered gate exits 0 in one iteration | stop, report success with evidence |
| b | Impossible | the goal cannot be satisfied as stated | stop immediately, escalate with the reason, do not burn the remaining cap |
| c | Regression | a previously-passing gate now fails from this loop's own change | stop, escalate; this outranks the original task |
| d | No progress | `no_progress_streak >= 2`, meaning two consecutive iterations with zero gates newly passing, zero defects closed, zero defects opened | stop, escalate: converged without succeeding |
| e | Thrash | same file set touched in consecutive iterations and the gate vector at N equals the gate vector at N-2 | stop, escalate: the scope is wrong, not the implementation |
| f | Scope violation | a file outside `scope` was modified without a logged reason | stop, flag, revert or widen scope explicitly |
| g | Iteration cap | `iteration == max_iterations` | stop, escalate with the full ledger |

`no_progress_streak` increments when an iteration produces no newly-passing gate, no closed defect, and no
newly-discovered defect. It resets to 0 the moment any of the three is non-empty.

**Escalation is a handoff, not silence.** On any stop other than (a), the final `PROGRESS.md` entry names the
stop condition that fired, and the open BLOCKER and MAJOR rows in `DEFECTS.md` are the handoff artifact. A
human, or a session after `/clear`, reads that. Not a prose summary.

## Pathology to signal

| Pathology | Detection signal |
|---|---|
| Reward hacking the gate | gate flips to pass while a gate-defining file changed in the same iteration |
| Test deletion or weakening | test file line count drops, assertion loosened, `.skip` added |
| Scope creep | files touched outside `scope`, or diff grows with no new defect entry justifying it |
| Over-refactoring | gate vector unchanged for 2 iterations while diff size keeps growing |
| Verification theater | a ledger PASS with no attached exit code from this iteration |
| Sandbagging | 3 or more iterations of surface patches to the same root defect. Re-plan, do not patch again. |
| Novelty drift | a late diff touches files never mentioned in earlier `PROGRESS.md` or `TODO.md` |
| Critique ritualism | review runs every iteration but the FIXED count never increments |
| Score theater | any self-assigned number presented as quality |
| Perfectionist non-delivery | iteration count far past the task's evident size |

## App-specific loop traps

- **A green emulator is not a green device.** An emulator build passing every gate says nothing about
  permission dialogs, push token generation, biometric prompts, or real network conditions. When the task
  touches those, the gate is a device run, and if no device is available, say so instead of substituting the
  emulator result.
- **A passing OTA update is not a passing binary.** Anything touching native code, permissions, or the SDK
  version needs a fresh build gate, not an update gate.
- **Flaky device E2E is a defect, not noise.** Log it with a location. Re-running until green is reward
  hacking with extra steps.
- **Watch for the gate that cannot fail.** A device suite that passes on an app that never launched is
  reporting on nothing. Confirm the app actually started before trusting a green E2E run.

## Quality checklist

- [ ] `state.json` exists, parses, and its `scope` and `non_goals` were written before iteration 1.
- [ ] Every `PROGRESS.md` block carries a real exit code and real output per gate for that iteration.
- [ ] No gate result in the ledger was carried over from an earlier iteration.
- [ ] No test file was deleted, shortened, skipped, or loosened during any iteration that turned a gate green.
- [ ] Every file touched this run is inside `scope`, or has a logged reason.
- [ ] The stop condition that fired is named in the final `PROGRESS.md` entry.
- [ ] Open BLOCKER and MAJOR defects are listed in `DEFECTS.md` at handoff, not summarized in prose.

## Reference files

This skill has no reference files. Gate definitions come from `appforge-verify`; if it is absent, gates are
derived from the repo's own `scripts` block and that fact is stated in the receipt.
