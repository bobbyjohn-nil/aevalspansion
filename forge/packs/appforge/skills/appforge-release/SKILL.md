---
name: appforge-release
description: >-
  Gets a build signed, uploaded, reviewed, and rolled out without a store rejection: build profiles, EAS
  Build, Submit and Update, what ships over the air versus what needs a new binary, staged rollout, and the
  Apple and Google review checklists. Use when asked to ship, release, submit to a store, cut a build, or push
  an OTA update. Use this even when unnamed. Not for app code; use appforge-mobile.
metadata:
  pack: appforge
  kind: specialist
  domain: release,mobile
  version: "1.0.0"
---

# AppForge Release

Takes a working build to real users. Owns build profiles, submission, the OTA boundary, and rollout control.
Normally called by `appforge-orchestrator` only when the user asks to ship.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-release only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-release (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## Refusal clause

> A store submission, a production-track release, and an OTA update to the production channel are
> irreversible in the ways that matter: review queues, user devices, and store metadata. State the exact action
> and get explicit confirmation before executing it. Preparing the build, running the checks, and reporting
> what is ready is this skill working correctly. Pressing send without being asked is not.

## When called by the orchestrator

Take the effort dial as High by default: everything here is release-path work. Run the pre-submission
checklist, report what fails, and stop at the confirmation gate.

## When invoked directly

Frame in one line: which platform, which track, and whether this is a binary or an over-the-air update. Read
the app config and `eas.json` before naming any profile. Assume no shared state.

## Live compliance deadline, check it every Android build

Google Play requires new apps and updates to target **API 36 (Android 16) by 2026-08-31**, with an extension
available to 2026-11-01 through a Play Console request. Existing published apps must be at minimum API 35 by
the same date or they stop being available to new users on devices running newer Android versions than the
app's target. Wear OS and Android Automotive need API 35 by that date; Android TV and XR need API 34.

Read the actual target from disk on every Android build and surface it:

```bash
grep -n 'targetSdkVersion\|compileSdkVersion' android/build.gradle 2>/dev/null
grep -n '"expo"' package.json
```

A stale target is not a warning to note in passing. It is the difference between a release and a blocked
update.

## The OTA boundary

`eas update` serves JS and asset updates through `expo-updates` with no store resubmission. The boundary is
hard and getting it wrong ships a broken app.

| Can ship over the air | Needs a new binary |
|---|---|
| JS logic, styling, layout, images and other assets | Native code and native dependencies |
| Copy and content changes | Any permission change, including a purpose string |
| Bug fixes that do not touch native code | Expo SDK version changes |
| | Anything in `Info.plist` or the Android manifest |

Two further rules:

- OTA supports percentage rollouts, and republishing a previous update is the rollback mechanism. Same mental
  model as redeploying a prior commit. Confirm the rollback works before you need it.
- Keep OTA updates to content and bug fixes. Using them to change app behavior or feature-gating around a
  review is exactly the abuse Apple and Google flag, and it puts the account at risk, not just the release.

Source maps do not upload automatically on the OTA path. After `eas update`, run
`npx sentry-expo-upload-sourcemaps dist`, or every OTA-shipped crash arrives unsymbolicated.

## Build, submit, update

```bash
eas build --platform all                  # cloud build, both platforms
eas build --platform android --local      # local build, for on-prem policy or debugging the build itself
eas submit --platform ios                 # upload the built artifact to the store
eas update --channel production           # OTA update to a channel
eas workflow:run .eas/workflows/build.yml # trigger a defined workflow manually
```

Profiles live in `eas.json`. The common triad is `development`, `preview`, `production`. Run the profile the
repo defines; never invent one.

Environment variables have three visibility tiers, and picking the wrong one leaks a credential into a log:

| Visibility | Readable where |
|---|---|
| `plaintext` | Dashboard, CLI, and build logs |
| `sensitive` | Dashboard and CLI, masked in logs |
| `secret` | Only on EAS servers. Never shown in dashboard, CLI, or logs. |

The `env` subcommand name has moved between EAS CLI majors. Run `eas env --help` and use what it prints
rather than an argument list from memory; the tier is the load-bearing decision, not the verb. Flags are
`--name`, `--value`, `--environment`, and `--visibility`.

`EXPO_PUBLIC_*` variables are bundled into the client and are public by construction. Signing credentials and
npm tokens belong at `secret` visibility.

## Staged rollout

Progression: 5 to 10 percent, then 25, then 50, then 100, with a deliberate hold and observe period at each
stage.

Before the rollout starts, write down the rollback threshold for each gating metric: crash-free session rate,
error rate, p95 and p99 latency, and the one conversion or engagement metric the release was supposed to move.
A threshold decided during an incident is a threshold argued about during an incident. Prefer an automated
rollback trigger over a human watching a dashboard.

A canary release and a kill switch are different tools. A canary is gradual, time-based, and reversible. A kill
switch is instant off for one feature. A mature release path has both, not one.

## Apple review, the pitfalls with real hit rate

| Guideline | Failure | Prevention |
|---|---|---|
| 2.1 Completeness | Crashes, placeholder or lorem-ipsum content, broken links. Reportedly the largest category of unresolved rejections. | Full TestFlight pass on real devices. No stub content. Every link resolves. |
| 5.1.1(i) | Missing or unreachable privacy policy | A working URL in both the App Store Connect metadata field and an in-app link |
| 5.1.1(v) | No account-deletion path | Mandatory when the app supports account creation. Reachable in-app, not "contact support". |
| 3.1.1 | Digital goods sold outside Apple IAP: license keys, QR unlocks, crypto | Feature, content, and currency unlocks go through IAP unless a named exemption applies |
| 3.1.2 | Paywall terms not legible or not disclosed | Price, period, and renewal terms visible before purchase |
| 4.0 | Third-party login without an equivalent that limits data collection | Offer Sign in with Apple, or use a login method that already meets the criteria |
| 2.3.x | Screenshots that do not show the app in use, misleading description | Real app UI in screenshots, specific feature descriptions |
| Review friction | No demo account for a login-gated app | Working demo credentials in the App Review Information notes |

Schedule at least a week of slack before a hard launch date, so one rejection-and-resubmit cycle fits.

## Pre-submission checklist

- [ ] Android `targetSdkVersion` meets the current Play requirement, checked on disk this run.
- [ ] The build was produced from a clean checkout and installed on a real device, not just a simulator.
- [ ] Every permission in the manifest is used, and each has a purpose string.
- [ ] Privacy policy URL resolves, in store metadata and in the app.
- [ ] Account deletion is reachable in-app if accounts exist.
- [ ] Demo credentials are in the review notes if anything is behind a login.
- [ ] No placeholder copy, no lorem ipsum, no dead link anywhere in the shipped build.
- [ ] Crash reporting is live and source maps upload on both the build and the OTA path.
- [ ] The rollback path was named: previous binary, or republish of the prior OTA update.
- [ ] Rollback thresholds for the staged rollout are written down before stage one.
- [ ] The user explicitly confirmed the submission or production push.

## Reference files

| File | Read when |
|---|---|
| `references/store-compliance.md` | Preparing a submission, or a rejection needs diagnosing |
