# Stack detection for app repos

Run this before any specialist is dispatched, so every downstream skill already knows which stack it is
operating in. Output a table of concerns, each marked `DETECTED: <value>` or `NONE`.

**The decision rule.** If any marker for a concern is present, conform to it and do not scaffold a competing
tool alongside it, even when the pack default differs. Fall back to the pack default only when a concern has
no marker at all. This rule is what makes the pack usable inside a repo you did not create.

## Signal table, strongest first

| Signal | What it tells you | Priority |
|---|---|---|
| `package.json` field `"packageManager"` (Corepack, e.g. `"pnpm@9.1.0"`) | Exact package manager and version. Authoritative when present. | 1 |
| Lockfile, if the field is absent: `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lock` or `bun.lockb` | pnpm / yarn / npm / bun | 2 |
| Framework config: `app.json` or `app.config.{js,ts}` plus `expo` in dependencies (Expo); `next.config.{js,ts}` (Next.js); `vite.config.ts` (Vite); `tauri.conf.json` (Tauri); `electron-builder.yml` or `forge.config.js` (Electron) | Which pack specialist applies | 3 |
| ORM config: `drizzle.config.ts` (Drizzle); `prisma/schema.prisma` (Prisma) | Which migration commands to shell out to | 4 |
| Monorepo marker: `turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `lerna.json` | Where generated files belong | 5 |
| Non-Node backend marker: `requirements.txt` or `pyproject.toml`, `go.mod`, `Cargo.toml` outside a Tauri context, `Gemfile` | The backend is not Node. Do not default to a Node/TS backend. | 6 |
| CI config: `.github/workflows/*.yml`, `.eas/workflows/*.yml`, `fastlane/Fastfile` | Extend, never replace | 7 |
| Test config: `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `.detoxrc.*`, `maestro/*.yaml` | Which test pattern to emit | 8 |
| Lint/format config: `.eslintrc*`, `eslint.config.*`, `biome.json`, `.prettierrc*` | Shell out to the existing tool. Never introduce a second linter or formatter. | 9 |

## Run order

```bash
ls -a                                        # top level markers
cat package.json 2>/dev/null | head -60      # packageManager, deps, scripts
ls *.lock* *lock.yaml *lock.json 2>/dev/null || true
ls app.json app.config.* next.config.* vite.config.* tauri.conf.json 2>/dev/null || true
ls drizzle.config.* prisma/schema.prisma 2>/dev/null || true
ls .eas/workflows .github/workflows fastlane 2>/dev/null || true
```

Read the `scripts` block of `package.json` in full. A repo's own `scripts` entries outrank any command this
pack would otherwise invent: if `npm run test:e2e` exists, that is the E2E gate, whatever tool it wraps.

## Version pins that change what you may emit

Read these from disk, never from memory.

| Read | Where | Why it changes the output |
|---|---|---|
| Expo SDK major | `package.json` dependency `expo` | SDK 55 and later run entirely on the New Architecture and cannot disable it. SDK 54 and earlier can still run Legacy. |
| React Native version | `package.json` dependency `react-native` | RN 0.82 is the first release that runs entirely on the New Architecture. `newArchEnabled=false` and `RCT_NEW_ARCH_ENABLED=0` are ignored from 0.82 on. |
| Android `targetSdkVersion` | `app.json` under `android`, or `android/build.gradle` in a bare project | Google Play requires API 36 (Android 16) targeting for new apps and updates by 2026-08-31, with an extension available to 2026-11-01. Surface this on every Android build. |
| Tauri core version | `src-tauri/Cargo.toml` | The updater plugin mandates signature verification and requires Rust 1.77.2 or later. |
| Electron version | `package.json` devDependency `electron` | The latest three majors are supported, on an eight-week major cadence. |
| Prisma version | `package.json` dependency `prisma` | The Rust-free TypeScript and WASM query engine is the production default from 6.16.0. The old "Prisma is too heavy for edge" rule does not apply at or above that version. |

## Pack defaults, applied only to concerns marked NONE

| Concern | Default | Escape hatch |
|---|---|---|
| Mobile framework | Expo with Expo Router | Any detected framework config wins outright |
| Desktop framework | Decided by `appforge-desktop` on stated criteria, not by preference | A detected `tauri.conf.json` or Electron config wins outright |
| Server state | TanStack Query | A detected data-fetching layer wins |
| Client state | Zustand | A detected store wins |
| ORM | Drizzle for a new lightweight or edge-deployed service | A detected ORM config wins; Prisma is equally reasonable at 6.16.0 or later |
| Validation | Zod schemas shared between client and server | A detected validator wins |
| Package manager | Whatever the lockfile says; npm only in a genuinely empty repo | Always detected first |
| Device E2E | Maestro when non-engineers should write tests, Detox when observed-state synchronization matters | A detected `.detoxrc.*` or `maestro/` wins |
| Crash reporting | Sentry | A detected crash SDK wins |

## Conflict handling

If two markers for the same concern disagree (a `yarn.lock` and a `pnpm-lock.yaml` both present, or both a
Prisma schema and a Drizzle config), that is a repo defect, not a choice for you to make silently. Report both,
name which one the `scripts` block actually uses, and ask before writing code that depends on the answer.
