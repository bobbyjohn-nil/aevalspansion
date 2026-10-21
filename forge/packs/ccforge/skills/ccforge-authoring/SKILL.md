---
name: ccforge-authoring
description: >-
  Writes, validates, and tunes new skills, slash commands, and plugins so they trigger reliably and coexist with
  everything already installed. Use when asked to create a skill or command, turn a repeated prompt into a
  reusable one, fix a skill that never fires, package skills as a plugin, or shorten a description that is too
  long. Use this even when the user does not name it. Not for auditing which skills exist; use ccforge-skillmap.
metadata:
  pack: ccforge
  kind: specialist
  domain: meta,authoring
  version: "1.0.0"
---

# CCForge Authoring

Turns a repeated workflow into a skill that actually fires, and validates it before it ships. Called by
`ccforge-orchestrator`, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-authoring only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-authoring (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

Check the skill index before authoring anything. If a skill already covers this job, extend it. The user's own
skills define house conventions for naming and structure; match them rather than imposing this pack's shape on
a repo that already has one.

## When called by the orchestrator

Take the routing decision and the skill index as given. Re-read only the skill you are about to write or
change, plus any indexed skill whose description overlaps it. Two skills competing for one trigger is the
failure this step exists to prevent.

## When invoked directly

Get three things stated before writing: the recurring task this replaces, the exact phrasing the user would
type to reach it, and where it will live (project, personal, or plugin). The last one decides whether the
directory name or the frontmatter `name` supplies the invocation slug.

## Before writing: does this deserve to be a skill

A skill is warranted when the same multi-step procedure has been pasted a third time, or the same prompt typed
repeatedly to start a task. One occurrence is not a pattern. If the material is a single convention every
request needs, it is a CLAUDE.md line. If it must happen every time without judgment, it is a hook.

Also check what is already there. Bundled skills cover a lot: `/doctor`, `/code-review`, `/batch`, `/debug`,
`/loop`, `/run`, `/verify`, `/deep-research`, and others. A near-duplicate of a bundled skill is a confusing
second entry in the same trigger space.

## Hard constraints

Name:

- `^[a-z0-9-]+$`, at most 64 characters, no leading or trailing hyphen, no double hyphen.
- Never contains "claude" or "anthropic". Those are reserved and rejected server-side at upload.
- Never `help`, `feedback`, or `synced`. Those collide with reserved names.
- Never `helper`, `utils`, `tools`, `data`, `files`, or any other noun that says nothing. Vague names do not
  trigger.
- For a personal or project skill the directory name supplies the invocation slug and `name` is a display
  label. For a plugin skill inside `skills/`, `name` replaces the last segment of `/plugin:name`. Keep them
  byte-identical and the distinction stops mattering.

Description:

- At most 1,024 characters, and no angle brackets anywhere.
- The listing truncates `description` plus `when_to_use` at 1,536 characters combined, so the key use case
  goes first.
- Target 250 to 450 characters. The whole skill listing is capped near 1% of the context window and drops the
  least-invoked descriptions first, so length is a liability rather than thoroughness.

Structure:

- Exactly one `SKILL.md` per package, at `<folder>/SKILL.md`.
- Body under 500 lines. Past that, move material to `references/`.
- References one level deep only: SKILL.md points at a file in its own `references/`, and that file points at
  nothing. The second hop is not followed reliably.
- Forward slashes in every path, always.
- Any reference file past 100 lines opens with a table of contents; past 300 lines that is mandatory.

## Writing a description that fires

1. Third person, always. "Processes X", never "I can help you" or "You can use this to". The text is injected
   into the system prompt verbatim and a mismatched point of view causes discovery problems.
2. State what and when in the same sentence. A description listing capabilities with no trigger conditions
   under-fires.
3. Use the words the user would actually type: file extensions, tool names, the verbs. Not an abstract
   capability summary.
4. Be pushy. Claude under-triggers skills. End with a clause like "Use this even when the user does not name
   it."
5. End with a defer clause naming what it is not for: `Not for <adjacent thing>; use <owner> instead.` This is
   what keeps skills out of each other's trigger space.

Know the mechanism you are writing against: Claude does not consult skills for tasks it can handle on its own.
A one-step request may not trigger a skill even with a perfect keyword match. So a skill whose value is
substantive must signal stakes and multi-step scope, not just its domain.

## Writing the body

- Imperative, second person, addressed to the agent: "Run X." "Never do Y." Descriptions are third person;
  do not blur the registers.
- Reserve `ALWAYS`, `NEVER`, and `MUST` for fragile, sequence-critical, or safety-critical steps. For judgment
  calls, use explained prose with a stated default and one named escape hatch. Rigid imperatives on a judgment
  call stop the model adapting to context it understands better than the author did.
- One default plus one named escape hatch, never a menu of five options.
- Every instruction should be a test the model can run. "Restate it in one sentence" beats "understand it
  deeply". "Push every input to 0, 1, empty, huge, negative" beats "consider edge cases".
- Write standing instructions, not one-time steps. An invoked skill's rendered body stays in context for the
  rest of the session and is never re-read, so anything that must hold on turn 40 needs to be phrased as a
  durable rule.
- Put load-bearing content near the top. After a compaction only the most recent invocation of each skill is
  re-attached, capped at 5,000 tokens per skill and 25,000 total, and truncation keeps the start of the file.
- Add only what the model does not already know. Assume a strong reader under load.

## Frontmatter, and what to leave out

The portable field set, legal on every surface including uploads: `name`, `description`, `license`,
`compatibility`, `metadata`, `allowed-tools`. Anything else is a hard validation error when packaging for the
Skills API or claude.ai, with the message naming the offending key.

Claude Code accepts more (`when_to_use`, `disable-model-invocation`, `user-invocable`, `paths`, `model`,
`effort`, `context`, `agent`, `background`, `hooks`, `shell`, `argument-hint`, `arguments`,
`disallowed-tools`). Use them when the skill is Claude Code only, and know the costs:
`disable-model-invocation: true` removes the description from context entirely, which also breaks any
orchestrator that dispatches by name. `shell: bash` hard-fails on Windows without Git Bash.

`allowed-tools` pre-approves tools for the invoking turn only; the grant clears on the user's next message.
Scope it to the exact bundled script rather than granting a bare tool:
`allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/run.sh *)`.

`metadata` is a free-form flat map Claude Code ignores. It is the sanctioned channel for census tagging;
values must be strings, and the whole map is dropped if it is not a flat map.

## Validate before claiming it works

```bash
claude plugin validate ./<plugin> --strict; echo "exit=$?"
head -1 <skill>/SKILL.md                      # must be exactly ---
claude --debug 2>&1 | grep -i <skill-name>    # the only place a frontmatter parse error appears
```

Malformed YAML fails silently: the skill loads with empty metadata, `/name` still works, and auto-triggering is
permanently dead. Never report a skill as working without one of these checks having run.

## Tune the description when it under-fires

Do not guess at rewrites. Run a small eval:

1. Write 20 realistic queries: 8 to 10 that should trigger, 8 to 10 genuine near-misses that should not.
   Obviously irrelevant negatives test nothing.
2. Hold out roughly 40% as a test split.
3. Run each query several times; triggering means the model actually reached for the skill, not that it
   discussed the topic.
4. Change one thing per round, at most five rounds.
5. Pick the winner by the held-out score, not the training score, or you have tuned the description to your
   own examples.

## Quality checklist

- [ ] The name matches the pattern, is under 64 characters, and contains neither reserved word.
- [ ] The directory name and `name:` are byte-identical.
- [ ] The description is third person, states what and when, is under 450 characters, and ends with a defer
      clause.
- [ ] The body is under 500 lines, and every reference file is exactly one hop from `SKILL.md`.
- [ ] Exactly one `SKILL.md` exists in the package.
- [ ] `claude plugin validate --strict` exited 0, or the skill is not in a plugin and the frontmatter was
      checked another way.
- [ ] The frontmatter parse was confirmed with `claude --debug`, and that output is quoted.
- [ ] Every `!`-injected command in the body either cannot fail or ends with `|| true`.
- [ ] The skill was tested with a substantive multi-step prompt, not a one-liner.

## Reference files

| File | Read when |
|---|---|
| `references/validation.md` | Packaging, validating, or debugging a skill or plugin that will not load |
