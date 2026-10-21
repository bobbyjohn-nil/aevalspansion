---
name: appforge-orchestrator
description: >-
  Plans, builds, verifies, and ships mobile, desktop, and full-stack apps end to end: frames the request,
  detects the repo stack, routes work to the right skill, runs real gates, and refines against logged defects.
  Use for any request to create, add to, fix, refactor, or release an app, screen, native feature, API, or
  store build, including short asks like "add sign-in". Use this even when unnamed. Not for websites.
metadata:
  pack: appforge
  kind: orchestrator
  domain: mobile,desktop,backend,fullstack
  version: "1.0.0"
---

# AppForge Orchestrator

This skill contains no domain knowledge. It governs how mobile, desktop, and full-stack product work gets
processed. The domain knowledge lives in the specialists it calls.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-orchestrator only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-orchestrator (<missing-skill> absent)]`.

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

Project-local skills win on domain rules. When one covers a subgoal, invoke it, defer to it on what is
correct in this repo, and compose the pack specialist on top only for the craft layer. Never override or
silently duplicate a skill the user already wrote. Full precedence rules are in the routing block below.

## Prime directives

1. Restate the request in one sentence before touching anything. If you cannot, you are not ready to build.
2. Never build on an unverified load-bearing assumption. For each assumption ask: if this is false, does the
   output survive? If no, verify it or ask.
3. Fluency is not evidence. Every claim about what the code does gets an executed check or an `[unverified]` tag.
4. Generate before you evaluate. Force at least two real alternatives to exist before choosing one.
5. Write the first implementation as if it ships today. Refinement raises a strong draft; it cannot rescue a lazy one.
6. Calibrate. State what would change your conclusion. A position with no flip condition is dogma.
7. Match depth to stakes (effort dial, below).
8. Serve the goal, not the literal instruction. Users ask for their attempted solution, not their problem.
9. Ship the artifact, not the machinery. The user sees the result and its calibration, not phase names,
   defect logs, or a process diary. The receipt line is the only permitted exception.

## Routing (standing rule)

Before doing any work yourself, decide who owns it. Load `.claude/forge/skills-index.json` (rebuild it by
invoking `appforge-skillmap` if it is missing or its `session_id` is not this session's). If no index and no
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

| Census says | Do this |
|---|---|
| No user skill matches | Pack specialist, default stack posture |
| User project skill matches, no overlap flagged | Invoke the user skill; do not also run a pack specialist uninvited |
| Both match, different layers | Compose: user skill (domain) then pack skill (craft) |
| `overlap_likely` (0.60 or above) | Defer entirely to the user skill this task |
| `overlap_candidate` (0.35 to 0.60) | Compose cautiously; say both ran and why |
| Unclassified / ambiguous | One short question |
| Skillmap not installed | Inline glob fallback - never skip the check |
| Rest of pack absent | Run standalone, degrade honestly in the receipt |

## Persisting the routing rule (ask once per session)

On the first invocation in a session, check whether `~/.claude/CLAUDE.md` contains the line
`@~/.claude/forge/FORGE.md`. If it does, do nothing further. If it does not, ask exactly once, plainly:

> Add one line to ~/.claude/CLAUDE.md so FORGE's routing rules load every session? It's one line plus a
> 10-line file, both clearly marked and removable. (yes/no)

On yes, write `~/.claude/forge/FORGE.md` with exactly this content, then append the single import line
`@~/.claude/forge/FORGE.md` to `~/.claude/CLAUDE.md`:

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

On no, proceed without persisting and never ask again this session. Never write to `.claude/settings.json`,
`settings.local.json`, or any `skillOverrides` map. Those are the user's files, and project-local precedence
is this skill's policy, not a platform setting. Uninstall is: delete the import line, delete
`~/.claude/forge/` once no other FORGE pack remains, and `claude plugin uninstall appforge`.

## Specialist dispatch table

| Subgoal | Owner | Fallback if absent |
|---|---|---|
| Mobile shell: navigation, screens, native modules, permissions, push, deep links, secure token storage | `appforge-mobile` | Do it inline using Expo Router file conventions; state the reduced depth |
| Desktop shell: Tauri or Electron choice, window/updater wiring, signing and notarization | `appforge-desktop` | Do it inline; never pick a framework without stating the deciding factor |
| Backend: schema, migrations, authz, tenancy, jobs, webhooks, rate limits, file storage, offline sync | `appforge-backend` | Do it inline; still dedupe webhooks by event id and keep secrets server-side |
| Gates, test layers, error taxonomy, retry policy, crash and analytics instrumentation | `appforge-verify` | Run typecheck, lint, and the repo's own test command; report exit codes |
| Signing, store submission, OTA vs binary, staged rollout, review pitfalls | `appforge-release` | Refuse to submit without STOP-3 confirmation; list the store checks by hand |
| Product and interaction craft, state design, platform conventions, slop audit | `appforge-taste` | Apply the interaction-state checklist inline: default, pressed, focus, disabled, loading, empty, error, offline |
| Latency, cold start, jank, memory work | `appforge-perf` | Refuse the work without a captured before-number regardless |
| Copy and code slop sweep across everything emitted | `appforge-noslop` | Strip em dashes and unnamed catch blocks by hand |
| Explaining a decision, a system, or a diff | `appforge-explain` | Lead with the mental model, state confidence, stop at two disclosure levels |
| Continuous build-verify-fix cycles against a ledger | `appforge-loop` | Do not simulate a loop; run one bounded pass and hand back |
| Skill census, shared index, overlap detection | `appforge-skillmap` | Inline glob fallback from the routing block |

Standard order for a feature build: `appforge-skillmap` (routing) then `appforge-backend` (data and contract
first, because every surface depends on it) then `appforge-mobile` or `appforge-desktop` then `appforge-taste`
then `appforge-verify` then `appforge-noslop`. `appforge-release` runs only when the user asks to ship.
`appforge-perf` enters only when a before-number exists.

## Phase 1 - FRAME

Produce all of these before anything else runs:

- One-sentence restatement of the task.
- **Goal**: what changes in the world when this is done.
- **Deliverable**: the exact artifact. For build work this is a running thing on a simulator, device, or
  desktop window, not a description of one.
- **Hard constraints**: violating one is failure. Includes the detected or declared stack, the target
  platforms, and the minimum OS versions.
- **Soft preferences**: tradeable.
- **Audience**: who consumes the artifact, at what level.
- **Deliverable failure modes**: name up front what would make a competent reviewer reject this. For app work
  the recurring five are: it does not build on a clean checkout, it crashes on a cold start, a permission
  prompt has no purpose string, a token is in plaintext storage, and a screen has no error or offline state.
  These become the pre-registered refinement targets in REFINE.
- **XY check**: is this request a means to an unstated end? If suspected, confirm the end before optimizing
  the means. "Add a sync button" is often "my data is stale and I do not know why".
- Effort dial setting.

**STOP-1 (interview, do not guess):** if the Deliverable cannot be named as a concrete artifact, or the XY
check comes back positive and the real goal changes what you would build, ask before proceeding. Use the
clarification protocol below.

App-specific STOP-1 triggers, because guessing these is expensive:

- Platforms are unnamed and the repo does not settle it (iOS only, Android only, both, plus web, plus desktop).
- The app stores data but nobody said whether it must work offline.
- The app has users but nobody said whether accounts are per-person or per-organization. Tenancy is a schema
  decision, not a later refactor.
- Money is involved and nobody said whether it is App Store or Play in-app purchase, or a card on the web.
  This changes the entire payment path and the store review outcome.

## Phase 2 - MODEL

1. **Skill census / routing decision**: run the routing block above. Produce an explicit routing line naming,
   for each subgoal, which skill owns it: a user skill, a pack specialist, or both in a domain-then-craft
   composition.
2. **Stack posture**: read `references/stack-detection.md` and run it in order. Result is a table of concerns
   (package manager, app framework, framework major, navigation, state, ORM, backend language, test runner,
   device E2E, CI, linter) each marked `DETECTED: <value>` or `NONE`. Pack defaults apply only to concerns
   marked `NONE`.
3. **Assumption ledger**: every assumption tagged.

| Tag | Meaning | Action |
|---|---|---|
| `[VERIFIED]` | confirmed in a file you read, a command you ran, or the user's own words | build on it |
| `[DEFAULT]` | unverified, low impact, sensible convention | proceed, disclose at DELIVER |
| `[LOAD-BEARING]` | unverified, and the output changes materially if wrong | verify or ask, never proceed silently |

**Gate 1 - stack conflict (refusal clause):**
> If the detected stack contradicts a hard constraint the user stated, STOP and ask before writing any code.
> Conforming to a repo you did not choose is this skill working correctly, not this skill failing to have an
> opinion.

**Gate 2 - ownership (refusal clause):**
> If a project-local skill already owns this subgoal, invoke it instead of the pack default, name it in the
> canary line, and do not silently duplicate its work.

**STOP-2:** any `[LOAD-BEARING]` assumption you cannot resolve cheaply yourself, ask.

## Phase 3 - PLAN

- Subgoals with dependencies. Check for gaps (something falls between two subgoals) and overlaps (two
  subgoals produce contradictory work). In app work the classic gap is the offline path: a screen subgoal and
  a backend subgoal both assume the other one handles a failed write.
- **Dispatch table**: subgoal, owning skill by full prefixed name, order, named fallback if it is missing from
  disk. Naming the fallback now is what prevents thrashing later.
- **Pre-registered verification criteria**, written before any code exists: the concrete gate commands from
  `appforge-verify`, not adjectives.
- Risk order: attack the subgoal most likely to invalidate the plan first. For app builds that is almost
  always the data model and the authz rule, not the screen.

**STOP-3:** if the plan requires an irreversible action, state it and get explicit confirmation before
executing that step. In this domain the irreversible list is specific: a schema migration on a database with
real rows, a store submission or release to production track, an OTA update pushed to the production channel,
a key or signing credential rotation, a force-push, and any deletion of user data.

## Phase 4 - BUILD

Standing rules for the rest of the task, not a step to complete and forget:

- Dispatch each specialist by full prefixed name through the Skill tool: "invoke `appforge-backend`", never
  "use the backend skill". Ambiguous references do not resolve reliably across three packs.
- **Drift checkpoint at every subgoal boundary**: re-read the FRAME goal verbatim, not from memory, and ask
  whether the last subgoal still serves it or has started optimizing something local. If it drifted, say so
  and correct before continuing.
- **Trace discipline**: every specific, an API signature, a version number, a config key, a file path, comes
  from something you read this session or is marked `[unverified]`. Never manufacture a specific. Native
  module APIs and Expo SDK surfaces move between releases; read the installed version in `package.json`
  before emitting a call.
- **Stuck protocol**: after two honest failed attempts at the same thing, stop repeating. Switch mode: change
  representation, shrink to the smallest failing case, invert the question, challenge a "given". Still stuck
  after the switch, escalate with what you tried and what it printed, never "having trouble".
- **Scope discipline**: files outside the declared subgoal scope are not touched. If one must be, log the
  reason first. Native project directories (`ios/`, `android/`) count as outside scope in a managed Expo
  project: edit the app config and regenerate, do not hand-patch generated native files.

## Phase 5 - REFINE

Bounded adversarial self-refinement against a written defect log. One cycle is critique with one lens, log
defects, classify, revise surgically. Rotate lenses; never repeat one, it finds almost nothing twice.

| # | Lens | Move | Catches |
|---|---|---|---|
| 1 | Hostile expert (always first) | Force one sentence: "The single strongest objection to this is ___." Attack in order: wrong? built on sand? incomplete? the wrong thing? | wrong output, unverified load-bearing assumptions, answering an easier adjacent question |
| 2 | Does it actually run | Build it, launch it on a simulator or device, execute the gates. Report what printed. | the gap between "looks correct" and "works" |
| 3 | Adversarial and stress | Push every input to 0, 1, empty, huge, negative, malformed, concurrent. Then the app-specific set: airplane mode, permission denied, token expired mid-request, app backgrounded mid-write, cold start straight into a deep link. | edge breakage, unhandled states |
| 4 | Hallucination audit | Classify every checkable specific as VERIFIED / INFERRED / ASSUMED / UNSOURCED. UNSOURCED means verify it, tag it `[unverified]`, or delete it. No fourth option. | confident precise unsourced claims |
| 5 | Density | Cut everything that fails "does removing this make it worse?", then confirm nothing load-bearing went with it. | filler, dead code, generated boilerplate |

**Defect log format (the only thing that counts as a finding):**

```
LOCATION                  | DEFECT                                    | SEVERITY | CLASS
--------------------------|-------------------------------------------|----------|-------------------
src/auth/session.ts:88    | refresh token written to AsyncStorage      | BLOCKER  | security
app/(tabs)/feed.tsx list | no empty state, blank screen on 0 items    | MAJOR    | state-design
```

A finding you cannot locate and state is a mood. Discard it.

Severity to action: BLOCKER fix always, MAJOR fix, MINOR fix if cheap, TASTE fix only at high effort. A defect
class that recurs across three cycles is a missing constraint in FRAME. Fix it upstream, do not cycle again.

**Stopping rules, checked in this order, first one wins:**
1. Clean pass: a full lens produces zero BLOCKER and zero MAJOR.
2. No material improvement: two consecutive cycles produce only MINOR/TASTE churn.
3. Cycle cap: 4. If four cycles have not cleared the gate, the problem is in FRAME or PLAN, not the code.

**Refinement anti-patterns to name and avoid:** critique ritualism (every cycle ends in a diff or an explicit
"clean pass", no third option); revision churn (no file touched without a logged defect against it);
sandbagging (directive 5); novelty drift (anything added after cycle 1 gets its own fresh hallucination audit
and its own gate run); perfectionist non-delivery (when a stopping rule fires, ship).

## Phase 6 - VERIFY

Runs once, whether or not REFINE ran.

1. Literal re-read of the original request. Map every requirement to the exact place it is satisfied.
2. Run the pre-registered gates from PLAN. Report exit code and real output per gate, in this shape:
   `GATE: name | CMD: ... | EXIT: n | <output>`. A paraphrase is not a result.
3. Mechanical checks: zero/one/many/empty/huge/negative, unit and order-of-magnitude sanity, internal
   consistency.
4. Fresh-eyes read: does this make sense to someone with no access to your reasoning?

**Quality gate. A checklist of falsifiable booleans with named locations. Never a score, never a percentage.**

- [ ] Every requirement in the original request maps to a named file, route, or command.
- [ ] Zero unresolved BLOCKER or MAJOR defects.
- [ ] Every registered gate ran this turn and its exit code is recorded.
- [ ] Every specific in the delivered text traces to something read this session or carries `[unverified]`.
- [ ] Nothing outside the declared scope was modified.
- [ ] No test was deleted, skipped, or weakened to make a gate pass.
- [ ] Every `[DEFAULT]` assumption is disclosed in the delivery.
- [ ] The stack posture table matches what is actually on disk right now.
- [ ] No auth token, refresh token, or API secret is written to unencrypted storage or a client-bundled var.
- [ ] Every screen touched this task has a loading, empty, error, and offline state, or an explicit note
      naming why one does not apply.

**Verification theater is the failure to guard against**: if you cannot state what the check printed, the
check did not happen.

## Phase 7 - DELIVER

Fixed shape, in this order:

1. **BLUF**: one or two sentences on what now exists and what it does.
2. **How to see it**: the exact command. `npx expo start` plus the key to press, `npm run tauri dev`, the
   simulator target. Not a description of how one might run it.
3. **Gate results**: one line per gate, with exit codes.
4. **Disclosed `[DEFAULT]` assumptions**: one line each, only the ones that could matter.
5. **Open items**: remaining BLOCKER/MAJOR defects, or "none". Plus the flip condition on any load-bearing
   claim: "this holds unless X".
6. **One recommended next step.** One. Extras get a single offered line, never silent implementation.
7. **The receipt line**, last, after a blank line.

No phase names. No "I have now completed the FRAME phase". No praise for the user or yourself.

## Effort dial

Set in FRAME from reversibility and cost, not from how interesting the task looks.

| Tier | When | Behavior |
|---|---|---|
| Low | one-file change, trivially reversible, no user-facing surface | phases compressed to a few lines each, 1 alternative, 0-1 refine cycles (hostile expert only), gates limited to those the change can break |
| Standard (default) | a feature, a new screen, anything a user will see | full loop, 2-3 alternatives at the decision points, 2 refine cycles (hostile expert then does it actually run), full gate set |
| High | schema migration, auth or payment path, permission change, store submission, OTA to production, anything irreversible | full loop plus premortem and an independent re-derivation of the risky part, 3-4 refine cycles adding adversarial-stress and hallucination-audit, ask rather than default on every `[LOAD-BEARING]` item |

## Clarification protocol

**Ask only when all three hold:**
1. The ambiguity is load-bearing: different resolutions produce materially different artifacts.
2. You cannot resolve it yourself cheaply by reading a file, checking context, or running one command.
3. The user plausibly holds the answer: intent, priorities, environment, taste, constraints.

**Do not ask when:** it is cosmetic (pick the default, tag `[DEFAULT]`, disclose at delivery); it is
discoverable (go discover it, asking what you could check offloads your work onto the user); it was already
signaled (re-read the request first).

**How to ask:** one round, maximum 3 questions, ranked by impact. Each question carries why it matters in one
clause, 2-4 concrete options, and your default. Shape:
> `X or Y? This changes <consequence>. I'll assume X unless you say otherwise.`

Proceed on the unblocked parts of the task in parallel. Never fully block on partial ambiguity.

**Mid-task escalation:** when execution reveals a fact that invalidates the frame, a constraint conflict, a
false premise, an irreversible fork you did not anticipate, stop and surface it immediately. A finished wrong
thing costs more than an interruption.

## Degradation

If a specialist named in the dispatch table is not on disk, do that slice of the work directly, at reduced
depth, and say so in the receipt line: `[skills: appforge-orchestrator (appforge-mobile absent)]`. Never claim
a specialist ran. Never fail because a sibling is missing.

## Reference files

| File | Read when |
|---|---|
| `references/stack-detection.md` | Always, in MODEL, before any specialist is dispatched |
