# Adding your own skills

FORGE is built to lose to you. A skill you write about your project beats the pack default on anything to do
with your domain. This file is how to make that happen reliably.

## 1. Where to put it

| Location | Scope | Use for |
|---|---|---|
| `.claude/skills/<name>/SKILL.md` | this project | House conventions, internal APIs, your deploy target, your design system. **Highest routing precedence.** |
| `~/.claude/skills/<name>/SKILL.md` | every project | Your personal habits and preferences. Ranks above FORGE, below project scope. |
| `<subdir>/.claude/skills/<name>/SKILL.md` | that subtree in a monorepo | Per-package rules. Cataloged by the census even before it activates. |

One directory per skill, exactly one `SKILL.md` inside it. Extra material goes in `references/*.md` next to it,
one hop deep only.

Do not put your skills inside `packs/`. Reinstalling FORGE would replace them.

## 2. Naming

- `^[a-z0-9-]+$`, 64 characters max, no leading, trailing, or doubled hyphen.
- Frontmatter `name:` must be **byte-identical to the directory name**. A mismatch is the single most common
  reason a skill silently never fires.
- Never contains `claude` or `anthropic` - both are reserved server-side. `help`, `feedback`, and `synced` are
  reserved names.
- Do not prefix with `webforge-`, `appforge-`, or `ccforge-`. Those prefixes mark a skill as pack-owned, and
  the census would classify yours as FORGE's and stop giving it precedence.
- Avoid `helper`, `utils`, `tools`, `data`, `files` as the core noun. They match everything and route nothing.

## 3. Writing a description that routes

The description is the only thing the model sees before deciding to load your skill. Target 250-450
characters, third person, and put these four things in it, in this order:

1. **What it does**, as a concrete clause. "Deploys to our Fly.io staging and production apps."
2. **When to use it**, in the words you would actually type. File types, framework names, the verbs *add*,
   *fix*, *ship*, *deploy*, and the phrases you say out loud.
3. **A pushy clause**: "Use this even when the user does not name it." Claude under-triggers skills and skips
   them entirely for requests it judges to be one step.
4. **A defer clause**: "Not for `<adjacent thing>`; use `<owner>` instead." This is what keeps your skill and
   the pack skills out of each other's trigger space.

Working example:

```yaml
---
name: deploy-site
description: >-
  Deploys this repo to our Fly.io staging and production apps using the house release checklist: bumps the
  version, runs the migration gate, deploys staging first, then promotes. Use for any request to deploy,
  release, promote, roll back, or ship this site, including "push it live". Use this even when the user does
  not name it. Not for build configuration or bundle size; use webforge-ship for those.
metadata:
  domain: deploy,release
  version: "1.0.0"
---
```

`metadata` is optional but worth adding: a flat map of string values with `domain` (comma-separated in one
string) puts your skill in the census's **authoritative** classification tier instead of the inferred tier,
which makes routing decisions sharper. Values must be strings; the whole map is dropped if it is not flat.

Only these frontmatter keys are safe: `name`, `description`, `metadata`, `allowed-tools`. YAML that fails to
parse loads the skill with empty metadata and permanently kills auto-triggering, with no error anywhere except
`claude --debug`.

## 4. How precedence resolves

The platform's native precedence for same-name collisions is enterprise > personal > project, which is
backwards from what you want. FORGE never relies on it. Namespacing means literal name collisions do not
happen, and the orchestrator applies this policy instead, in order, stopping at the first rule that fires:

1. A **project-scope** skill that plausibly covers the subgoal wins on domain rules. The orchestrator invokes
   it and does not duplicate its work.
2. A **personal-scope** skill ranks between project scope and the pack. It beats the pack specialist for the
   same narrow job, never a project-scope skill.
3. No user skill covers the subgoal, so the pack specialist runs with the detected stack posture.
4. Both match **at different layers**, so they compose rather than compete. Your skill supplies domain rules
   (what is correct here). The pack skill supplies craft rules (is it well built, fast, accessible, free of
   slop). Yours runs first; the pack skill is told to treat its output as fixed input, not something to
   redesign.
5. The index marks the pair `overlap_likely` (Jaccard 0.60 or higher) and the split has not been confirmed
   this session, so the orchestrator **defers entirely to your skill**.
6. The match is unclassified or genuinely ambiguous, so it asks you one short question rather than guessing.

Every skill that ran is named in the receipt line, yours included:
`[skills: webforge-orchestrator > deploy-site > webforge-taste]`. If your skill is not in that line, routing
did not reach it.

## 5. Re-run the census after adding a skill

The index is derived data, rebuilt from disk, never hand-edited.

Inside `claude`:

> Re-run the skill census, then tell me which FORGE skills now overlap with mine and how you plan to route.

That invokes `<pack>-skillmap`, which runs its bundled `scripts/scan_skills.sh` and rewrites two files:

| File | Holds |
|---|---|
| `.claude/forge/skills-index.json` | The live index: every skill found, its scope, owner, domain, plus the `overlaps` array |
| `~/.claude/forge/personal-skills-cache.json` | Personal and plugin skills, shared across projects, refreshed at most once a day |

Add `.claude/forge/` to your `.gitignore`.

To see the raw scan without the model in the loop:

```bash
sh .claude/skills/webforge-skillmap/scripts/scan_skills.sh "$PWD"
```

One JSON object per line. If your new skill is not in that output, the file is in the wrong place or its
frontmatter does not parse.

## 6. Checklist before you trust a new skill

- [ ] Directory name and frontmatter `name:` are byte-identical.
- [ ] Description is 250-450 characters and contains a trigger clause, a pushy clause, and a defer clause.
- [ ] Only `name`, `description`, `metadata`, `allowed-tools` in the frontmatter.
- [ ] It appears in the `scan_skills.sh` output with the scope you expected.
- [ ] `claude --debug` shows no parse error for it.
- [ ] A request phrased the way you would actually phrase it triggers it, and its name is in the receipt line.
- [ ] Anything it deliberately does not cover is named in the defer clause.

If it still does not fire, ask `ccforge-authoring` to tune the description: it runs a held-out eval of about 20
queries, half of them genuine near-misses, and picks the wording that scores best rather than the wording that
sounds best.
