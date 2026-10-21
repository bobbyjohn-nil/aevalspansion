---
name: webforge-loop
description: >-
  Drives continuous build-verify-fix cycles on a web project against an on-disk ledger: one focused change per
  iteration, every gate re-run with real exit codes, defects logged, stop conditions checked. Use for "keep
  going until the tests pass", long refactors, and unattended runs. Unlike /loop, this carries a ledger, real
  gates, and stop conditions. Use this even when unnamed. Not for a one-file edit.
metadata:
  pack: webforge
  kind: loop
  domain: frontend,backend,testing
  version: "1.0.0"
---

# WebForge Loop
Runs bounded build-verify-fix iterations against `.claude/webforge-loop/` until a stop condition fires. Runs
inline, in this session, not as a background fork.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-loop only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-loop (<missing-skill> absent)]`.

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

## When called by the orchestrator

Take `scope`, `non_goals`, and the pre-registered gate list from PLAN. Do not re-frame. Write `state.json`
and run.

## When invoked directly

Run a one-line FRAME first: state the goal in one sentence, name the files in scope, name the gates. If the
task is a refactor and the touched code has no test coverage, iteration 0 is characterization (below), not a
code change.

## Preconditions

- **Refactor with no test coverage: iteration 0 is characterization.** Pin current behavior with generated
  golden-master tests, commit that pin, and only then start the improve-and-verify loop. Without a pin, every
  later failure is an unanswerable "did I break it or was it already broken?"
- Declare `scope` and `non_goals` in `state.json` before iteration 1.
- Pick an iteration cap up front: **10** for a single bounded task, **25** for a multi-file feature. The cap
  is a backstop, never the primary stop signal. A loop that only ever stops at the cap cannot distinguish
  converging early from giving up late. The user may override it.
- Choose enforcement strength: in-prompt for a quick bounded task; a Stop hook for anything running with less
  supervision. Any Stop hook must check `stop_hook_active` and exit 0 if true, or it fights the hard
  8-consecutive-block cap.

## Ledger

`.claude/webforge-loop/` (namespaced, so three packs' loops never collide):

```
.claude/webforge-loop/
  state.json      # machine state: iteration, gates, progress history, caps
  PROGRESS.md     # append-only, one block per iteration
  DEFECTS.md      # open/closed defect table
  DECISIONS.md    # what was chosen, what was rejected, why
  TODO.md         # remaining work, markdown checkboxes, BLOCKED: prefix for deps
```

Do not use `TodoWrite` or the Task tools as the ledger. They are disabled by default on current models, they
live only in context, and a fresh session or subagent cannot read them.

`state.json`, exact field names:

```json
{
  "task": "one-sentence goal",
  "scope": ["src/auth/**", "tests/auth/**"],
  "non_goals": ["do not touch the billing module"],
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

`PROGRESS.md` block shape. Real output, never a paraphrase:

```markdown
## Iteration 7 - 2026-08-18T14:31:00Z
Goal: fix the 3 remaining lint errors in src/auth.ts
GATE: typecheck | CMD: npx tsc --noEmit | EXIT: 0 |
GATE: lint      | CMD: npx eslint .     | EXIT: 1 | 3 errors (src/auth.ts:42,:88,:103)
Changed: src/auth.ts
Result: 2 of 3 fixed. The third needs a design decision - see DECISIONS.md. Not fixed blind.
Next: resolve the design question before touching line 88.
```

`DEFECTS.md` uses the defect-log columns (LOCATION, DEFECT, SEVERITY, CLASS) plus a `STATUS` column
(`OPEN` / `FIXED (iter N)`). A defect `OPEN` for 3 or more iterations without being touched is surfaced at
escalation. It needs a decision, not another attempt.

## Gates

Registered from `webforge-verify`. If that skill is absent, register this default set and say so.

| Order | Gate | Command | Exit semantics |
|---|---|---|---|
| 1 | typecheck | `npx tsc --noEmit` | 0 pass, non-zero fail. Do not branch on a specific non-zero code |
| 2 | lint | `npx eslint .` | 0 pass, 1 lint errors, **2 config or internal error, which means the gate is broken, not the code** |
| 3 | unit | `npx vitest run` | 0 pass, non-zero fail |
| 4 | e2e | `npx playwright test` | 0 pass, non-zero fail including screenshot diffs over threshold |
| 5 | a11y | `npx @axe-core/cli <url> --exit` | 0 no violations, 1 any violation. Without `--exit` it reports but never fails |
| 6 | bundle | `npx size-limit` | 0 within limit, non-zero over |
| 7 | budgets (when the task touches perf or a public surface) | `npx @lhci/cli autorun` | 0 pass, non-zero if any `error`-level assertion in `lighthouserc.json` fails |

Rules that apply to every gate:

- A gate is machine-checkable from a terminal: it exits 0 or non-zero, or writes a parseable file. "Looks
  right" and "I reviewed it" are not gates.
- Record exit code **and** captured output per gate, every iteration. A `PASS` with no exit code from this
  iteration's actual run may not be written to the ledger.
- Distinguish "the gate failed" from "the gate is broken". ESLint exit 2 is a config error. A pytest exit 5
  means no tests were collected, which is a setup bug, not a pass.
- Playwright snapshot baselines live in `<testname>.spec.ts-snapshots/` and are committed.
  `--update-snapshots` is a deliberate action, never a reaction to red.

## Iteration body

1. Read `state.json`, the **last 3** `PROGRESS.md` entries only, and the open rows of `DEFECTS.md`. Never
   re-read the full history.
2. Pick **one** item: highest severity, or the one blocking the most others. One focus per iteration.
3. Make the change. Do not touch files outside `scope`.
4. Run every registered gate. Capture exit code and output verbatim.
5. **Diff test and gate-definition files specifically.** If any test file lost lines, loosened an assertion,
   or gained a `.skip` in the same iteration a gate flipped to pass, stop. That is a BLOCKER, not a pass.
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
| b | Impossible | the goal cannot be satisfied as stated | stop immediately, escalate with the reason. Do not burn the remaining cap |
| c | Regression | a previously-passing gate now fails from this loop's own change | stop, escalate. This outranks the original task |
| d | No progress | `no_progress_streak >= 2`: two consecutive iterations with zero gates newly passing, zero defects closed, zero defects opened | stop, escalate: converged without succeeding |
| e | Thrash | same file set touched in consecutive iterations and the gate vector at N equals the gate vector at N-2 | stop, escalate: the scope is wrong, not the implementation |
| f | Scope violation | a file outside `scope` was modified without a logged reason | stop, flag, revert or widen scope explicitly |
| g | Iteration cap | `iteration == max_iterations` | stop, escalate with the full ledger |

`no_progress_streak` increments when an iteration produces no newly-passing gate, no closed defect, and no
newly-discovered defect. It resets to 0 the moment any of the three is non-empty.

Escalation is a handoff, not silence. On any stop other than (a), the final `PROGRESS.md` entry names the stop
condition that fired, and the open BLOCKER/MAJOR rows in `DEFECTS.md` are the handoff artifact. A human or a
post-`/clear` session reads that, not a prose summary.

## Pathology to signal

| Pathology | Detection signal |
|---|---|
| Reward hacking the gate | gate flips to pass while a gate-defining file changed in the same iteration |
| Test deletion or weakening | test file line count drops, assertion loosened, `.skip` added |
| Scope creep | files touched outside `scope`, or diff grows with no new defect entry justifying it |
| Over-refactoring | gate vector unchanged for 2 iterations while diff size keeps growing |
| Verification theater | a ledger `PASS` with no attached exit code from this iteration |
| Sandbagging | 3 or more iterations of surface patches to the same root defect. Re-plan, do not patch again |
| Novelty drift | a late diff touches files never mentioned in earlier `PROGRESS.md` or `TODO.md` |
| Critique ritualism | review runs every iteration but the `FIXED` count never increments |
| Score theater | any self-assigned number presented as quality |
| Perfectionist non-delivery | iteration count far past the task's evident size |

## Web-specific loop notes

- Never run the E2E gate against `next dev`. Build once per iteration that touches app code
  (`npx next build && npx next start &`), then run Playwright against the production server. Dev-mode timing
  and streaming differ enough to produce both false passes and false failures.
- The a11y gate needs a running URL. If the server is not up, the gate is broken, not failing. Record it as
  broken and fix the harness before counting the iteration.
- Browser evidence is mandatory for any visual change: `await page.screenshot({ path: ... })` or
  `expect(page).toHaveScreenshot()` in the E2E spec, and the resulting file path recorded in the
  `PROGRESS.md` block. A described screenshot you did not capture is verification theater.
- A visual regression that is a deliberate design change is closed by regenerating the baseline in its own
  commit, with the reason in `DECISIONS.md`, never inside a red run.

## Quality checklist

- [ ] `state.json` exists and its `iteration` matches the last `PROGRESS.md` block.
- [ ] Every gate row in the last `PROGRESS.md` block carries a command and an exit code from this iteration.
- [ ] No test file lost lines or gained a skip in any iteration where a gate flipped to pass.
- [ ] Every file touched this iteration is inside `scope`, or has a logged reason.
- [ ] The stop condition that fired is named in the final `PROGRESS.md` block.
- [ ] No numeric quality score appears anywhere in the ledger.

## Interop

Defer to a more specific project-local loop or build skill when one exists, and compose with it: let it own
what to change, and keep the ledger, gates, and stop conditions here. Name it in the receipt line. If
`webforge-verify` is absent, use the default gate table above and mark the absence in the receipt; if the rest
of the pack is absent, this skill runs standalone.
