---
name: webforge-verify
description: >-
  Defines and runs the machine gates for a web project and writes the tests behind them: typecheck, lint, unit,
  Playwright end-to-end, axe accessibility, bundle size, and Lighthouse budgets, each with its exact command and
  exit-code meaning. Use when asked to add tests, set up CI, check that something works, or prove a change is
  safe before shipping. Use this even when the user does not name it. Not for diagnosing a slow page; use
  webforge-perf.
metadata:
  pack: webforge
  kind: specialist
  domain: testing,frontend
  version: "1.0.0"
---

# WebForge Verify
Owns the gate set: what counts as proof, the exact command, and what each exit code means. Called by
`webforge-orchestrator` in PLAN and VERIFY, and by `webforge-loop` every iteration.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-verify only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-verify (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## When called by the orchestrator

Trust the stack posture table from MODEL. Register only the gates the detected stack can actually run, name
them in PLAN before any code exists, and report each result in the
`GATE: name | CMD: ... | EXIT: n | <output>` shape.

## When invoked directly

Read `package.json` scripts and the config files present, decide which gates already exist, and report the
gap. Do not install a test framework without saying which one and why.

## Prime rule

Claude stops when the work looks done. Without a check it can run, "looks done" is the only signal available.
A gate is only a gate if it is machine-checkable from a terminal: it exits 0 or non-zero, or writes a
parseable file. "Looks right", "should work", and "I reviewed the code" are not gates.

If you cannot state what the check printed, the check did not happen.

## Gate table

| # | Gate | Command | Pass | Fail | Trap |
|---|---|---|---|---|---|
| 1 | typecheck | `npx tsc --noEmit` | 0 | non-zero | Do not branch on a specific non-zero code; treat all non-zero as fail |
| 2 | lint | `npx eslint .` | 0 | 1 = lint errors or warnings over `--max-warnings`; **2 = config or internal error** | Exit 2 means the gate itself is broken. Never treat 1 and 2 the same way |
| 3 | unit | `npx vitest run` | 0 | non-zero | Never unit-test an async Server Component. The tooling does not support it. Cover it in E2E |
| 4 | e2e | `npx playwright test` | 0 | non-zero on any failing assertion, including screenshot diffs over threshold | Run against `next build && next start`, never `next dev` |
| 5 | a11y | `npx @axe-core/cli <url> --exit` | 0, no violations | 1, any rule fails | Without `--exit` axe reports and still exits 0. No severity threshold exists; it is binary |
| 6 | bundle | `npx size-limit` | 0 | non-zero when over limit | Config lives in `package.json` under `"size-limit"` |
| 7 | budgets | `npx @lhci/cli autorun` | 0 | non-zero if any `error`-level assertion fails | `budget.json` sizes are in KB; inline assertion sizes are in bytes. Do not mix units |

If a repo uses pytest anywhere in its gate chain: exit 5 means **no tests were collected**. A loop checking
only `exit != 0` calls that a failure; a loop checking only `exit == 0` calls it a pass. It is neither. It is a
setup bug. Branch on 5 explicitly.

## What to test at which layer

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest (or Jest if already installed) | Pure functions, hooks, synchronous and Client Components |
| Component | React Testing Library with Vitest | Isolated render and interaction, synchronous only |
| E2E | Playwright | Full user flows, and the only working coverage for async Server Components |

Next.js's own guidance is explicit: because async Server Components are new to the React ecosystem and some
tools do not fully support them, use end-to-end testing over unit testing for async components. Do not fight
this by mocking the server runtime.

## Writing the tests

Playwright, official shape:

```bash
npm init playwright        # scaffolds playwright.config.ts
npx playwright install-deps  # CI only, before the first headless run
```

```ts
import { test, expect } from '@playwright/test'

test('signs in and lands on the dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dashboard')
})
```

Locator discipline: `getByRole`, `getByLabel`, `getByText` first. A test that can only find an element by CSS
class is testing the stylesheet. A test that needs `data-testid` on a button that has a visible accessible
name is hiding an accessibility defect.

Accessibility assertions belong inside the E2E specs, not in a separate manual pass:

```ts
import AxeBuilder from '@axe-core/playwright'

test('dashboard has no detectable a11y violations', async ({ page }) => {
  await page.goto('/dashboard')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

Automated tools catch roughly a third to half of WCAG issues. They catch the six highest-frequency failures
cheaply and continuously; they do not replace a manual keyboard pass for AA sign-off.

## The six checks that matter before any full audit

Present on 83 to 96 percent of real home pages, in this order of frequency. Treat each as a BLOCKER.

1. Text contrast below 4.5:1 for body, 3:1 for large text and UI boundaries.
2. `<img>` with no `alt`.
3. Form input with no associated `<label>` or `aria-label`.
4. `<a>` with no discernible text.
5. `<button>` with no accessible name.
6. Missing `<html lang="...">`.

## Snapshot and baseline discipline

- Playwright screenshot baselines live in `<testname>.spec.ts-snapshots/` and are committed to version
  control.
- `--update-snapshots` is a deliberate act in its own commit with a stated reason. It is never a reaction to a
  red run.
- Threshold is `maxDiffPixels` per assertion, or a global default under `expect.toHaveScreenshot` in
  `playwright.config.ts`. Pick one and write it down; an unset threshold makes every antialiasing difference a
  failure.

## Reporting results

```
GATE: typecheck | CMD: npx tsc --noEmit          | EXIT: 0 |
GATE: lint      | CMD: npx eslint .              | EXIT: 1 | 3 errors (src/auth.ts:42,:88,:103)
GATE: e2e       | CMD: npx playwright test       | EXIT: 0 | 14 passed (12.4s)
GATE: a11y      | CMD: npx @axe-core/cli http://localhost:3000 --exit | EXIT: 1 | color-contrast (4 nodes)
```

Not: "Ran the tests, they pass now."

## Quality checklist

- [ ] Every registered gate has an exact command written down before any code was changed.
- [ ] Every gate reported this turn carries an exit code from a run that happened this turn.
- [ ] ESLint exit 2 was handled as a broken gate, not a code failure.
- [ ] No test was deleted, skipped, or loosened in the same change that made a gate pass.
- [ ] E2E ran against a production build, not the dev server.
- [ ] The axe command included `--exit`, or axe ran inside a Playwright spec with an assertion.
- [ ] Snapshot baselines are committed and were not regenerated during a red run.

## Interop

Defer to a more specific project-local testing or CI skill when one exists, and compose with it: let it define
the house test conventions, and use this skill only for the gate command set and exit-code semantics. Name it
in the receipt line. If the rest of the pack is absent, this skill runs standalone.

## Reference files

| File | Read when |
|---|---|
| `references/gate-commands.md` | Setting up a gate from scratch, or a gate is behaving unexpectedly |
