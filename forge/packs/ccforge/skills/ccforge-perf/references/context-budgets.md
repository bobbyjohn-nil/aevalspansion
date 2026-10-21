# Context budgets reference

## Contents

1. Startup budget: what loads before you type
2. Context cost by feature
3. Auto-compaction thresholds
4. What survives compaction
5. Checkpoints and their limits
6. Cache and cost mechanics
7. Status line fields
8. Retention on disk
9. Environment variables that move a budget

## 1. Startup budget: what loads before you type

In order: the full memory-file hierarchy, then auto memory (`MEMORY.md`, capped), then environment info (working
directory, platform, git branch and status as a separate trailing block), then MCP tool names with schemas
deferred, then skill descriptions with bodies deferred, then the system prompt, then output-style additions and
any `--append-system-prompt`.

Everything in that list is paid on every request for the life of the session.

## 2. Context cost by feature

| Feature | When it loads | What loads | Cost |
|---|---|---|---|
| Memory files | session start | full content | every request |
| Skills | session start plus on use | descriptions at start, body on invoke | low, descriptions every request |
| MCP servers | session start | tool names; schemas on demand | low until a tool is used |
| Code intelligence | after edits and on demand | diagnostics after edit, symbol lookups on demand | low, often reduces net reads |
| Subagents | on spawn | fresh context, specified skills preloaded | isolated from the main session |
| Hooks | on trigger | nothing; they run externally | zero unless they return text |

The skill listing itself is capped near 1% of the context window and drops the descriptions of least-invoked
skills first. A long description is a liability, not thoroughness.

## 3. Auto-compaction thresholds

| Model or configuration | Compacts at |
|---|---|
| Cloud sessions on the web | as the conversation approaches the model limit |
| Sonnet 4.6, Opus 4.6 without extended context | 200K boundary |
| Opus with a 200K window on a cloud provider | 200K boundary |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` on a native 1M model | 200K boundary |
| Sonnet 5, default, no override | around 967,000 tokens |
| Unrecognized or gateway model ID | whatever `CLAUDE_CODE_MAX_CONTEXT_TOKENS` declares |

Overrides, in increasing priority: `autoCompactWindow` in settings, the `--autocompact` flag for the session,
`CLAUDE_CODE_AUTO_COMPACT_WINDOW` in the environment. `/autocompact 500k` writes the settings value; the
accepted range is 100K to 1M.

Thrashing guard: if one file or tool output is large enough that context refills immediately after each
summary, Claude Code stops auto-compacting after a few attempts and errors rather than looping.

## 4. What survives compaction

| Mechanism | After compaction |
|---|---|
| System prompt and output style | unchanged; not part of message history |
| Project-root memory file and unscoped rules | re-injected from disk |
| Auto memory | re-injected from disk |
| Rules with `paths:` frontmatter | lost until a matching file is read again |
| Nested subdirectory memory files | lost until a file in that subdirectory is read again |
| Invoked skill bodies | re-injected: most recent invocation of each skill only, 5,000 tokens per skill, 25,000 total, oldest dropped first |
| Hooks | not applicable; they run as code |

Two consequences worth designing around. Anything load-bearing for a whole session must live in the
project-root memory file, not in a scoped rule. And truncation keeps the start of a skill file, so load-bearing
instructions belong near the top.

## 5. Checkpoints and their limits

Every user prompt creates a checkpoint. The 100 most recent per session keep file snapshots; older snapshots
are deleted except each file's first, kept as the diff baseline.

Not tracked, therefore not restorable: files modified by Bash commands, subagent edits (except a foreground
forked skill, which edits during your own turn and is captured), external changes from manual edits or another
session, and symlinked or hard-linked paths.

Checkpoints are not a replacement for git, and they are deleted along with sessions after `cleanupPeriodDays`.

## 6. Cache and cost mechanics

- Every request re-sends the full conversation, so a session open all day carries cache-read cost for its
  whole history even on a one-line question.
- Cache lifetime is one hour on subscription plans, five minutes once drawing on usage credits, and five
  minutes by default on an API key or cloud provider, extendable to one hour with `ENABLE_PROMPT_CACHING_1H=1`.
  The first message after a gap longer than the lifetime reprocesses the full context at full price.
- `/compact` itself reads the whole conversation to summarize it. Compacting a huge context is a large
  request; `/clear` costs nothing by comparison.
- Scheduled tasks and cross-session messages firing into an idle session each send full context.
- Agent teammates keep consuming tokens until they exit.
- Background usage in an idle session, for resume summarization and status, is typically under four cents per
  session.
- Agent teams in plan mode run roughly seven times the tokens of a standard session, because each teammate is
  a separate instance with its own window.

Deployment-scale baselines, useful only for sanity-checking an unusual bill: roughly 13 US dollars per
developer per active day, 150 to 250 per developer per month, and under 30 per active day for the large
majority of users.

## 7. Status line fields

A status line script receives JSON on stdin on every render. The fields useful for a context or cost display:

```json
{
  "model": { "id": "...", "display_name": "..." },
  "context_window": {
    "total_input_tokens": 15500, "context_window_size": 200000,
    "used_percentage": 8, "remaining_percentage": 92
  },
  "cost": { "total_cost_usd": 0.01234, "total_duration_ms": 45000 },
  "effort": { "level": "high" },
  "session_name": "my-session",
  "output_style": { "name": "default" }
}
```

`used_percentage` counts input tokens only: input plus cache creation plus cache read. It does not include
output tokens. `context_window.current_usage` is null before the first API call and again immediately after a
compact until the next call repopulates it, so any script reading it must null-guard.

Disabling a custom status line restores the built-in footer badges that a custom one otherwise suppresses.

## 8. Retention on disk

Auto-cleaned after `cleanupPeriodDays`, default 30, minimum 1: session transcripts under
`projects/<project>/`, subagent and tool-result files, checkpoint snapshots in `file-history/`, `plans/`,
`debug/`, paste and image caches, `tasks/`, `shell-snapshots/`, `backups/`, `usage-data/`.

Never auto-cleaned: `history.jsonl`, which holds every prompt ever typed for up-arrow recall and grows
forever, plus `stats-cache.json` and a few caches.

Excluded from the sweep: per-session lock files, and auto memory, which is removed only after being empty for
the full retention period.

Everything is plaintext and unencrypted at rest. If a tool reads a `.env` file or a command prints a
credential, that value is written into the session transcript. Mitigations: lower `cleanupPeriodDays`,
`CLAUDE_CODE_SKIP_PROMPT_HISTORY`, `--no-session-persistence` for a single run, or `Read` deny rules on
credential files. `claude project purge [path] [--dry-run]` deletes all local state for one project.

## 9. Environment variables that move a budget

| Variable | Effect | Default |
|---|---|---|
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | auto-compact threshold, highest precedence | unset |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | `1` caps every model at 200K | unset |
| `CLAUDE_CODE_EFFORT_LEVEL` | effort override, highest precedence of all effort methods | unset |
| `MAX_THINKING_TOKENS` | thinking budget on fixed-budget models; `0` disables thinking on the Anthropic API | unset |
| `BASH_MAX_OUTPUT_LENGTH` | maximum characters of Bash output read back | 30000 |
| `BASH_DEFAULT_TIMEOUT_MS` | default Bash timeout | 120000 |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `1` disables auto memory | unset |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY` | skip writing transcripts and history | unset |
| `CLAUDE_CONFIG_DIR` | relocate the whole config directory | `~/.claude` |

Numeric values accept scientific notation and digit separators on current versions.
