# FORGE quickstart

Open the VS Code integrated terminal in your project, run `claude`, and type these in order. Copy the text
after the arrow verbatim.

## 1. Prove the skills are live

> Which FORGE skills are installed and what does each one own? One line each.

You should get a list and, as the very last line, `[skills: ...]`. If that line is missing, the skills are not
loaded: quit `claude`, check `ls .claude/skills | head`, restart.

## 2. Take the census so your own skills win

> Run the skill census and show me the overlaps between my skills and the FORGE packs.

Writes `.claude/forge/skills-index.json`. Read the `overlaps` array: anything with `jaccard` at or above 0.60
means a FORGE skill will step aside entirely for yours. Re-run this after you add a skill.

## 3. Build something real, end to end

> Add a settings page with email change and password reset. Use the existing stack, do not introduce new
> dependencies, and run the gates before you tell me it works.

`webforge-orchestrator` frames it, detects your stack rather than imposing one, dispatches `webforge-ui` and
`webforge-server`, then reports gate results with exit codes. Expect it to ask up to three questions first if
something load-bearing is ambiguous. That is the skill working, not stalling.

## 4. Turn the loop loose on a failing gate

> Start webforge-loop. Scope is src/auth/** and tests/auth/**. Goal: every gate exits 0. Cap 10 iterations.
> Do not touch billing.

It writes `.claude/webforge-loop/` with `state.json`, `PROGRESS.md`, `DEFECTS.md`, `TODO.md`. It stops on a
clean pass, a regression, two iterations of no progress, or the cap, and hands off the open defect rows. It
will not weaken a test to make a gate go green. Read `PROGRESS.md` to see exactly what ran.

## 5. Get a real design pass, not a compliment

> Run webforge-taste on the pricing page. Write the constraint block first, then audit against the slop table
> and fix what fails.

You get a palette and type-scale constraint written before any change, then a defect table with file and
section locations. Swap `webforge-` for `appforge-` on a mobile or desktop screen.

## Two more worth knowing

**Your Claude Code setup itself is a target.**

> My CLAUDE.md is 400 lines and sessions feel dumber than they used to. Fix it.

`ccforge-prime` and `ccforge-perf` cut memory to budget and name what is actually burning context.

**Force a specific skill by name.** Auto-trigger usually gets it right, but you can be explicit: type
`/webforge-taste` (script install) or `/webforge:webforge-taste` (plugin install), or just say "use
appforge-backend for this".

## Reading the receipt in one second

| Line | Means |
|---|---|
| `[skills: webforge-orchestrator > webforge-ui]` | Orchestrator ran, dispatched the UI specialist |
| `[skills: webforge-orchestrator > deploy-site > webforge-taste]` | Your `deploy-site` skill owned a subgoal and ran |
| `[skills: webforge-taste only]` | One skill, no orchestration |
| `[skills: webforge-orchestrator (webforge-ui absent)]` | A specialist is not on disk; work was done directly, at less depth |
| no line at all | Skills are no longer shaping replies. `/clear`, re-run. |
| `note: skill context is degrading - /clear, then re-run this request.` | Same, but the model noticed first |

## When to /clear

Whenever the receipt disappears, whenever you correct the same mistake twice, and whenever you start a task
unrelated to the one the session began with. `/clear` costs nothing. `/compact` re-reads the whole
conversation, so prefer `/compact <what to keep>` over a bare `/compact` when you do need it.
