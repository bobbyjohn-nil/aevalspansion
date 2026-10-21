---
name: appforge-skillmap
description: >-
  Inventories every skill available this session: project, personal, synced, and plugin skills. Writes a
  shared on-disk index, flags overlaps between the user's own skills and pack skills, and answers which skill
  should own a piece of work. Use when asked what skills exist, which skill handles something, why a skill did
  not fire, or before routing a multi-skill task. Use this even when unnamed. Not for authoring skills.
metadata:
  pack: appforge
  kind: skillmap
  domain: interop,routing
  version: "1.0.0"
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh *)
---

# AppForge Skill Map

Builds and reads the shared FORGE skill index so work is routed to the right owner instead of the nearest
default. Normally called by `appforge-orchestrator` in its MODEL phase; also useful directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-skillmap only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-skillmap (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

This skill reads; it never curates. It records the user's own skills alongside the pack's, ranks project scope
above personal scope above the pack on every overlap, and never proposes that a pack skill displace a skill
the user wrote. `resolution` is `project-wins` or `compose`, never `pack-wins`. Name every skill that fired in
the receipt line.

## When called by the orchestrator

Return three things and nothing else: the routing line (subgoal, owner skill, reason), the overlap rows that
touch this task, and the index path plus its `generated_at`. Do not restate the whole inventory.

## When invoked directly

Rebuild the index, then answer the question that was actually asked. Show a table, not raw JSON. If the user
asked "what skills do I have", group by scope and mark the owner. If they asked "why did skill X not fire",
check its frontmatter parses and its description covers the phrasing they used, and say which is wrong.

## The two index files

| File | Scope | Rebuilt when |
|---|---|---|
| `~/.claude/forge/personal-skills-cache.json` | personal, synced, and plugin skills, identical across projects | its `session_id` differs from the current session AND `generated_at` is older than 24h. Both conditions. |
| `.claude/forge/skills-index.json` | the live index: personal cache merged with a fresh scan of the project tree | at the start of each orchestrator task, if `session_id` differs from the current session |

With no project root, the live index falls back to `~/.claude/forge/skills-index.json`. All three FORGE packs
read and write these exact paths. One shared map, never three.

Writes are atomic: write `<path>.tmp`, then `mv` over the target. The index is a full rebuild, not a merge, so
a later writer never corrupts an earlier one. `generated_by` records which skillmap produced it. Add
`.claude/forge/` to `.gitignore` if it is not already ignored.

## Procedure

1. **Decide whether a rebuild is needed.** Read `.claude/forge/skills-index.json`. If it exists and its
   `session_id` equals this session's, use it as-is and stop here. Cost of a needless rescan is real.
2. **Scan.** Run the bundled script. It prints one JSON object per line and never writes a file:

   ```bash
   ${CLAUDE_SKILL_DIR}/scripts/scan_skills.sh "$PWD"
   ```

   Never `Read()` each discovered `SKILL.md` to build the index. That is a large context spend for six
   frontmatter lines per file. The script already extracts `name`, `description`, `metadata.pack`,
   `metadata.kind`, `metadata.domain`, scope, and source path.
3. **Classify.** Two tiers, and be honest about which one applied.
   - `authoritative`: the skill carries a `metadata:` map with `pack`, `kind`, or `domain`. FORGE skills
     always do. The script emits these directly.
   - `inferred`: everything else. Infer `domain` by keyword match of the description against this fixed
     vocabulary only: `frontend`, `backend`, `mobile`, `desktop`, `data`, `deploy`, `testing`, `docs`,
     `design`, `terminal`. If no keyword hits with confidence, record `domain: ["unclassified"]` and move on.
     A wrong classification is worse than none. It misroutes.
   - The script marks `owner: forge` only when a `pack:` claim is backed by the file actually living inside
     that pack's plugin directory. A user skill that declares `pack: appforge` is still `owner: user`.
4. **Detect overlaps.** For every cross-owner pair (`forge` against `user` or `thirdparty`, skipping
   same-owner pairs), lowercase and tokenize both descriptions, drop stopwords, compute Jaccard similarity
   of the token sets.
   - 0.35 or above: `overlap_candidate`.
   - 0.60 or above: `overlap_likely`.

   These two thresholds are FORGE heuristics, not platform constants. They are tunable, and if they produce
   false positives in this repo, say so and adjust rather than routing badly.
5. **Flag dead candidates, narrowly.** A `source_path` that the index previously recorded and that now fails
   to resolve is `dead-candidate (missing-file)`. That is the only honest signal available. Never label a
   skill "unused": FORGE only sees invocations it mediates, and a user typing `/some-skill` is invisible to
   it. `rename_suggestions` is advisory text only.
6. **Write the index atomically** in the schema below.
7. **Never edit, rename, or move any file with `owner: user`.** The census reads. It does not curate.

## Index schema (schema_version 1, exact field names)

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-08-18T14:32:00Z",
  "generated_by": "appforge-skillmap@1.0.0",
  "session_id": "sess_abc123",
  "project_root": "/home/user/myapp",
  "skills": [
    {
      "id": "appforge-taste",
      "invoke_as": "/appforge:appforge-taste",
      "scope": "plugin",
      "source_path": "~/.claude/skills/appforge/skills/appforge-taste/SKILL.md",
      "plugin": "appforge",
      "description_excerpt": "first 200 chars only",
      "pack": "appforge",
      "kind": "taste",
      "domain": ["mobile", "design"],
      "owner": "forge",
      "classification_tier": "authoritative",
      "status": "active",
      "last_seen_scan": "2026-08-18T14:32:00Z"
    }
  ],
  "overlaps": [
    {
      "forge_skill": "appforge-release",
      "user_skill": "ship-app",
      "jaccard": 0.41,
      "severity": "overlap_candidate",
      "overlap_domain": ["deploy"],
      "resolution": "project-wins",
      "note": "ship-app owns submission; appforge-release is limited to build config and store checks."
    }
  ],
  "dead_candidates": [
    { "id": "old-thing", "reason": "source_path missing on scan", "last_seen_scan": "2026-07-01T00:00:00Z" }
  ],
  "rename_suggestions": []
}
```

`resolution` is `project-wins` or `compose`. It is never `pack-wins`.

## Routing answers this skill gives

| Census says | Answer |
|---|---|
| No user skill matches | Pack specialist, default stack posture |
| User project skill matches, no overlap flagged | Invoke the user skill; do not also run a pack specialist uninvited |
| Both match, different layers | Compose: user skill for domain rules, then pack skill for craft |
| `overlap_likely` (0.60 or above) | Defer entirely to the user skill this task |
| `overlap_candidate` (0.35 to 0.60) | Compose cautiously; say both ran and why |
| Unclassified or ambiguous | One short question |
| Index missing or corrupt | Rebuild once. If the rebuild fails, fall back to inline globs and say so once. Never block the task on the index. |

## Degrades to

If the script is missing or Bash is unavailable, glob `.claude/skills/*/SKILL.md` and
`~/.claude/skills/*/SKILL.md`, read only their frontmatter, and route from that. Say once that the index was
not built. Never skip the ownership check entirely; an unrouted task is how a pack skill silently overrides a
user's own skill.

## Quality checklist

- [ ] The index at `.claude/forge/skills-index.json` parses as JSON and carries `schema_version: 1`.
- [ ] `generated_by` and `session_id` are this run's values, not copied from a previous index.
- [ ] Every entry has a `source_path` that resolves right now, or appears in `dead_candidates`.
- [ ] Every overlap row names both skills, the Jaccard value, and a resolution of `project-wins` or `compose`.
- [ ] No file owned by the user was created, edited, renamed, or deleted by this run.
- [ ] The write was atomic: a `.tmp` file was moved into place, not written in situ.

## Reference files

| File | Read when |
|---|---|
| `scripts/scan_skills.sh` | Executed, never read into context. Its stdout is the census. |
