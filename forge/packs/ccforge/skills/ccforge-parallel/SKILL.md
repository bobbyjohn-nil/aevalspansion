---
name: ccforge-parallel
description: >-
  Decides whether work should run in parallel at all, then picks and wires the right primitive: subagents, the
  agent view, agent teams, dynamic workflows, git worktrees, or headless runs. Use when asked to speed something
  up with multiple agents, fan out across many files, run things in the background, work on two branches at once,
  or script Claude in CI. Use this even when the user does not name it. Not for product code speed.
metadata:
  pack: ccforge
  kind: specialist
  domain: meta,parallelism
  version: "1.0.0"
---

# CCForge Parallel

Chooses the cheapest primitive that actually fits, and refuses parallelism that has not earned its cost.
Called by `ccforge-orchestrator`, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-parallel only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-parallel (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill already defines how this repo fans work out, use its conventions for branch naming,
worktree location, and CI entry points. This skill supplies the primitive choice, not the house rules.

## When called by the orchestrator

Take the setup posture as given. Answer Gate 0 first and hand back either a refusal with the failing condition
named, or a primitive plus its wiring. Do not start the fan-out yourself unless told to.

## When invoked directly

Establish three things in one line each before touching Gate 0: what the work is, how many independent pieces
it actually splits into, and whether the pieces have to agree with each other. Then proceed.

## Gate 0: should this be parallel at all

Go parallel only when all four hold:

1. The work splits into **5 or more genuinely independent subtasks**. Four is usually faster sequentially once
   coordination is counted.
2. The subtasks' outputs **do not need to agree with each other**. Anything requiring a consistent decision
   across outputs is one task, not many.
3. Each subtask can be described completely in its own prompt, with no reference to the conversation. A worker
   inherits no history.
4. Verifying the merged result is cheaper than doing the work sequentially. If every output needs a careful
   read anyway, the fan-out bought nothing.

Stay sequential when any of these hold: the subtasks share a file, the task needs iterative back-and-forth,
the phases share heavy context, or the change is quick and targeted.

The costs that make this gate real, all approximate and directional:

| Shape | Token cost relative to one chat session |
|---|---|
| Delegating to subagents | around 4 times |
| A full multi-agent setup | around 15 times |
| Agent teams in plan mode | around 7 times |

**If Gate 0 says sequential, say so plainly, name which condition failed, and do the task the normal way.
Recommending against parallelism when the task has not earned it is this skill working correctly, not this
skill failing to trigger.**

## Pick the primitive

| Primitive | What it gives | Use when |
|---|---|---|
| Subagent | a delegated worker inside one session, own context, returns a summary | a side task would flood the conversation with search results, logs, or files you will not reference again |
| Agent view (`claude agents`) | one screen to dispatch and monitor background sessions | several independent tasks you want to hand off and glance at |
| Agent teams | coordinated sessions with a shared task list and messaging | Claude should split a project, assign pieces, and keep workers in sync. Experimental, off by default, and the most expensive option |
| Dynamic workflows | a script, not turn-by-turn judgment, running many agents and cross-checking | the job outgrows a handful of subagents, or needs adversarial verification: a codebase-wide audit, a several-hundred-file migration |
| Worktrees | a separate git checkout per session | two changes to the same repo that must not see each other's files |
| Headless (`-p`) | scriptable, exit-coded, non-interactive | CI, a git hook, a batch over many inputs |

These compose. A worktree is not an agent runner; it is the isolation a parallel agent needs. `/batch` is a
bundled skill that packages subagents plus worktrees plus one PR each, not a separate primitive.

## Subagents, the default answer

Reach here first. A subagent's value is context isolation: only its final result returns to the main
conversation. It starts cold, so the delegation message must be self-contained; it inherits the CLAUDE.md
hierarchy and a git status snapshot, and nothing from the conversation.

Cost levers worth using: `model: haiku` on simple delegated work, `tools:` narrowed to what the task needs,
and a `skills:` list that preloads exactly the knowledge the worker needs rather than making it search.

## Dynamic workflows, with the real limits

A workflow is JavaScript that Claude writes and a separate runtime executes, orchestrating agents through
`agent()` and `pipeline()`. Intermediate results live in script variables rather than in context, so only the
final answer costs tokens. Trigger with the literal keyword `ultracode` in a prompt, plain language such as
"run a workflow", or `/effort ultracode` for the session.

Hard limits worth planning against:

- Up to **16 concurrent agents**, fewer on CPU-constrained hosts.
- **1,000 agents total per run.**
- A run scheduling more than **25 agents** or projecting more than **1.5M tokens** shows a large-workflow
  advisory. It does not pause.
- No mid-run user input, and no `import()` in the script.
- Resume after a stop is asymmetric: completed agents replay from cache only up to the first agent that was
  still running when you stopped; everything started after that point re-runs. Many small agents preserve more
  progress on interruption than one long agent.
- Agents a workflow spawns run in `acceptEdits` mode with your tool allowlist regardless of your session's
  mode. Decide whether that is acceptable before starting one.

## Worktrees

```bash
claude --worktree feature-auth        # creates .claude/worktrees/feature-auth, branch worktree-feature-auth
claude --worktree "#1234"             # branch from a PR; quote it so the shell does not treat # as a comment
```

Isolation is enforced by hard blocks that cannot be turned off: edits into the main checkout, a working
directory resolving into the main checkout, git redirects such as `git -C` or `GIT_DIR`, and command shapes
Claude Code cannot statically trace (brace expansion, heredocs with unquoted delimiters) are all refused.
Design the work to fit that, rather than trying to route around it.

Two facts that decide setup:

- Gitignored files such as `.env` do not exist in a new worktree. A `.worktreeinclude` file at the project
  root, gitignore syntax, copies them in automatically.
- `.claude/worktrees/` belongs in `.gitignore`.

Shared across worktrees of one repo, not isolated: the `.git` directory, project-scope plugins, and permission
approvals, which save to the main checkout's `.claude/settings.local.json`.

Cleanup: exiting a clean unnamed worktree session removes it. A named one, or one with uncommitted work,
prompts. A `-p` run has no exit prompt, so worktrees accumulate; remove them with
`git worktree remove --force`.

## Headless

```bash
claude -p "Fix the failing test in auth.test.ts" --allowedTools "Read,Edit,Bash"
claude -p "..." --output-format json --bare
```

Use `--bare` for anything running in CI or against a repository you did not write. Without it, a `-p` session
runs the project's `.claude/settings.json` hooks and connects its `.mcp.json` servers even in a folder never
trusted, because `-p` shows no trust dialog and cannot show the per-server MCP approval prompt. Bare mode also
skips OAuth credentials, so set `ANTHROPIC_API_KEY` explicitly and pass context with `--append-system-prompt`,
`--settings`, `--mcp-config`, `--agents`, or `--plugin-dir`.

Exit code 0 on success, non-zero on failure. `--output-format json` gives `result`, `session_id`, usage, and
a client-side `total_cost_usd` estimate. Background Bash tasks are terminated shortly after the final result;
background subagents and workflows are waited on instead, capped at ten minutes by default.

## Quality checklist

- [ ] Gate 0 was answered against all four conditions, and the answer is stated.
- [ ] If the answer was sequential, the failing condition is named and the work proceeded normally.
- [ ] The chosen primitive is named, with one sentence on why the cheaper one below it does not fit.
- [ ] Each parallel worker's prompt is self-contained and was checked for references to the conversation.
- [ ] Any worktree setup states where gitignored files come from, or that none are needed.
- [ ] Any headless command states whether `--bare` is used and why.
- [ ] Projected agent count and any advisory threshold crossed are stated before the run, not after.

## Reference files

| File | Read when |
|---|---|
| `references/primitives.md` | Wiring a specific primitive, or comparing two that both look plausible |
