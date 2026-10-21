# Store compliance detail

Contents: 1. Google Play target-API timeline. 2. Apple guideline categories. 3. The rejection-to-cause table.
4. CI pipelines that already exist. 5. Rollout metrics. 6. What to do after a rejection.

## 1. Google Play target-API timeline

| Requirement | Deadline |
|---|---|
| New apps and updates target API 36 (Android 16) | 2026-08-31 |
| Extension available through a Play Console request | to 2026-11-01 |
| Existing published apps at minimum API 35, or they stop reaching new users on newer Android versions | 2026-08-31 |
| Wear OS and Android Automotive target API 35 | 2026-08-31 |
| Android TV and XR target API 34 | 2026-08-31 |

This is a dated, live compliance item. Check the repo's actual target on every Android build rather than
assuming a recent Expo SDK handles it. An Expo SDK upgrade usually moves the target, but the project may pin
it.

## 2. Apple guideline categories

Five: Safety, Performance, Business, Design, Legal. Most rejections a small team hits are Performance 2.1
(completeness), Legal 5.1.1 (privacy policy, account deletion), and Business 3.1 (payments).

Payment exceptions exist but are narrow. Reader apps under 3.1.3(a), multiplatform services, and enterprise
distribution are the named categories. Confirm the app actually qualifies before assuming an exception; "we
are basically a reader app" is not a category.

Loot-box style randomized paid items require odds disclosure before purchase.

## 3. Rejection to cause

| Rejection text pattern | Actual cause | Fix |
|---|---|---|
| "We were unable to review your app as it crashed on launch" | Release-build-only failure, often a missing env var or an unsigned native dependency | Install the exact submitted artifact on a real device and cold start it |
| "Your app requires users to register before accessing content" | Login wall with no demo path | Demo credentials in review notes, or let content be browsed pre-login |
| "Your app does not include an account deletion option" | Deletion exists only via support | Add an in-app deletion path |
| "Your app includes a purchase mechanism other than in-app purchase" | External unlock, license key, or web checkout for digital goods | Route unlocks through IAP or confirm a named exemption applies |
| "Your app's metadata includes references to other platforms" | Screenshots or description mention Android, or a competitor trademark | Rewrite metadata per platform |
| "Missing purpose string" | A permission requested with no usage description | Add the string, rebuild. This cannot be fixed over the air. |
| App becomes unavailable to new Play users | Target API below the current floor | Raise the target and ship a new binary |

## 4. CI pipelines that already exist

Detect before creating. Scaffolding a second pipeline beside a working one is a defect.

| Marker | System | Extend it by |
|---|---|---|
| `.eas/workflows/*.yml` | EAS Workflows | Adding a job. Types include `build`, `submit`, and `slack`. Triggers: GitHub push, GitHub PR, App Store Connect review-state events, manual `eas workflow:run`. |
| `.github/workflows/*.yml` | GitHub Actions | Adding a step or a job to the existing workflow |
| `fastlane/Fastfile` | Fastlane | Adding a lane, or extending the existing one |

For bare React Native outside the EAS ecosystem, GitHub Actions plus Fastlane is the standard combination.

## 5. Rollout metrics and thresholds

Write the threshold before stage one, per metric. A threshold argued about mid-incident is not a threshold.

| Metric | Why it gates | Typical source |
|---|---|---|
| Crash-free session rate | The one metric that should stop a rollout by itself | Sentry, or the store's own vitals |
| Error rate on the changed path | Catches a non-crashing failure the release introduced | Backend logs, Sentry |
| p95 and p99 latency | Catches a change that made the app slow rather than broken | Backend metrics |
| The metric the release was meant to move | Catches a release that works and still fails | Product analytics |
| ANR rate (Android) | A frozen app reads worse to users than a crash | Play vitals |

Stage progression is 5 to 10 percent, then 25, then 50, then 100, holding at each stage long enough to observe
the metrics rather than long enough to feel patient.

## 6. After a rejection

1. Read the actual guideline number cited, not the summary paragraph. The number determines the fix.
2. Reproduce the reviewer's path on a real device using the exact submitted artifact.
3. Fix the cause, not the symptom. If the reviewer could not find the deletion path, the cause may be that it
   is three levels deep, not that it is missing.
4. Reply in Resolution Center with what changed, specifically. A resubmission with no explanation restarts the
   full queue with no context.
5. Log the guideline number and the cause where the next release will see it, so the same category does not
   repeat.
