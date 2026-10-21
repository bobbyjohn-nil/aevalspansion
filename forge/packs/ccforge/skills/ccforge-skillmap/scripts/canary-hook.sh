#!/usr/bin/env bash
# FORGE canary enforcer. Opt-in. Not registered by any FORGE pack; the user pastes it into settings.json.
#
# Purpose: fail the turn when the assistant's last message did not end with a `[skills: ...]` receipt line,
# so a silently-degraded skill context is visible instead of invisible.
#
# Wiring (user action, never automatic) - in ~/.claude/settings.json or .claude/settings.json:
#   { "hooks": { "Stop": [ { "hooks": [
#       { "type": "command", "command": "~/.claude/skills/ccforge/skills/ccforge-skillmap/scripts/canary-hook.sh" }
#   ] } ] } }
# Remove it by deleting that Stop entry. Nothing else to undo.
#
# Contract: exit 0 = let the turn end. exit 2 = block, stderr becomes the correction Claude reads.
# Safety: exits 0 immediately when stop_hook_active is true, so it cannot fight the consecutive-block cap.
# Safety: exits 0 when it cannot find the message field. This hook fails open, never closed.
#
# jq is used when present and not required. Without jq the check is a looser pattern match on the payload.

set -u

payload=$(cat)

HAVE_JQ=0
command -v jq >/dev/null 2>&1 && HAVE_JQ=1

# Re-entry guard. Without this a Stop hook can block repeatedly and burn the block budget.
# Match the key and its own value, never a stray "true" elsewhere in the payload.
if [ "$HAVE_JQ" -eq 1 ]; then
  printf '%s' "$payload" | jq -e '.stop_hook_active == true' >/dev/null 2>&1 && exit 0
else
  printf '%s' "$payload" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
fi

msg=""
have_field=0

if [ "$HAVE_JQ" -eq 1 ]; then
  if printf '%s' "$payload" | jq -e 'has("last_assistant_message")' >/dev/null 2>&1; then
    have_field=1
    msg=$(printf '%s' "$payload" | jq -r '.last_assistant_message // ""')
  fi
else
  case "$payload" in
    *'"last_assistant_message"'*) have_field=1 ;;
  esac
fi

# Field absent from this event's payload: nothing to check, do not block.
[ "$have_field" -eq 1 ] || exit 0

if [ -n "$msg" ]; then
  # Last non-blank line, trailing whitespace and CR stripped.
  last=$(printf '%s\n' "$msg" | grep -v '^[[:space:]]*$' | tail -n 1 | sed 's/[[:space:]]*$//')
  case "$last" in
    '[skills: '*']') exit 0 ;;
  esac
elif [ "$HAVE_JQ" -eq 0 ]; then
  # No jq: match the receipt bracket followed only by string-closing whitespace in the raw payload.
  if printf '%s' "$payload" | grep -q '\[skills: [^]"]*\]\(\\n\|\\r\|\\t\|[[:space:]]\)*"'; then
    exit 0
  fi
fi

cat >&2 <<'MSG'
Missing activation receipt. End the reply with exactly one line, after a blank line, as the last visible
output: [skills: name1 > name2] listing every skill that fired this turn in order. If no skill fired, say so
in one short line and end with [skills: none]. Do not add a heading, a banner, or a second such line.
MSG
exit 2
