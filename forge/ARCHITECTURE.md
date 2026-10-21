# FORGE - Binding Architecture Specification

Status: **normative**. Three builder agents implement this. Where this document and a research dossier
disagree, this document wins. Where this document is silent, the cited dossier is authoritative.

Read order for a builder: this file end-to-end, then only the dossier sections named in your pack's roster
rows. Do not read all ten dossiers; they total ~600 KB.

Source dossiers, referenced throughout as `[D01]`...`[D10]`, all under `/home/claude/skillpacks/research/`:
`01-skills-spec.md`, `02-skill-authoring-patterns.md`, `03-claude-code-features.md`, `04-web-engineering.md`,
`05-design-taste.md`, `06-app-engineering.md`, `07-performance.md`, `08-loops-and-verification.md`,
`09-noslop-explain-canary.md`, `10-interop-and-skill-organization.md`.

---

## 0. Decisions that close every ambiguity in the research

Each line is final. The reason is one clause; do not relitigate.

| # | Decision | Why |
|---|---|---|
| D1 | Canary format is `[skills: a > b]` ([D09] §C.5), **not** `[forge] used: ...` ([D10] §6.2) | shorter, anchored-regex checkable, names are already pack-prefixed so the word "forge" is redundant |
| D2 | Install path is a **skills-directory plugin**: unzip each pack to `~/.claude/skills/<pack>/` containing `.claude-plugin/plugin.json` + `skills/` | loads next session with zero commands, satisfies R7 literally ([D01] §5, §12) |
| D3 | Orchestrators **auto-trigger**. Never write "MANUAL ACTIVATION ONLY". Never set `disable-model-invocation` | R1 requires default-on; darke/panda's manual gate is an overhead-control choice FORGE explicitly rejects ([D02] §2.13) |
| D4 | Frontmatter `name:` is always **byte-identical to the skill's directory name** | only form that is correct on all four surfaces ([D01] §1) |
| D5 | Allowed frontmatter keys: `name`, `description`, `metadata`, and `allowed-tools` **only** | the portable-6 subset; anything else risks silent breakage or upload rejection ([D01] §0, §10) |
| D6 | Loop skills run **inline**, not `context: fork` | forked background runs hide per-iteration canaries and escape checkpointing ([D02] §7.2, [D08] §4.1) |
| D7 | **No numeric quality score anywhere** in any skill. Falsifiable boolean checklists with named locations, always | scores are Goodhart-able theatre produced by the same process being judged ([D02] §2.9, [D08] §6) |
| D8 | Loop ledger lives at `.claude/<pack>-loop/` | namespaced so three packs never collide ([D08] §4.3) |
| D9 | The Stop-hook canary enforcer ships in `ccforge` as an **opt-in script the user runs**, never auto-registered | R7 forbids install-time config; writing to the user's settings unasked is out of bounds ([D10] §9) |
| D10 | Compaction keeps only the **first 5,000 tokens** of each skill, so section order is normative and load-bearing rules go near the top | [D01] §3, [D09] §C.2 |
| D11 | Skill count is capped at **12 per pack**: 7 fixed roles + exactly 5 domain specialists | the skill listing budget is ~1% of context and drops least-invoked descriptions first ([D10] §2) |
| D12 | "Project-local wins" is **100% software policy** implemented by the orchestrator, never a platform setting | native precedence is enterprise > personal > project, i.e. backwards ([D01] §4, [D09] §C.6) |
| D13 | Packs must never write to `.claude/settings.json`, `settings.local.json`, or `skillOverrides` | user-owned files; FORGE only ever appends one marked block to CLAUDE.md, and only after asking |

---

## 1. The skill roster

### 1.1 The seven fixed roles, present in every pack

Every pack ships exactly these seven, plus exactly five domain specialists. In the roster tables below,
"Req" names the hard requirement the skill satisfies, "Must contain" is the non-negotiable content floor
(add more, never less), and "Read" names the only dossier sections that builder needs to open.

| Role | Name pattern | Requirement |
|---|---|---|
| Orchestrator | `<pack>-orchestrator` | R1 |
| Taste | `<pack>-taste` | R2 |
| Loop | `<pack>-loop` | R3 |
| Anti-slop | `<pack>-noslop` | R4 |
| Performance | `<pack>-perf` | R4 |
| Explain | `<pack>-explain` | R4 |
| Skill map | `<pack>-skillmap` | R6 |

Five domain specialists per pack (R2). Total: **36 skills, 12 per pack.**

### 1.2 webforge - websites and web apps

| # | Skill | One-line purpose | Req | Must contain (with thresholds) | Read |
|---|---|---|---|---|---|
| 1 | `webforge-orchestrator` | Runs the §2 contract for any nontrivial web build, fix, or ship request; owns stack detection, skill routing, and specialist dispatch. | R1 | §2 verbatim; `references/stack-detection.md` = [D04] §21.1 detection order verbatim | [D04] §21 |
| 2 | `webforge-scaffold` | Stands up a new web project or a new surface inside an existing one, matching the detected stack or the pack default. | R2, R8 | Default stack: Next.js 16 App Router + TS strict + Tailwind v4 + shadcn/Base UI + Drizzle + Vitest + Playwright. Escape hatch: any detected marker beats the default, per-concern. Package-manager table (lockfile → pm). Next major gate: `^16` → `"use cache"` legal only with `cacheComponents: true`; `^14/15` → never emit `"use cache"`. | [D04] §1, §10-12, §21 |
| 3 | `webforge-ui` | Builds components, layouts, forms, and every interaction state, accessible by construction. | R2 | All six of hover/focus-visible/disabled/loading/empty/error specified before a component is called done. WCAG 2.2 AA: 4.5:1 body, 3:1 large/UI. The six failures on 83-96% of sites (contrast, alt, labels, empty links/buttons) are BLOCKERs. `useActionState` + Zod (v4 `{error:}`, not v3 `{message:}` - check installed major). | [D04] §5, §8, §11, §14; [D05] §6 |
| 4 | `webforge-server` | Owns everything behind the client boundary: server/client split, caching, server actions, API layer, ORM, auth and session security. | R2 | `'use client'` at the leaf, never the route root. `revalidateTag()` requires a `cacheLife` profile 2nd arg on 16; `updateTag()` for read-your-writes, `refresh()` for uncached. Auth re-checked inside **every** action and DAL call - layout checks protect nothing. Session cookie `__Host-` + `HttpOnly` + `Secure` + `SameSite=Strict`, ≥64 bits entropy. Verify Next ≥16.1.7 (CVE-2026-27978, `Origin: null` CSRF). | [D04] §2-4, §6, §7, §9 |
| 5 | `webforge-verify` | Defines and runs the machine gates: types, lint, unit, E2E, a11y, bundle size - and writes the tests. | R2 | Gate table with exact commands and exit codes: `npx tsc --noEmit`; `npx eslint .` (1 = lint fail, 2 = broken gate - branch differently); `vitest run`; `npx playwright test`; `axe <url> --exit`; `npx size-limit`. pytest exit 5 = "no tests collected" is a failure, not a pass. Snapshot baselines are committed; `--update-snapshots` is never a side effect of a red run. | [D08] §2.2; [D04] §13-14 |
| 6 | `webforge-ship` | Takes a working app to a URL: build, env and secrets, metadata/SEO, observability. | R2 | Never emit a secret into a `NEXT_PUBLIC_*` var. Ship with error tracking wired before the first public deploy. Metadata/canonical/OG per route, not per app. Post-deploy check is a fetched status code plus a real CWV read, not "deployed successfully". | [D04] §15, §19, §20 |
| 7 | `webforge-taste` | Makes design decisions on purpose and audits output against the AI-slop tell table before anything ships. | R2 | Pre-commit constraint block (palette cap, ≤2 families, one pushed dimension) written **before** generating. Slop audit table verbatim: no purple→blue hero gradient, no gradient text, no 3-identical-cards reflex, no colored 3-4px card accent border, no 1px gray border on everything (separate by whitespace → 3-5% background shift → soft elevation → border, in that order), radius ≤12-16px on small containers, never `ease-in` alone for entrances, `prefers-reduced-motion` respected. Type scale steps ≥1.25×. Dark mode is a hand-authored second scale, never an inversion; #121212-class base, never pure black. | [D05] §1-8 |
| 8 | `webforge-perf` | Refuses performance work without a captured before-number, then fixes the named phase. | R4 | LCP ≤2.5s / INP ≤200ms / CLS ≤0.1 at p75. LCP sub-budget: TTFB ~40%, load delay <10%, load duration ~40%, render delay <10%. INP phases: input delay / processing / presentation - name one before coding. JS budget 365 KiB compressed for 3s TTI on mid-tier Android; JS costs ≥3× per byte. No "faster" claim without a p75 field number or a ≥5-run lab median. Every fix ships a regression gate. | [D07] §0-4, §7 |
| 9 | `webforge-noslop` | Strips AI tells from every word and line of code the pack emits. | R4 | Zero em dashes. >1 banned-pattern hit per 150 words fails. Cut 10% on the final pass. Code: unused parameter fails; `catch` with no comment naming the failure fails; config key with one call site fails; exported symbol with zero call sites fails. Commit text: imperative first line, zero emoji, explicit "did not do" line. **Exempt the canary line from every sweep.** | [D09] §A.1-A.5 |
| 10 | `webforge-explain` | Explains a decision, a system, or a diff at the altitude the reader needs, with calibrated confidence. | R4 | Mental model before mechanics, max two disclosure levels. ADR template, trade-off table, BLUF, Conventional Comments, Google CL-description shape (first line stands alone; state what you did NOT do). Confidence bands: almost certain ~95%+, very likely 80-95%, likely 60-80%, unclear 40-60%, unlikely 20-40%, very unlikely <20% - attached to the specific claim, never as a blanket disclaimer. | [D09] §B |
| 11 | `webforge-loop` | Drives continuous build-verify-fix cycles against a ledger until gates pass or a stop condition fires. | R3 | §5 verbatim, gates from `webforge-verify`. | [D08] |
| 12 | `webforge-skillmap` | Inventories every available skill, records the shared index, detects overlaps, and routes work to the right owner. | R6 | §4 verbatim. | [D10] |

### 1.3 appforge - mobile, desktop, and full-stack product surfaces

| # | Skill | One-line purpose | Req | Must contain (with thresholds) | Read |
|---|---|---|---|---|---|
| 1 | `appforge-orchestrator` | Runs the §2 contract for any app build request; owns platform choice, stack detection, and specialist dispatch. | R1 | §2 verbatim; `references/stack-detection.md` = [D06] §9 signal table verbatim | [D06] §9 |
| 2 | `appforge-mobile` | Builds the React Native / Expo surface: routing, native modules, permissions, push, deep links. | R2, R8 | New Architecture is **mandatory** on RN 0.82 / Expo SDK 55+ - `newArchEnabled=false` is ignored; never emit legacy-arch workarounds. Expo Router file conventions. Permissions declared with purpose strings + privacy manifest. Tokens in Keychain/Keystore, never AsyncStorage. | [D06] §1 |
| 3 | `appforge-desktop` | Builds the desktop surface and picks Tauri or Electron on stated criteria. | R2, R8 | Decision table with the actual deciding factors (bundle size, system webview risk, Node API need), not a preference. Auto-update path for each. macOS notarization and Windows signing are part of "done", not an afterthought. | [D06] §2 |
| 4 | `appforge-backend` | Owns the product backend: schema, authz, tenancy, jobs, webhooks, limits, storage - plus offline sync as a reference. | R2 | Prisma vs Drizzle decision (Prisma is Rust-free by default since 6.16.0: ~90% smaller bundles, edge-viable - the old "Prisma is too heavy" rule is dead). Webhook handlers dedupe by event ID and are order-independent; Stripe/RevenueCat guarantee neither order nor single delivery. Idempotency key: ≤255 chars, 24h TTL, v4 UUID. Presigned URLs for uploads, never proxying bytes. `references/offline-sync.md` covers optimistic updates and conflict resolution. | [D06] §3-5 |
| 5 | `appforge-release` | Gets a build signed, uploaded, reviewed, and rolled out without a store rejection. | R2 | Google Play requires API 36 (Android 16) targeting by **2026-08-31** - check and surface this on every Android build. EAS Build/Submit/Update split. OTA update rules: what may ship OTA vs what needs a store binary. Staged rollout with a stated rollback trigger. Apple review pitfalls checklist. | [D06] §1, §2 |
| 6 | `appforge-verify` | Defines and runs the app gate stack, plus reliability instrumentation. | R2 | Testing pyramid with Detox vs Maestro decision. Error taxonomy → retry policy: full/equal/decorrelated jitter backoff, with the rule that non-idempotent calls never auto-retry without an idempotency key. Sentry + an analytics event taxonomy defined before the first event is emitted. Gate exit-code table as in `webforge-verify`. | [D06] §6-7; [D08] §2.2 |
| 7 | `appforge-taste` | Makes product and interface decisions on purpose and audits against the slop table and platform conventions. | R2 | Same constraint-block-before-generating rule and slop table as `webforge-taste`, retargeted: platform-native navigation and gestures over web-shaped UI, touch target ≥44×44pt, thumb-zone placement, loading/empty/error/offline states specified for every screen, no purple-gradient default. | [D05] §1-8 |
| 8 | `appforge-perf` | Refuses performance work without a captured before-number, then fixes the named phase. | R4 | Android cold start TTID/TTFD ≥5s is "excessive"; warm ≥2s; hot ≥1.5s. Frame budget is a hard 16.67ms cliff; jank 16-700ms / frozen 700ms-5s / ANR >5s. Measure with `adb shell am start -S -W ...` or Macrobenchmark `StartupTimingMetric`, never by feel. Same no-number-no-work doctrine as `webforge-perf`. | [D07] §0, §6, §7 |
| 9 | `appforge-noslop` | Strips AI tells from every word and line of code the pack emits. | R4 | Same rule set as `webforge-noslop`, retargeted to app copy: no "Oops! Something went wrong", error text names the failure and the next action. | [D09] §A |
| 10 | `appforge-explain` | Explains a decision, a system, or a diff at the altitude the reader needs, with calibrated confidence. | R4 | Same as `webforge-explain`. | [D09] §B |
| 11 | `appforge-loop` | Drives continuous build-verify-fix cycles against a ledger until gates pass or a stop condition fires. | R3 | §5 verbatim, gates from `appforge-verify`. | [D08] |
| 12 | `appforge-skillmap` | Inventories every available skill, records the shared index, detects overlaps, and routes work to the right owner. | R6 | §4 verbatim. | [D10] |

### 1.4 ccforge - mastering Claude Code in the terminal and VS Code

Roster designed from [D03]. Naming constraint: **no skill name may contain the substrings "claude" or
"anthropic"** - reserved server-side ([D01] §1, [D02] §1.3). This is why the memory-file skill is
`ccforge-prime`, not `ccforge-claude-md`.

| # | Skill | One-line purpose | Req | Must contain (with thresholds) | Read |
|---|---|---|---|---|---|
| 1 | `ccforge-orchestrator` | Runs the §2 contract for any request about configuring, debugging, or operating Claude Code itself. | R1 | §2 verbatim; stack detection here means detecting the **existing setup**: which memory files load, which plugins/MCP servers are enabled, which hooks exist, what the settings precedence resolves to | [D03] §17, §8 |
| 2 | `ccforge-prime` | Sets up and prunes the repo's persistent instruction layer: memory files, `.claude/rules/`, AGENTS.md interop. | R2 | Target **<200 lines** of memory; every line is a per-request tax on unrelated work. Move sometimes-needed material into skills, path-scoped material into `.claude/rules/` with `paths:`. Load order broadest→specific. `paths:`-scoped rules and nested memory files are **lost after compaction** until a matching file is read again - never put a load-bearing rule only there. | [D03] §2, §11.3, §16.3 |
| 3 | `ccforge-wire` | Wires hooks, subagents, MCP servers, permissions, and settings - and refuses the ones that are not earned. | R2 | Hook exit codes: 0 = proceed, 2 = block (Stop → keep working; PreToolUse → deny), other non-zero = non-blocking error. `PostToolUse` cannot block. Stop hooks have a hard **8-consecutive-block cap**; any Stop hook must check `stop_hook_active` and exit 0 if true. Settings precedence table. Prefer a CLI tool over an MCP server when both exist (MCP tool names cost context even unused). | [D03] §5-8 |
| 4 | `ccforge-debug` | Diagnoses why a session, skill, hook, or agent is misbehaving, using evidence rather than assertion. | R2 | Malformed YAML frontmatter fails **silently**: skill loads with empty metadata, `/name` still works, auto-trigger is permanently dead - `claude --debug` is the only way to see it. Skills placed in `.claude-plugin/` load the plugin with components silently missing. A `!` injected command that exits non-zero aborts the whole skill invocation - append `|| true`. `mcp__ide__getDiagnostics` reads the VS Code Problems panel. Evidence rule: if you cannot state what the check printed, the check did not happen. | [D03] §1.3, §6.4; [D01] §10 |
| 5 | `ccforge-parallel` | Chooses and runs the right parallelism primitive: subagents, agent view, teams, dynamic workflows, worktrees, headless. | R2 | Gate 0 style refusal: stay sequential unless the work splits into ≥5 genuinely independent subtasks whose outputs do not need to agree. Cost facts that force the gate: subagents ~4× tokens, multi-agent ~15×, agent teams in plan mode ~7×. Dynamic workflows cap at 1,000 agents / 16 concurrent, warn >25 agents or >1.5M projected tokens. Worktree isolation is enforced by hard block, not convention; `.worktreeinclude` copies `.env` in. | [D03] §13, §15, §16 |
| 6 | `ccforge-authoring` | Writes, validates, and tunes new skills so the user's own additions trigger correctly and coexist with FORGE. | R2 | `name` ≤64 chars `^[a-z0-9-]+$`, no leading/trailing/double hyphen, never containing "claude"/"anthropic". `description` ≤1024 chars, no angle brackets; listing truncates description+`when_to_use` at 1,536 chars. Exactly one `SKILL.md` per package. Body <500 lines. References one level deep only. Description eval: 20 queries, 8-10 positive and 8-10 genuine near-miss negatives, pick by held-out score. `claude plugin validate ./pack --strict` before shipping. | [D01] §1-3, §10; [D02] §3 |
| 7 | `ccforge-taste` | Judges whether a piece of setup should exist at all, and how it should read. | R2 | The "should this exist" gate applied to every proposed skill/hook/MCP/agent/rule: name the recurring task it replaces, the failure it prevents, and its context cost - if any of the three is unnameable, do not add it. Naming: no `helper`/`utils`/`tools`/`data`/`files`. One default with one named escape hatch, never a menu. Output legibility: a status line and a canary the user reads in under a second. Deleting a dead skill is a win, not a loss. | [D01] §2; [D02] §3.4, §8 |
| 8 | `ccforge-perf` | Manages context, token, and cost economy as a measured budget. | R4 | Sonnet 5 auto-compacts near ~967K; 200K boundary under `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` or on 200K-window configs. Compaction re-attaches only the most recent invocation of each skill, first 5,000 tokens each, 25,000 total, oldest dropped first. Clear triggers: unrelated task mixed in; the same issue corrected twice; instruction adherence visibly degrading. `/compact <focus>` beats an unguided compact; `/clear` costs nothing while `/compact` re-reads the whole conversation. Cache lifetime 1h on subscription, 5min on credits/API. Ranked burn list: unscoped investigate prompts > raw tool output > memory bloat > idle MCP servers > high effort on simple tasks. | [D03] §11, §16 |
| 9 | `ccforge-noslop` | Strips AI tells from prose, code, commits, and config the user ships. | R4 | Same rule set as `webforge-noslop`, plus: no config key nobody asked for, no wrapper script that only forwards arguments. | [D09] §A |
| 10 | `ccforge-explain` | Explains a mechanism, a failure, or a trade-off in Claude Code's own behavior, with calibrated confidence. | R4 | Same as `webforge-explain`, plus: separate documented behavior from inferred behavior explicitly; version-gate any claim (`≥v2.1.x`) rather than stating it flatly. | [D09] §B |
| 11 | `ccforge-loop` | Drives continuous improvement of the user's Claude Code setup against a ledger and measurable gates. | R3 | §5 verbatim. Gates here are setup gates: `claude plugin validate --strict` exits 0; every skill's frontmatter parses; memory files under budget; no skill in the index has a missing source path. | [D08]; [D03] §17 |
| 12 | `ccforge-skillmap` | Inventories every available skill, records the shared index, detects overlaps, and routes work to the right owner. | R6 | §4 verbatim, **plus** it owns the census script and the optional Stop-hook canary enforcer (D9). The other two packs' skillmaps use the same script and index and must work with ccforge absent. | [D10] |

### 1.5 What was considered and killed

- **A separate `*-a11y` skill.** Killed: accessibility is a gate inside `webforge-verify` and a construction
  rule inside `webforge-ui`. A skill nobody invokes gets its description dropped from the listing first.
- **A separate `*-security` skill.** Killed: folded into `webforge-server` (session/CSP/actions) and
  `appforge-backend` (authz/tenancy/webhooks). Security that lives in its own skill is security nobody loads.
- **A separate `appforge-sync` skill.** Killed: offline sync is a client-server data protocol; it ships as
  `appforge-backend/references/offline-sync.md`, loaded only when relevant, at zero cost otherwise.
- **A separate `ccforge-context` skill.** Killed: merged into `ccforge-perf`, because for this pack context
  economy *is* performance and two skills would split the same trigger space.
- **A `*-deploy` skill with `disable-model-invocation: true`.** Killed for webforge/appforge: shipping is
  inside `webforge-ship` / `appforge-release`, gated by a refusal clause rather than a frontmatter flag,
  because the flag also removes the description from context and breaks orchestrator dispatch.

---

## 2. The orchestrator contract

All three orchestrators are the same machine with different specialist tables. Copy this section into each
`<pack>-orchestrator/SKILL.md`, substituting `<pack>` and the pack's specialist names. Do not reorder phases,
do not rename them, do not add a phase.

**Framing sentence every orchestrator opens with, verbatim shape:**
> This skill contains no domain knowledge. It governs how `<pack-domain>` work gets processed. The domain
> knowledge lives in the specialists it calls.

### 2.0 Prime directives (copy verbatim, numbered, at the top of the body)

1. Restate the request in one sentence before touching anything. If you cannot, you are not ready to build.
2. Never build on an unverified load-bearing assumption. For each assumption ask: if this is false, does the
   output survive? If no, verify it or ask.
3. Fluency is not evidence. Every claim about what the code does gets an executed check or an `[unverified]` tag.
4. Generate before you evaluate. Force at least two real alternatives to exist before choosing one.
5. Write the first implementation as if it ships today. Refinement raises a strong draft; it cannot rescue a lazy one.
6. Calibrate. State what would change your conclusion. A position with no flip condition is dogma.
7. Match depth to stakes (§2.8 effort dial).
8. Serve the goal, not the literal instruction. Users ask for their attempted solution, not their problem.
9. Ship the artifact, not the machinery. The user sees the result and its calibration - not phase names,
   defect logs, or a process diary. The canary line (§3) is the only permitted exception.

### 2.1 Phase 1 - FRAME

Outputs, all of them, before anything else runs:

- One-sentence restatement of the task.
- **Goal** - what changes in the world when this is done.
- **Deliverable** - the exact artifact. For build work this is a running thing, not a description of one.
- **Hard constraints** - violating one is failure. Includes the detected or declared stack.
- **Soft preferences** - tradeable.
- **Audience** - who consumes the artifact, at what level.
- **Deliverable failure modes** - name up front what would make a competent reviewer reject this artifact.
  These become the pre-registered refinement targets in §2.5.
- **XY check** - is this request a means to an unstated end? If suspected, confirm the end before optimizing
  the means.
- Effort dial setting (§2.8).

**STOP-1 (interview, do not guess):** if the Deliverable cannot be named as a concrete artifact, or the XY
check comes back positive and the real goal changes what you would build, ask before proceeding. Use §2.9.

### 2.2 Phase 2 - MODEL

Outputs:

1. **Skill census / routing decision** - run §4. Produce an explicit routing line naming, for each subgoal,
   which skill owns it: a user skill, a pack specialist, or both in a domain-then-craft composition.
2. **Stack posture (R8)** - read `references/stack-detection.md` and run it in order. Result is a table of
   concerns (package manager, framework, framework major/variant, CSS, ORM, test runner, linter, CI) each
   marked `DETECTED: <value>` or `NONE`. Pack defaults apply **only** to concerns marked `NONE`.
3. **Assumption ledger** - every assumption tagged:

   | Tag | Meaning | Action |
   |---|---|---|
   | `[VERIFIED]` | confirmed in a file you read, a command you ran, or the user's own words | build on it |
   | `[DEFAULT]` | unverified, low impact, sensible convention | proceed, disclose at DELIVER |
   | `[LOAD-BEARING]` | unverified, and the output changes materially if wrong | verify or ask - never proceed silently |

**Gate 1 - stack conflict (refusal clause, copy verbatim):**
> If the detected stack contradicts a hard constraint the user stated, STOP and ask before writing any code.
> Conforming to a repo you did not choose is this skill working correctly, not this skill failing to have an
> opinion.

**Gate 2 - ownership (refusal clause, copy verbatim):**
> If a project-local skill already owns this subgoal, invoke it instead of the pack default, name it in the
> canary line, and do not silently duplicate its work.

**STOP-2:** any `[LOAD-BEARING]` assumption you cannot resolve cheaply yourself → ask (§2.9).

### 2.3 Phase 3 - PLAN

Outputs:

- Subgoals with dependencies. Check for gaps (something falls between two subgoals) and overlaps (two
  subgoals produce contradictory work).
- **Dispatch table**: subgoal → owning skill (full prefixed name) → order → named fallback if it is missing
  from disk. Naming the fallback now is what prevents thrashing later.
- **Pre-registered verification criteria**, written before any code exists. For build work these are the
  concrete gate commands from `<pack>-verify`, not adjectives. Criteria written afterwards bend to justify
  whatever got made.
- Risk order: attack the subgoal most likely to invalidate the plan first.

**STOP-3:** if the plan requires an irreversible action (schema migration, public deploy, data deletion,
store submission, force-push), state it and get explicit confirmation before executing that step.

### 2.4 Phase 4 - BUILD

Standing rules for the rest of the task, not a step to complete and forget:

- Dispatch each specialist by **full prefixed name** through the Skill tool: "invoke `webforge-ui`", never
  "use the UI skill". Ambiguous references do not resolve reliably across three packs.
- **Drift checkpoint at every subgoal boundary**: re-read the FRAME goal verbatim, not from memory, and ask
  whether the last subgoal still serves it or has started optimizing something local. If it drifted, say so
  and correct before continuing.
- **Trace discipline**: every specific - an API signature, a version number, a config key, a file path -
  comes from something you read this session or is marked `[unverified]`. Never manufacture a specific.
- **Stuck protocol**: after two honest failed attempts at the same thing, stop repeating. Switch mode -
  change representation, shrink to the smallest failing case, invert the question, challenge a "given". Still
  stuck after the switch → escalate to the user with what you tried and what it printed, never "having trouble".
- **Scope discipline**: files outside the declared subgoal scope are not touched. If one must be, log the
  reason first.

### 2.5 Phase 5 - REFINE

Bounded adversarial self-refinement against a written defect log. One cycle = **critique with one lens →
log defects → classify → revise surgically**. Rotate lenses; never repeat one, it finds almost nothing twice.

| # | Lens | Move | Catches |
|---|---|---|---|
| 1 | Hostile expert (always first) | Force one sentence: "The single strongest objection to this is ___." Attack in order: wrong? built on sand? incomplete? the wrong thing? | wrong output, unverified load-bearing assumptions, answering an easier adjacent question |
| 2 | Does it actually run | Build it, run it, open it, execute the gates. Report what printed. | the gap between "looks correct" and "works" |
| 3 | Adversarial and stress | Push every input to 0, 1, empty, huge, negative, malformed, concurrent. Unhappy path only. | edge breakage, unhandled states |
| 4 | Hallucination audit | Classify every checkable specific as VERIFIED / INFERRED / ASSUMED / UNSOURCED. UNSOURCED → verify it, tag it `[unverified]`, or delete it. No fourth option. | confident precise unsourced claims |
| 5 | Density | Cut everything that fails "does removing this make it worse?", then confirm nothing load-bearing went with it. | filler, dead code, generated boilerplate |

**Defect log format (the only thing that counts as a finding):**

```
LOCATION              | DEFECT                                   | SEVERITY | CLASS
----------------------|------------------------------------------|----------|-------------------
src/auth.ts:88        | floating promise, no catch                | BLOCKER  | correctness
app/page.tsx §hero    | 3 identical feature cards, default shape  | MAJOR    | slop-tell
```

A finding you cannot locate and state is a mood. Discard it.

Severity → action: **BLOCKER** fix always / **MAJOR** fix / **MINOR** fix if cheap / **TASTE** fix only at
high effort. A defect class that recurs across three cycles is a missing constraint in FRAME - fix it
upstream, do not cycle again.

**Stopping rules, checked in this order, first one wins:**
1. Clean pass - a full lens produces zero BLOCKER and zero MAJOR.
2. No material improvement - two consecutive cycles produce only MINOR/TASTE churn.
3. **Cycle cap: 4.** If four cycles have not cleared the gate, the problem is in FRAME or PLAN, not the code.

**Refinement anti-patterns to name and avoid:** critique ritualism (every cycle ends in a diff or an explicit
"clean pass" - no third option); revision churn (no file touched without a logged defect against it);
sandbagging (§2.0 directive 5); novelty drift (anything added after cycle 1 gets its own fresh hallucination
audit and its own gate run); perfectionist non-delivery (when a stopping rule fires, ship).

### 2.6 Phase 6 - VERIFY

Runs once, whether or not REFINE ran.

1. Literal re-read of the original request. Map every requirement to the exact place it is satisfied.
2. Run the pre-registered gates from PLAN. Report exit code and real output per gate, in the
   `GATE: name | CMD: ... | EXIT: n | <output>` shape. A paraphrase is not a result.
3. Mechanical checks: zero/one/many/empty/huge/negative, unit and order-of-magnitude sanity, internal consistency.
4. Fresh-eyes read: does this make sense to someone with no access to your reasoning?

**Quality gate - a checklist of falsifiable booleans with named locations. Never a score, never a percentage,
never "9/10".** Minimum items every orchestrator ships:

- [ ] Every requirement in the original request maps to a named file, route, or command.
- [ ] Zero unresolved BLOCKER or MAJOR defects.
- [ ] Every registered gate ran this turn and its exit code is recorded.
- [ ] Every specific in the delivered text traces to something read this session or carries `[unverified]`.
- [ ] Nothing outside the declared scope was modified.
- [ ] No test was deleted, skipped, or weakened to make a gate pass.
- [ ] Every `[DEFAULT]` assumption is disclosed in the delivery.
- [ ] The stack posture table matches what is actually on disk right now.

**Verification theater is the failure to guard against**: if you cannot state what the check printed, the
check did not happen.

### 2.7 Phase 7 - DELIVER

Fixed shape, in this order:

1. **BLUF** - one or two sentences: what now exists and what it does.
2. **How to see it** - the exact command or URL. Not a description of how one might run it.
3. **Gate results** - one line per gate, with exit codes.
4. **Disclosed `[DEFAULT]` assumptions** - one line each, only the ones that could matter.
5. **Open items** - remaining BLOCKER/MAJOR defects, or "none". Plus the flip condition on any load-bearing
   claim: "this holds unless X".
6. **One recommended next step.** One. Extras get a single offered line, never silent implementation.
7. **The canary line** (§3), last, after a blank line.

No phase names. No "I have now completed the FRAME phase". No praise for the user or yourself.

### 2.8 Effort dial

Set in FRAME from reversibility and cost, not from how interesting the task looks.

| Tier | When | Behavior |
|---|---|---|
| Low | one-file change, trivially reversible, no user-facing surface | phases compressed to a few lines each, 1 alternative, 0-1 refine cycles (hostile expert only), gates limited to those the change can break |
| Standard (default) | a feature, a new surface, anything a user will see | full loop, 2-3 alternatives at the decision points, 2 refine cycles (hostile expert → does it actually run), full gate set |
| High | schema migration, auth or payment path, public deploy, store submission, anything irreversible | full loop plus premortem and an independent re-derivation of the risky part, 3-4 refine cycles adding adversarial-stress and hallucination-audit, ask rather than default on every `[LOAD-BEARING]` item |

### 2.9 Clarification protocol (this is the "interview instead of guessing" machinery)

**Ask only when all three hold:**
1. The ambiguity is load-bearing - different resolutions produce materially different artifacts.
2. You cannot resolve it yourself cheaply by reading a file, checking context, or running one command.
3. The user plausibly holds the answer - intent, priorities, environment, taste, constraints.

**Do not ask when:** it is cosmetic (pick the default, tag `[DEFAULT]`, disclose at delivery); it is
discoverable (go discover it - asking what you could check offloads your work onto the user); it was already
signaled (re-read the request first).

**How to ask:** one round, **maximum 3 questions**, ranked by impact. Each question carries why it matters in
one clause, 2-4 concrete options, and your default. Shape:
> `X or Y? This changes <consequence>. I'll assume X unless you say otherwise.`

Proceed on the unblocked parts of the task in parallel. Never fully block on partial ambiguity.

**Mid-task escalation:** when execution reveals a fact that invalidates the frame - a constraint conflict, a
false premise, an irreversible fork you did not anticipate - stop and surface it immediately. A finished
wrong thing costs more than an interruption.

### 2.10 Degradation

If a specialist named in the dispatch table is not on disk, do that slice of the work directly, at reduced
depth, and say so in the canary line: `[skills: webforge-orchestrator (webforge-ui absent)]`. Never claim a
specialist ran. Never fail because a sibling is missing.

### 2.11 Orchestrator description guidance (R1 + D3)

The orchestrator must win the trigger contest for anything nontrivial in its domain. Claude bypasses skills
for requests it thinks are one-step, so the description must signal **stakes and multi-step scope**, not just
domain keywords.

Required elements, in this order, third person, 250-450 characters:
1. What it does, as a process claim: "Plans, builds, verifies, and ships ...".
2. Explicit trigger breadth: "Use for any request to build, add, fix, refactor, review, or ship a
   `<domain thing>`, including requests that look like a single step but touch <the risky surfaces>."
3. A pushy clause: "Use this even when the user does not name it."
4. A defer clause naming what it is **not** for, so it does not eat unrelated requests.

Worked example, copy the shape:

```yaml
description: >-
  Plans, builds, verifies, and ships websites and web apps end to end: frames the request, detects the
  existing repo stack, routes work to the right skill, runs real gates, and refines against logged defects.
  Use for any request to create, add to, fix, refactor, review, or deploy a site, page, component, route,
  API, or web feature, including short requests like "add a login page" that touch routing, data, and auth.
  Use this even when the user does not name it. Not for mobile or desktop app shells, or for questions about
  Claude Code itself.
```

Never write "MANUAL ACTIVATION ONLY". Never set `disable-model-invocation`.

---

## 3. The canary spec (R5)

### 3.1 Format

One line. Last line of the visible response, after a blank line. ASCII only. No heading, no bold, no emoji,
no code fence, no second line, no explanation of the line itself.

```
[skills: webforge-orchestrator > webforge-server > webforge-noslop]
```

- Separator is ` > ` (space, greater-than, space). Names appear **in the order they fired**.
- Names are the full prefixed skill names, exactly as they appear in frontmatter.
- **Non-FORGE skills that fired are listed too**, by their own name, in position. That is the proof R6 routing
  actually happened: `[skills: webforge-orchestrator > deploy-site > webforge-taste]`.
- A skill that fired alone: `[skills: webforge-taste only]`.
- Degraded dispatch gets exactly one parenthetical, at the end, ≤6 words:
  `[skills: webforge-orchestrator (webforge-ui absent)]`.

Checkable regex, anchored to the last line: `^\[skills: .+\]$`

**What never goes in it:** iteration counts, timestamps, token counts, confidence, scores, file names,
a second bracket group, a sentence.

### 3.2 The verbatim block every SKILL.md must contain

Place it as the **second section of the body**, immediately after the one-line role statement and before the
procedure. It sits near the top because compaction retains only the first 5,000 tokens of a skill (D10).
Copy it exactly; substitute only `<this-skill-name>`.

```markdown
## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: <this-skill-name> only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: <this-skill-name> (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.
```

For `<pack>-noslop` skills, add one more sentence to that block: *"Exempt this receipt line from every
anti-slop sweep; it is a log line, not prose."*

### 3.3 What the orchestrator does when the receipt goes missing or context degrades

Add this to every orchestrator body, immediately after the receipt block:

```markdown
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
```

Specialists do not carry the degradation watch - only orchestrators and loop skills do. One watcher per
session is the point.

### 3.4 Optional hard enforcement (ccforge only, opt-in)

`ccforge-skillmap` ships `scripts/canary-hook.sh` and documents it. It is **not** registered automatically
(D9). The script reads hook JSON on stdin, checks `last_assistant_message` against `^\[skills: .+\]$`, and
exits 2 with a corrective stderr message if absent. It must exit 0 immediately when `stop_hook_active` is
true, or it will fight the 8-consecutive-block cap. The skill body tells the user the exact `settings.json`
snippet to paste if they want it, and how to remove it.

---

## 4. Interop and skill-organization protocol (R6)

The platform resolves same-name collisions **enterprise > personal > project** - backwards from what R6
requires - and detects semantic overlap not at all. Namespacing means literal collisions essentially never
happen, so **every bit of "project-local wins" is software policy implemented here** (D12).

### 4.1 The shared index

Two files. Both are machine-derived data; neither is ever hand-edited by a user.

| File | Scope | Rebuilt when |
|---|---|---|
| `~/.claude/forge/personal-skills-cache.json` | personal + plugin skills, identical across projects | its `session_id` differs from the current session **and** `generated_at` is older than 24h - both conditions |
| `.claude/forge/skills-index.json` | the live index: personal cache merged with a fresh scan of the project tree | at the start of each orchestrator task, if `session_id` differs from the current session |

With no project root, the live index falls back to `~/.claude/forge/skills-index.json`. All three packs'
skillmap skills read and write **these exact paths** - one shared map, never three. Writes are atomic:
write to `<path>.tmp`, then `mv`. The index is a full rebuild, not a merge, so a later writer never corrupts
an earlier one; `generated_by` records which skillmap produced it. Add `.claude/forge/` to `.gitignore`.

**Schema** (`schema_version: 1`, exact field names - builders must not rename these):

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-08-18T14:32:00Z",
  "generated_by": "webforge-skillmap@1.0.0",
  "session_id": "sess_abc123",
  "project_root": "/home/user/myapp",
  "skills": [
    {
      "id": "webforge-taste",
      "invoke_as": "/webforge:webforge-taste",
      "scope": "plugin",                  // enterprise|personal|project|nested|plugin|bundled|synced
      "source_path": "~/.claude/skills/webforge/skills/webforge-taste/SKILL.md",
      "plugin": "webforge",
      "description_excerpt": "first 200 chars only",
      "pack": "webforge",                 // or null
      "kind": "taste",                    // orchestrator|specialist|taste|loop|noslop|perf|explain|skillmap|user|unknown
      "domain": ["frontend", "design"],
      "owner": "forge",                   // forge|user|thirdparty
      "classification_tier": "authoritative",  // authoritative|inferred|unclassified
      "status": "active",                 // active|dead-candidate
      "last_seen_scan": "2026-08-18T14:32:00Z"
    }
  ],
  "overlaps": [
    {
      "forge_skill": "webforge-ship",
      "user_skill": "deploy-site",
      "jaccard": 0.41,
      "severity": "overlap_candidate",    // overlap_candidate|overlap_likely
      "overlap_domain": ["deploy"],
      "resolution": "project-wins",       // project-wins|compose  - never "pack-wins"
      "note": "deploy-site owns the ship step; webforge-ship is limited to build config."
    }
  ],
  "dead_candidates": [
    { "id": "old-thing", "reason": "source_path missing on scan", "last_seen_scan": "2026-07-01T00:00:00Z" }
  ],
  "rename_suggestions": []
}
```

### 4.2 The census procedure

Every `<pack>-skillmap` ships `scripts/scan_skills.sh` - POSIX shell + `awk`/`sed`, **no third-party
dependency, no YAML library** (skill frontmatter is flat `key: value`). Each pack ships its own copy of the
script; plugin directories cannot reference files outside their own tree. The script prints **one JSON object
per line** to stdout. The model runs it via Bash and reads the compact output. Never `Read()` every discovered
`SKILL.md` into context to build the index - that is a large spend for six frontmatter lines per file.

Enumeration order, cheapest and most authoritative first:

1. `~/.claude/skills/synced/manifest.json` if present - already-structured census of synced skills, read it
   instead of opening each `synced/*/SKILL.md`.
2. `~/.claude/skills/*/SKILL.md` and `~/.claude/skills/*/skills/*/SKILL.md`, excluding `synced/`.
3. `.claude/skills/**/SKILL.md` from cwd up to repo root, plus a repo-wide `**/.claude/skills/*/SKILL.md`
   glob. Catalog nested monorepo skills even before they activate - the census's job is completeness.
4. Each enabled plugin's `skills/*/SKILL.md`, under `~/.claude/plugins/cache/<plugin>/` or
   `~/.claude/skills/<plugin>/`.
5. `.claude/commands/*.md` - legacy, loses to any same-named skill.

Classification is two-tier: **authoritative** when a `metadata:` map carries `pack`/`kind`/`domain` (FORGE
skills always do), **inferred** from description keywords otherwise. When neither is confident, record
`domain: ["unclassified"]` and move on. A wrong classification is worse than none - it misroutes.

Overlap detection: lowercase and tokenize each description, drop stopwords, compute Jaccard similarity for
every cross-owner pair (`forge` vs `user`/`thirdparty`; skip same-owner pairs). **≥0.35 → `overlap_candidate`.
≥0.60 → `overlap_likely`.** State in the skill body that these are FORGE heuristics, not platform constants,
and tunable.

Dead-skill flagging is limited to what is honestly observable: a `source_path` that fails to resolve on a
scan where the index previously recorded it. **Never label a skill "unused"** - FORGE can only see
invocations it mediates; a user typing `/some-skill` is invisible to it. `rename_suggestions` is advisory
text only. The census never edits, renames, or moves any file with `owner: user`.

### 4.3 Routing precedence - the verbatim block for every orchestrator

Copy this into every `<pack>-orchestrator/SKILL.md`, in the MODEL phase section.

```markdown
## Routing (standing rule)

Before doing any work yourself, decide who owns it. Load `.claude/forge/skills-index.json` (rebuild it by
invoking `<pack>-skillmap` if it is missing or its `session_id` is not this session's). If no index and no
skillmap exist, run the inline fallback: glob `.claude/skills/*/SKILL.md` and `~/.claude/skills/*/SKILL.md`,
read the names and descriptions, and route from those. Never skip the check.

Apply these rules in order and stop at the first that fires:

1. A project-scope user skill that plausibly covers the subgoal wins on domain rules - business logic, house
   conventions, internal tooling, naming, deploy targets. Invoke it. This holds regardless of what native
   name precedence would do.
2. A personal-scope user skill ranks between project scope and this pack. Prefer it over the pack specialist
   for the same narrow job; it never beats a project-scope skill.
3. If no user skill plausibly covers the subgoal, use the pack specialist with the stack posture from MODEL.
4. If a user skill and a pack skill match at different layers, compose rather than choose. The user skill
   supplies domain rules (what is correct here). The pack skill supplies craft rules (is it well built, fast,
   accessible, free of slop). Invoke the user skill first, then pass its output to the pack skill as fixed
   input, explicitly told not to redesign it.
5. If the index marks the pair `overlap_likely` and you have not confirmed the split this session, defer
   entirely to the user skill. Do not split the work and hope the halves agree.
6. If the match is unclassified, ambiguous, or genuinely novel, ask one short question. Do not guess.

Name every skill you route to in the receipt line, user skills included.
```

Summary table builders may include as-is:

| Census says | Do this |
|---|---|
| No user skill matches | Pack specialist, default stack posture |
| User project skill matches, no overlap flagged | Invoke the user skill; do not also run a pack specialist uninvited |
| Both match, different layers | Compose: user skill (domain) → pack skill (craft) |
| `overlap_likely` (≥0.60) | Defer entirely to the user skill this task |
| `overlap_candidate` (0.35-0.60) | Compose cautiously; say both ran and why |
| Unclassified / ambiguous | One short question |
| Skillmap not installed | Inline glob fallback - never skip the check |
| Rest of pack absent | Run standalone, degrade honestly in the receipt |

### 4.4 CLAUDE.md integration - small, marked, removable

Ship one shared fragment, not one per pack, at `~/.claude/forge/FORGE.md`:

```markdown
<!-- forge:begin managed-by=forge schema=1 -->
## FORGE routing
FORGE packs installed here; skills are namespaced `<pack>-<skill>`.
Before a FORGE skill acts, check `.claude/forge/skills-index.json` (rebuild via any `*-skillmap`).
Any skill NOT prefixed `webforge-`/`appforge-`/`ccforge-` that plausibly covers the task wins on
domain rules; the FORGE skill runs only for the craft layer, or not at all if the other skill
already owns the whole task. Compose, do not duplicate.
Every FORGE skill ends its reply with one line: `[skills: name1 > name2]`.
<!-- forge:end -->
```

Rules:
- The HTML comment sentinels are stripped before entering context but persist on disk, so they cost nothing
  and make install/uninstall an exact grep.
- Total fragment: **≤10 lines**. Imports still load fully into context - importing does not make it free.
- The user's `CLAUDE.md` gets exactly **one added line**: `@~/.claude/forge/FORGE.md`.
- **Ask before writing it.** On first orchestrator invocation in a session, if that import line is absent,
  ask once, plainly: *"Add one line to ~/.claude/CLAUDE.md so FORGE's routing rules load every session? It's
  one line plus a 10-line file, both clearly marked and removable. (yes/no)"* On no, proceed without
  persisting and do not ask again this session.
- Uninstall is: delete the one import line, delete `~/.claude/forge/`, and `claude plugin uninstall <pack>`.
  Delete `~/.claude/forge/` only when no FORGE pack remains.

### 4.5 Graceful degradation

| Situation | Behavior |
|---|---|
| Only one pack installed | Fully functional. Its orchestrator uses its own skillmap; if that is absent too, the inline glob fallback. R6 compliance never depends on `ccforge` being present. |
| A specialist is missing | Orchestrator does that slice directly at reduced depth and marks it in the receipt. Never a hard failure. |
| Index file missing or corrupt | Rebuild once. If rebuild fails, fall back to inline globs and say so once. Never block the task on the index. |
| Specialist invoked directly by the user | Runs standalone. It assumes no orchestrator ran, no shared state exists, and re-frames minimally on its own. |
| Essentials (`noslop`, `perf`, `explain`) | Never reference another FORGE skill at all, in any pack. Fully standalone by construction. |

---

## 5. The loop contract (R3)

Structurally identical in all three packs; only the gate table differs. `<pack>-loop` automates continuous
progress on the thing being built and improves it against logged defects. It runs **inline** (D6). It is not
the bundled `/loop`, which is a bare prompt repeater - say so in one clause of the description: *"unlike
`/loop`, this carries an on-disk ledger, real gates, and stop conditions."* For interval repetition, the user
can pair them: `/loop 10m /<pack>-loop`.

### 5.1 Ledger - exact files, exact path

`.claude/<pack>-loop/` (namespaced per pack, so three loops never collide):

```
.claude/<pack>-loop/
  state.json      # machine state: iteration, gates, progress history, caps
  PROGRESS.md     # append-only, one block per iteration
  DEFECTS.md      # open/closed defect table
  DECISIONS.md    # what was chosen, what was rejected, why
  TODO.md         # remaining work, markdown checkboxes, BLOCKED: prefix for deps
```

**Do not use `TodoWrite` or the Task tools as the ledger.** They are disabled by default on current models,
they live only in context, and a fresh session or subagent cannot read them.

`state.json` - exact field names, builders must not rename:

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

`PROGRESS.md` block shape - real output, never a paraphrase:

```markdown
## Iteration 7 - 2026-08-18T14:31:00Z
Goal: fix the 3 remaining lint errors in src/auth.ts
GATE: typecheck | CMD: npx tsc --noEmit | EXIT: 0 |
GATE: lint      | CMD: npx eslint .     | EXIT: 1 | 3 errors (src/auth.ts:42,:88,:103)
Changed: src/auth.ts
Result: 2 of 3 fixed. The third needs a design decision - see DECISIONS.md. Not fixed blind.
Next: resolve the design question before touching line 88.
```

`DEFECTS.md` uses the §2.5 defect-log columns plus a `STATUS` column (`OPEN` / `FIXED (iter N)`). A defect
`OPEN` for 3+ iterations without being touched is surfaced at escalation - it needs a decision, not another
attempt.

### 5.2 Verification gates

Each pack's loop registers gates from its `<pack>-verify` skill. Gate rules that apply everywhere:

- A gate is machine-checkable from a terminal: it exits 0 or non-zero, or writes a parseable file. "Looks
  right" and "I reviewed it" are not gates.
- Record exit code **and** captured output per gate, every iteration. A `PASS` with no exit code from this
  iteration's actual run may not be written to the ledger.
- Distinguish "the gate failed" from "the gate is broken": ESLint exit 1 = lint errors, exit 2 = config
  error. pytest exit 5 = no tests collected, which is a setup bug, **not** a pass.
- Snapshot baselines are committed. `--update-snapshots` is a deliberate action, never a reaction to red.

Default gate sets, in run order:

| Pack | Gates |
|---|---|
| webforge | `npx tsc --noEmit` → `npx eslint .` → `vitest run` → `npx playwright test` → `axe <url> --exit` → `npx size-limit` |
| appforge | typecheck → lint → unit → `detox test` or `maestro test` → platform build (`eas build --local` or `tauri build`) → startup/perf benchmark |
| ccforge | `claude plugin validate ./<pack> --strict` → frontmatter parses for every skill → memory files under budget → every `source_path` in the index resolves |

### 5.3 Loop body, per iteration

1. Read `state.json` and the **last 3** `PROGRESS.md` entries only, plus open `DEFECTS.md` rows. Never re-read
   the full history.
2. Pick **one** item - highest severity, or the one blocking the most others. One focus per iteration.
3. Make the change. Do not touch files outside `scope`.
4. Run every registered gate. Capture exit code and output verbatim.
5. **Diff test and gate-definition files specifically.** If any test file lost lines, loosened an assertion,
   or gained a skip in the same iteration a gate flipped to pass, stop. That is a BLOCKER, not a pass.
6. Update `DEFECTS.md`, `DECISIONS.md`, `TODO.md`, `state.json` (`gates_newly_passing`, `defects_closed`,
   `defects_opened`, `no_progress_streak`).
7. Append the `PROGRESS.md` block with real output.
8. `git commit` when the touched area's gates pass. If the build is broken and the cause is unclear,
   `git reset --hard` to the last commit whose gates passed and resume with a narrower step. Never amend a
   commit already reported as a passed gate - that erases the evidence trail.
9. Check stop conditions in this order.

### 5.4 Stop conditions, checked in order

| Order | Condition | Trigger | Action |
|---|---|---|---|
| a | Clean pass | every registered gate exits 0 in one iteration | stop, report success with evidence |
| b | Impossible | the goal cannot be satisfied as stated | stop immediately, escalate with the reason - do not burn the remaining cap |
| c | Regression | a previously-passing gate now fails from this loop's own change | stop, escalate; this outranks the original task |
| d | No progress | `no_progress_streak >= 2` - two consecutive iterations with zero gates newly passing, zero defects closed, zero defects opened | stop, escalate: converged without succeeding |
| e | Thrash | same file set touched in consecutive iterations and gate vector at N equals gate vector at N-2 | stop, escalate: the scope is wrong, not the implementation |
| f | Scope violation | a file outside `scope` was modified without a logged reason | stop, flag, revert or widen scope explicitly |
| g | Iteration cap | `iteration == max_iterations` | stop, escalate with the full ledger |

`no_progress_streak` increments when an iteration produces no newly-passing gate, no closed defect, and no
newly-discovered defect; it resets to 0 the moment any of the three is non-empty.

**Iteration caps:** default **10** for a single bounded task, **25** for a multi-file feature. Always
overridable by the user. The cap is a backstop, never the primary stop signal - a loop that only ever stops
at the cap cannot distinguish converging early from giving up late.

**Escalation is a handoff, not silence.** On any stop other than (a), the final `PROGRESS.md` entry names the
stop condition that fired, and the open BLOCKER/MAJOR rows in `DEFECTS.md` are the handoff artifact. A human
or a post-`/clear` session reads that, not a prose summary.

### 5.5 Anti-reward-hacking rules (copy verbatim into every loop skill)

```markdown
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
```

Pathology-to-signal table builders should include verbatim:

| Pathology | Detection signal |
|---|---|
| Reward hacking the gate | gate flips to pass while a gate-defining file changed in the same iteration |
| Test deletion / weakening | test file line count drops, assertion loosened, `.skip` added |
| Scope creep | files touched outside `scope`, or diff grows with no new defect entry justifying it |
| Over-refactoring | gate vector unchanged for 2 iterations while diff size keeps growing |
| Verification theater | a ledger `PASS` with no attached exit code from this iteration |
| Sandbagging | 3+ iterations of surface patches to the same root defect - re-plan, do not patch again |
| Novelty drift | a late diff touches files never mentioned in earlier `PROGRESS.md` or `TODO.md` |
| Critique ritualism | review runs every iteration but `FIXED` count never increments |
| Score theater | any self-assigned number presented as quality |
| Perfectionist non-delivery | iteration count far past the task's evident size |

### 5.6 Loop preconditions

- **Refactor with no test coverage → iteration 0 is characterization.** Pin current behavior with generated
  golden-master tests, commit that pin, and only then start the improve-and-verify loop. Without a pin, every
  later failure is an unanswerable "did I break it or was it already broken?"
- Declare `scope` and `non_goals` in `state.json` before iteration 1.
- Choose enforcement strength up front: in-prompt for a quick bounded task, a Stop hook for anything running
  with less supervision. Any Stop hook must check `stop_hook_active` and exit 0 if true (8-block cap).
- Loop skills carry the §3.3 degradation watch. Specialists do not.

---

## 6. Shared conventions

### 6.1 Frontmatter template

Four keys. Nothing else. `name` is byte-identical to the directory name.

```yaml
---
name: webforge-taste
description: >-
  <third person, 250-450 chars, what + when + pushy clause + defer clause. See §6.2.>
metadata:
  pack: webforge
  kind: taste
  domain: frontend,design
  version: "1.0.0"
---
```

- `metadata` values are **strings only**; lists are comma-separated in one string. Claude Code drops the
  whole map if it is not a flat map. This is the Tier-1 signal the census reads.
- `allowed-tools` is added **only** on a skill that invokes its own bundled script, and only scoped to that
  exact script: `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh *)`. Never a broad `Bash`
  grant. Note the grant clears on the user's next message - never design behavior that assumes it persists.
- Forbidden in FORGE skills: `disable-model-invocation`, `user-invocable`, `context`, `agent`, `background`,
  `model`, `effort`, `paths`, `shell`, `hooks`, `when_to_use`, `argument-hint`, `arguments`.
  Reasons: `shell: bash` hard-fails on Windows without Git Bash; `paths` gates auto-activation in ways the
  orchestrator already handles; the rest either break dispatch or add surface with no requirement behind it.
- Name rules: `^[a-z0-9-]+$`, ≤64 chars, no leading/trailing/double hyphen, and **never containing "claude"
  or "anthropic"**. Never use the reserved names `help`, `feedback`, `synced`.
- YAML must parse. Malformed frontmatter loads the skill with empty metadata and silently kills
  auto-triggering - `claude --debug` is the only place the error appears. Validate before shipping.

### 6.2 Description writing rules

Hard limit 1,024 chars; **target 250-450**. The skill listing is capped near 1% of the context window and
drops descriptions of least-invoked skills first, so a long description is a liability, not thoroughness.

1. Third person, always: "Builds...", "Audits...". Never "I can help you..." or "You can use this to...".
2. State **what** and **when** in the same sentence. Capability without trigger conditions under-fires.
3. Include the words the user would actually type - file types, framework names, verbs like *add*, *fix*,
   *ship*, *make it faster* - not an abstract capability summary.
4. Be pushy. Claude under-triggers skills and skips them entirely for requests it judges one-step. End with
   a clause like "Use this even when the user does not name it."
5. **Every skill ends with a defer clause** naming what it is not for. This is what keeps three packs and the
   user's own skills out of each other's trigger space. Shape: `Not for <adjacent thing>; use <owner> instead.`
6. Orchestrators are deliberately broad (§2.11). Specialists are deliberately narrow, so they lose to the
   orchestrator on anything multi-step and only win a genuinely single-step ask.
7. Never `helper`, `utils`, `tools`, `documents`, `data`, `files` as a name or a description's core noun.
8. No angle brackets anywhere in `name` or `description`.

Specialist example, copy the shape:

```yaml
description: >-
  Audits and fixes web design craft: type scale, spacing rhythm, color ramps, contrast, motion, and every
  interaction state, then checks the result against a table of AI-slop tells (default purple gradients,
  three identical cards, 1px gray borders everywhere, over-rounded small containers). Use when a page looks
  generic, before shipping any visual surface, or when asked to make something look good, distinctive, or
  less AI-generated. Not for copy or code style; use webforge-noslop for those.
```

### 6.3 Body budget and structure

| Skill kind | SKILL.md body target | Hard cap |
|---|---|---|
| Orchestrator | 300-450 lines | 500 |
| Specialist | 150-250 lines | 300 |
| Loop | 200-300 lines | 350 |
| Essentials (noslop, perf, explain) | 120-200 lines | 250 |
| Skillmap | 120-200 lines | 250 |

**Section order is normative** - compaction keeps only the first 5,000 tokens of each skill, so anything
load-bearing sits early:

```markdown
# <Skill Display Name>
<one line: what narrow job this does, and who normally calls it>

## Activation receipt          <- §3.2, verbatim
## Degradation watch           <- §3.3, orchestrators and loops only
## Prime directives            <- orchestrators only, §2.0
## Routing                     <- orchestrators only, §4.3, verbatim
## When called by the orchestrator
## When invoked directly
## Procedure                   <- the actual work
## Quality checklist           <- falsifiable booleans, named locations, no scores
## Reference files             <- pointer table, last
```

Specialists state both entry paths explicitly. Called by the orchestrator, they trust the assumption ledger
and re-verify only what changed. Invoked cold, they run a one-line version of FRAME themselves and assume no
shared state exists.

### 6.4 References and scripts

- `references/*.md` costs zero tokens until read. Move anything stack-specific, variant-specific, or over
  ~40 lines of table there. The body detects which variant applies and points at **exactly one** file.
- **One hop only.** `SKILL.md → references/x.md`. Never `references/x.md → references/y.md`; the second hop
  is not followed reliably.
- Any reference file over 100 lines opens with a table of contents. Over 300 lines, this is mandatory.
- `scripts/*` for anything deterministic and repeatedly reinvented - the census scan, the canary hook. Only
  the script's **output** enters context, never its source. POSIX shell or stdlib-only Python; no
  dependencies, ever (R7).
- Reference scripts as `${CLAUDE_SKILL_DIR}/scripts/<name>` and grant exactly that path in `allowed-tools`.
- Forward slashes in every path, always, even when authoring on Windows.
- A `!`-injected command that exits non-zero **aborts the entire skill invocation** and Claude sees nothing
  that turn. Append `|| true` to anything with a legitimate non-zero exit. Prefer plain Bash calls in the body
  over `!` injection.

### 6.5 Voice and house rules

- Body instructions are **imperative, second person, to the agent**: "Run X." "Never do Y." Descriptions are
  third person. Do not blur the two registers.
- Use `ALWAYS` / `NEVER` / `MUST` **only** for fragile, sequence-critical, or safety-critical steps: the
  receipt, routing precedence, refusal gates, stack-detection order, the anti-reward-hacking rules. For
  judgment calls - which library, how to phrase something, what looks good - use explained prose with a
  stated default and one named escape hatch.
- Every instruction must be a test the model can run, not an adjective. "Restate it in one sentence." not
  "understand it deeply." "Push every input to 0, 1, empty, huge, negative." not "consider edge cases."
- Give one default and one named escape hatch. Never a menu of five options.
- **Banned in every skill body and every generated output:** emoji; em dashes; motivational or
  congratulatory prose; "Great question"; "Let's dive in"; "It's important to note"; "In today's fast-paced";
  filler transitions; restating the user's request back at them; numeric quality scores; any claim of having
  verified something without the output that proves it.
- Assume the reader is a strong model under load. Add only what it does not already know. Cut the rest.

---

## 7. Directory layout

Builders produce exactly this tree under `/home/claude/skillpacks/packs/`. One directory per pack; each is a
self-contained skills-directory plugin the user unzips into `~/.claude/skills/`.

```
/home/claude/skillpacks/packs/
├── webforge/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── README.md
│   └── skills/
│       ├── webforge-orchestrator/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── stack-detection.md
│       ├── webforge-scaffold/
│       │   ├── SKILL.md
│       │   └── references/
│       │       ├── next-app-router.md
│       │       └── non-next-stacks.md
│       ├── webforge-ui/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── interaction-states.md
│       ├── webforge-server/
│       │   ├── SKILL.md
│       │   └── references/
│       │       ├── caching.md
│       │       └── auth-sessions.md
│       ├── webforge-verify/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── gate-commands.md
│       ├── webforge-ship/
│       │   └── SKILL.md
│       ├── webforge-taste/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── slop-tells.md
│       ├── webforge-perf/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── budgets.md
│       ├── webforge-noslop/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── banned-patterns.md
│       ├── webforge-explain/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── templates.md
│       ├── webforge-loop/
│       │   └── SKILL.md
│       └── webforge-skillmap/
│           ├── SKILL.md
│           └── scripts/
│               └── scan_skills.sh
├── appforge/
│   ├── .claude-plugin/plugin.json
│   ├── README.md
│   └── skills/
│       ├── appforge-orchestrator/{SKILL.md,references/stack-detection.md}
│       ├── appforge-mobile/{SKILL.md,references/expo-router.md,references/native-permissions.md}
│       ├── appforge-desktop/{SKILL.md,references/tauri-vs-electron.md}
│       ├── appforge-backend/{SKILL.md,references/offline-sync.md,references/webhooks-idempotency.md}
│       ├── appforge-release/{SKILL.md,references/store-compliance.md}
│       ├── appforge-verify/{SKILL.md,references/gate-commands.md}
│       ├── appforge-taste/{SKILL.md,references/slop-tells.md}
│       ├── appforge-perf/{SKILL.md,references/budgets.md}
│       ├── appforge-noslop/{SKILL.md,references/banned-patterns.md}
│       ├── appforge-explain/{SKILL.md,references/templates.md}
│       ├── appforge-loop/SKILL.md
│       └── appforge-skillmap/{SKILL.md,scripts/scan_skills.sh}
└── ccforge/
    ├── .claude-plugin/plugin.json
    ├── README.md
    └── skills/
        ├── ccforge-orchestrator/{SKILL.md,references/setup-detection.md}
        ├── ccforge-prime/{SKILL.md,references/memory-layout.md}
        ├── ccforge-wire/{SKILL.md,references/hooks.md,references/permissions.md}
        ├── ccforge-debug/{SKILL.md,references/failure-table.md}
        ├── ccforge-parallel/{SKILL.md,references/primitives.md}
        ├── ccforge-authoring/{SKILL.md,references/validation.md}
        ├── ccforge-taste/SKILL.md
        ├── ccforge-perf/{SKILL.md,references/context-budgets.md}
        ├── ccforge-noslop/{SKILL.md,references/banned-patterns.md}
        ├── ccforge-explain/{SKILL.md,references/templates.md}
        ├── ccforge-loop/SKILL.md
        └── ccforge-skillmap/{SKILL.md,scripts/scan_skills.sh,scripts/canary-hook.sh}
```

Braced paths above are shorthand for the same nested shape shown in full for `webforge`. Every reference file
listed is required; add more only when the body actually points at them.

### 7.1 `plugin.json` - one per pack

```json
{
  "name": "webforge",
  "displayName": "WebForge",
  "description": "Orchestrated skills for building websites and web apps with Claude Code.",
  "version": "1.0.0",
  "license": "MIT",
  "keywords": ["web", "frontend", "nextjs", "build"]
}
```

Only `plugin.json` goes inside `.claude-plugin/`. `skills/` sits at the plugin root, as a sibling. Getting
this wrong loads the plugin with its components silently missing - the single most common failure.

Do not use `userConfig` (forces a config step). Do not use any marketplace source. Do not reference anything
outside the pack directory.

### 7.2 README.md per pack - required contents, ≤40 lines

1. One-line what it is.
2. Install: `unzip <pack>.zip -d ~/.claude/skills/` then restart `claude`. Nothing else.
3. The skill list, one line each.
4. How to tell it is working: the `[skills: ...]` receipt line, and what its absence means.
5. Update: delete `~/.claude/skills/<pack>/` first, then unzip the new version. Overwriting in place leaves
   orphaned files.
6. Uninstall: `claude plugin uninstall <pack>`, delete the `@~/.claude/forge/FORGE.md` line from
   `~/.claude/CLAUDE.md`, and delete `~/.claude/forge/` if no other pack remains.
7. Troubleshooting: skills not appearing → `rm -rf ~/.claude/plugins/cache` and restart. Auto-trigger dead →
   `claude --debug` to see a frontmatter parse error.

### 7.3 Build order and acceptance

Build in this order so shared text is written once and copied: orchestrator → skillmap → loop → verify →
remaining specialists → taste → essentials.

A pack is done when all of the following are true. This is a checklist, not a score.

- [ ] 12 skill directories, each with `SKILL.md`, each `name:` byte-identical to its directory name.
- [ ] `claude plugin validate ./<pack> --strict` exits 0.
- [ ] Every `description` is 250-450 chars, third person, contains a trigger clause, a pushy clause, and a
      defer clause.
- [ ] Every `SKILL.md` contains the §3.2 receipt block verbatim, as its second section.
- [ ] Orchestrator and loop contain the §3.3 degradation watch verbatim.
- [ ] Orchestrator contains §2.0 directives, all seven phases in order, both refusal gates, and the §4.3
      routing block verbatim.
- [ ] Loop contains the §5.5 hard rules verbatim and the §5.4 stop table.
- [ ] All three skillmaps read and write the same two index paths from §4.1 and share the §4.1 schema.
- [ ] No skill name contains "claude" or "anthropic".
- [ ] No frontmatter key outside `name`, `description`, `metadata`, `allowed-tools`.
- [ ] No numeric quality score, no emoji, no em dash anywhere in the pack.
- [ ] Every body is within its §6.3 cap.
- [ ] No reference file is reached by more than one hop from a `SKILL.md`.
- [ ] Every script is dependency-free and executable (`chmod +x`), with a `#!/usr/bin/env bash` shebang.
- [ ] The pack functions with the other two packs absent.
