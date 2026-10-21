# Failure table

Symptom, cause, the check that proves it, the fix. Grouped by subsystem. Everything here produces an
observable; if a row's check prints nothing, that is itself the finding.

## Contents

1. Skills and commands
2. Plugins
3. Hooks
4. Subagents
5. MCP servers
6. Memory and instructions
7. Permissions
8. Worktrees and headless
9. Checks that only exist inside a session

## 1. Skills and commands

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| Skill never auto-triggers, `/name` works | malformed frontmatter, empty metadata | `claude --debug 2>&1 \| grep -i <name>` | fix the YAML; quote values containing a colon |
| Skill never auto-triggers, frontmatter parses | description too vague, or the test prompt was one-step | read the description; retest with a multi-step prompt | rewrite per `ccforge-authoring`; Claude bypasses skills for tasks it can handle directly |
| Skill missing from `/` menu | `user-invocable: false`, or `skillOverrides` set to `off` | `/skills`; grep `skillOverrides` in settings files | change the override; plugin skills are not affected by `skillOverrides` |
| Skill invisible to Claude entirely | `disable-model-invocation: true` removes the description from context | read the frontmatter | remove the field if auto-invocation is wanted |
| Wrong copy of a same-named skill runs | precedence is enterprise, then personal, then project | list all paths with that name | rename, or accept the platform order and route by policy |
| A nested monorepo skill did not appear | nested skills load the first time a file in that subdirectory is read | read a file under that package, then check `/skills` | expected behavior, not a bug |
| A new skill directory is invisible | a brand-new top-level skills directory needs a restart to be watched | restart `claude` | restart; editing existing files is picked up live |
| The whole skill invocation produced nothing | a `!`-injected command exited non-zero and aborted it | run that command manually and check `$?` | append `\|\| true`, or move it to a plain Bash call in the body |
| A command file and a skill share a name | the skill wins | list both paths | delete the stale one |

## 2. Plugins

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| Plugin loads, components missing | `skills/` or `hooks/` nested inside `.claude-plugin/` | `ls <plugin>/.claude-plugin/ <plugin>/` | move them to the plugin root; only `plugin.json` belongs in `.claude-plugin/` |
| Plugin will not load at all | malformed `plugin.json` | `claude plugin validate ./<plugin> --strict; echo $?` | fix the reported JSON or schema error |
| Manifest path fields do not resolve | absolute paths, or paths not starting with `./` | read the manifest | make every path relative and `./`-prefixed |
| Plugin skills stopped appearing after an update | stale plugin cache | `ls ~/.claude/plugins/cache` | `rm -rf ~/.claude/plugins/cache`, restart, reinstall |
| A file outside the plugin tree is not found | installed plugins are copied to the cache and cannot reference `../` | check for parent-relative paths | vendor the file into the plugin |

## 3. Hooks

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| Hook never fires | missing execute bit or a bad shebang | `ls -l <handler>; head -1 <handler>` | `chmod +x`; use `#!/usr/bin/env bash` |
| Hook fires, changes nothing | wrong event; `PostToolUse` cannot block | read the event table in `hooks.md` | move the logic to `PreToolUse` |
| Exit 2 does not block | that event does not honor exit 2 | check the event table | use the JSON decision field for `PermissionRequest` |
| Session appears wedged | a Stop hook missing the `stop_hook_active` check | read the handler | exit 0 when `stop_hook_active` is true |
| Hook output never reaches Claude | plain-text stdout reaches only the debug log on most events | `claude --debug` | use `UserPromptSubmit`, `UserPromptExpansion`, or `SessionStart`, or return JSON |
| Registered hook not listed | it is defined in a settings layer you did not read, or in skill or agent frontmatter | `/hooks` inside the session | look in plugin `hooks/hooks.json` and skill frontmatter too |
| Hook works locally, not in CI | `--bare` skips hook discovery | run without `--bare` to compare | pass config explicitly with `--settings` |

## 4. Subagents

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| Agent acts as if it knows nothing | non-fork subagents inherit no conversation history | read the delegation message | put every needed fact in the delegation message |
| Agent ignores the output style | output style applies to the main conversation only | expected | a fork is the only exception |
| Agent cannot use a tool | `tools` is an allowlist and omits it | read the agent frontmatter | add the tool, or drop `tools` to inherit |
| Agent name rejected | a colon in `name` is reserved for plugin namespacing | read the frontmatter | rename |
| Agent edits are not undone by `/rewind` | a backgrounded fork's edits fall outside session checkpoints | `git status` | use git, not checkpoints, for that work |

## 5. MCP servers

| Status from `claude mcp list` | Meaning | Next step |
|---|---|---|
| `Connected` | ready | nothing |
| `Connected, tools fetch failed` | connected, tool listing failed | `claude mcp get <name>` |
| `Needs authentication` | browser sign-in or a token header required | `/mcp`, select the server, Authenticate |
| `Failed to connect` / `Connection error` | did not respond, or threw | run the launch command by hand |
| `Pending approval` | an unapproved project-scoped server | run `claude` and approve, or `claude mcp reset-project-choices` |

Add commands must run in the shell, outside a session. Scope is fixed at add time; to change it, remove with
the old scope and re-add with the new one.

## 6. Memory and instructions

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| A rule is ignored | the file is too long and the rule is lost in noise | `wc -l` on every memory file | prune below 200 lines, or make it a hook |
| Claude asks something the file answers | the phrasing is ambiguous | read the line | rewrite it as something a diff could show violated |
| Two rules conflict | contradicting nested or rule files; the model may pick one arbitrarily | read the whole hierarchy | delete one |
| A rule vanished mid-session | path-scoped rules and nested memory files are not re-injected after compaction | ask whether a compact happened | move anything load-bearing to the project-root file |
| A file did not load at all | wrong location, or excluded by `claudeMdExcludes` | `/context`, Memory files section | move the file, or fix the exclude glob |
| An import did not expand | backticks, a code fence, or past the 4-hop depth limit | read the importing file | fix the path form |

## 7. Permissions

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| A rule seems to be ignored | a deny at any level beats every allow | read all settings layers | remove the deny, or narrow it |
| An allow rule does not match | trailing space, or a compound command checked per subcommand | compare the rule to the exact command | write one rule per subcommand |
| An explicit allow still prompts | the path is on the protected list, checked before allow rules | check the protected-path list | expected; approve interactively |
| A relative path rule matches nothing | a single leading slash anchors at the settings source, not the filesystem root | read the rule | use `//` for a filesystem-absolute path |
| Auto mode stopped approving | 3 consecutive or 20 total classifier blocks pause it | expected | approve once to resume |
| A spoken boundary was ignored later | conversational boundaries are re-read from the transcript and can be lost to compaction | expected | use a deny rule for a guarantee |

## 8. Worktrees and headless

| Symptom | Cause | Fix |
|---|---|---|
| Edits to the main checkout are refused inside a worktree | four isolation checks are hard blocks and cannot be disabled | do the work in the worktree, or exit it |
| A command with a heredoc is refused in a worktree | unverifiable command shape | split it into plain commands |
| A `-p` run picked up project hooks in an untrusted repo | `-p` shows no trust dialog | use `--bare`, and set `ANTHROPIC_API_KEY` explicitly |
| A background dev server died right after the run | background Bash tasks are terminated a few seconds after the final result | keep it in the foreground, or run it outside Claude |
| Worktrees pile up after `-p` runs | `-p` has no exit prompt | `git worktree remove --force`, and gitignore `.claude/worktrees/` |

## 9. Checks that only exist inside a session

Name these for the user; they cannot be run from Bash.

| Question | Command |
|---|---|
| What loaded into context | `/context` |
| Which hooks are registered | `/hooks` |
| Which skills are visible, and their override state | `/skills` |
| MCP status and per-server token cost | `/mcp` |
| Everything invocable, grouped by source | `/help`, Custom commands tab |
| A general setup health pass with proposed trims | `/doctor` |
