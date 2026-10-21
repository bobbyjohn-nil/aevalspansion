# Parallelism primitives reference

## Contents

1. Comparison table
2. Subagent frontmatter
3. Skill-to-subagent fork
4. Agent teams
5. Dynamic workflows
6. Worktrees
7. Headless mode
8. Loop-adjacent primitives: `/goal`, `/loop`, Stop hooks
9. Interrupt and cleanup

## 1. Comparison table

| | Subagents | Skills | Agent teams | Dynamic workflows |
|---|---|---|---|---|
| Who decides what runs next | Claude, turn by turn | Claude, following the prompt | the lead agent, turn by turn | the script |
| Where intermediate results live | Claude's context | Claude's context | a shared task list | script variables |
| What is repeatable | the worker definition | the instructions | the team definition | the orchestration itself |
| Scale | a few per turn | same as subagents | a handful of long-running peers | dozens to hundreds per run |
| Interruption | restarts the turn | restarts the turn | teammates keep running | resumable in the same session |

## 2. Subagent frontmatter

Files live in `.claude/agents/<name>.md` (project) or `~/.claude/agents/<name>.md` (personal). Priority,
highest first: managed settings, `--agents` CLI JSON, project, personal, plugin.

```markdown
---
name: test-runner
description: Runs the test suite and fixes failures. Use proactively after any source change.
tools: Read, Edit, Bash
model: haiku
---
Run the test suite. For each failure, read the failing test and the code under test, make the smallest fix,
and re-run. Report the final command and its exit code.
```

| Field | Notes |
|---|---|
| `name` | required, lowercase and hyphens, cannot contain a colon |
| `description` | required, drives auto-delegation. "use proactively" nudges automatic use |
| `tools` | allowlist. Omit to inherit everything available to subagents |
| `disallowedTools` | denylist, removed from the inherited or specified set. `mcp__*` removes all MCP tools |
| `model` | `sonnet`, `opus`, `haiku`, `fable`, a full ID, or `inherit` (default) |
| `permissionMode` | ignored while auto mode's classifier is checking subagent actions |
| `maxTurns` | hard cap on agentic turns |
| `skills` | fully preloaded into the subagent at launch, unlike the main session's lazy loading |
| `memory` | `user`, `project`, or `local`; gives the agent its own auto-memory scope |
| `isolation: worktree` | runs in an isolated git worktree |
| `initialPrompt` | auto-submitted first turn when the agent runs as the main session via `--agent` |

Invocation: automatic by description match, by natural language ("use the test-runner subagent to ..."),
guaranteed with `@agent-test-runner`, or session-wide with `claude --agent test-runner`.

To restrict which subagents a coordinator may spawn, when that agent runs as the main thread:
`tools: Agent(worker, researcher), Read, Bash`. Bare `Agent` allows any.

Built-in agents: `Explore` and `Plan` are read-only and skip both CLAUDE.md and git status to stay minimal;
`general-purpose` and `claude` have everything.

## 3. Skill-to-subagent fork

```yaml
---
name: deep-dive
description: Research a topic thoroughly across the repo
context: fork
agent: Explore
---
```

`context: fork` runs the skill body as a forked subagent's prompt, inheriting the full conversation history,
system prompt, tools, and model. It runs in the background by default; `background: false` blocks the invoking
turn instead. Forced foreground regardless of the flag: `-p` and SDK mode,
`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, an earlier invocation of the same skill still running, or a
scheduled task firing it.

A backgrounded fork's edits fall outside session checkpoints, so `/rewind` will not undo them. Use git.

FORGE's own loop skills deliberately do not use `context: fork`: a forked run hides the per-iteration receipt
and escapes checkpointing.

`/subtask <instructions>` forks the running conversation ad hoc for a side investigation that would otherwise
flood context.

## 4. Agent teams

Multiple coordinated sessions with a shared task list, inter-agent messaging, and a lead that assigns work.
Experimental and off by default. The cost is the deciding factor: in plan mode a team runs roughly 7 times the
tokens of a standard session, because each teammate is a separate Claude instance with its own context window,
and teammates keep consuming tokens until they exit. Reach for a team only when the work genuinely needs
coordination between long-running peers, which is rarer than it looks.

## 5. Dynamic workflows

```javascript
export const meta = { name: 'audit-routes', description: 'Audit every route handler for missing auth checks' }
const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'],
            properties: { files: { type: 'array', items: { type: 'string' } } } },
})
const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }))
return audits.filter(Boolean)
```

Trigger: the literal keyword `ultracode` in a prompt, plain language such as "run a workflow", or
`/effort ultracode` to let Claude decide per task for the session. `ultracode` is a Claude Code setting, not a
model effort level: it sends `xhigh` to the model and has Claude plan a workflow for each substantive task.

Limits: 16 concurrent agents, 1,000 agents per run, an advisory above 25 agents or 1.5M projected tokens, no
mid-run user input, no `import()`. Resume replays completed agents from cache only up to the first agent still
running at the stop.

Save a good run for reuse: `/workflows`, select the run, press `s`, choose `.claude/workflows/` (shared) or
`~/.claude/workflows/` (personal). It becomes a slash command and accepts input through an `args` global.

Disable org-wide or per session with `CLAUDE_CODE_DISABLE_WORKFLOWS=1`.

## 6. Worktrees

```bash
claude --worktree feature-auth     # or -w
claude --worktree                  # generated name
claude --worktree "#1234"          # from a PR
git worktree list
git worktree remove --force .claude/worktrees/<name>
```

- Creates `.claude/worktrees/<name>/` at the repo root on branch `worktree-<name>`.
- Requires workspace trust already accepted, except `-p --worktree`, which skips the trust check.
- `worktree.baseRef` setting: `"fresh"` (default, branches from the remote default branch) or `"head"`
  (branches from local HEAD, carrying unpushed commits).
- Moving into a worktree outside `.claude/worktrees/` always prompts and cannot be remembered.
- Subagent-level isolation: `isolation: worktree` in agent frontmatter. Claude Code locks an in-use subagent
  worktree so the cleanup sweep cannot remove it mid-run.
- The four isolation checks are hard blocks: main-checkout edits, main-checkout working directory, git
  redirects, and unverifiable command shapes.

## 7. Headless mode

```bash
claude -p "prompt" --allowedTools "Read,Edit,Bash"
claude -p "prompt" --permission-mode acceptEdits
claude -p "prompt" --output-format json --json-schema '{"type":"object", ...}'
claude -p "second question" --continue
session=$(claude -p "start" --output-format json | jq -r '.session_id'); claude -p "more" --resume "$session"
```

| `--output-format` | Shape |
|---|---|
| `text` (default) | plain text |
| `json` | one object with `result`, `session_id`, usage, `total_cost_usd` |
| `stream-json` | newline-delimited events; last line is a `result` message |

Structured output lands in `.structured_output`; free text always also lands in `.result`. Subagent messages
carry `parent_tool_use_id`; `--forward-subagent-text` also surfaces their text and thinking.

`--bare` skips auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md, giving the
same result on every machine. It is documented as becoming the default for `-p` in a future release.

`-p` creates a resumable session by default; `--no-session-persistence` opts out. SIGTERM aborts the turn,
kills the Bash process tree, runs `SessionEnd` hooks, and exits with code 143.

## 8. Loop-adjacent primitives

| Approach | Next turn starts when | Stops when |
|---|---|---|
| `/goal <condition>` | the previous turn finishes | a small model judges the condition met, or impossible |
| `/loop` | a time interval elapses | you stop it, or Claude decides it is done |
| Stop hook | the previous turn finishes | your own script or prompt decides |

`/goal` is session-scoped, capped at 4,000 characters, and checks the transcript without calling tools of its
own. It does not change the permission mode; pair it with auto mode for unattended runs. If Claude stalls with
no tool use for several turns, Claude Code stops the loop itself, prints a warning, and hands control back
with the goal still set. Under the hood it is a session-scoped prompt-based Stop hook, so a hand-rolled Stop
hook gives finer control over the same mechanism.

## 9. Interrupt and cleanup

| Action | How |
|---|---|
| Interrupt the current turn | `Esc` |
| Stop all background subagents | `Ctrl+X Ctrl+K`, twice within 3 seconds to confirm |
| Background the running command or agent | `Ctrl+B` |
| See what is running | `claude agents`, or `/tasks` in session |
| Remove a stuck worktree | `git worktree remove --force <path>` |
