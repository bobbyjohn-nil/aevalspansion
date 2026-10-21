---
name: appforge-verify
description: >-
  Defines and runs the app gate stack and writes the missing tests: typecheck, lint, unit, device E2E with
  Maestro or Detox, platform build, and startup timing, each with its real exit code. Also sets the error
  taxonomy, retry policy, crash reporting, and analytics schema. Use when asked to test something, add tests,
  prove it works, or wire Sentry. Use this even when unnamed. Not for speed; use appforge-perf.
metadata:
  pack: appforge
  kind: specialist
  domain: testing,reliability
  version: "1.0.0"
---

# AppForge Verify

Turns "it works" into a list of commands with exit codes. Owns the gate stack, the test layers, and the
reliability instrumentation that makes a failure legible after it ships.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-verify only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-verify (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Trust the assumption ledger and the stack posture table. Register the gates that the detected stack can
actually run, in the order below, and return the gate table itself so PLAN can pre-register it. Re-verify only
what changed.

## When invoked directly

Run a one-line frame first: what surface changed, what would a competent reviewer reject. Then detect the
repo's own scripts before inventing commands, and run the gates that exist. Assume no shared state.

## Gate order and exit-code semantics

Run in this order. Cheapest and most specific first, so a type error never costs a device build.

| # | Gate | Command | Exit meaning |
|---|---|---|---|
| 1 | typecheck | `npx tsc --noEmit` | 0 pass. Non-zero means type errors, printed with file and line. |
| 2 | lint | `npx eslint .` | 0 pass. **1 means lint errors. 2 means the gate itself is broken** (config or parser failure). Branch differently: exit 2 is not a code defect, it is a setup defect, and fixing source code will not clear it. |
| 3 | deps and config sanity | `npx expo-doctor@latest` | Checks installed dependency compatibility against the React Native Directory. Run on any Expo project before a build gate. |
| 4 | unit and component | the repo's own script first (`npm test`), otherwise `npx jest` or `npx vitest run` | 0 pass. A run that collects zero tests is a setup failure, not a pass. Never add `--passWithNoTests` to make a gate green. `pytest` exit 5 means no tests collected and is a failure. |
| 5 | device E2E | the repo's own script first (`npm run e2e`), otherwise `maestro test <flow-dir>` or `detox test` with the configuration named in `.detoxrc` | 0 pass. A skipped suite is not a pass. Read the runner's own summary line, not just the exit code. |
| 6 | platform build | `eas build --platform <ios or android> --local`, or `npx tauri build`, or the repo's build script | 0 pass. This is the gate that catches native and config breakage nothing else sees. |
| 7 | startup timing | `adb shell am start -S -W <pkg>/<Activity> -c android.intent.category.LAUNCHER -a android.intent.action.MAIN` | Prints ThisTime / TotalTime / WaitTime in ms. Compare against the budget in `appforge-perf`, not against a feeling. |

Rules that apply to every gate, without exception:

1. Record the exit code **and** the captured output. A gate result with no exit code from this run is not a
   result.
2. Distinguish "the gate failed" from "the gate is broken". They need opposite fixes.
3. Snapshot baselines are committed. Updating a snapshot is a deliberate action with a reason, never a
   reaction to a red run.
4. Never delete, skip, or weaken a test to make a gate pass. If a gate-defining file changed in the same
   change that flipped a gate to green, that is a BLOCKER regardless of what the exit code says.

Report in this shape, one line per gate:

```
GATE: typecheck | CMD: npx tsc --noEmit | EXIT: 0 |
GATE: lint      | CMD: npx eslint .     | EXIT: 1 | 3 errors (src/auth.ts:42,:88,:103)
```

## Test layers

The common heuristic is roughly 70 percent unit, 20 percent integration, 10 percent E2E. Treat it as a
starting shape, not a law, and adjust it for mobile: a large share of real mobile bugs live specifically at the
native bridge, permission, and OS integration boundary that unit tests cannot reach. Expect proportionally more
integration and device-level coverage than an equivalent web project would need.

**Detox or Maestro**, decided on stated criteria and not preference:

| Axis | Detox | Maestro |
|---|---|---|
| Architecture | Gray-box. Instruments the app process and observes the JS thread, UI queue, and network state directly. | Black-box. Drives the app through the OS accessibility layer, no instrumentation. |
| Setup | Native build changes required | Single binary, no codebase changes |
| Authoring | JS/TS with async/await | Declarative YAML, so QA and non-engineers can contribute |
| Synchronization | Waits for observed app idleness | Fixed windows, roughly a 2s animation wait and a 17s element lookup. Continuous visual effects such as shimmer loaders can fool it. |

Pick Maestro when the team wants YAML tests anyone can write and minimal setup is worth some timeout-based
flakiness. Pick Detox when deeper native integration and observed-state synchronization matter more than
authoring accessibility. Flakiness and speed comparisons published by either project are vendor-reported;
use the axes above, not the marketing numbers.

## Error taxonomy to retry policy

Classify before you retry. This is a correctness rule, not a tuning knob.

| Class | Examples | Policy |
|---|---|---|
| Transient | network blip, 429, 503, momentary unavailability, DNS hiccup | Retry with backoff and jitter |
| Permanent | 400, 401, 403, 404, malformed request, schema violation | Fail fast. Retrying burns budget and never resolves. |
| Ambiguous | timeout with no response body | Retry **only** if the operation is idempotent or carries an idempotency key |

**Never auto-retry a non-idempotent operation.** Charging a card twice because of a timeout is not a transient
error. Make it idempotent first (see `appforge-backend`), then retry.

Backoff formulas, use full jitter by default:

```
full jitter:          sleep = random(0, min(cap, base * 2^attempt))
equal jitter:         sleep = base * 2^attempt / 2 + random(0, base * 2^attempt / 2)
decorrelated jitter:  sleep = min(cap, random(base, sleep * 3))   # sleep seeded from the previous attempt
```

Full jitter and decorrelated jitter both substantially reduce total client-side work versus no jitter. Equal
jitter reduces it less than full jitter while buying nothing in return; do not pick it by default.

Also set, per external call: a timeout derived from observed p99 latency rather than a guess, a circuit
breaker on any dependency whose failure would cascade, and a dead letter queue for messages that fail N times.

## Crash reporting

```bash
npx @sentry/wizard@latest -i reactNative
```

- Set `SENTRY_AUTH_TOKEN` as an EAS environment variable with `sensitive` visibility. It needs the
  Organization Auth Token scope for source-map upload and release creation.
- EAS Build uploads source maps automatically once that token is set.
- **EAS Update does not.** After `eas update`, run `npx sentry-expo-upload-sourcemaps dist`, or every
  OTA-shipped crash arrives unsymbolicated.
- Tag `Updates.updateId` early in app init so a crash is attributable to the specific OTA update that shipped
  it, not merely to the binary version.

Wire crash reporting before the first build a real user touches. A crash you cannot symbolicate is a crash you
cannot fix.

## Analytics event schema, defined before the first event

Decide the naming convention once, then hold it:

- Format `category:object_action`, for example `signup_flow:pricing_page_view`.
- Lowercase snake_case, present-tense verbs (`submit`, not `submitted`), from a fixed verb vocabulary:
  click, submit, create, view, delete.
- **Never interpolate a variable into an event name.** `purchased_widget_47` explodes into thousands of
  unfilterable event definitions. Keep the name fixed and put the variable in a property:
  `event: "purchase", properties: { item_id: 47 }`.
- Properties use `object_adjective`. Booleans get an `is_` or `has_` prefix; times get a `_date` or
  `_timestamp` suffix.
- Track growth-critical events (signup, purchase) explicitly rather than relying on autocapture.
- Send revenue and accuracy-critical events from the **backend**. Frontend analytics lose events to ad
  blockers and closed tabs.

Pick the framework from the question being asked: AARRR (acquisition, activation, retention, referral,
revenue) when the question is funnel or monetization shaped, HEART (happiness, engagement, adoption,
retention, task success) when the question is whether the feature is good to use.

## Quality checklist

- [ ] Every registered gate ran this turn, and its exit code and output are recorded verbatim.
- [ ] Lint exit 2 was handled as a broken gate, not as lint errors.
- [ ] The unit gate collected a non-zero number of tests.
- [ ] No test file lost lines, lost an assertion, or gained a skip in the same change that turned a gate green.
- [ ] Every external call that can fail is classified transient, permanent, or ambiguous, and its retry policy
      follows from that class.
- [ ] No non-idempotent operation is auto-retried without an idempotency key.
- [ ] Crash reporting is wired and source maps upload on both the build and the OTA path.
- [ ] Every new analytics event has a fixed name with variables in properties, not in the name.

## Reference files

| File | Read when |
|---|---|
| `references/gate-commands.md` | Registering gates for a stack, or an exit code needs interpreting |
