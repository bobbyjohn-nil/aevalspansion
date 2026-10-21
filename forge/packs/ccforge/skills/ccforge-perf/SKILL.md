---
name: ccforge-perf
description: >-
  Manages context, token, and cost economy in Claude Code as a measured budget: reads where context actually went,
  ranks the real burn sources, and fixes the named one. Use when a session gets slow, expensive, or forgetful,
  when asked to reduce token usage or cut cost, when deciding between clearing, compacting, and rewinding, or when
  context keeps filling. Use this even when the user does not name it. Not for application speed.
metadata:
  pack: ccforge
  kind: perf
  domain: meta,context,cost
  version: "1.0.0"
---

# CCForge Perf

Treats context as a budget with a measured before-number, then fixes one named source. Standalone; assumes no
other skill ran.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: ccforge-perf only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: ccforge-perf (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill already defines this repo's cost conventions, defer to it on what to measure and what
the budget is. This skill supplies the method.

## No number, no work

Refuse to optimize before a before-number exists. The number comes from one of these, and you must be able to
quote it:

| Question | Where the number comes from |
|---|---|
| What is in context right now, by category | `/context`, run by the user in the session |
| What each MCP server costs | `/mcp` |
| What this session has cost | `/usage`, or `--output-format json` in a `-p` run, field `total_cost_usd` |
| How large a memory file is | `wc -l` and `wc -c` |
| How large a tool output is | run the command and pipe to `wc -c` |

`/context`, `/mcp`, and `/usage` are session commands, not shell commands. Ask the user to run the one you
need and paste the output. Do not estimate the breakdown from what you remember of the session; that estimate
is exactly the thing being measured.

State the before-number, the change, and the after-number. "Faster" and "leaner" with no numbers are not
results.

## What burns context, ranked

Fix in this order. The ranking reflects how much each typically costs, not how easy it is to fix.

1. **Unscoped investigation prompts.** "Investigate X" reads hundreds of files into the main context. Scope
   the request to named files or a named symbol, or delegate it to a subagent whose output never returns in
   full.
2. **Verbose tool output landing raw in context.** Test logs, build output, API responses. The documented fix
   is a `PreToolUse` hook that rewrites the command to filter its own output before Claude ever sees it,
   turning tens of thousands of tokens into hundreds. This is the highest-leverage single change available.
3. **Memory file bloat.** Every line is a per-request tax, paid on work that has nothing to do with it. Target
   under 200 lines per file; move sometimes-needed material into skills and path-scoped material into scoped
   rules.
4. **MCP servers nobody uses.** Tool names sit in context even though schemas are deferred. `/mcp` shows the
   per-server cost; remove what went unused.
5. **High effort on simple tasks.** Thinking tokens bill as output tokens. The default effort level is chosen
   well; raise it for one hard step and put it back.

Beyond those five, the structural costs: every request re-sends the whole conversation, so a session left open
all day carries cache-read cost for its entire history on a one-line question, and a first message after a gap
longer than the cache lifetime reprocesses everything at full price. Cache lifetime is one hour on
subscription plans and five minutes once drawing on usage credits or on an API key by default.

## Clear, compact, or rewind

Clear when any of these is true, and do not wait for a threshold:

- An unrelated task got mixed into this session.
- The same issue has been corrected twice; the context now holds two failed approaches that keep pulling the
  model back.
- Instruction adherence is visibly degrading, which is the root justification behind nearly every other
  practice here.

Costs, which decide the choice:

| Action | Cost | Effect |
|---|---|---|
| `/clear` | nothing | entirely fresh context; the prior conversation stays resumable |
| `/compact <focus>` | re-reads the whole conversation to summarize it, so a huge context is itself a large request | continues in place, keeping what the focus names |
| `/rewind` | small | restores code, conversation, or both to a prompt checkpoint, or summarizes forward or backward from one |

An unguided `/compact` guesses what matters. Always give it a focus. Prefer `/clear` plus a re-prompt carrying
what you learned; prefer `/rewind` when exactly one turn went wrong.

## What compaction keeps, and why the receipt matters

Auto-compaction fires at the model's context limit. On Sonnet 5 with no override that is around 967,000
tokens; it is the 200K boundary on 200K-window configurations, on Sonnet 4.6 and Opus 4.6 without extended
context, and whenever `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` is set. Override the trigger with `/autocompact 500k`
or the `autoCompactWindow` setting, in the 100K to 1M range.

After a compaction:

| Survives | Does not |
|---|---|
| system prompt and output style | rules with `paths:` frontmatter, until a matching file is read |
| project-root memory file and unscoped rules, re-injected from disk | nested subdirectory memory files, same condition |
| auto memory, re-injected from disk | skill bodies past the budget |

Invoked skill bodies are re-attached at only the most recent invocation of each skill, capped at 5,000 tokens
per skill and 25,000 tokens total, oldest dropped first. So a skill invoked early in a long session can vanish
silently while the session appears to continue normally. That silent drop is why a per-turn activation line is
worth reading: it is the cheapest available signal of what is still live.

If a single file or tool output is so large that context refills immediately after each summary, Claude Code
stops auto-compacting after a few attempts and errors instead of looping.

## Cheap wins, in order

1. `/clear` between unrelated tasks. Rename the session first if you will want to find it again.
2. A `PreToolUse` filter on the noisiest command in the repo.
3. Prune memory files to what every request actually needs.
4. Prefer a CLI over an MCP server when both exist; a CLI adds no per-tool listing cost.
5. Right-size the model, including per-subagent, where a small model is enough.
6. Delegate verbose operations so raw output never touches the main context.
7. Write specific prompts. "Add input validation to the login function in auth.ts" and "improve this codebase"
   differ by an order of magnitude in files read.
8. Plan before implementing on non-trivial work, because rework is the most expensive token spend there is.

## Quality checklist

- [ ] A before-number was captured and quoted before any change was proposed.
- [ ] The single burn source being fixed is named, and its rank from the list is stated.
- [ ] An after-number was captured, or the delivery says the measurement is still pending.
- [ ] No claim of improvement appears without both numbers.
- [ ] Session-only commands were named for the user rather than described as run.
- [ ] Any threshold quoted is version-gated or marked `[unverified]`.

## Reference files

| File | Read when |
|---|---|
| `references/context-budgets.md` | Working out what loads when, or planning around compaction and cache behavior |
