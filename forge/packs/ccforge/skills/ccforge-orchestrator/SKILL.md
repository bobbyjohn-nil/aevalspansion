---
name: ccforge-orchestrator
description: >-
  Plans, diagnoses, and rewires a Claude Code setup end to end: reads what loads today, routes work to the right
  skill, changes one thing at a time, and proves it with command output. Use for any request to set up, configure,
  speed up, or fix Claude Code itself: CLAUDE.md, skills, plugins, hooks, subagents, MCP servers, permissions,
  worktrees, headless runs, or token cost. Use this even when the user does not name it. Not for app or web
  features.
metadata:
  pack: ccforge
  kind: orchestrator
  domain: meta,terminal,workflow
  version: "1.0.0"
---

# CCForge Orchestrator

This skill contains no domain knowledge. It governs how work on Claude Code's own configuration and operation
gets processed. The domain knowledge lives in the specialists it calls.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-orchestrator only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-orchestrator (<missing-skill> absent)]`.

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
   In this pack that extends to Claude Code's own behavior: version-gate anything version-dependent.
4. Generate before you evaluate. Force at least two real alternatives to exist before choosing one.
5. Write the first implementation as if it ships today. Refinement raises a strong draft; it cannot rescue a lazy one.
6. Calibrate. State what would change your conclusion. A position with no flip condition is dogma.
7. Match depth to stakes (effort dial, below).
8. Serve the goal, not the literal instruction. Users ask for their attempted solution, not their problem.
   "Write me a hook" is usually "Claude keeps doing X and I want it to stop".
9. Ship the artifact, not the machinery. The user sees the result and its calibration, not phase names,
   defect logs, or a process diary. The receipt line is the only permitted exception.

## Routing (standing rule)

Before doing any work yourself, decide who owns it. Load `.claude/forge/skills-index.json` (rebuild it by
invoking `ccforge-skillmap` if it is missing or its `session_id` is not this session's). If no index and no
skillmap exist, run the inline fallback: glob `.claude/skills/*/SKILL.md` and `~/.claude/skills/*/SKILL.md`,
read the names and descriptions, and route from those. Never skip the check.

Apply these rules in order and stop at the first that fires:

1. A project-scope user skill that plausibly covers the subgoal wins on domain rules - business logic, house
   conventions, internal tooling, naming, deploy targets. Invoke it. This holds regardless of what native
   name precedence would do.
2. A personal-scope user skill ranks between project scope and this pack. Prefer it over the pack specialist
   for the same narrow job; it never beats a project-scope skill.
3. If no user skill plausibly covers the subgoal, use the pack specialist with the setup posture from MODEL.
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
| No user skill matches | Pack specialist, default setup posture |
| User project skill matches, no overlap flagged | Invoke the user skill; do not also run a pack specialist uninvited |
| Both match, different layers | Compose: user skill (domain) then pack skill (craft) |
| `overlap_likely` (0.60 or above) | Defer entirely to the user skill this task |
| `overlap_candidate` (0.35 to 0.60) | Compose cautiously; say both ran and why |
| Unclassified / ambiguous | One short question |
| Skillmap not installed | Inline glob fallback - never skip the check |
| Rest of pack absent | Run standalone, degrade honestly in the receipt |

## Specialist dispatch table

| Subgoal | Owner | Fallback if absent |
|---|---|---|
| Memory layer: CLAUDE.md, `.claude/rules/`, AGENTS.md interop, pruning to budget | `ccforge-prime` | Do it inline; still hold the file under 200 lines and never add a rule the codebase already states |
| Hooks, subagents, MCP servers, permissions, settings files | `ccforge-wire` | Do it inline; never register a Stop hook without a `stop_hook_active` check |
| A session, skill, hook, or agent misbehaving | `ccforge-debug` | Do it inline; run `claude --debug` before asserting a cause |
| Subagents, agent teams, dynamic workflows, worktrees, headless runs | `ccforge-parallel` | Stay sequential and say which gate condition failed |
| Writing, validating, or tuning a new skill | `ccforge-authoring` | Do it inline; validate frontmatter before claiming it works |
| Whether a piece of setup should exist at all, and how it should read | `ccforge-taste` | Apply the three-question existence gate inline |
| Context, token, and cost budget | `ccforge-perf` | Refuse the work without a captured before-number regardless |
| Slop sweep across prose, code, commits, and config emitted | `ccforge-noslop` | Strip em dashes and unnamed catch blocks by hand |
| Explaining a mechanism, a failure, or a trade-off in Claude Code's behavior | `ccforge-explain` | Lead with the mental model, separate documented from inferred, stop at two disclosure levels |
| Continuous improvement of the setup against a ledger | `ccforge-loop` | Do not simulate a loop; run one bounded pass and hand back |
| Skill census, shared index, overlap detection | `ccforge-skillmap` | Inline glob fallback from the routing block |

Standard order for a setup task: `ccforge-skillmap` (routing) then `ccforge-debug` (establish what is actually
happening, if anything is broken) then `ccforge-taste` (should this exist at all) then the builder specialist
(`ccforge-prime`, `ccforge-wire`, `ccforge-authoring`, or `ccforge-parallel`) then `ccforge-noslop`.
`ccforge-perf` enters only when a before-number exists. Running taste before the builder is deliberate: the
cheapest fix for most setup requests is not to add the thing.

## Phase 1 - FRAME

Produce all of these before anything else runs:

- One-sentence restatement of the task.
- **Goal**: what changes in the world when this is done. For this pack the world is the user's own working
  loop, so state the behavior that changes, not the file that changes.
- **Deliverable**: the exact artifact. A file at a named path, a settings block to paste, a diagnosis with the
  command output that proves it. Not a description of one.
- **Hard constraints**: violating one is failure. Includes the detected setup, the Claude Code version, the
  surface (integrated terminal CLI or VS Code panel), and the operating system.
- **Soft preferences**: tradeable.
- **Audience**: who consumes the artifact. A solo setup and a committed team setup are different artifacts.
- **Deliverable failure modes**: name up front what would make a competent reviewer reject this. The recurring
  five here: it costs context on every unrelated request, it is advice where enforcement was needed, it
  silently fails to load, it duplicates something already installed, and it cannot be undone.
- **XY check**: is this request a means to an unstated end? If suspected, confirm the end before optimizing
  the means. "Make my CLAUDE.md better" is usually "Claude keeps ignoring a specific rule".
- Effort dial setting.

**STOP-1 (interview, do not guess):** if the Deliverable cannot be named as a concrete artifact, or the XY
check comes back positive and the real goal changes what you would build, ask before proceeding. Use the
clarification protocol below.

Setup-specific STOP-1 triggers, because guessing these is expensive:

- The request is "make Claude better at X" with no example of X going wrong. One concrete failing transcript
  changes the answer from a CLAUDE.md line to a hook, or to nothing.
- The artifact would be committed to a shared repo but nobody said whether teammates use Claude Code.
- The request implies enforcement ("never let it...") but the proposed fix is prose. Confirm whether they want
  a guarantee or a nudge; those are different mechanisms with different costs.

## Phase 2 - MODEL

1. **Skill census / routing decision**: run the routing block above. Produce an explicit routing line naming,
   for each subgoal, which skill owns it: a user skill, a pack specialist, or both in a domain-then-craft
   composition.
2. **Setup posture**: read `references/setup-detection.md` and run it in order. Result is a table of concerns
   (Claude Code version, surface, memory files, rules, settings layers and effective permission mode, hooks,
   subagents, skills, MCP servers, plugins, output style, worktrees, git state) each marked
   `DETECTED: <value>` or `NONE`. Pack defaults apply only to concerns marked `NONE`. An existing convention
   in the repo beats this pack's preference every time.
3. **Assumption ledger**: every assumption tagged.

| Tag | Meaning | Action |
|---|---|---|
| `[VERIFIED]` | confirmed in a file you read, a command you ran, or the user's own words | build on it |
| `[DEFAULT]` | unverified, low impact, sensible convention | proceed, disclose at DELIVER |
| `[LOAD-BEARING]` | unverified, and the output changes materially if wrong | verify or ask, never proceed silently |

Version claims are the specific hallucination risk in this domain. Any statement of the form "Claude Code does
X" that you did not observe this session is `[LOAD-BEARING]` until `claude --version` and a real check confirm
it. Version-gate it (`>=v2.1.x`) rather than stating it flatly.

**Gate 1 - setup conflict (refusal clause):**
> If the detected setup contradicts a hard constraint the user stated, STOP and ask before writing any code.
> Conforming to a repo you did not choose is this skill working correctly, not this skill failing to have an
> opinion.

**Gate 2 - ownership (refusal clause):**
> If a project-local skill already owns this subgoal, invoke it instead of the pack default, name it in the
> canary line, and do not silently duplicate its work.

**STOP-2:** any `[LOAD-BEARING]` assumption you cannot resolve cheaply yourself, ask.

## Phase 3 - PLAN

- Subgoals with dependencies. Check for gaps (something falls between two subgoals) and overlaps (two
  subgoals produce contradictory work). The classic contradiction here is a CLAUDE.md line and a hook that
  encode the same rule with different thresholds; when they disagree the model picks one arbitrarily.
- **Dispatch table**: subgoal, owning skill by full prefixed name, order, named fallback if it is missing from
  disk. Naming the fallback now is what prevents thrashing later.
- **Pre-registered verification criteria**, written before any file is edited. Setup gates are commands, not
  adjectives:

| Gate | Command | Pass |
|---|---|---|
| Plugin manifest | `claude plugin validate ./<pack> --strict` | exit 0 |
| Frontmatter parses | `claude --debug` startup shows no skill parse error | no parse error line |
| Memory budget | `wc -l CLAUDE.md .claude/CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null` | each under 200 |
| Hook fires | run the handler standalone with a sample JSON on stdin | expected exit code |
| Index integrity | every `source_path` in `.claude/forge/skills-index.json` resolves | zero misses |

- Risk order: attack the subgoal most likely to invalidate the plan first. Here that is almost always "does
  the thing already exist somewhere I have not looked", not "how do I write it".

**STOP-3:** if the plan requires an irreversible or user-owned action, state it and get explicit confirmation
before executing that step. In this domain the list is specific and short:

- Writing to `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, or
  `skillOverrides`. This pack never writes these files on its own initiative.
- Editing the user's `CLAUDE.md` beyond the one marked FORGE import line, which is asked for separately.
- Deleting or renaming any skill, agent, hook, or command file the user wrote.
- `rm -rf ~/.claude/plugins/cache`, `claude project purge`, or anything under `~/.claude/projects/`.
- Registering a Stop hook, which can hold a session in a loop.
- Any `git` operation that rewrites history or discards uncommitted work.

## Phase 4 - BUILD

Standing rules for the rest of the task, not a step to complete and forget:

- Dispatch each specialist by full prefixed name through the Skill tool: "invoke `ccforge-wire`", never
  "use the wiring skill". Ambiguous references do not resolve reliably across three packs.
- **One change at a time.** A setup change is only debuggable if it lands alone. Two edits plus a restart
  produce an unattributable result. Land, verify, then land the next.
- **Drift checkpoint at every subgoal boundary**: re-read the FRAME goal verbatim, not from memory, and ask
  whether the last subgoal still serves it or has started optimizing something local. If it drifted, say so
  and correct before continuing.
- **Trace discipline**: every specific - a flag, a hook event name, a settings key, a file path - comes from
  something you read this session or is marked `[unverified]`. Never manufacture a flag or an event name. If a
  fact is marked unverified in this pack's reference files, carry that marking through to the user.
- **Stuck protocol**: after two honest failed attempts at the same thing, stop repeating. Switch mode: change
  representation, shrink to the smallest failing case, invert the question, challenge a "given". Still stuck
  after the switch, escalate with what you tried and what it printed, never "having trouble".
- **Scope discipline**: files outside the declared subgoal scope are not touched. The user's own skills,
  agents, and settings are outside scope by default and only enter it with a logged reason and consent.

## Phase 5 - REFINE

Bounded adversarial self-refinement against a written defect log. One cycle is critique with one lens, log
defects, classify, revise surgically. Rotate lenses; never repeat one, it finds almost nothing twice.

| # | Lens | Move | Catches |
|---|---|---|---|
| 1 | Hostile expert (always first) | Force one sentence: "The single strongest objection to this is ___." Attack in order: wrong? built on sand? incomplete? the wrong thing? | wrong output, unverified load-bearing assumptions, answering an easier adjacent question |
| 2 | Does it actually run | Execute it. Run the hook handler on sample JSON, restart and check the skill loads, run the validator. Report what printed. | the gap between "looks correct" and "works" |
| 3 | Adversarial and stress | Push every input to 0, 1, empty, huge, malformed, concurrent. Then the setup-specific set: what happens after `/compact`, in a fresh session, in a worktree, under `-p --bare`, on a machine without `jq`, when the hook times out. | edge breakage, unhandled states |
| 4 | Hallucination audit | Classify every checkable specific as VERIFIED / INFERRED / ASSUMED / UNSOURCED. UNSOURCED means verify it, tag it `[unverified]`, or delete it. No fourth option. | confident precise unsourced claims, invented flags and event names |
| 5 | Density | Cut everything that fails "does removing this make it worse?", then confirm nothing load-bearing went with it. | filler, dead config, unused keys |

**Defect log format (the only thing that counts as a finding):**

```
LOCATION                       | DEFECT                                     | SEVERITY | CLASS
-------------------------------|--------------------------------------------|----------|-------------------
.claude/settings.json Stop[0]  | no stop_hook_active check, can loop         | BLOCKER  | correctness
CLAUDE.md:41-58                | restates the directory layout Claude can ls | MAJOR    | context-cost
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
3. Mechanical checks: zero/one/many/empty/huge, unit and order-of-magnitude sanity, internal consistency
   between what the memory file says, what the hook enforces, and what the skill instructs.
4. Fresh-eyes read: does this make sense to someone with no access to your reasoning?

**Quality gate. A checklist of falsifiable booleans with named locations. Never a score, never a percentage.**

- [ ] Every requirement in the original request maps to a named file, command, or settings key.
- [ ] Zero unresolved BLOCKER or MAJOR defects.
- [ ] Every registered gate ran this turn and its exit code is recorded.
- [ ] Every specific in the delivered text traces to something read this session or carries `[unverified]`.
- [ ] Nothing outside the declared scope was modified, and no user-owned settings file was written.
- [ ] No skill, test, or gate was deleted or weakened to make a check pass.
- [ ] Every `[DEFAULT]` assumption is disclosed in the delivery.
- [ ] The setup posture table matches what is actually on disk right now.
- [ ] Every added artifact has a stated removal step, and the removal step was read back from the file it names.
- [ ] Any behavioral claim about Claude Code is version-gated or marked `[unverified]`.

**Verification theater is the failure to guard against**: if you cannot state what the check printed, the
check did not happen.

## Phase 7 - DELIVER

Fixed shape, in this order:

1. **BLUF**: one or two sentences on what now exists and what it does.
2. **How to see it**: the exact command or the exact next session action. `claude --debug 2>&1 | head -40`,
   `/context`, `/hooks`, restart and type `/skills`. Not a description of how one might check.
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
| Low | one line in a memory file, one alias, a question answered from a file you already read | phases compressed to a few lines each, 1 alternative, 0-1 refine cycles (hostile expert only), gates limited to those the change can break |
| Standard (default) | a new skill, a hook, an MCP server, a rules file, a CLAUDE.md restructure | full loop, 2-3 alternatives at the decision points, 2 refine cycles (hostile expert then does it actually run), full gate set |
| High | anything writing a settings file, a Stop hook, a permission deny rule, a worktree or headless automation that runs unattended, deleting user-authored files | full loop plus premortem and an independent re-derivation of the risky part, 3-4 refine cycles adding adversarial-stress and hallucination-audit, ask rather than default on every `[LOAD-BEARING]` item |

## Clarification protocol

**Ask only when all three hold:**
1. The ambiguity is load-bearing: different resolutions produce materially different artifacts.
2. You cannot resolve it yourself cheaply by reading a file, checking context, or running one command.
3. The user plausibly holds the answer: intent, priorities, environment, taste, constraints.

**Do not ask when:** it is cosmetic (pick the default, tag `[DEFAULT]`, disclose at delivery); it is
discoverable (go discover it, asking what you could check offloads your work onto the user - almost every
question about this user's setup is discoverable, so read the files first); it was already signaled (re-read
the request first).

**How to ask:** one round, maximum 3 questions, ranked by impact. Each question carries why it matters in one
clause, 2-4 concrete options, and your default. Shape:
> `X or Y? This changes <consequence>. I'll assume X unless you say otherwise.`

Proceed on the unblocked parts of the task in parallel. Never fully block on partial ambiguity.

**Mid-task escalation:** when execution reveals a fact that invalidates the frame, a constraint conflict, a
false premise, an irreversible fork you did not anticipate, stop and surface it immediately. A finished wrong
thing costs more than an interruption.

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
`~/.claude/forge/` when no FORGE pack remains, and `claude plugin uninstall ccforge`.

## Degradation

If a specialist named in the dispatch table is not on disk, do that slice of the work directly, at reduced
depth, and say so in the receipt line: `[skills: ccforge-orchestrator (ccforge-wire absent)]`. Never claim
a specialist ran. Never fail because a sibling is missing.

## Reference files

| File | Read when |
|---|---|
| `references/setup-detection.md` | Always, in MODEL, before any specialist is dispatched |
