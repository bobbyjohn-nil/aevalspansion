---
name: webforge-orchestrator
description: >-
  Plans, builds, verifies, and ships websites and web apps: frames the request, detects the repo stack, routes
  to the right skill, runs gates, refines against logged defects. Use for any request to create, add to, fix,
  refactor, or deploy a site, page, component, route, API, or web feature, including short ones like "add a
  login page" that touch routing, data, and auth. Use even when unnamed. Not for mobile or desktop shells or
  Claude Code setup.
metadata:
  pack: webforge
  kind: orchestrator
  domain: frontend,backend,web
  version: "1.0.0"
---

# WebForge Orchestrator
Governs how web work gets processed: frame, model, plan, build, refine, verify, deliver. Entry point for the pack.

This skill contains no domain knowledge. It governs how website and web app work gets processed. The domain
knowledge lives in the specialists it calls.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-orchestrator only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-orchestrator (<missing-skill> absent)]`.

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
   defect logs, or a process diary. The canary line is the only permitted exception.

## Routing (standing rule)

Before doing any work yourself, decide who owns it. Load `.claude/forge/skills-index.json` (rebuild it by
invoking `webforge-skillmap` if it is missing or its `session_id` is not this session's). If no index and no
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
| `overlap_likely` (0.60 or higher) | Defer entirely to the user skill this task |
| `overlap_candidate` (0.35 to 0.60) | Compose cautiously; say both ran and why |
| Unclassified / ambiguous | One short question |
| Skillmap not installed | Inline glob fallback - never skip the check |
| Rest of pack absent | Run standalone, degrade honestly in the receipt |

## Specialist dispatch table

Dispatch by full prefixed name through the Skill tool: "invoke `webforge-ui`", never "use the UI skill".

| Subgoal | Owner | Typical order | Fallback if absent |
|---|---|---|---|
| New project, new app surface, dependency and config setup | `webforge-scaffold` | 1 | Follow `references/stack-detection.md`, then match the detected stack by hand |
| Information architecture, routes, page inventory, copy | `webforge-taste` then `webforge-ui` | 2 | Write a route table and a per-page content outline before any JSX |
| Components, layouts, forms, interaction states, a11y construction | `webforge-ui` | 3 | Build with all six states named per component; WCAG AA contrast |
| Server/client split, caching, actions, API, ORM, auth, session security | `webforge-server` | 3 | Re-check auth inside every action and DAL call; never trust a layout check |
| Visual craft, palette, type scale, motion, slop audit | `webforge-taste` | 4 (before ship, after build) | Apply the slop table from memory; cap palette and families |
| Tests, gates, a11y checks, bundle budget | `webforge-verify` | 5 | Run `npx tsc --noEmit`, `npx eslint .`, `npx playwright test` at minimum |
| Speed work with a captured before-number | `webforge-perf` | on demand | Refuse optimization with no number; name the phase first |
| Copy and code slop sweep | `webforge-noslop` | 6 | Zero em dashes, cut 10 percent, no dead exports |
| Build, env, metadata, observability, deploy | `webforge-ship` | 7 | Never a secret in `NEXT_PUBLIC_*`; verify a fetched status code post-deploy |
| Continuous build-verify-fix cycles | `webforge-loop` | when the task is long | Iterate manually with a written ledger |
| Explaining a decision, system, or diff | `webforge-explain` | on demand | BLUF, trade-off table, calibrated confidence |

## When invoked directly

You are the entry point. Run the full procedure below at the effort tier the task earns.

## When a specialist calls back

A specialist returning to you does not restart the procedure. Fold its output into the current phase, run the
drift checkpoint, and continue.

## Procedure

### Phase 1 - FRAME

Produce all of these before anything else runs:

- One-sentence restatement of the task.
- **Goal** - what changes in the world when this is done.
- **Deliverable** - the exact artifact. For build work this is a running thing at a URL or a command, not a
  description of one.
- **Hard constraints** - violating one is failure. Includes the detected or declared stack.
- **Soft preferences** - tradeable.
- **Audience** - who consumes the artifact, at what level.
- **Deliverable failure modes** - name up front what would make a competent reviewer reject this. For web work
  the recurring four: it does not run; it fails WCAG AA on contrast or labels; it looks like every other
  AI-generated page; it leaks server data or an unauthorized mutation. These become the pre-registered
  refinement targets in REFINE.
- **XY check** - is this request a means to an unstated end? If suspected, confirm the end before optimizing
  the means.
- Effort dial setting.

**STOP-1 (interview, do not guess):** if the Deliverable cannot be named as a concrete artifact, or the XY
check comes back positive and the real goal changes what you would build, ask before proceeding. Use the
clarification protocol below.

### Phase 2 - MODEL

1. **Skill census / routing decision** - run the Routing block above. Produce an explicit routing line naming,
   for each subgoal, which skill owns it: a user skill, a pack specialist, or both in a domain-then-craft
   composition.
2. **Stack posture** - read `references/stack-detection.md` and run it in order. Result is a table of concerns
   (package manager, framework, framework major/variant, CSS, ORM, test runner, linter, CI) each marked
   `DETECTED: <value>` or `NONE`. Pack defaults apply **only** to concerns marked `NONE`.
3. **Assumption ledger** - every assumption tagged:

| Tag | Meaning | Action |
|---|---|---|
| `[VERIFIED]` | confirmed in a file you read, a command you ran, or the user's own words | build on it |
| `[DEFAULT]` | unverified, low impact, sensible convention | proceed, disclose at DELIVER |
| `[LOAD-BEARING]` | unverified, and the output changes materially if wrong | verify or ask - never proceed silently |

Web work has four assumptions that are load-bearing almost every time: the installed Next.js major (decides
whether `"use cache"` is even legal), the installed Zod major (v4 uses `{error:}`, v3 uses `{message:}`), the
installed Tailwind major (v4 CSS-first config vs v3 JS config), and whether the app is App Router or Pages
Router. Read `package.json` rather than guessing any of them.

**Gate 1 - stack conflict:**
> If the detected stack contradicts a hard constraint the user stated, STOP and ask before writing any code.
> Conforming to a repo you did not choose is this skill working correctly, not this skill failing to have an
> opinion.

**Gate 2 - ownership:**
> If a project-local skill already owns this subgoal, invoke it instead of the pack default, name it in the
> canary line, and do not silently duplicate its work.

**STOP-2:** any `[LOAD-BEARING]` assumption you cannot resolve cheaply yourself, ask.

### Phase 3 - PLAN

- Subgoals with dependencies. Check for gaps (something falls between two subgoals) and overlaps (two subgoals
  produce contradictory work).
- **Dispatch table**: subgoal, owning skill by full prefixed name, order, named fallback if it is missing from
  disk. Naming the fallback now is what prevents thrashing later.
- **Pre-registered verification criteria**, written before any code exists: the concrete gate commands from
  `webforge-verify`, not adjectives. Criteria written afterwards bend to justify whatever got made.
- Risk order: attack the subgoal most likely to invalidate the plan first. For web builds that is usually the
  data and auth path, not the visual layer.

**STOP-3:** if the plan requires an irreversible action (schema migration, public deploy, data deletion,
DNS change, force-push), state it and get explicit confirmation before executing that step.

### Phase 4 - BUILD

Standing rules for the rest of the task, not a step to complete and forget:

- Dispatch each specialist by full prefixed name through the Skill tool.
- **Drift checkpoint at every subgoal boundary**: re-read the FRAME goal verbatim, not from memory, and ask
  whether the last subgoal still serves it or has started optimizing something local. If it drifted, say so
  and correct before continuing.
- **Trace discipline**: every specific - an API signature, a version number, a config key, a file path - comes
  from something you read this session or is marked `[unverified]`. Never manufacture a specific. This is the
  single highest-frequency failure in web work, because the model's training data spans four incompatible
  Next.js caching models.
- **Stuck protocol**: after two honest failed attempts at the same thing, stop repeating. Switch mode - change
  representation, shrink to the smallest failing case, invert the question, challenge a "given". Still stuck
  after the switch, escalate to the user with what you tried and what it printed, never "having trouble".
- **Scope discipline**: files outside the declared subgoal scope are not touched. If one must be, log the
  reason first.

### Phase 5 - REFINE

Bounded adversarial self-refinement against a written defect log. One cycle = critique with one lens, log
defects, classify, revise surgically. Rotate lenses; never repeat one, it finds almost nothing twice.

| # | Lens | Move | Catches |
|---|---|---|---|
| 1 | Hostile expert (always first) | Force one sentence: "The single strongest objection to this is ___." Attack in order: wrong? built on sand? incomplete? the wrong thing? | wrong output, unverified load-bearing assumptions, answering an easier adjacent question |
| 2 | Does it actually run | Build it, run it, open it, execute the gates. Report what printed. | the gap between "looks correct" and "works" |
| 3 | Adversarial and stress | Push every input to 0, 1, empty, huge, negative, malformed, concurrent. Unhappy path only. | edge breakage, unhandled states |
| 4 | Hallucination audit | Classify every checkable specific as VERIFIED / INFERRED / ASSUMED / UNSOURCED. UNSOURCED means verify it, tag it `[unverified]`, or delete it. No fourth option. | confident precise unsourced claims |
| 5 | Density | Cut everything that fails "does removing this make it worse?", then confirm nothing load-bearing went with it. | filler, dead code, generated boilerplate |

Defect log format, the only thing that counts as a finding:

```
LOCATION              | DEFECT                                   | SEVERITY | CLASS
----------------------|------------------------------------------|----------|-------------------
src/auth.ts:88        | floating promise, no catch                | BLOCKER  | correctness
app/page.tsx hero     | 3 identical feature cards, default shape  | MAJOR    | slop-tell
```

A finding you cannot locate and state is a mood. Discard it.

Severity to action: BLOCKER fix always / MAJOR fix / MINOR fix if cheap / TASTE fix only at high effort. A
defect class that recurs across three cycles is a missing constraint in FRAME. Fix it upstream, do not cycle
again.

Stopping rules, checked in this order, first one wins:
1. Clean pass - a full lens produces zero BLOCKER and zero MAJOR.
2. No material improvement - two consecutive cycles produce only MINOR/TASTE churn.
3. Cycle cap: 4. If four cycles have not cleared the gate, the problem is in FRAME or PLAN, not the code.

Anti-patterns to name and avoid: critique ritualism (every cycle ends in a diff or an explicit "clean pass",
no third option); revision churn (no file touched without a logged defect against it); sandbagging (directive
5); novelty drift (anything added after cycle 1 gets its own fresh hallucination audit and its own gate run);
perfectionist non-delivery (when a stopping rule fires, ship).

### Phase 6 - VERIFY

Runs once, whether or not REFINE ran.

1. Literal re-read of the original request. Map every requirement to the exact place it is satisfied.
2. Run the pre-registered gates from PLAN. Report exit code and real output per gate, in the
   `GATE: name | CMD: ... | EXIT: n | <output>` shape. A paraphrase is not a result.
3. Mechanical checks: zero/one/many/empty/huge/negative, unit and order-of-magnitude sanity, internal consistency.
4. Fresh-eyes read: does this make sense to someone with no access to your reasoning?

Quality gate. Falsifiable booleans with named locations. Never a score, never a percentage.

- [ ] Every requirement in the original request maps to a named file, route, or command.
- [ ] Zero unresolved BLOCKER or MAJOR defects.
- [ ] Every registered gate ran this turn and its exit code is recorded.
- [ ] Every specific in the delivered text traces to something read this session or carries `[unverified]`.
- [ ] Nothing outside the declared scope was modified.
- [ ] No test was deleted, skipped, or weakened to make a gate pass.
- [ ] Every `[DEFAULT]` assumption is disclosed in the delivery.
- [ ] The stack posture table matches what is actually on disk right now.

If you cannot state what the check printed, the check did not happen.

### Phase 7 - DELIVER

Fixed shape, in this order:

1. **BLUF** - one or two sentences: what now exists and what it does.
2. **How to see it** - the exact command or URL.
3. **Gate results** - one line per gate, with exit codes.
4. **Disclosed `[DEFAULT]` assumptions** - one line each, only the ones that could matter.
5. **Open items** - remaining BLOCKER/MAJOR defects, or "none". Plus the flip condition on any load-bearing
   claim: "this holds unless X".
6. **One recommended next step.** One. Extras get a single offered line, never silent implementation.
7. **The canary line**, last, after a blank line.

No phase names. No "I have now completed the FRAME phase". No praise for the user or yourself.

## Effort dial

Set in FRAME from reversibility and cost, not from how interesting the task looks.

| Tier | When | Behavior |
|---|---|---|
| Low | one-file change, trivially reversible, no user-facing surface | phases compressed to a few lines each, 1 alternative, 0-1 refine cycles (hostile expert only), gates limited to those the change can break |
| Standard (default) | a feature, a new route, anything a user will see | full loop, 2-3 alternatives at the decision points, 2 refine cycles (hostile expert then does it actually run), full gate set |
| High | schema migration, auth or payment path, public deploy, anything irreversible | full loop plus premortem and an independent re-derivation of the risky part, 3-4 refine cycles adding adversarial-stress and hallucination-audit, ask rather than default on every `[LOAD-BEARING]` item |

## Clarification protocol

Ask only when all three hold:
1. The ambiguity is load-bearing - different resolutions produce materially different artifacts.
2. You cannot resolve it yourself cheaply by reading a file, checking context, or running one command.
3. The user plausibly holds the answer - intent, priorities, environment, taste, constraints.

Do not ask when: it is cosmetic (pick the default, tag `[DEFAULT]`, disclose at delivery); it is discoverable
(go discover it - asking what you could check offloads your work onto the user); it was already signaled
(re-read the request first).

How to ask: one round, maximum 3 questions, ranked by impact. Each question carries why it matters in one
clause, 2-4 concrete options, and your default. Shape:
> `X or Y? This changes <consequence>. I'll assume X unless you say otherwise.`

The three questions that most often earn their cost on web work: who is this for and what is the one action
they should take; is there an existing brand, palette, or reference site to conform to; does this ship to a
public URL and on what host. Proceed on the unblocked parts of the task in parallel. Never fully block on
partial ambiguity.

Mid-task escalation: when execution reveals a fact that invalidates the frame - a constraint conflict, a false
premise, an irreversible fork you did not anticipate - stop and surface it immediately. A finished wrong thing
costs more than an interruption.

## Degradation

If a specialist named in the dispatch table is not on disk, do that slice of the work directly, at reduced
depth, and say so in the canary line: `[skills: webforge-orchestrator (webforge-ui absent)]`. Never claim a
specialist ran. Never fail because a sibling is missing.

## CLAUDE.md integration

On the first invocation in a session, if `~/.claude/CLAUDE.md` does not contain the line
`@~/.claude/forge/FORGE.md`, ask once, plainly:

> Add one line to ~/.claude/CLAUDE.md so FORGE's routing rules load every session? It's one line plus a
> 10-line file, both clearly marked and removable. (yes/no)

On no, proceed without persisting and do not ask again this session. On yes, append the single line
`@~/.claude/forge/FORGE.md` to `~/.claude/CLAUDE.md` and write exactly this to `~/.claude/forge/FORGE.md`,
nothing more:

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

The sentinels are stripped before entering context but persist on disk, so install and uninstall are an exact
grep. Never write to `.claude/settings.json`, `settings.local.json`, or `skillOverrides`.

## Reference files

| File | Read when |
|---|---|
| `references/stack-detection.md` | Always, in MODEL, before any file is written |
