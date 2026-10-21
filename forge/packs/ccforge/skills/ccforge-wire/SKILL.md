---
name: ccforge-wire
description: >-
  Wires and audits the enforcement layer of a Claude Code setup: hooks, subagents, MCP servers, permission rules,
  and settings files, and refuses the ones that are not earned. Use when asked to add a hook, block a command,
  auto-format after edits, add an MCP server or subagent, set permissions or a default mode, or stop approving the
  same prompt repeatedly. Use this even when the user does not name it. Not for CLAUDE.md; use ccforge-prime.
metadata:
  pack: ccforge
  kind: specialist
  domain: meta,hooks,permissions
  version: "1.0.0"
---

# CCForge Wire

Owns everything that changes Claude Code's behavior through configuration rather than prose. Called by
`ccforge-orchestrator`, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-wire only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-wire (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill or an existing hook already covers the behavior, extend it rather than adding a second
mechanism beside it. Two enforcers on one behavior is how a repo ends up with a lint hook that fights a lint
rule. Name the existing one and say what you changed.

## When called by the orchestrator

Take the setup posture as given. Re-read only the settings file you are about to modify, plus any existing
hook on the same event, before proposing anything.

## When invoked directly

Establish three things first, in one line each: what behavior must change, whether it must happen every time
or only usually, and which file the user is willing to have changed. Then proceed.

## Gate 0: does this deserve to exist

Answer all three before writing config. If any one is unanswerable, do not add it and say which one failed.

1. Name the recurring task or failure it replaces. One instance is an anecdote; a rule needs a repeat.
2. Name what goes wrong if it does not exist. If the answer is "nothing, it is just tidier", stop.
3. Name its ongoing cost: context per request, latency per tool call, or a new file someone must maintain.

Refusing to add a hook that has not earned its place is this skill working correctly, not this skill failing
to have an opinion.

## Choose the mechanism on determinism, not on taste

| Need | Mechanism | Why |
|---|---|---|
| Must happen every time, no exceptions | hook | the trigger is guaranteed; prose is a request |
| Should usually happen, needs judgment | skill | the model reads it and adapts |
| A convention every request needs | CLAUDE.md line, via `ccforge-prime` | cheap, advisory |
| Block a command or path outright | `permissions.deny` rule | enforced by the client, not the model |
| Verbose side task you will not reference again | subagent | its output never enters the main context |
| Data Claude cannot see | a CLI tool first, an MCP server only if no CLI exists | MCP tool names cost context even unused |

A boundary stated in conversation ("do not push") is re-read from the transcript on each check and can be lost
to compaction. For a guarantee, use a deny rule.

## Hooks

### Exit codes, the part that decides everything

| Exit | Meaning |
|---|---|
| 0 | success. Stdout starting with `{` is parsed as JSON; otherwise it is plain text. Plain-text stdout goes only to the debug log, except on `UserPromptSubmit`, `UserPromptExpansion`, and `SessionStart`, where it is added as visible context |
| 2 | hard block, regardless of any JSON output. On `PreToolUse` the call is denied; on `Stop` the turn does not end. The block reason comes from the JSON reason or from stderr |
| any other non-zero | honored if the JSON validates against the event schema; otherwise a non-blocking error. The action proceeds and the transcript shows a hook error notice |
| timeout | hook canceled, no decision rendered, execution continues |

Not every event honors exit 2. `PermissionRequest` explicitly ignores it and needs the JSON `decision` field.
`PostToolUse` cannot block anything: the tool has already run. Its only lever is stderr text shown to Claude.

### Stop hooks, and the loop hazard

A `Stop` hook that exits 2 keeps Claude working. That is the mechanism behind completion-condition loops, and
it is the one hook that can hold a session hostage. Two rules, both mandatory:

1. Any Stop hook MUST read `stop_hook_active` from its input JSON and exit 0 immediately when it is true.
2. There is a hard cap of 8 consecutive blocks. A Stop hook that ignores rule 1 will hit it, and the failure
   looks like a wedged session rather than a hook bug.

### Handler types

| `type` | Use for | Key fields |
|---|---|---|
| `command` | shell command | `command`, `args` (present means exec form with no shell interpolation), `async`, `shell` |
| `http` | POST to an endpoint | `url`, `headers` |
| `mcp_tool` | call a configured MCP tool | `server`, `tool`, `input` |
| `prompt` | a judgment call by a fast model | `prompt`, `model` |
| `agent` | judgment with read access before deciding | `prompt` |

Common optional fields: `if` (permission-rule syntax, for example `"Bash(git *)"`), `timeout` in seconds,
`statusMessage`. Default timeouts are 600s for command, http, and mcp_tool, 30s for prompt, 60s for agent;
some events lower this.

### Writing the handler

- Executable bit set, and a `#!/usr/bin/env bash` shebang. A missing execute bit fails silently.
- Read the JSON from stdin. Handle the case where a field is absent by exiting 0. A hook that fails closed on
  malformed input blocks work for reasons nobody can debug.
- Test it standalone before registering it: `echo '<sample json>' | ./hook.sh; echo $?`. Report that exit code.
- Reference project paths with `${CLAUDE_PROJECT_DIR}`; plugin paths with `${CLAUDE_PLUGIN_ROOT}`.
- `jq` is convenient and is not guaranteed present. Either check for it and degrade, or state the dependency.

Full event list, matcher syntax, JSON output schema, and worked patterns are in `references/hooks.md`.

## Subagents

A subagent is context isolation, not parallelism. Its value is that verbose output never touches the main
conversation; only the final result returns. Reach for one when a side task would flood the conversation with
search results, logs, or many file reads you will not reference again.

Frontmatter lives in `.claude/agents/<name>.md`. `name` and `description` are required; `name` cannot contain
a colon. Put "use proactively" in the description to nudge automatic delegation. `tools` is an allowlist;
`disallowedTools` is a denylist. `model: haiku` on a simple delegated task is a real cost lever.

What a non-fork subagent gets at startup: its own system prompt, the delegation message, the full CLAUDE.md
hierarchy, a git status snapshot from parent session start, and any skill named in its `skills:` field, fully
preloaded. What it does not get: conversation history, output style, the main session's auto memory, or
previous tool results. Write the delegation message assuming the agent knows nothing about the conversation.

Anything more than one delegated worker is a parallelism decision. Route it to `ccforge-parallel`.

## MCP servers

Prefer an existing CLI tool. `gh`, `aws`, `gcloud`, and `sentry-cli` add zero per-tool listing overhead, and
Claude learns an unfamiliar CLI from `--help`. Add an MCP server when no CLI covers the data.

```bash
claude mcp add --transport http <name> <url>            # hosted
claude mcp add <name> -- npx -y <package>               # local stdio, everything after -- is the command
claude mcp add --transport http <name> <url> --header "Authorization: Bearer <token>"
```

Run these from the shell, outside a `claude` session. `--scope` decides the file: `local` (the default) writes
`~/.claude.json` under this project's entry, `project` writes `.mcp.json` in the repo root for the team, and
`user` writes the top-level `mcpServers` key of that same `~/.claude.json`. Scope is fixed at add time; change
it with `claude mcp remove <name> --scope <old>` then re-add with the new scope. A project-scoped server
prompts for per-server approval the first time Claude Code sees it.

Tool schemas are deferred and only tool names load at session start, so an unused server still costs
something. `/mcp` shows per-server cost. Audit and remove servers nobody used this month.

## Permissions and settings

Precedence, highest first: managed policy, command-line arguments, `.claude/settings.local.json`,
`.claude/settings.json`, `~/.claude/settings.json`. Deny is absolute: a deny at any level cannot be overridden
by an allow at another.

**This skill never writes a settings file.** Produce the exact snippet, name the file it belongs in, and let
the user paste it. Settings files are user-owned and a bad write is invisible until the next session.

Rule syntax, permission modes, protected paths, and the auto-mode classifier are in `references/permissions.md`.

## Quality checklist

- [ ] Gate 0 was answered in three lines, or the addition was refused with the failing question named.
- [ ] Every hook handler was executed standalone this turn and its exit code is recorded.
- [ ] Every hook handler file is executable and has a shebang.
- [ ] Any Stop hook checks `stop_hook_active` and exits 0 when it is true.
- [ ] No settings file was written by this skill; snippets were handed to the user with the target path.
- [ ] Every event name, exit code, and settings key used appears in this skill or its references, or carries
      `[unverified]`.
- [ ] The removal step for anything added is stated, and it names a real file and key.
- [ ] An MCP server was added only after confirming no CLI covers the same data.

## Reference files

| File | Read when |
|---|---|
| `references/hooks.md` | Writing or auditing any hook |
| `references/permissions.md` | Writing permission rules, choosing a mode, or debugging a prompt that keeps appearing |
