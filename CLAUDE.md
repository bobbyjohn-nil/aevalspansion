# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The repo root holds a bare-bones browser RTS game (`index.html`, see `README.md`). Everything below
describes `forge/`, which is vendored into this repo.

FORGE: three Claude Code skill packs (`webforge`, `appforge`, `ccforge`), 12 skills each, 36 total. Plain
markdown plus POSIX shell. No dependencies, no build step. `forge/ARCHITECTURE.md` is the normative spec;
where it and anything else disagree, it wins.

## Commands

```sh
python3 forge/tools/validate.py          # structural validation, exit 0 clean / 1 on any failure
./forge/install.sh --project --dry-run   # show what an install would copy, write nothing
./forge/install.sh --project             # copy skills into ./.claude/skills/
./forge/install.sh --user --packs ccforge
```

There are no unit tests. The validator is the only gate; run it before committing any change under
`forge/packs/`.

## Layout (inside `forge/`)

- `packs/<pack>/.claude-plugin/plugin.json` must be the only file in that directory.
- `packs/<pack>/skills/<skill>/SKILL.md` plus optional `references/*.md` (one hop deep) and `scripts/*.sh`.
- `.claude-plugin/marketplace.json` lists exactly the three packs with `./packs/<pack>` sources.

## Rules the validator enforces

- Every pack has exactly 12 skills. Each is `<pack>-<role>`; the seven fixed roles are orchestrator, taste,
  loop, noslop, perf, explain, skillmap, plus five domain specialists.
- Frontmatter `name:` is byte-identical to the directory name. Only `name`, `description`, `metadata`,
  `allowed-tools` keys are allowed.
- Description is 250 to 450 characters, no angle brackets.
- Body line caps: orchestrator 500, loop 350, others 250 or 300 (see `CAPS` in the validator). Every
  SKILL.md has an `## Activation receipt` section.
- Skill names never contain `claude` or `anthropic`.
- No em or en dashes anywhere. No non-ASCII in `packs/`, the top-level docs, or `install.sh`. No placeholder
  words (TODO, TBD, FIXME, etc.). No empty files. Every `.sh` is executable.
- `plugin.json` never has `userConfig`.

## Design constraints from ARCHITECTURE.md

- Every skill ends its reply with one canary line: `[skills: a > b]`. Nothing else goes on that line.
- Orchestrators auto-trigger; never write "manual activation only" or set `disable-model-invocation`.
- Loop skills run inline, never `context: fork`. Ledgers live at `.claude/<pack>-loop/`.
- No numeric quality scores in any skill; use boolean checklists.
- Packs never write to `.claude/settings.json`, `settings.local.json`, or `skillOverrides`.
- Compaction keeps only the first ~5,000 tokens of a skill, so load-bearing rules go near the top of SKILL.md.
