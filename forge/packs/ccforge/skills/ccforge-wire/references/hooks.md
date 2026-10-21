# Hooks reference

## Contents

1. Event list and what can block
2. Matcher syntax
3. Handler types and common fields
4. Exit codes
5. JSON output schema
6. Where hooks are configured
7. Worked patterns
8. Debugging a hook that does not fire

## 1. Event list and what can block

| Event | Fires | Can block |
|---|---|---|
| `SessionStart` | session begins or resumes | no |
| `Setup` | `--init-only`, or `--init` / `--maintenance` in `-p` mode | no |
| `UserPromptSubmit` | prompt submitted, before processing | yes, blocks and erases the prompt |
| `UserPromptExpansion` | a typed command expands into a prompt | yes |
| `PreToolUse` | before a tool call executes | yes, denies the call |
| `PermissionRequest` | a tool call needs a permission decision | no. Exit 2 is not honored; use the JSON `decision` field |
| `PermissionDenied` | auto mode denies a call | no. Use `hookSpecificOutput.retry: true` |
| `PostToolUse` | after a tool call succeeds | no. The tool already ran; stderr is shown to Claude |
| `PostToolUseFailure` | after a tool call fails | no |
| `PostToolBatch` | after a parallel tool-call batch resolves | yes, stops the agentic loop before the next model call |
| `Notification` | Claude Code sends a notification | no |
| `MessageDisplay` | while assistant text is displayed | no |
| `SubagentStart` / `SubagentStop` | subagent spawned / finished | Stop yes, Start no |
| `TaskCreated` / `TaskCompleted` | task created / marked done | yes |
| `Stop` | Claude finishes responding | yes, prevents stopping |
| `StopFailure` | turn ends due to an API error | no |
| `TeammateIdle` | an agent-team teammate is about to idle | yes |
| `InstructionsLoaded` | a CLAUDE.md or rules file loads | no |
| `ConfigChange` | a config file changes mid-session | yes, except the `policy_settings` source |
| `CwdChanged` | working directory changes | no |
| `DirectoryAdded` | directory added via `/add-dir` | no |
| `FileChanged` | a watched file changes on disk | no |
| `WorktreeCreate` / `WorktreeRemove` | worktree lifecycle | Create: any non-zero exit fails creation. Remove: no |
| `PreCompact` / `PostCompact` | before / after compaction | Pre yes, Post no |
| `Elicitation` / `ElicitationResult` | MCP server requests or receives user input | both yes |

## 2. Matcher syntax

| Matcher value | Evaluated as |
|---|---|
| `"*"`, `""`, or omitted | match all |
| only letters, digits, `_`, `-`, spaces, `,`, `\|` | exact string or list, for example `Bash` or `Edit\|Write` |
| anything else | JavaScript regex, unanchored, for example `^Notebook` or `mcp__memory__.*` |

The matcher domain depends on the event: tool name for the tool events, session-start mode
(`startup`, `resume`, `clear`, `compact`, `fork`), notification type, compaction trigger (`manual`, `auto`).

MCP tool names take the form `mcp__<server>__<tool>`. Plugin-scoped servers use
`mcp__plugin_<plugin-name>_<server-name>__<tool>`.

## 3. Handler types and common fields

| `type` | Purpose | Key fields |
|---|---|---|
| `command` | shell command | `command`, `args` (presence means exec form with no shell interpolation; absence means shell form with pipes and globs), `async`, `asyncRewake`, `shell` |
| `http` | POST to an endpoint | `url`, `headers` with `$VAR` interpolation via `allowedEnvVars` |
| `mcp_tool` | call a configured MCP tool | `server`, `tool`, `input` with `${path}` substitution from the hook JSON |
| `prompt` | LLM judgment | `prompt` (use `$ARGUMENTS` for the hook input JSON), `model` |
| `agent` | judgment with Read, Grep, and Glob before deciding | `prompt` |

Optional on every handler: `if` (permission-rule syntax filter, for example `"Bash(git *)"`), `timeout` in
seconds, `statusMessage` (spinner text). Timeout defaults: 600 for command, http, and mcp_tool; 30 for prompt;
60 for agent. Some events lower this: `UserPromptSubmit` defaults to 30s and `MessageDisplay` to 10s;
`SessionEnd` hooks share a 1.5-second budget, extendable to 60s with an explicit `timeout`.

Path placeholders, also exported as environment variables to spawned processes: `${CLAUDE_PROJECT_DIR}`,
`${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`.

## 4. Exit codes

- **0**: success. Stdout beginning with `{` is parsed as JSON, anything else is plain text. Plain-text stdout
  reaches only the debug log, except on `UserPromptSubmit`, `UserPromptExpansion`, and `SessionStart`, where
  it is added as visible context.
- **2**: hard block, taking precedence over a JSON `permissionDecision: "allow"`. The reason comes from the
  JSON decision reason or from stderr. Not every event honors it.
- **any other non-zero**: honored if the JSON validates against the event schema; otherwise a non-blocking
  error. The action proceeds and the transcript shows a hook error notice.
- **timeout**: canceled, no decision, execution continues.

## 5. JSON output schema

Universal fields, all events:

```json
{
  "continue": true,
  "stopReason": "User intervention",
  "systemMessage": "Warning: unusual activity detected",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked by policy"
  }
}
```

`continue: false` overrides any event-specific decision and stops Claude after the hook runs.

## 6. Where hooks are configured

| Location | Scope | Shareable |
|---|---|---|
| `~/.claude/settings.json` | all projects | no, machine-local |
| `.claude/settings.json` | one project | yes, commit it |
| `.claude/settings.local.json` | one project | no, gitignore it |
| managed policy settings | org-wide | yes, admin-controlled |
| plugin `hooks/hooks.json` | while the plugin is enabled | yes, bundled |
| skill or subagent frontmatter `hooks:` | session or subagent scope | yes, in the file |

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [
        { "type": "command", "if": "Bash(rm *)",
          "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh" }
      ]}
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [
        { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/lint-changed.sh" }
      ]}
    ]
  }
}
```

Kill switch: `{"disableAllHooks": true}`. A managed-level `disableAllHooks: true` cannot be overridden by user
or project settings.

## 7. Worked patterns

**Block a command class (PreToolUse, exit 2):**

```bash
#!/usr/bin/env bash
input=$(cat)
command=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
case "$command" in
  rm\ *) echo "Blocked: rm is not allowed here" >&2; exit 2 ;;
esac
exit 0
```

Use `jq -r '.tool_input.command'` instead of `sed` when `jq` is known to be present; the `sed` form avoids the
dependency at the cost of not handling escaped quotes inside the command.

**Format after every edit (PostToolUse):**

```json
{ "hooks": { "PostToolUse": [
  { "matcher": "Write|Edit", "hooks": [
    { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npm run lint:fix" }
  ]}
]}}
```

`PostToolUse` cannot block, so this is a fixer, not a gate. If the requirement is "the edit must not land
unless it lints", that is a `PreToolUse` hook or a CI check, not this.

**Shrink verbose tool output before it reaches context (PreToolUse, rewriting the input):** the documented
pattern is to detect a test or build command and rewrite it to grep its own output for error lines, turning
tens of thousands of tokens into hundreds. Return
`{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","updatedInput":{"command":"<rewritten>"}}}`.
This is the single highest-leverage hook for context cost.

## 8. Debugging a hook that does not fire

| Symptom | Check |
|---|---|
| Nothing happens at all | `chmod +x` the handler; confirm the shebang; run it standalone with sample JSON |
| Registered but silent | `/hooks` lists what is actually configured for this session |
| Input looks wrong | `claude --debug` prints `modified tool input keys: [...]` when a hook rewrites input |
| Blocks nothing despite exit 2 | the event does not honor exit 2; check the table in section 1 |
| Session appears wedged | a Stop hook missing the `stop_hook_active` check, hitting the 8-consecutive-block cap |
| Works locally, not in `-p` | `--bare` skips hook auto-discovery entirely; without `--bare`, a `-p` run does load project hooks |
