# Permissions and settings reference

## Contents

1. Settings precedence
2. Rule syntax
3. Compound commands and wrapper stripping
4. Path rules
5. Permission modes
6. Protected paths
7. Auto mode
8. Circuit breaker and sandboxing
9. Settings keys worth knowing
10. Cutting repeated prompts

## 1. Settings precedence

Highest wins:

1. Managed policy (server-managed, plist, registry, or `managed-settings.json`).
2. Command-line arguments, session-only.
3. `.claude/settings.local.json`, gitignored.
4. `.claude/settings.json`, committed.
5. `~/.claude/settings.json`.

Deny is absolute. If a tool is denied at any level, no other level can allow it: a managed deny survives
`--allowedTools`, and a user-level deny blocks a project-level allow.

Live reload: `permissions`, `hooks`, and `apiKeyHelper` reload mid-session and fire the `ConfigChange` hook.
`model` and `outputStyle` are read once at session start; use `/model` mid-session, and `/clear` or a new
session for an output style.

## 2. Rule syntax

`Tool` or `Tool(specifier)`.

| Pattern | Example | Matches |
|---|---|---|
| bare tool name | `Bash`, `Read`, `WebFetch` | every use of that tool |
| exact specifier | `Bash(npm run build)` | that exact command |
| wildcard | `Bash(npm run test *)`, `Bash(* --version)`, `Bash(git * main)` | one `*` can span multiple arguments including spaces |
| `:*` suffix | `Bash(ls:*)` | same as `Bash(ls *)` |
| parameter match, deny and ask only | `Agent(model:opus)`, `Bash(run_in_background:true)` | a top-level scalar input field |
| tool-name glob, deny and ask only | `mcp__*` | every MCP tool from any server |
| tool-name glob for allow, MCP only | `mcp__puppeteer__*` | the server segment must be glob-free |

Trailing space matters: `Bash(git diff *)` is not `Bash(git diff*)`; the second also matches `git diff-index`.

Skills can be addressed too: `Skill` denies all skills, `Skill(commit)` denies one exactly,
`Skill(review-pr *)` denies by argument prefix. This is a client-level control independent of what the model
would choose.

## 3. Compound commands and wrapper stripping

Claude Code parses shell operators (`&&`, `||`, `;`, `|`, `|&`, `&`, newlines) and checks each subcommand
independently, so `Bash(safe-cmd *)` does not grant `safe-cmd && other-cmd`. Approving a compound command with
"do not ask again" saves one rule per subcommand, up to 5.

Stripped before matching, not configurable: `timeout`, `time`, `nice`, `nohup`, `stdbuf`, the `command` and
`builtin` shell builtins, zsh `noglob`, and bare `xargs`. So `Bash(npm test *)` also matches
`timeout 30 npm test`. Known-safe environment assignments are stripped for allow rules only: `NODE_ENV=test
npm test` matches `Bash(npm test *)`, while `Bash(rm *)` still blocks `FOO=bar rm -rf tmp/`.

Cannot be auto-approved by a prefix rule: `watch`, `setsid`, `flock`, `find -exec`, `find -delete`. Commands
over 10,000 characters always prompt.

Built-in read-only Bash commands never prompt in any mode and are not configurable: `ls`, `cat`, `echo`,
`pwd`, `head`, `tail`, `grep`, `find`, `wc`, `which`, `diff`, `stat`, `du`, `cd`, and read-only `git` forms.

## 4. Path rules

Read and Edit path rules use gitignore-style patterns.

| Pattern | Meaning | Example |
|---|---|---|
| `//path` | absolute, from the filesystem root | `Read(//Users/alice/secrets/**)` |
| `~/path` | home-relative | `Read(~/Documents/*.pdf)` |
| `/path` | relative to the settings file that defines it | `Edit(/src/**/*.ts)` |
| `path` or `./path` | relative to the working directory | `Read(*.env)` |

A single leading slash is not the filesystem root. `/Users/alice/file` anchors at the settings source; use
`//Users/alice/file`.

A `Read` deny rule also blocks Edit and Write on the same path, including creating a new file there.
`NotebookEdit` is not covered; add a separate `Edit` deny for paths no tool may touch.

`WebFetch(domain:example.com)` matches that host. `WebFetch(domain:*.example.com)` matches any subdomain at
any depth but not the bare domain.

## 5. Permission modes

| Mode | Runs without asking | Notes |
|---|---|---|
| `default`, labeled Manual | read-only operations in the working directory | asks before edits and most Bash |
| `acceptEdits` | file edits plus `mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, `sed` in scope | everything else still asks |
| `plan` | reads and read-only shell, no source edits until the plan is approved | classifier-approved commands can run during planning when auto mode is available |
| `auto` | broad; a classifier model reviews instead of the user | see section 7 |
| `dontAsk` | only allow-matched, built-in read-only, and `PreToolUse`-approved calls | everything else is auto-denied, never waits for input. For CI |
| `bypassPermissions` | everything, including protected-path writes | isolated sandboxes only; a few circuit breakers still fire |

Cycle with `Shift+Tab` in the CLI: default, acceptEdits, plan, then bypassPermissions and auto when available.
In VS Code, click the mode indicator.

## 6. Protected paths

Never auto-approved except in `bypassPermissions`, and an explicit allow rule does not override this because
the safety check runs before allow-rule evaluation.

Directories: `.git`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, `.mvn`,
and `.claude` except `.claude/worktrees`.

Files: `.gitconfig`, `.gitmodules`, every shell rc file, `.npmrc`, `.yarnrc`, `.pnpmfile.cjs`, `bunfig.toml`,
`.bazelrc`, `.pre-commit-config.yaml`, `lefthook.yml`, `gradle-wrapper.properties`, `.mcp.json`, `.claude.json`.

## 7. Auto mode

A separate classifier model reviews each action before it runs, blocking scope escalation, unrecognized
infrastructure, and hostile-content-driven actions.

Blocked by default, partial list: `curl | bash`; sending sensitive data externally; production deploys and
migrations; mass cloud-storage deletion; IAM or repository permission grants; force push; `git reset --hard`,
`checkout -- .`, `restore .`, `clean -fd`, `stash drop`, `stash clear`; `terraform`, `pulumi`, `cdk`, and
`terragrunt destroy`; merging an unapproved PR or approving your own; toggling a production feature flag;
writing to a secret manager; disarming a safety flag such as `--insecure`.

Allowed by default: local file operations in the working directory; installing lockfile-declared dependencies;
reading `.env` and sending credentials to their matching API; read-only HTTP; pushing to any branch of the
repository being worked in unless the branch name marks it as a deploy target.

Fallback thresholds, not configurable: 3 blocks in a row, or 20 in a session, pauses auto mode and returns to
prompting. In non-interactive `-p` runs with no prompt fallback, the action simply does not run and Claude
keeps working.

A boundary stated in conversation is treated as a block signal but is re-read from the transcript on each
check, so it can be lost to compaction. For a hard guarantee, use a deny rule.

## 8. Circuit breaker and sandboxing

An `rm` or `rmdir` targeting the filesystem root, a top-level directory, the home directory, a Windows drive
root, or the working directory or its parents can never be silently approved, even in `bypassPermissions`,
where it still asks. `dontAsk` denies it outright. The check sees through command and process substitution.

Sandboxing is OS-level and Bash-only, on macOS, Linux, and WSL2; native Windows is not supported. It restricts
the filesystem and network for the Bash tool and its children only, not Read, Edit, WebFetch, or MCP. The
filesystem boundary merges `sandbox.filesystem` settings with Read and Edit deny rules; the network boundary
merges `sandbox.network` domains with WebFetch allow rules.

## 9. Settings keys worth knowing

| Key | Purpose |
|---|---|
| `permissions.allow` / `deny` / `ask` | rule arrays |
| `permissions.defaultMode` | starting permission mode |
| `disableBundledSkills` | disables every bundled skill except `/doctor` |
| `disableAllHooks` | kill switch for hooks and the custom status line |
| `autoCompactWindow` | auto-compact trigger point, 100,000 to 1,000,000 tokens |
| `autoMemoryEnabled` / `autoMemoryDirectory` | auto memory on or off, and where it lives |
| `outputStyle` | named built-in or custom output style |
| `cleanupPeriodDays` | session-file retention, default 30, minimum 1 |
| `claudeMdExcludes` | glob-exclude ancestor memory files |
| `skillOverrides` | per-skill visibility, written by the `/skills` menu |
| `agent` | run the main thread as a named subagent |

Add `"$schema": "https://json.schemastore.org/claude-code-settings.json"` to a settings file for autocomplete
and validation in VS Code.

## 10. Cutting repeated prompts

In order of preference:

1. Add a narrow allow rule for the exact command shape being approved over and over.
2. Switch the default mode for that repo, not globally.
3. Use a `PreToolUse` hook that approves a specific pattern, which is auditable in a way a broad allow is not.
4. Only then consider a broader mode. Every step up trades a visible decision for an invisible one.
