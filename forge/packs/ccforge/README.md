# CCForge

Twelve namespaced skills for mastering Claude Code itself in the terminal and VS Code. One orchestrator drives
the rest.

**Install:** `unzip ccforge.zip -d ~/.claude/skills/` then restart `claude`. No dependencies, no build step.

**Skills**

- `ccforge-orchestrator` frames, detects the existing setup, routes, runs gates, refines against logged defects
- `ccforge-prime` CLAUDE.md, `.claude/rules/`, imports, AGENTS.md interop, and pruning to budget
- `ccforge-wire` hooks, subagents, MCP servers, permissions, settings, and refusing the ones not earned
- `ccforge-debug` diagnoses a misbehaving session, skill, hook, plugin, or MCP server from captured output
- `ccforge-parallel` subagents, agent teams, dynamic workflows, worktrees, headless, and when to stay sequential
- `ccforge-authoring` writes, validates, and tunes new skills so they trigger and coexist with yours
- `ccforge-taste` whether a piece of setup should exist, delegate or inline, plan or act, hook or reminder
- `ccforge-perf` context, token, and cost economy as a measured budget with a before-number
- `ccforge-noslop` strips AI tells from prose, code, commits, and config
- `ccforge-explain` mechanisms, failures, and trade-offs at the right altitude with calibrated confidence
- `ccforge-loop` turns session friction into durable artifacts against an on-disk ledger with stop conditions
- `ccforge-skillmap` inventories every available skill, writes the shared index, routes to the right owner

**How to tell it is working.** Every reply shaped by these skills ends with one line, for example
`[skills: ccforge-orchestrator > ccforge-wire > ccforge-noslop]`. If that line stops appearing, skill context
has degraded: run `/clear` and re-run the request. Your own project skills take precedence, and when one covers
a subgoal the orchestrator invokes it instead of the pack default and names it in that same line.

**Optional hard enforcement.** `ccforge-skillmap` ships `scripts/canary-hook.sh`, a Stop hook that blocks a
turn ending without that line. It is not registered by installing this pack; ask for the settings snippet.

**Update.** Delete `~/.claude/skills/ccforge/` first, then unzip the new version. Overwriting in place leaves
orphaned files behind.

**Uninstall.** `claude plugin uninstall ccforge`, then delete the `@~/.claude/forge/FORGE.md` line from
`~/.claude/CLAUDE.md`, and delete `~/.claude/forge/` if no other FORGE pack remains.

**Troubleshooting.** Skills not appearing: `rm -rf ~/.claude/plugins/cache` and restart. A skill never
auto-triggers: run `claude --debug`, since malformed YAML frontmatter fails silently and is visible nowhere
else.
