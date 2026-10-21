---
name: ccforge-prime
description: >-
  Writes, prunes, and restructures the persistent instruction layer a repo loads every session: CLAUDE.md and
  CLAUDE.local.md, .claude/rules/ with path scoping, imports, and AGENTS.md interop. Use when asked to set up or
  improve CLAUDE.md, add a project convention, run or redo /init, stop Claude forgetting a rule, or cut context
  cost from memory files. Use this even when the user does not name it. Not for hooks or permissions; use ccforge-
  wire.
metadata:
  pack: ccforge
  kind: specialist
  domain: meta,memory
  version: "1.0.0"
---

# CCForge Prime

Owns what loads into every session before the user types anything. Called by `ccforge-orchestrator`, or
directly when someone wants a convention to stick.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-prime only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-prime (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill already owns the repo's conventions, it defines what the rules say. This skill only
decides where each rule lives and how it is phrased. Invoke that skill first, take its content as fixed, and
never restate its rules in a memory file; two copies that drift is worse than one copy in the wrong place.

## When called by the orchestrator

Take the setup posture and assumption ledger as given. Re-verify only the memory files you are about to
change: read them, count their lines, and read the rule you are asked to add for a duplicate that already
exists somewhere in the hierarchy.

## When invoked directly

Run a one-line frame first: which repo, which file, and what behavior should change. Then read every memory
file in the hierarchy before writing one word. Adding a rule to a file that already contains a contradicting
rule is the most common way this work fails, and the model then picks between them arbitrarily.

## The budget, and why it is the first constraint

Target under 200 lines per memory file. Past roughly that length adherence drops: rules get lost in noise, and
the official failure pattern has a name, the over-specified CLAUDE.md. Every line is a per-request tax paid on
work that has nothing to do with it.

So the first question about any proposed line is not "is this true" but "does every request need it". Three
outcomes:

| The material is | It belongs in | Cost |
|---|---|---|
| needed on every request in this repo | `CLAUDE.md` | every request, forever |
| needed only when touching certain paths | `.claude/rules/<topic>.md` with `paths:` | only when a matching file is read |
| needed only for a specific recurring task | a skill | description only, until invoked |
| derivable from the codebase (directory layout, dependency list, architecture tour) | nowhere | delete it; Claude can `ls` and `grep` |
| a hard guarantee, not a preference | a hook, via `ccforge-wire` | zero context, and it actually fires |

That last row is the one people get wrong. A line in CLAUDE.md is a request, not a guarantee. If the rule must
hold every time, it is a `PreToolUse` hook.

## Load order and what survives

Broadest to most specific, all concatenated rather than overridden:

1. Managed policy file (org-wide, cannot be excluded).
2. `~/.claude/CLAUDE.md` (you, all projects).
3. `./CLAUDE.md` or `./.claude/CLAUDE.md` (project, committed).
4. `./CLAUDE.local.md` (you, this project; gitignore it).

Files closer to the working directory are read last. Nested subdirectory `CLAUDE.md` files load on demand the
first time a file in that subdirectory is read, not at launch.

**The compaction rule that changes where you put a load-bearing instruction:** after a compaction, the
project-root CLAUDE.md, unscoped rules, and auto memory are re-injected from disk. A rule with `paths:`
frontmatter and a nested subdirectory `CLAUDE.md` are not; they reload only the next time a matching file is
read. Never put a rule that must hold for a whole long session only in a path-scoped file.

## Procedure

### 1. Read the whole hierarchy first

```bash
ls -l ./CLAUDE.md ./.claude/CLAUDE.md ./CLAUDE.local.md ~/.claude/CLAUDE.md 2>/dev/null
wc -l ./CLAUDE.md ./.claude/CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null
ls -R .claude/rules ~/.claude/rules 2>/dev/null
grep -rn '^@' ./CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null
```

User-level rules in `~/.claude/rules/` load before project rules; project wins on conflict.

### 2. Diagnose before adding

Two signals, each with a different fix:

- Claude keeps making a mistake despite a rule against it: the file is too long and the rule is getting lost.
  Prune first, then decide whether the rule needs to be a hook.
- Claude asks a question the file already answers: the phrasing is ambiguous. Rewrite that line concretely.

### 3. Write the line so it is checkable

Concrete and verifiable beats general and true. "Run `pnpm test` from the package directory before
committing" is a rule. "Follow best practices" is decoration. Each line should be something a reader could
mark violated or not violated by looking at a diff.

Order inside the file: build and test commands, then non-obvious conventions, then known pitfalls with the
reason. Facts a newcomer would get wrong, not facts the code already states.

### 4. Prune on every visit

Delete, in this order: content derivable from the codebase, rules no longer true, duplicated rules, and vague
lines that cannot be violated. Report the before and after line counts. A shorter file with the same rules is
a real improvement and should be stated as one.

### 5. Path-scope what is path-specific

```markdown
---
paths:
  - "packages/api/**/*.ts"
---
# API rules
- Every endpoint validates its input before touching the database.
```

Rules without `paths:` load unconditionally at the same priority as CLAUDE.md. Rules with `paths:` load when
Claude reads a matching file. Glob syntax matches the memory-file style: `**/*.ts`, `src/**/*`, brace
expansion works. Subdirectories under `.claude/rules/` are discovered recursively, and the directory supports
symlinks for sharing one rule set across repos.

### 6. Handle AGENTS.md and other agents' rule files

Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If the repo has one, import it rather than duplicating:

```markdown
@AGENTS.md

## Claude Code specifics
Use plan mode for changes under `src/billing/`.
```

A symlink also works on Unix and fails on Windows without administrator or Developer Mode; prefer the import.

### 7. Imports, with the limits stated

- Relative paths resolve against the file containing the import, not the working directory.
- Maximum recursive import depth is 4 hops.
- Backticks around a path mention it without importing it. Imports inside fenced code blocks are not expanded.
- An import resolving outside the working directory triggers a one-time approval dialog listing the files.
  Declining once disables it for that project.
- Importing does not make content free. An imported file loads in full, every session.
- Block-level HTML comments in a memory file are stripped before injection, so notes to humans cost nothing.

## Auto memory, which is a separate system

Auto memory is written by Claude, not the user, and lives under `~/.claude/projects/<project>/memory/`. The
index file `MEMORY.md` loads every session capped at the first 200 lines or 25KB, whichever comes first; topic
files load only when read. The project key derives from the git repo root, so every worktree of one repo
shares one memory directory. Toggle it with `/memory`, or `autoMemoryEnabled` in settings.

Do not hand-edit auto memory to install a convention. Conventions belong in CLAUDE.md or a rule file, where
the user can see and version them.

## Quality checklist

- [ ] Every memory file touched is under 200 lines, and the before and after counts are reported.
- [ ] Every line added is concrete enough that a diff could show it violated.
- [ ] No line restates something Claude could derive by reading the repo.
- [ ] No added rule contradicts an existing rule anywhere in the hierarchy, checked by reading all of them.
- [ ] Anything requiring a guarantee was routed to a hook instead, or the trade-off was stated plainly.
- [ ] Nothing load-bearing for a whole session lives only in a `paths:`-scoped rule or a nested CLAUDE.md.
- [ ] The user's own conventions were imported or referenced, never copied and re-worded.

## Reference files

| File | Read when |
|---|---|
| `references/memory-layout.md` | Restructuring a hierarchy, splitting a monolith, or debugging why a file did not load |
