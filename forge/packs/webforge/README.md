# WebForge
Twelve namespaced Claude Code skills for building websites and web apps: one orchestrator that frames, routes,
builds, verifies, and refines, plus the specialists it calls.

**Install:** `unzip webforge.zip -d ~/.claude/skills/`, then restart `claude`. No build step, no dependencies.

| Skill | Does |
|---|---|
| `webforge-orchestrator` | Frames, detects the repo stack, routes, runs gates, refines against logged defects |
| `webforge-scaffold` | Project or new surface, matching the detected stack over the pack default |
| `webforge-ui` | Components, forms, all six interaction states, accessibility by construction |
| `webforge-server` | Server/client split, caching, actions, API, ORM, auth, session security |
| `webforge-taste` | Design constraints before generating, then the AI-slop tell audit |
| `webforge-verify` | The gates: typecheck, lint, unit, Playwright, axe, bundle, Lighthouse |
| `webforge-ship` | Build config, secrets, per-route metadata, observability, post-deploy proof |
| `webforge-perf` | Refuses speed work without a before-number, then fixes the named phase |
| `webforge-noslop` | Strips AI tells from copy, code, commits, and PR text |
| `webforge-explain` | Decisions, systems, and diffs at the right altitude, with calibrated confidence |
| `webforge-loop` | Build-verify-fix cycles against an on-disk ledger with real stop conditions |
| `webforge-skillmap` | Inventories every skill, writes the shared index, routes work to its owner |

## How to tell it is working
Every reply a WebForge skill shaped ends with one line, for example
`[skills: webforge-orchestrator > webforge-ui > webforge-noslop]`. Your own skills appear there too, by their
own names, in the order they fired. If the line stops appearing, the skills are no longer shaping the reply:
`/clear`, then re-run the request.

Project-local skills beat pack defaults wherever they overlap. `webforge-skillmap` writes the index at
`.claude/forge/skills-index.json`, flags overlaps, and the orchestrator defers to or composes with your skill.

## Update, uninstall, troubleshooting
- Update: delete `~/.claude/skills/webforge/`, then unzip the new version. Overwriting leaves orphans.
- Uninstall: `claude plugin uninstall webforge`, delete the `@~/.claude/forge/FORGE.md` line from
  `~/.claude/CLAUDE.md`, delete `~/.claude/forge/` if no other FORGE pack remains.
- Skills not appearing: `rm -rf ~/.claude/plugins/cache` and restart `claude`.
- A skill never auto-triggers: `claude --debug`. Malformed YAML frontmatter loads the skill with empty
  metadata and kills auto-triggering silently; that is the only place the parse error surfaces.
