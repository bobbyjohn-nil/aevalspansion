---
name: ccforge-debug
description: >-
  Diagnoses why a Claude Code session, skill, hook, subagent, plugin, or MCP server is misbehaving, using captured
  command output instead of assertion. Use when a skill never triggers, a slash command vanished, a hook does
  nothing, a plugin loaded but its parts are missing, an MCP server will not connect, or instructions are being
  ignored. Use this even when the user does not name it. Not for bugs in the project's own code.
metadata:
  pack: ccforge
  kind: specialist
  domain: meta,debugging
  version: "1.0.0"
---

# CCForge Debug

Finds the actual cause of a misbehaving setup and proves it. Called by `ccforge-orchestrator`, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-debug only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-debug (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill owns diagnostics for this repo's own tooling, invoke it for that layer and keep this
skill to the Claude Code layer. Do not re-derive a diagnosis the user's own skill already produces.

## The one rule everything else rests on

**If you cannot state what the check printed, the check did not happen.** Every step below produces an
observable: an exit code, a line of output, a file that exists or does not. A diagnosis with no captured
output attached is a guess wearing a diagnosis costume, and in this domain guesses are expensive because the
user acts on them by editing config.

Two corollaries:

- Never say "that should work now" without having re-run the check.
- When a check cannot be run from Bash, say so, name the interactive command the user must type, and wait.
  `/context`, `/hooks`, `/skills`, `/mcp`, and `/help` are session commands, not shell commands.

## When called by the orchestrator

Take the setup posture as given, but re-run the specific check that bears on the symptom. A posture table
built at the start of the task is not evidence about a file edited since.

## When invoked directly

Get the symptom to a reproducible statement before touching anything: what was expected, what happened, and
how many times out of how many. "It sometimes ignores my rule" and "it ignored my rule in the last three
sessions, always after a long one" are different bugs.

## Procedure

### 1. Classify the symptom

| Symptom class | First check |
|---|---|
| A skill never auto-triggers | frontmatter parse, then description quality |
| A slash command disappeared | file location and precedence, then plugin structure |
| A hook does nothing | execute bit, shebang, standalone run, then event choice |
| A plugin loaded but parts are missing | directory layout: `skills/` must be a sibling of `.claude-plugin/`, not inside it |
| An MCP server is not connected | `claude mcp list` status string, then scope and approval |
| Claude ignores an instruction | where the instruction lives, then whether a compaction dropped it |
| A subagent behaves as if it knows nothing | it does; non-fork subagents inherit no conversation history |
| Everything got worse partway through a session | context, not config. Route to `ccforge-perf` |

### 2. Run the cheap global checks first

```bash
claude --version
claude --debug 2>&1 | head -60          # startup diagnostics, including skill frontmatter parse errors
claude plugin validate ./<pack> --strict; echo "exit=$?"
claude mcp list 2>/dev/null
```

`claude --debug` is the only place a frontmatter parse error appears. This matters more than it sounds:

**Malformed YAML frontmatter fails silently.** The skill still loads, with empty metadata. Typing `/name`
still works, so it looks fine. But `description` is empty, so auto-triggering is permanently dead for that
skill. Nothing warns. Any report of "my skill only works when I type it" starts here.

### 3. Isolate before theorizing

- Reduce to the smallest failing case: one skill, one hook, one command.
- Change one thing, re-run the check, record the exit code. Two changes at once produce an unattributable
  result and cost another cycle.
- Compare against a known-good instance of the same thing. A skill that triggers next to one that does not is
  the fastest available diff.
- Bisect by scope: does it fail in a fresh session, in a different directory, under `claude -p --bare`? Bare
  mode skips auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md, which makes it
  a clean baseline for "is this my config or the tool".

### 4. Use the diagnostics channel that already exists

When the VS Code extension is active, `mcp__ide__getDiagnostics` returns the Problems panel, optionally scoped
to one file. That is a real, structured error source; prefer it to re-running a compiler for the same
information. It is one of exactly two model-visible tools on the built-in `ide` MCP server, the other being
`mcp__ide__executeCode` for the active Jupyter kernel, which always asks before running.

### 5. State the cause with the evidence attached

Format every finding this way:

```
SYMPTOM : /my-skill never fires on its own
CHECK   : claude --debug 2>&1 | grep -i 'my-skill'
OUTPUT  : failed to parse frontmatter: mapping values are not allowed in this context (line 3)
CAUSE   : an unquoted colon in the description value
FIX     : quote the description, or use a folded block scalar
RECHECK : claude --debug 2>&1 | grep -i 'my-skill'  -> no parse error
```

The `RECHECK` line is not optional. A fix with no recheck is a hypothesis.

## Traps that produce silent failures

These four produce no error message at all, which is why they cost the most time:

1. **Frontmatter parse error.** Empty metadata, dead auto-trigger, manual invocation still works.
   Only `claude --debug` shows it.
2. **`skills/`, `agents/`, `commands/`, or `hooks/` placed inside `.claude-plugin/`.** The plugin loads and its
   components are silently missing. They belong at the plugin root, as siblings of `.claude-plugin/`, which
   holds only `plugin.json`.
3. **A `!`-injected command that exits non-zero aborts the entire skill invocation.** Claude sees none of the
   skill content that turn. Append `|| true` to anything with a legitimate non-zero exit, and prefer a plain
   Bash call in the body over `!` injection.
4. **A hook script without the execute bit.** It never fires and nothing reports it.

Two more worth knowing before blaming the tool:

- A brand-new top-level skills directory that did not exist when the session started requires a restart to be
  watched. Editing an existing skill file is picked up mid-session.
- Testing triggering with a trivially simple prompt proves nothing. Claude bypasses skill consultation for
  one-step requests it can handle directly. Test with a substantive, multi-step prompt.

## Quality checklist

- [ ] Every claimed cause has a captured command and its real output attached.
- [ ] The fix was re-checked with the same command, and the recheck output is shown.
- [ ] Only one thing changed between the failing check and the passing one.
- [ ] Interactive-only checks were named for the user rather than described as done.
- [ ] No configuration was edited that the symptom did not implicate.
- [ ] If the cause could not be found, that is stated plainly along with what was ruled out and how.

## Reference files

| File | Read when |
|---|---|
| `references/failure-table.md` | The symptom is not in the classification table above, or the first check did not explain it |
