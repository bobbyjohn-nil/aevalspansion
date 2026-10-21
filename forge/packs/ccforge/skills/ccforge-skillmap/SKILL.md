---
name: ccforge-skillmap
description: >-
  Inventories every skill available here (project, personal, plugin, synced, legacy commands), writes a shared on-
  disk index, flags overlapping skills, and decides which one owns a piece of work so project-local skills win
  over pack defaults. Use when skills seem ignored, duplicated, or dead, or before routing any multi-step task.
  Use this even when the user does not name it. Not for authoring new skills; use ccforge-authoring.
metadata:
  pack: ccforge
  kind: skillmap
  domain: meta,routing
  version: "1.0.0"
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh *)
---

# CCForge Skill Map

Builds and reads the shared skill index, detects overlaps, and answers "who owns this subgoal". Called by
`ccforge-orchestrator` in its MODEL phase, or directly. Also owns the census script and the opt-in canary hook
that the other two packs do not ship.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-skillmap only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-skillmap (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

This skill exists to make the user's own skills win. Every routing rule below resolves ties toward the skill
the user wrote. Never edit, rename, or move any file whose `owner` is `user`.

## When called by the orchestrator

Return a routing decision, not a report. Output is one line per subgoal: `subgoal -> owning skill -> reason`.
Rebuild the index only if it is missing or stale. Do not print the whole index.

## When invoked directly

Rebuild the index, then answer the question actually asked: what exists, what overlaps, what is dead, or who
should own a named task. Print at most 15 rows; summarize the rest by scope count.

## Procedure

### 1. Decide whether to rebuild

Two files. Both are machine-derived. Neither is ever hand-edited.

| File | Scope | Rebuild when |
|---|---|---|
| `~/.claude/forge/personal-skills-cache.json` | personal, plugin, synced skills; identical across projects | its `session_id` differs from this session **and** `generated_at` is older than 24h. Both conditions |
| `.claude/forge/skills-index.json` | the live index: personal cache merged with a fresh project-tree scan | at the start of each orchestrator task, if `session_id` differs from this session |

With no project root, the live index falls back to `~/.claude/forge/skills-index.json`. All three FORGE packs
read and write these exact paths. One shared map, never three. `generated_by` records which skillmap wrote it.

### 2. Scan

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh" "$PWD" || true
```

The script prints one JSON object per line and enumerates, cheapest and most authoritative first:

1. `~/.claude/skills/synced/manifest.json` if present. The script emits a pointer to it; Read that one file
   rather than opening each `synced/*/SKILL.md`.
2. `~/.claude/skills/*/SKILL.md` and `~/.claude/skills/*/skills/*/SKILL.md`, excluding `synced/`.
3. `~/.claude/plugins/cache/*/skills/*/SKILL.md`.
4. Every `*/.claude/skills/*/SKILL.md` under the project root, pruning `node_modules`, `.git`, `dist`,
   `build`, `.next`, `target`, `vendor`, `.venv`. Nested monorepo skills are cataloged even before they
   activate; completeness is the point.
5. `.claude/commands/*.md`, legacy, loses to any same-named skill.

Never `Read()` every discovered `SKILL.md` to build the index. That is a large context spend for six
frontmatter lines per file.

The script needs no dependencies and never writes. If it is missing or errors, fall back to two Glob calls
(`.claude/skills/*/SKILL.md`, `~/.claude/skills/*/SKILL.md`), say once that the census is degraded, and
continue. Never block a task on the index.

### 3. Classify, two tiers

- **authoritative**: the skill carries a `metadata:` map with `pack` / `kind` / `domain`. FORGE skills always
  do. Use those values as given.
- **inferred**: match description keywords against a fixed vocabulary: `frontend`, `backend`, `mobile`,
  `desktop`, `data`, `deploy`, `testing`, `docs`, `design`, `terminal`. `kind` defaults to `user` for anything
  without a FORGE pack prefix.
- Neither confident: record `domain: ["unclassified"]` and move on. A wrong classification is worse than none;
  it misroutes, and a misroute either duplicates the user's work or silently overrides it.

`owner` is `forge` when `metadata.pack` names a FORGE pack, `thirdparty` for plugin and synced scopes,
`user` otherwise.

### 4. Detect overlaps

Lowercase and tokenize each description, drop stopwords, compute Jaccard similarity for every cross-owner
pair. Skip same-owner pairs; the three FORGE packs are allowed adjacent descriptions by construction.

| Jaccard | Severity | Resolution |
|---|---|---|
| 0.35 to 0.60 | `overlap_candidate` | compose: user skill for domain rules, pack skill for craft |
| 0.60 or higher | `overlap_likely` | `project-wins`: defer entirely to the user skill this task |

These thresholds are FORGE heuristics, not platform constants. They are tunable; say so if the user asks why a
pair was flagged. `resolution` is never `pack-wins`.

### 5. Flag dead candidates, conservatively

A skill is a `dead-candidate` only when its `source_path` fails to resolve on a scan where a previous index
recorded it. **Never label a skill "unused."** FORGE only sees invocations it mediates; a user typing
`/some-skill` directly is invisible to it. `rename_suggestions` is advisory text, never applied.

### 6. Write the index atomically

Write to `<path>.tmp`, then `mv`. The index is a full rebuild, not a merge, so a later writer never corrupts an
earlier one. Add `.claude/forge/` to `.gitignore` if it is not already there.

`schema_version: 1`. Exact field names, do not rename:

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-08-18T14:32:00Z",
  "generated_by": "ccforge-skillmap@1.0.0",
  "session_id": "sess_abc123",
  "project_root": "/home/user/myapp",
  "skills": [
    {
      "id": "ccforge-taste",
      "invoke_as": "/ccforge:ccforge-taste",
      "scope": "plugin",
      "source_path": "~/.claude/skills/ccforge/skills/ccforge-taste/SKILL.md",
      "plugin": "ccforge",
      "description_excerpt": "first 200 chars only",
      "pack": "ccforge",
      "kind": "taste",
      "domain": ["meta", "workflow"],
      "owner": "forge",
      "classification_tier": "authoritative",
      "status": "active",
      "last_seen_scan": "2026-08-18T14:32:00Z"
    }
  ],
  "overlaps": [
    {
      "forge_skill": "ccforge-prime",
      "user_skill": "repo-conventions",
      "jaccard": 0.41,
      "severity": "overlap_candidate",
      "overlap_domain": ["docs"],
      "resolution": "project-wins",
      "note": "repo-conventions owns what the rules say; ccforge-prime is limited to where they live."
    }
  ],
  "dead_candidates": [
    { "id": "old-thing", "reason": "source_path missing on scan", "last_seen_scan": "2026-07-01T00:00:00Z" }
  ],
  "rename_suggestions": []
}
```

Valid `scope`: `enterprise`, `personal`, `project`, `nested`, `plugin`, `bundled`, `synced`, `command`.
Valid `kind`: `orchestrator`, `specialist`, `taste`, `loop`, `noslop`, `perf`, `explain`, `skillmap`, `user`,
`unknown`.

### 7. Route

Precedence, first rule that fires wins:

1. Project-scope user skill covering the subgoal. Invoke it, regardless of what native name precedence does.
2. Personal-scope user skill. Beats the pack specialist, loses to project scope.
3. No user skill matches: pack specialist.
4. Different layers: compose. User skill first (domain rules), then the pack skill on its output (craft
   rules), explicitly told not to redesign it.
5. `overlap_likely` and the split is unconfirmed this session: defer entirely to the user skill.
6. Unclassified, ambiguous, or genuinely novel: ask one short question.

Note the platform resolves same-name collisions enterprise > personal > project, which is backwards from the
rule above. Namespacing means literal collisions essentially never happen, so every bit of "project wins" is
this policy, not a setting. Never tell the user the platform is doing it.

## The opt-in canary enforcer

`scripts/canary-hook.sh` blocks a turn that ends without a `[skills: ...]` receipt line. It is not registered
by installing this pack, and this skill never writes a settings file. Give the user the snippet only when they
ask for enforcement:

```json
{ "hooks": { "Stop": [ { "hooks": [
  { "type": "command",
    "command": "~/.claude/skills/ccforge/skills/ccforge-skillmap/scripts/canary-hook.sh" }
] } ] } }
```

Facts to state when offering it:

- Stop hooks can block. Exit 2 means "keep working" and the stderr text is what Claude reads as the correction.
- The script exits 0 the moment `stop_hook_active` is true, so it cannot fight the consecutive-block cap that
  stops a Stop hook from holding a session forever.
- It fails open: a payload without the message field, or an unparseable one, exits 0. A receipt enforcer that
  wedges a session is worse than a missing receipt.
- `Stop` and `SubagentStop` payloads carry `last_assistant_message`, the final response text. That is what the
  script matches against. If the hook never blocks on an obviously receipt-less turn, check that field name
  first with `claude --debug`; it is the only part of the contract that would move between versions.
- A turn where genuinely no skill fired still has to end with a line, or the hook blocks it. Tell the user the
  escape is `[skills: none]`, which is what the hook's own correction message asks for.
- `jq` is used when present and is not required. Without it the check falls back to a pattern match on the
  raw payload, which is looser but still refuses a turn with no bracketed line at all.
- Removal is deleting that one `Stop` entry.

## Quality checklist

- [ ] The index on disk carries this session's `session_id` and a `generated_by` naming a real skillmap.
- [ ] Every `source_path` in the index resolves right now, or is listed under `dead_candidates`.
- [ ] Every routing decision this turn names one owning skill and one reason.
- [ ] No file with `owner: user` was edited, renamed, or moved.
- [ ] Overlap thresholds were described as FORGE heuristics, not platform behavior.
- [ ] The receipt line names every user skill that fired, not just FORGE ones.

## Reference files

| File | Read when |
|---|---|
| `scripts/scan_skills.sh` | Run it; never read it into context |
| `scripts/canary-hook.sh` | Only when the user asks for hard receipt enforcement |
