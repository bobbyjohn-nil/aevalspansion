# Gate commands - setup, config, and exit-code semantics

## Contents
1. Typecheck
2. Lint
3. Unit tests
4. Playwright end-to-end
5. Accessibility (axe)
6. Bundle size (size-limit)
7. Performance budgets (Lighthouse CI)
8. Wiring gates into a Stop hook
9. Package-manager equivalents

---

## 1. Typecheck

```bash
npx tsc --noEmit
```

`--noEmit` type-checks without writing output, which is what makes it a pure gate. Exit 0 passes; treat every
non-zero code as a failure without branching on the specific number. In a bundler-based project
(`"module": "preserve"`, `"noEmit": true`), `tsc` is the only thing type-checking at all: Next.js, Vite, and
Turbopack transpile per file and never type-check.

Minimum config for a production project, on top of `"strict": true`:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // arr[i] is possibly undefined - catches real out-of-bounds bugs
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,       // forces import type - fewer accidental runtime imports
    "isolatedModules": true             // required for per-file transpilation
  }
}
```

`exactOptionalPropertyTypes` is high value on greenfield and high friction on a retrofit. Enable it on new
projects only.

## 2. Lint

```bash
npx eslint .
npx eslint . --max-warnings 0   # when warnings should also fail
```

| Exit | Meaning | Loop behavior |
|---|---|---|
| 0 | clean | pass |
| 1 | lint errors, or warnings over `--max-warnings` | fail: fix the code |
| 2 | configuration or internal error | the gate is broken: fix the config, do not touch application code |

Conflating 1 and 2 makes a loop "fix" application code in response to a broken ESLint config. Branch on them.

## 3. Unit tests

```bash
npx vitest run          # single run, no watch - the watch default hangs CI
npx vitest run --coverage
```

Never unit-test an async Server Component. Cover it in Playwright instead.

If the project uses pytest anywhere:

| Exit | Meaning |
|---|---|
| 0 | all collected tests passed |
| 1 | test failures |
| 2 | user interrupted |
| 3 | internal error |
| 4 | usage error |
| 5 | **no tests collected** - a setup bug, neither pass nor fail |

## 4. Playwright end-to-end

```bash
npm init playwright
npx playwright install-deps     # CI, before the first headless run
npx next build && npx next start &
npx playwright test
npx playwright test --update-snapshots   # deliberate baseline change only, in its own commit
```

Run against a production build. Dev mode differs in timing, streaming, and error overlays enough to produce
both false passes and false failures.

`playwright.config.ts` essentials:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  expect: { toHaveScreenshot: { maxDiffPixels: 100 } },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

Baselines live in `<testname>.spec.ts-snapshots/` and are committed.

## 5. Accessibility

CLI, against a running URL:

```bash
npx @axe-core/cli http://localhost:3000 --exit
npx @axe-core/cli http://localhost:3000 --exit --save a11y.json
```

`--exit` is what turns axe into a gate. Without it, axe prints violations and exits 0. There is no severity
threshold; any violation fails. Post-filter the JSON yourself if a specific rule must be waived, and write the
waiver down.

In-spec, which is the better default because it runs on the same pages the E2E suite already navigates:

```ts
import AxeBuilder from '@axe-core/playwright'
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
  .analyze()
expect(results.violations).toEqual([])
```

## 6. Bundle size

```json
"size-limit": [
  { "path": "dist/app-*.js", "limit": "35 kB" }
]
```

```bash
npx size-limit
```

Non-zero exit when the built bundle exceeds the limit. size-limit also accepts a time budget
(`"limit": "500 ms"`), which needs the `@size-limit/time` plugin installed and measures download plus parse
plus execute. That is a more meaningful budget than raw bytes when the question is interactivity rather than
transfer cost.

## 7. Performance budgets

`lighthouserc.json`:

```json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "total-byte-weight": ["error", {"maxNumericValue": 2000000}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000, "aggregationMethod": "optimistic"}],
        "categories:performance": ["warn", {"minScore": 0.9}]
      }
    }
  }
}
```

```bash
npm install -g @lhci/cli && lhci autorun
```

Assertion levels: `error` fails the build, `warn` logs only, `off` disables. Use `minScore` for 0-to-1
category scores and `maxNumericValue` for millisecond and byte metrics. A single Lighthouse run is an
anecdote; set `numberOfRuns` to 5 or more and use median aggregation before treating a delta as real.

## 8. Wiring gates into a Stop hook

Only when the loop runs with less supervision. `.claude/settings.json` is the user's file: show the snippet,
let the user paste it, never write it yourself.

```bash
#!/usr/bin/env bash
INPUT=$(cat)
if [ "$(printf '%s' "$INPUT" | grep -c '"stop_hook_active": *true')" -gt 0 ]; then
  exit 0   # already forced one continuation; do not fight the 8-consecutive-block cap
fi
npx tsc --noEmit || { echo "Type check failed; fix before stopping." >&2; exit 2; }
npx eslint .;  rc=$?
if [ "$rc" -eq 2 ]; then echo "ESLint config is broken - fix the gate, not the code." >&2; exit 2; fi
if [ "$rc" -ne 0 ]; then echo "Lint failed; fix before stopping." >&2; exit 2; fi
exit 0
```

Hook exit codes: 0 proceeds, 2 blocks (for `Stop` this means keep working), any other non-zero is a
non-blocking error. `PostToolUse` cannot block; the tool already ran.

## 9. Package-manager equivalents

| npm | pnpm | yarn | bun |
|---|---|---|---|
| `npx <bin>` | `pnpm exec <bin>` | `yarn <bin>` | `bunx <bin>` |
| `npm run build` | `pnpm build` | `yarn build` | `bun run build` |
| `npm install` | `pnpm install` | `yarn install` | `bun install` |

Use the one the lockfile implies. Mixing package managers in one repo corrupts the lockfile.
