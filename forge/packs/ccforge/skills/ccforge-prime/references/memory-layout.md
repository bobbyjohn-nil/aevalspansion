# Memory layout reference

Everything here is mechanics. The judgment about what belongs where is in the skill body.

## Contents

1. File hierarchy and exact paths
2. Resolution mechanics
3. Excluding ancestor files in a monorepo
4. `.claude/rules/` full syntax
5. What survives compaction
6. Auto memory mechanics
7. Migrating from another agent's rule files
8. A worked split
9. Troubleshooting

## 1. File hierarchy and exact paths

| Scope | Location | Shared with |
|---|---|---|
| Managed policy | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux and WSL `/etc/claude-code/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md` | all org users, cannot be excluded |
| User | `~/.claude/CLAUDE.md` | you, all projects |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | the team, via git |
| Local | `./CLAUDE.local.md` | you, this project. Gitignore it |

An organization can also inline managed content through the `claudeMd` key in `managed-settings.json` instead
of shipping a file.

A gitignored `CLAUDE.local.md` exists only in the worktree it was created in. To carry personal instructions
across worktrees, put them in `~/.claude/` and import.

## 2. Resolution mechanics

Claude Code walks up the directory tree from the working directory and loads every `CLAUDE.md` and
`CLAUDE.local.md` it finds. All discovered files are concatenated, not overridden, ordered root first, so the
instructions closest to the working directory are read last. Within one directory, `CLAUDE.local.md` is
appended after `CLAUDE.md`.

Nested subdirectory `CLAUDE.md` files load on demand the first time Claude reads a file in that subdirectory.

Directories added with `--add-dir` do not load their `CLAUDE.md` by default. Set
`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` to opt in.

## 3. Excluding ancestor files in a monorepo

```json
{ "claudeMdExcludes": ["**/monorepo/CLAUDE.md", "/home/user/monorepo/other-team/.claude/rules/**"] }
```

Glob patterns match against absolute paths and merge across settings layers. This is a settings key, so it is
user-owned: produce the snippet, do not write the file.

## 4. `.claude/rules/` full syntax

```
your-project/
  .claude/
    CLAUDE.md
    rules/
      code-style.md            # no paths: - loads unconditionally, same priority as CLAUDE.md
      testing.md
      frontend/api-design.md   # subdirectories are discovered recursively
```

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API development rules
- All API endpoints must include input validation.
```

- Glob forms: `**/*.ts`, `src/**/*`, `*.md` (root only), `src/components/*.tsx`. Brace expansion works
  (`src/**/*.{ts,tsx}`), budget-capped at 1,000 expanded patterns or 4 MiB across one rule's whole `paths` list.
- Trigger point is when Claude reads a matching file, not on every tool use.
- `.claude/rules/` supports symlinks: `ln -s ~/shared-claude-rules .claude/rules/shared`.
- `~/.claude/rules/` loads before project rules; project wins on conflict.

## 5. What survives compaction

| Mechanism | After compaction |
|---|---|
| System prompt and output style | unchanged, not part of message history |
| Project-root CLAUDE.md and unscoped rules | re-injected from disk |
| Auto memory | re-injected from disk |
| Rules with `paths:` frontmatter | lost until a matching file is read again |
| Nested subdirectory CLAUDE.md | lost until a file in that subdirectory is read again |
| Invoked skill bodies | re-injected, capped at 5,000 tokens per skill and 25,000 total, oldest dropped first |
| Hooks | not applicable; they run as code, not context |

If an instruction disappeared after a compact, it was either conversation-only and never in a file, or it was
in a path-scoped or nested file that has not retriggered.

## 6. Auto memory mechanics

- Storage: `~/.claude/projects/<project>/memory/`, one `MEMORY.md` index plus optional topic files.
- `<project>` derives from the git repo root, so all worktrees and subdirectories of one repo share it.
- `MEMORY.md` loads the first 200 lines or 25KB, whichever comes first. Content past that is not loaded.
  Going over the limit is a hard error on the next load.
- Topic files load on demand through a normal Read, never at startup.
- Controls: `/memory`, `autoMemoryEnabled` in settings, `autoMemoryDirectory` to relocate,
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.
- A subagent gets its own auto-memory scope only if its frontmatter sets `memory: user|project|local`. The
  main session's auto memory is not inherited by a non-fork subagent.

## 7. Migrating from another agent's rule files

`/init` reads Cursor rules (`.cursor/rules/`, `.cursorrules`) and
`.github/copilot-instructions.md` automatically. With `CLAUDE_CODE_NEW_INIT=1` it also reads `AGENTS.md`,
`.devin/rules/`, `.windsurf/rules/` and `.windsurfrules`, and `.clinerules`.

`/import` (requires v2.1.213 or later) does a one-time copy-in of another agent's instructions, MCP servers,
commands, subagents, and skills. It is a copy, not a link: after running it, the source file and the copy drift
independently. Prefer `@AGENTS.md` when the other file stays authoritative.

## 8. A worked split

Before, one 340-line `CLAUDE.md` covering the whole monorepo. After:

```
CLAUDE.md                       # 40 lines: install, build, test, the three pitfalls
.claude/rules/api.md            # paths: packages/api/**   - validation, error shape, auth check placement
.claude/rules/web.md            # paths: packages/web/**   - component conventions
.claude/skills/release/SKILL.md # the 60-line release procedure that used to live in CLAUDE.md
```

What moved and why: the release procedure was multi-step and needed on maybe one session in twenty, so it
became a skill. The per-package conventions only matter when touching those packages, so they became scoped
rules. The three pitfalls stayed because they are true everywhere and cheap. The architecture tour was deleted
because Claude can read the directory tree.

Check the result: nothing load-bearing for a whole session ended up only in a scoped rule.

## 9. Troubleshooting

| Symptom | Check |
|---|---|
| A rule seems ignored | `/context`, Memory files section, confirms what actually resolved |
| Two rules contradict | read the whole hierarchy; when rules conflict the model may pick one arbitrarily |
| A rule vanished mid-session | it was path-scoped or nested and has not retriggered since the last compact |
| An import did not expand | check for backticks around the path, a fenced code block, or depth past 4 hops |
| An external import was declined once | that decision persists for the project; re-approve through the dialog |
| Nothing loads at all | wrong filename case, or the file sits outside the walked tree from the launch directory |
