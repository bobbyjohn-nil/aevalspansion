# Validation and packaging reference

## Contents

1. Directory anatomy
2. Frontmatter field table
3. Limits, and where each is enforced
4. Plugin layout and manifest
5. Install paths compared
6. Argument substitution and dynamic injection
7. Precedence when names collide
8. Update and uninstall
9. Pre-ship checklist

## 1. Directory anatomy

```
skill-name/
  SKILL.md          # required: frontmatter plus markdown instructions
  references/       # docs read on demand; zero token cost until read
  scripts/          # executables; only their output enters context, never their source
  assets/           # templates, icons, fonts used in output; never loaded into context
```

Progressive disclosure has three levels: `name` plus `description` always in context, the body on invocation,
bundled resources only when the body points at them. Move anything stack-specific, variant-specific, or over
roughly 40 lines of table into `references/`, and have the body point at exactly one file.

## 2. Frontmatter field table

Portable across every surface, including uploads: `name`, `description`, `license`, `compatibility`,
`metadata`, `allowed-tools`.

Claude Code only:

| Field | Effect |
|---|---|
| `when_to_use` | extra trigger phrases appended to `description`, sharing the 1,536-character listing cap |
| `argument-hint` | autocomplete hint such as `[issue-number]` |
| `arguments` | named positional arguments for `$name` substitution, mapped by position |
| `disable-model-invocation` | `true` means only `/name` works; the description leaves context entirely |
| `user-invocable` | `false` hides it from the `/` menu; Claude can still invoke it |
| `disallowed-tools` | removes tools from the pool while the skill is active; clears next message |
| `model` | overrides the model for the turn |
| `effort` | overrides the effort level while active |
| `context: fork` | runs the body as a forked subagent's prompt |
| `agent` | which subagent type to use with `context: fork` |
| `background` | with `context: fork`, `false` blocks the turn on the result |
| `hooks` | hooks registered on invocation, live for the rest of the session |
| `paths` | globs gating automatic activation to matching files |
| `shell` | `bash` (default) or `powershell` for `!` injection |

Booleans accept `yes`, `no`, `on`, `off`, `1`, `0`, `true`, `false`, any case.

## 3. Limits, and where each is enforced

| Field | Limit | Enforced by | Exceeding it |
|---|---|---|---|
| `name` | 64 characters, `^[a-z0-9-]+$`, no leading, trailing, or double hyphen | Skills API, claude.ai upload, packaging | upload rejected with a schema error |
| `name` | none | Claude Code personal and project skills | no enforcement; it is a display label |
| `description` | 1,024 characters, no angle brackets | Skills API, upload | rejected |
| `description` plus `when_to_use` | 1,536 characters combined | the Claude Code skill listing | silently truncated in the listing |
| `compatibility` | 500 characters | portable spec | rejected on upload |
| body | keep under 500 lines | official guidance | adherence drops; nothing errors |
| package | exactly one `SKILL.md` at `<folder>/SKILL.md` | Skills API, upload | rejected. Nested `SKILL.md` files mean something only to Claude Code's own loader |
| package | 30 MB uncompressed | Skills API | rejected |

Reserved: `name` values containing "anthropic" or "claude", enforced server-side at upload. The directory name
`synced` is reserved at every skill location.

## 4. Plugin layout and manifest

```
my-plugin/
  .claude-plugin/
    plugin.json        # ONLY plugin.json goes here
  skills/<name>/SKILL.md
  commands/            # legacy flat-file skills
  agents/
  hooks/hooks.json
  .mcp.json
  bin/                 # added to the Bash tool's PATH while the plugin is enabled
```

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "description": "One sentence.",
  "version": "1.0.0",
  "license": "MIT",
  "keywords": ["one", "two"]
}
```

The most common failure by a wide margin: putting `skills/`, `agents/`, `commands/`, or `hooks/` inside
`.claude-plugin/`. The plugin loads and its components are silently missing.

Every path in a manifest must be relative and start with `./`. Avoid `userConfig`; it forces a configuration
step at install. Installed plugins are copied into `~/.claude/plugins/cache` and cannot reference files
outside their own tree, so a `../shared` path that worked in development breaks after install.

## 5. Install paths compared

| Option | User steps | Persistence | Notes |
|---|---|---|---|
| Skills-directory plugin: unzip to `~/.claude/skills/<pack>/` with its own `.claude-plugin/plugin.json` | unzip, restart `claude` | permanent, every project, zero commands | best fit for a zip deliverable. Personal scope has no trust dialog |
| Local marketplace: `/plugin marketplace add ./dir` then `/plugin install <pack>@<market>` | two commands per pack | permanent, managed through `/plugin` | adds UI manageability at the cost of explicit steps |
| `--plugin-dir ./pack` or `--plugin-dir ./pack.zip` | a flag every launch | session-only | the development loop, not distribution. A `--plugin-dir` pointing at a same-named installed plugin takes precedence for that session |

`/reload-plugins` picks up edits without a restart, reloading skills, agents, hooks, and plugin MCP and LSP
servers.

For a zip that unzips straight into a skills directory, the archive's top-level entries must already be the
correctly named directories. No wrapper folder the user has to look inside and relocate by hand.

## 6. Argument substitution and dynamic injection

| Placeholder | Meaning |
|---|---|
| `$ARGUMENTS` | the full argument string as typed |
| `$ARGUMENTS[N]` or `$N` | zero-indexed positional; an unmatched index stays literal |
| `$name` | named argument per the `arguments:` list, mapped by position |
| `${CLAUDE_SKILL_DIR}` | the directory containing this SKILL.md; use it for bundled scripts |
| `${CLAUDE_PROJECT_DIR}` | project root |
| `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}` | session ID, current effort level |
| `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` | plugin install directory, persistent data directory |

`${CLAUDE_SKILL_DIR}` substitutes identically in the body and in `allowed-tools` Bash patterns, which is what
lets a skill pre-approve exactly the script it tells Claude to run.

Dynamic injection runs a command before the skill content reaches Claude:

```markdown
## Current changes
!`git diff HEAD`
```

A failed command aborts the entire skill invocation and Claude sees none of the content that turn. Exit code 1
from designated search and compare commands such as `grep` and `diff` is treated as a normal empty result;
append `|| true` to anything else that can exit non-zero. Injected commands never prompt for permission, so a
matching ask or deny rule aborts the invocation outright. Prefer a plain Bash call in the body.

## 7. Precedence when names collide

1. Across levels: enterprise overrides personal, personal overrides project.
2. A same-named skill at any level overrides a bundled skill, but not the bundled skill's aliases.
3. Plugin skills are always namespaced `/plugin-name:skill-name` and cannot collide.
4. If a command file and a skill share a name, the skill wins.
5. Any local skill or command overrides a same-named skill synced from claude.ai.

Nested skills are the exception worth knowing: a nested `.claude/skills/deploy/` inside a monorepo package
coexists with a root `deploy` rather than replacing it. It gets a directory-qualified name such as
`/apps/web:deploy`, the unqualified `/deploy` still runs the root skill, and Claude Code appends a note listing
the qualified variants with an instruction to also invoke whichever matches the files being worked on.

Note this precedence runs the opposite direction from "project-local wins". Prefixed names mean literal
collisions essentially never happen, so that policy is implemented by routing, not by the platform.

## 8. Update and uninstall

| Action | Command |
|---|---|
| List installed | `claude plugin list [--json] [--available]` |
| Inspect one | `claude plugin details <name>` |
| Disable, keep installed | `claude plugin disable <plugin>` |
| Uninstall | `claude plugin uninstall <plugin> [--keep-data] [--prune] [-y]` |
| Update | `claude plugin update <plugin>` |
| Apply without restart | `/reload-plugins` |

Update by directory copy means deleting the old directory before unzipping the new one. Overwriting in place
leaves orphaned files from skills the new version removed, which a census later flags as spurious dead
candidates.

Removing a marketplace uninstalls every plugin installed from it. Irrelevant for a bare directory copy, and a
real hazard once a pack is published through one.

## 9. Pre-ship checklist

- [ ] `claude plugin validate ./<plugin> --strict` exits 0.
- [ ] Every `SKILL.md` starts with `---` on line 1 and the block closes.
- [ ] Every directory name equals its `name:`.
- [ ] No name contains "claude" or "anthropic", and none is `help`, `feedback`, or `synced`.
- [ ] No frontmatter key outside what the target surface accepts.
- [ ] Every script is executable and has a `#!/usr/bin/env bash` shebang.
- [ ] Every reference file is one hop from a `SKILL.md`.
- [ ] `claude --debug` shows no parse error for any skill in the pack.
