# Setup detection

Run in this order. Stop early only when the request is scoped to one concern. Everything here is a read; none
of it modifies the user's setup.

Facts marked `[unverified]` were not confirmed against primary documentation during authoring. Carry the
marking through to the user rather than dropping it.

## Contents

1. Version and surface
2. Memory layer
3. Settings layers and effective permission mode
4. Hooks
5. Subagents
6. Skills and commands
7. MCP servers
8. Plugins
9. Output style and effort
10. Worktrees and git
11. Posture table
12. Interactive checks the user must run

## 1. Version and surface

```bash
claude --version
echo "$TERM_PROGRAM"          # vscode when running in the VS Code integrated terminal
ls ~/.claude/ide/ 2>/dev/null # lock files present means an IDE MCP connection exists or existed
```

The VS Code extension panel and the CLI running inside the integrated terminal are two different surfaces.
The extension bundles a private copy of the CLI for its own panel and does not put `claude` on the shell PATH;
the standalone CLI install is separate. CLI-only, per the docs: the full command and skill set, `claude mcp
add`, the `!` bash shortcut, tab completion. Do skill, hook, and MCP authoring in the integrated terminal.

## 2. Memory layer

```bash
ls -l ./CLAUDE.md ./.claude/CLAUDE.md ./CLAUDE.local.md ~/.claude/CLAUDE.md 2>/dev/null
ls -R .claude/rules ~/.claude/rules 2>/dev/null
wc -l ./CLAUDE.md ./.claude/CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null
grep -rn '^@' ./CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null   # imports
ls AGENTS.md .cursorrules .github/copilot-instructions.md 2>/dev/null
```

Load order is broadest to most specific: managed policy, then `~/.claude/CLAUDE.md`, then project
`CLAUDE.md` / `.claude/CLAUDE.md`, then `CLAUDE.local.md`. Files are concatenated, not overridden; the ones
closest to the working directory are read last. Nested subdirectory `CLAUDE.md` files load on demand the first
time a file in that subdirectory is read, not at launch.

Record for the posture table: total memory line count, whether any file exceeds 200 lines, whether
`.claude/rules/` exists, whether any rule carries `paths:` frontmatter, and whether an `AGENTS.md` exists
without a `@AGENTS.md` import in `CLAUDE.md`.

## 3. Settings layers and effective permission mode

```bash
for f in ~/.claude/settings.json .claude/settings.json .claude/settings.local.json; do
  echo "== $f"; cat "$f" 2>/dev/null; done
```

Precedence, highest first: managed policy, command-line arguments, `.claude/settings.local.json`,
`.claude/settings.json`, `~/.claude/settings.json`. Deny is absolute: if a tool is denied at any level, no
other level can allow it.

Report the effective `permissions.defaultMode`, the allow and deny rule counts, and any of
`disableBundledSkills`, `disableAllHooks`, `autoCompactWindow`, `skillOverrides`, `claudeMdExcludes`,
`autoMemoryEnabled`, `outputStyle`, `agent`.

## 4. Hooks

```bash
grep -l '"hooks"' ~/.claude/settings.json .claude/settings.json .claude/settings.local.json 2>/dev/null
ls -l .claude/hooks/ 2>/dev/null
find ~/.claude/skills -name hooks.json -path '*/hooks/*' 2>/dev/null
grep -rln '^hooks:' .claude/skills ~/.claude/skills --include=SKILL.md 2>/dev/null
```

Hooks also come from plugin `hooks/hooks.json` and from skill or subagent frontmatter, which is why grepping
only settings files under-reports. For each hook record: event, matcher, handler type, and whether the handler
file is executable. A hook script missing the execute bit silently does not fire.

## 5. Subagents

```bash
ls .claude/agents/ ~/.claude/agents/ 2>/dev/null
```

Priority, highest first: managed settings, `--agents` CLI JSON, `.claude/agents/`, `~/.claude/agents/`, plugin
`agents/`. Note any agent with `isolation: worktree`, `memory:`, or a `skills:` preload list, since each
changes what that agent sees at launch.

## 6. Skills and commands

Invoke `ccforge-skillmap`. Do not hand-roll this; the census script exists so the index is one shared artifact
across all three packs. If `ccforge-skillmap` is absent, run the inline fallback from the orchestrator's
routing block.

## 7. MCP servers

```bash
claude mcp list 2>/dev/null || true
cat .mcp.json 2>/dev/null
```

`claude mcp add` must be run outside a `claude` session. Scope determines the config file: `local` writes to
`~/.claude.json` under this project's entry, `project` writes `.mcp.json` in the project root, `user` writes
the top-level `mcpServers` key in `~/.claude.json`. A project-scoped server requires per-server approval the
first time Claude Code sees it.

The built-in `ide` MCP server runs whenever the VS Code extension is active. It is hidden from `/mcp` and
exposes exactly two model-visible tools: `mcp__ide__getDiagnostics` (VS Code Problems panel, read-only) and
`mcp__ide__executeCode` (Jupyter, always asks). If a `PreToolUse` allowlist hook is in play, `ide` must be on it.

## 8. Plugins

```bash
claude plugin list --json 2>/dev/null || claude plugin list 2>/dev/null || true
ls ~/.claude/plugins/cache/ 2>/dev/null
ls ~/.claude/skills/*/.claude-plugin/plugin.json 2>/dev/null
```

The exact field names of `claude plugin list --json` are `[unverified]`. Treat the JSON as opaque: use it for
the set of plugin names, then read plugin directories directly for anything structural.

Any directory under a skills directory that contains its own `.claude-plugin/plugin.json` loads as a plugin on
the next session with no install command. That is how the FORGE packs themselves are installed.

## 9. Output style and effort

Output style is set in a settings file (`outputStyle`) or via `/config`, and takes effect only after `/clear`
or a new session. It modifies the system prompt and applies to the main conversation only; a non-fork subagent
does not inherit it. Effort is session state, not a file: read it from `/effort` output or the status line, not
from disk.

## 10. Worktrees and git

```bash
git rev-parse --show-toplevel 2>/dev/null
git worktree list 2>/dev/null
ls .claude/worktrees/ 2>/dev/null
grep -n 'worktrees' .gitignore 2>/dev/null
ls .worktreeinclude 2>/dev/null
```

`.claude/worktrees/` belongs in `.gitignore`. `.worktreeinclude` (gitignore syntax, project root) is what
copies gitignored files such as `.env` into each new worktree.

## 11. Posture table

Emit exactly this table in MODEL. Every row is `DETECTED: <value>` or `NONE`. Pack defaults apply only to
`NONE` rows.

| Concern | Value |
|---|---|
| Claude Code version | |
| Surface (integrated terminal / VS Code panel / external terminal) | |
| Memory files and total lines | |
| `.claude/rules/` and path-scoped rules | |
| Settings layers present | |
| Effective default permission mode | |
| Hooks by event | |
| Subagents | |
| Skills by scope (from the index) | |
| MCP servers and status | |
| Plugins | |
| Output style | |
| Worktrees | |
| Repo root and dirty state | |

## 12. Interactive checks the user must run

These cannot be run from Bash. Ask the user to run them and paste the output when the answer depends on it,
rather than guessing:

| Question | Command, typed in the session |
|---|---|
| What actually loaded into this session's context | `/context` |
| Which memory files resolved | `/context`, Memory files section |
| Which hooks are registered right now | `/hooks` |
| Which skills are visible and their override state | `/skills` |
| MCP server status and per-server token cost | `/mcp` |
| What everything invocable is called | `/help`, Custom commands tab |
| Whether a frontmatter parse error is killing a skill | restart with `claude --debug` |
