# FORGE

Three installable Claude Code skill packs. 36 skills, all namespaced by pack, all emitting a one-line
proof-of-activation receipt so you can see which skills actually shaped a reply.

- **webforge** - websites and web apps
- **appforge** - mobile, desktop, and full-stack product surfaces
- **ccforge** - Claude Code itself, in the terminal and VS Code

Each pack has one orchestrator that frames the request, detects your repo's stack, routes work to the right
skill (yours first), runs real gates, and refines against a logged defect list. The specialists do the domain
work. A loop skill drives continuous build-verify-fix cycles against an on-disk ledger. A skillmap skill
inventories every skill on the machine so your own skills win where they overlap.

No dependencies. No build step. Plain markdown and POSIX shell.

## Rosters

**webforge**

| Skill | Does |
|---|---|
| `webforge-orchestrator` | Frames, detects the repo stack, routes, runs gates, refines against logged defects |
| `webforge-scaffold` | New project or new surface, matching the detected stack over the pack default |
| `webforge-ui` | Components, forms, all six interaction states, accessibility by construction |
| `webforge-server` | Server/client split, caching, actions, API, ORM, auth, session security |
| `webforge-taste` | Design constraints written before generating, then the AI-slop tell audit |
| `webforge-verify` | The gates: typecheck, lint, unit, Playwright, axe, bundle size |
| `webforge-ship` | Build config, secrets, per-route metadata, observability, post-deploy proof |
| `webforge-perf` | Refuses speed work without a before-number, then fixes the named phase |
| `webforge-noslop` | Strips AI tells from copy, code, commits, and PR text |
| `webforge-explain` | Decisions, systems, and diffs at the right altitude, with calibrated confidence |
| `webforge-loop` | Build-verify-fix cycles against an on-disk ledger with real stop conditions |
| `webforge-skillmap` | Inventories every skill, writes the shared index, routes work to its owner |

**appforge**

| Skill | Does |
|---|---|
| `appforge-orchestrator` | Frames, picks the platform, detects the stack, routes, runs gates, refines |
| `appforge-mobile` | Expo and React Native: routing, native modules, permissions, push, secure storage |
| `appforge-desktop` | Tauri or Electron on stated criteria, auto-update, signing, notarization |
| `appforge-backend` | Schema, authz, tenancy, jobs, webhooks, rate limits, uploads, offline sync |
| `appforge-release` | Build profiles, store submission, the OTA boundary, staged rollout, review checks |
| `appforge-verify` | Gate stack with real exit codes, test layers, retry policy, crash and analytics |
| `appforge-taste` | Platform feel, state design, touch targets, motion, and the AI-slop audit |
| `appforge-perf` | Refuses perf work without a before-number, then fixes the named phase |
| `appforge-noslop` | Strips AI tells from UI copy, prose, code, and commits |
| `appforge-explain` | Decisions, systems, and diffs at the right altitude, with calibrated confidence |
| `appforge-loop` | Build-verify-fix cycles against an on-disk ledger with stop conditions |
| `appforge-skillmap` | Inventories every skill, writes the shared index, routes work to its owner |

**ccforge**

| Skill | Does |
|---|---|
| `ccforge-orchestrator` | Frames, detects your existing setup, routes, runs setup gates, refines |
| `ccforge-prime` | CLAUDE.md, `.claude/rules/`, imports, AGENTS.md interop, pruning to budget |
| `ccforge-wire` | Hooks, subagents, MCP servers, permissions, settings, and refusing the unearned |
| `ccforge-debug` | Diagnoses a misbehaving session, skill, hook, plugin, or MCP server from output |
| `ccforge-parallel` | Subagents, teams, workflows, worktrees, headless, and when to stay sequential |
| `ccforge-authoring` | Writes, validates, and tunes new skills so they trigger and coexist with yours |
| `ccforge-taste` | Whether a piece of setup should exist at all, and how it should read |
| `ccforge-perf` | Context, token, and cost economy as a measured budget with a before-number |
| `ccforge-noslop` | Strips AI tells from prose, code, commits, and config |
| `ccforge-explain` | Mechanisms, failures, and trade-offs, with calibrated confidence |
| `ccforge-loop` | Turns session friction into durable artifacts against an on-disk ledger |
| `ccforge-skillmap` | Inventories every skill, writes the shared index, owns the census script |

## Install: path A, the script (recommended)

In the VS Code integrated terminal, from your project root:

```bash
unzip forge.zip -d ~      # creates ~/forge
~/forge/install.sh
```

It asks one question: this project (`./.claude/skills/`) or all projects (`~/.claude/skills/`). Non-interactive
forms:

```bash
~/forge/install.sh --project                        # ./.claude/skills/
~/forge/install.sh --user                           # ~/.claude/skills/
~/forge/install.sh --project --packs webforge,ccforge
~/forge/install.sh --project --dry-run              # show what would happen, write nothing
```

It never overwrites a skill directory of the same name without asking, re-running it changes nothing, and it
prints every path it wrote plus the uninstall command. Then restart `claude`.

## Install: path B, the plugin marketplace

Use this if you want `/plugin` to manage enable, disable, update, and uninstall. From your project root, inside
`claude`:

```
/plugin marketplace add ~/forge
/plugin install webforge@forge
/plugin install appforge@forge
/plugin install ccforge@forge
```

If the install summary says to activate:

```
/reload-plugins
```

Scriptable equivalent, outside `claude`:

```bash
claude plugin marketplace add ~/forge
claude plugin install webforge@forge --scope project -y
```

Under path B the skills are namespaced by plugin: `/webforge:webforge-taste`. Under path A they are
`/webforge-taste`. Auto-triggering works identically either way.

## The canary receipt

Every FORGE skill carries a standing rule: when its guidance shapes a reply, the reply ends with exactly one
line, after a blank line, as the last visible thing.

```
[skills: webforge-orchestrator > webforge-server > webforge-noslop]
```

How to read it:

- Names appear in the order they fired, by full skill name.
- Your own skills are listed too, by their own names: `[skills: webforge-orchestrator > deploy-site >
  webforge-taste]`. That is the proof routing reached your skill instead of duplicating it.
- One skill alone: `[skills: webforge-taste only]`.
- A missing sibling gets one short parenthetical: `[skills: webforge-orchestrator (webforge-ui absent)]`.
- **Line missing entirely** means the skills are no longer shaping the reply, usually because compaction
  dropped them. Run `/clear`, then re-run the request.
- An orchestrator or loop may add one line directly above it: `note: skill context is degrading - /clear, then
  re-run this request.` Believe it.

Nothing else ever goes in that line: no counts, no timestamps, no scores, no file names.

`ccforge-skillmap` ships `scripts/canary-hook.sh`, an opt-in Stop hook that blocks a turn ending without the
line. Installing a pack does not register it. Ask `ccforge-wire` for the settings snippet if you want it.

## Verify the install in one command

```bash
ls ~/.claude/skills/*forge-*/SKILL.md .claude/skills/*forge-*/SKILL.md 2>/dev/null | wc -l
```

`36` for a full install of all three packs, `12` for one pack. Then, inside `claude`, run `/skills` and confirm
the pack names appear. Zero means the copy landed somewhere else; re-run `install.sh --dry-run` and read the
Target line.

To check the packs themselves rather than the install, run `python3 tools/validate.py` from the bundle root:
it parses every frontmatter block, matches every directory name against it, validates all JSON, and fails on
empty files or leftover placeholder text.

## Uninstall

Path A:

```bash
rm -rf .claude/skills/webforge-* .claude/skills/appforge-* .claude/skills/ccforge-*
rm -rf .claude/forge ~/.claude/forge
```

Path B:

```bash
claude plugin uninstall webforge
claude plugin uninstall appforge
claude plugin uninstall ccforge
```

Either way, also delete the `@~/.claude/forge/FORGE.md` line from `~/.claude/CLAUDE.md` if you let FORGE add it.

## Troubleshooting

| Symptom | Do this |
|---|---|
| Skills do not appear in `/skills` | Restart `claude`. Under path B, `rm -rf ~/.claude/plugins/cache` and restart. |
| A skill never auto-triggers | `claude --debug`. Malformed YAML frontmatter loads a skill with empty metadata and kills auto-triggering silently; that is the only place the parse error shows. |
| The receipt line stopped | `/clear`, then re-run. Context degraded past the point where the skill body is still live. |
| Your own skill is being ignored | Run the census: invoke `webforge-skillmap` (or any `*-skillmap`) and read `.claude/forge/skills-index.json`. See ADDING-YOUR-OWN-SKILLS.md. |

## Also read

- `QUICKSTART.md` - five things to type first.
- `dist/` - `forge.zip` (everything) and `webforge.zip` / `appforge.zip` / `ccforge.zip` (one pack each, unzip
  straight into `~/.claude/skills/`).
- `ADDING-YOUR-OWN-SKILLS.md` - how your project skills take precedence over these.
- `ARCHITECTURE.md` - the normative spec these packs implement.
