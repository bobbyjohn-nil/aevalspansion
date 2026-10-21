---
name: webforge-skillmap
description: >-
  Inventories every skill available here (project, personal, plugin, synced, legacy commands), writes a shared
  on-disk index, flags overlapping skills, and decides which one owns a piece of work so project-local skills
  win over pack defaults. Use when skills seem ignored or duplicated, or before routing any multi-step build.
  Use this even when unnamed. Not for writing new skills.
metadata:
  pack: webforge
  kind: skillmap
  domain: meta,routing
  version: "1.0.0"
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh *)
---

# WebForge Skill Map
Builds and reads the shared skill index, detects overlaps, and answers "who owns this subgoal". Called by
`webforge-orchestrator` in its MODEL phase, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-skillmap only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-skillmap (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## When called by the orchestrator

Return a routing decision, not a report. Output is one line per subgoal: `subgoal -> owning skill -> reason`.
Rebuild the index only if it is missing or stale (below). Do not print the whole index.

## When invoked directly

Rebuild the index, then answer the question that was actually asked: what exists, what overlaps, what is dead,
or who should own a named task. Print at most 15 rows; summarize the rest by scope count.

## Procedure

### 1. Decide whether to rebuild

Two files. Both are machine-derived. Neither is ever hand-edited.

| File | Scope | Rebuild when |
|---|---|---|
| `~/.claude/forge/personal-skills-cache.json` | personal, plugin, synced skills; identical across projects | its `session_id` differs from this session **and** `generated_at` is older than 24h. Both conditions |
| `.claude/forge/skills-index.json` | the live index: personal cache merged with a fresh project-tree scan | at the start of each orchestrator task, if `session_id` differs from this session |

With no project root, the live index falls back to `~/.claude/forge/skills-index.json`. All three FORGE packs
read and write these exact paths. One shared map, never three.

### 2. Scan

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh" "$PWD" || true
```

The script prints one JSON object per line. It enumerates, cheapest and most authoritative first:

1. `~/.claude/skills/synced/manifest.json` if present. The script emits a pointer to it; Read that one file
   rather than opening each `synced/*/SKILL.md`.
2. `~/.claude/skills/*/SKILL.md` and `~/.claude/skills/*/skills/*/SKILL.md`, excluding `synced/`.
3. `~/.claude/plugins/cache/*/skills/*/SKILL.md`.
4. Every `*/.claude/skills/*/SKILL.md` under the project root, pruning `node_modules`, `.git`, `dist`,
   `.next`. Nested monorepo skills are cataloged even before they activate; completeness is the point.
5. `.claude/commands/*.md`, legacy, loses to any same-named skill.

Never `Read()` every discovered `SKILL.md` to build the index. That is a large context spend for six
frontmatter lines per file.

### 3. Classify, two tiers

- **authoritative**: the skill carries a `metadata:` map with `pack` / `kind` / `domain`. FORGE skills always
  do. Use those values as given.
- **inferred**: match description keywords against a fixed vocabulary: `frontend`, `backend`, `mobile`,
  `desktop`, `data`, `deploy`, `testing`, `docs`, `design`, `terminal`. `kind` defaults to `user` for anything
  without a FORGE pack prefix.
- Neither confident: record `domain: ["unclassified"]` and move on. A wrong classification is worse than none;
  it misroutes.

`owner` is `forge` for anything whose `metadata.pack` is a FORGE pack, `thirdparty` for plugin and synced
scopes, `user` otherwise.

### 4. Detect overlaps

Lowercase and tokenize each description, drop stopwords, compute Jaccard similarity for every cross-owner
pair. Skip same-owner pairs.

| Jaccard | Severity | Resolution |
|---|---|---|
| 0.35 to 0.60 | `overlap_candidate` | compose: user skill for domain rules, pack skill for craft |
| 0.60 or higher | `overlap_likely` | `project-wins`: defer entirely to the user skill this task |

These are FORGE heuristics, not platform constants. They are tunable; say so if the user asks why a pair was
flagged. `resolution` is never `pack-wins`.

### 5. Flag dead candidates, conservatively

A skill is a `dead-candidate` only when its `source_path` fails to resolve on a scan where a previous index
recorded it. **Never label a skill "unused."** FORGE only sees invocations it mediates; a user typing
`/some-skill` is invisible to it. `rename_suggestions` is advisory text, never applied.

The census never edits, renames, or moves any file with `owner: user`.

### 6. Write the index atomically

Write to `<path>.tmp`, then `mv`. The index is a full rebuild, not a merge, so a later writer never corrupts
an earlier one. Add `.claude/forge/` to `.gitignore` if it is not already there.

`schema_version: 1`. Exact field names, do not rename:

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-08-18T14:32:00Z",
  "generated_by": "webforge-skillmap@1.0.0",
  "session_id": "sess_abc123",
  "project_root": "/home/user/myapp",
  "skills": [
    {
      "id": "webforge-taste",
      "invoke_as": "/webforge:webforge-taste",
      "scope": "plugin",
      "source_path": "~/.claude/skills/webforge/skills/webforge-taste/SKILL.md",
      "plugin": "webforge",
      "description_excerpt": "first 200 chars only",
      "pack": "webforge",
      "kind": "taste",
      "domain": ["frontend", "design"],
      "owner": "forge",
      "classification_tier": "authoritative",
      "status": "active",
      "last_seen_scan": "2026-08-18T14:32:00Z"
    }
  ],
  "overlaps": [
    {
      "forge_skill": "webforge-ship",
      "user_skill": "deploy-site",
      "jaccard": 0.41,
      "severity": "overlap_candidate",
      "overlap_domain": ["deploy"],
      "resolution": "project-wins",
      "note": "deploy-site owns the ship step; webforge-ship is limited to build config."
    }
  ],
  "dead_candidates": [
    { "id": "old-thing", "reason": "source_path missing on scan", "last_seen_scan": "2026-07-01T00:00:00Z" }
  ],
  "rename_suggestions": []
}
```

Valid `scope` values: `enterprise`, `personal`, `project`, `nested`, `plugin`, `bundled`, `synced`.
Valid `kind` values: `orchestrator`, `specialist`, `taste`, `loop`, `noslop`, `perf`, `explain`, `skillmap`,
`user`, `unknown`.

### 7. Route

Precedence, first rule that fires wins:

1. Project-scope user skill covering the subgoal. Invoke it, regardless of what native name precedence does.
2. Personal-scope user skill. Beats the pack specialist, loses to project scope.
3. No user skill matches: pack specialist.
4. Different layers: compose. User skill first (domain rules), then the pack skill on its output (craft
   rules), explicitly told not to redesign it.
5. `overlap_likely` and the split is unconfirmed this session: defer entirely to the user skill.
6. Unclassified, ambiguous, or novel: ask one short question.

## Failure handling

| Situation | Behavior |
|---|---|
| Script missing or not executable | Inline fallback: glob `.claude/skills/*/SKILL.md` and `~/.claude/skills/*/SKILL.md`, read names and descriptions only. Say once that the fallback ran |
| Index file corrupt or unparseable | Rebuild once. If the rebuild fails, use the inline fallback and say so once. Never block the task on the index |
| No project root | Use `~/.claude/forge/skills-index.json` as the live index |
| Another pack's skillmap wrote the index | Fine. Same paths, same schema. `generated_by` records who wrote it |

## Quality checklist

- [ ] The index file on disk parses as JSON and its `session_id` is this session's.
- [ ] Every entry has a `source_path` that resolved during this scan.
- [ ] No entry with `owner: user` was edited, renamed, or moved.
- [ ] Every overlap row names both skills and a resolution that is `project-wins` or `compose`.
- [ ] The routing answer names a skill by its full prefixed name, not a category.
- [ ] No skill was labeled unused.

## Interop

Defer to a project-local skill-registry or routing skill when one exists, and compose with it: it owns the
house routing rules, this skill owns the census and the shared index format. Name it in the receipt line. If
the script, the index, or the rest of the pack is absent, fall back to the inline glob and run standalone;
never block a task on the index.

## Reference files

| File | Read when |
|---|---|
| `scripts/scan_skills.sh` | Executed, never read into context |
