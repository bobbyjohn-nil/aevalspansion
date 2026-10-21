# Gate commands by stack

Contents: 1. Selection rule. 2. Expo and React Native. 3. Desktop (Tauri, Electron). 4. Backend. 5. Exit-code
table. 6. CI wiring. 7. What is not a gate.

## 1. Selection rule

Read `package.json` `scripts` before writing any command. A script the repo already defines outranks anything
here, because it encodes local knowledge (a config path, an env file, a device name) that a generic command
does not. Only fall through to the commands below when no script covers the concern.

Never introduce a second tool for a concern that already has one. Two linters, two test runners, or two E2E
frameworks in one repo is a defect this pack created.

## 2. Expo and React Native

```bash
npx tsc --noEmit                      # types
npx eslint .                          # lint (1 = errors, 2 = broken config)
npx expo-doctor@latest                # dependency compatibility vs the React Native Directory
npm test                              # repo's own unit script, whatever it wraps
npx jest --ci                         # fallback when no script exists and jest is installed
maestro test .maestro/                # device E2E, black box, YAML flows
detox test                            # device E2E, gray box; uses the configuration in .detoxrc
eas build --platform android --local  # local platform build, catches native and config breakage
eas build --platform all              # cloud build, both platforms
```

Build profiles live in `eas.json`. The common triad is `development`, `preview`, `production`. Run the profile
the repo actually defines; do not invent a profile name.

Android startup timing, for the perf gate:

```bash
adb shell am start -S -W com.example.app/.MainActivity \
  -c android.intent.category.LAUNCHER -a android.intent.action.MAIN
```

Prints ThisTime, TotalTime, WaitTime in milliseconds.

## 3. Desktop

```bash
npx tauri build            # Tauri release build, produces the bundle and updater artifacts
npm run tauri dev          # Tauri dev shell
npm run make               # Electron Forge package step, when forge.config.js exists
npx electron-builder       # when electron-builder.yml exists
security find-identity -v -p codesigning   # macOS: confirm a signing identity exists before a signed build
```

A desktop build gate that never runs the signing path is not a release gate. Signing and notarization failures
appear only when they are attempted.

## 4. Backend

```bash
npx drizzle-kit generate   # write a reviewable SQL migration from the TS schema diff
npx drizzle-kit migrate    # apply generated migrations
npx drizzle-kit check      # validate migration history for race conditions
npx prisma migrate deploy  # Prisma equivalent for a non-dev environment
npx prisma validate        # schema parses
```

`drizzle-kit push` writes schema straight to the database with no migration file. It is a local iteration tool.
It is not a gate and it is not for any environment that matters, because it leaves no reviewable diff and no
rollback artifact.

## 5. Exit-code table

| Tool | Code | Meaning |
|---|---|---|
| `tsc` | 0 | no type errors |
| `tsc` | non-zero | type errors, listed with file and line |
| `eslint` | 0 | clean |
| `eslint` | 1 | lint errors exist |
| `eslint` | 2 | ESLint itself failed: bad config, missing parser, unresolved plugin. Fixing source code will not clear this. |
| `jest` / `vitest` | 0 | all tests passed |
| `jest` / `vitest` | 1 | test failures, or zero tests collected unless the run was explicitly allowed to be empty |
| `pytest` | 5 | no tests were collected. This is a setup bug, not a pass. |
| `maestro` / `detox` | 0 | flows passed. Still read the summary line for skipped flows. |
| `eas build` | 0 | build produced an artifact |

## 6. CI wiring

Detect the existing pipeline before creating one:

- `.eas/workflows/*.yml` means EAS Workflows. Extend it. Job types include `build`, `submit`, and `slack`;
  triggers include GitHub push, GitHub PR, App Store Connect review-state events, and manual
  `eas workflow:run`.
- `.github/workflows/*.yml` means GitHub Actions. Extend it.
- `fastlane/Fastfile` means Fastlane drives the store steps. Extend it.

Scaffolding a second, competing pipeline next to an existing one is a defect, not a feature.

Minimal EAS workflow shape:

```yaml
name: Create Production Builds
on:
  push:
    branches: ['main']
jobs:
  build_android:
    type: build
    params:
      platform: android
      profile: production
```

## 7. What is not a gate

- "I reviewed it."
- "It looks right."
- A screenshot with no assertion attached.
- A gate whose failure does not stop anything.
- A remembered pass from an earlier iteration.

A gate is machine-checkable from a terminal: it exits zero or non-zero, or it writes a file something else
parses. Everything else is an opinion, which may still be worth stating, but never in the gate table.
