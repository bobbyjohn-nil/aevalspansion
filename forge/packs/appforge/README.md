# AppForge

Twelve namespaced skills for building mobile, desktop, and full-stack apps with Claude Code. One orchestrator
drives the rest.

**Install:** `unzip appforge.zip -d ~/.claude/skills/` then restart `claude`. No dependencies, no build step.

**Skills**

- `appforge-orchestrator` frames, detects the stack, routes, runs gates, refines against logged defects
- `appforge-mobile` Expo and React Native: routing, native modules, permissions, push, secure storage
- `appforge-desktop` Tauri or Electron on stated criteria, auto-update, signing, notarization
- `appforge-backend` schema, authz, tenancy, jobs, webhooks, rate limits, uploads, offline sync
- `appforge-release` build profiles, store submission, the OTA boundary, staged rollout, review checklists
- `appforge-verify` the gate stack with real exit codes, test layers, retry policy, crash and analytics wiring
- `appforge-taste` platform feel, state design, touch targets, motion, and the AI-slop audit
- `appforge-perf` refuses perf work without a before-number, then fixes the named phase
- `appforge-noslop` strips AI tells from UI copy, prose, code, and commits
- `appforge-explain` decisions, systems, and diffs at the right altitude with calibrated confidence
- `appforge-loop` continuous build-verify-fix cycles against an on-disk ledger with stop conditions
- `appforge-skillmap` inventories every available skill, writes the shared index, routes to the right owner

**How to tell it is working.** Every reply shaped by these skills ends with one line, for example
`[skills: appforge-orchestrator > appforge-backend > appforge-noslop]`. If that line stops appearing, skill
context has degraded: run `/clear` and re-run the request. Your own project skills take precedence, and when
one covers a subgoal the orchestrator invokes it instead of the pack default and names it in that same line.

**Update.** Delete `~/.claude/skills/appforge/` first, then unzip the new version. Overwriting in place leaves
orphaned files behind.

**Uninstall.** `claude plugin uninstall appforge`, then delete the `@~/.claude/forge/FORGE.md` line from
`~/.claude/CLAUDE.md`, and delete `~/.claude/forge/` if no other FORGE pack remains.

**Troubleshooting.** Skills not appearing: `rm -rf ~/.claude/plugins/cache` and restart. A skill never
auto-triggers: run `claude --debug`, since malformed YAML frontmatter fails silently and is visible nowhere
else.
