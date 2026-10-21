#!/bin/sh
# FORGE installer. POSIX shell. No dependencies, no build step.
# Copies the skill directories of webforge, appforge, and ccforge into a Claude Code skills directory.
#
# Usage:
#   ./install.sh                       interactive: asks project or personal
#   ./install.sh --project             into ./.claude/skills/
#   ./install.sh --user                into ~/.claude/skills/
#   ./install.sh --project --packs webforge,ccforge
#   ./install.sh --user --force        overwrite same-named skills without asking
#   ./install.sh --project --dry-run   print what would happen, change nothing

set -eu

SRC=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ALL_PACKS="webforge appforge ccforge"

TARGET=""
PACKS=""
FORCE=0
DRYRUN=0

die() { printf '%s\n' "install.sh: $1" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --project) TARGET="project" ;;
    --user)    TARGET="user" ;;
    --packs)   shift; [ $# -gt 0 ] || die "--packs needs a value"
               PACKS=$(printf '%s' "$1" | tr ',' ' ') ;;
    --force)   FORCE=1 ;;
    --dry-run) DRYRUN=1 ;;
    -h|--help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
  shift
done

[ -d "$SRC/packs" ] || die "no packs/ directory next to this script (looked in $SRC)"

if [ -z "$PACKS" ]; then PACKS="$ALL_PACKS"; fi
for p in $PACKS; do
  [ -d "$SRC/packs/$p/skills" ] || die "unknown pack '$p' (have: $ALL_PACKS)"
done

if [ -z "$TARGET" ]; then
  if [ -t 0 ]; then
    printf 'Install FORGE where?\n'
    printf '  1) this project only   ./.claude/skills/      (recommended)\n'
    printf '  2) all projects        ~/.claude/skills/\n'
    printf 'Choice [1]: '
    read -r ans || ans=""
    case "$ans" in
      2) TARGET="user" ;;
      1|"") TARGET="project" ;;
      *) die "answer 1 or 2" ;;
    esac
  else
    die "no terminal to ask on; pass --project or --user"
  fi
fi

if [ "$TARGET" = "project" ]; then
  DEST="$PWD/.claude/skills"
  SCOPE_NOTE="this project only (run claude from $PWD)"
else
  DEST="${HOME}/.claude/skills"
  SCOPE_NOTE="every project on this machine"
fi

printf 'Source: %s\n' "$SRC/packs"
printf 'Target: %s\n' "$DEST"
printf 'Packs:  %s\n\n' "$PACKS"

[ "$DRYRUN" -eq 1 ] || mkdir -p "$DEST"

INSTALLED=""
UPDATED=""
UNCHANGED=""
SKIPPED=""

for pack in $PACKS; do
  for skilldir in "$SRC/packs/$pack/skills"/*/; do
    name=$(basename "$skilldir")
    [ -f "$skilldir/SKILL.md" ] || { SKIPPED="$SKIPPED $name(no-SKILL.md)"; continue; }
    dst="$DEST/$name"

    if [ -d "$dst" ]; then
      if diff -r "$skilldir" "$dst" >/dev/null 2>&1; then
        UNCHANGED="$UNCHANGED $name"
        continue
      fi
      if [ "$FORCE" -ne 1 ]; then
        if [ -t 0 ]; then
          printf '%s already exists at %s and differs. Overwrite? [y/N]: ' "$name" "$dst"
          read -r ov || ov=""
          case "$ov" in
            y|Y|yes|YES) : ;;
            *) SKIPPED="$SKIPPED $name(kept-yours)"; continue ;;
          esac
        else
          SKIPPED="$SKIPPED $name(exists)"
          continue
        fi
      fi
      if [ "$DRYRUN" -eq 1 ]; then
        UPDATED="$UPDATED $name"
      else
        rm -rf "$dst"
        cp -R "$skilldir" "$dst"
        UPDATED="$UPDATED $name"
      fi
    else
      if [ "$DRYRUN" -eq 1 ]; then
        INSTALLED="$INSTALLED $name"
      else
        cp -R "$skilldir" "$dst"
        INSTALLED="$INSTALLED $name"
      fi
    fi
  done
done

if [ "$DRYRUN" -eq 0 ]; then
  find "$DEST" -type f -name '*.sh' -exec chmod +x {} + 2>/dev/null || true
fi

count() { printf '%s' "$1" | wc -w | tr -d ' '; }

printf '\n'
[ "$DRYRUN" -eq 1 ] && printf 'DRY RUN - nothing was written.\n\n'

printf 'Installed new (%s):\n' "$(count "$INSTALLED")"
for s in $INSTALLED; do printf '  %s\n' "$DEST/$s"; done
[ -n "$INSTALLED" ] || printf '  none\n'

printf 'Replaced with the pack version (%s):\n' "$(count "$UPDATED")"
for s in $UPDATED; do printf '  %s\n' "$DEST/$s"; done
[ -n "$UPDATED" ] || printf '  none\n'

printf 'Already identical, left alone (%s):\n' "$(count "$UNCHANGED")"
for s in $UNCHANGED; do printf '  %s\n' "$s"; done
[ -n "$UNCHANGED" ] || printf '  none\n'

printf 'Your files, kept (%s):\n' "$(count "$SKIPPED")"
for s in $SKIPPED; do printf '  %s\n' "$s"; done
[ -n "$SKIPPED" ] || printf '  none\n'

printf '\nWhat this did: copied each skill directory into %s.\n' "$DEST"
printf 'Scope: %s.\n' "$SCOPE_NOTE"
printf 'Nothing else changed. No settings file, no CLAUDE.md, no dependencies installed.\n'
printf 'Restart claude (or open a new VS Code terminal and run claude) to load them.\n'
printf 'Check it worked:  ls %s | wc -l\n' "$DEST"
printf 'Prove it fired:   ask claude anything web-shaped and read the last line, [skills: ...]\n'

printf '\nUninstall (removes only the FORGE skills, leaves yours):\n'
UNINST=""
for pack in $PACKS; do
  UNINST="$UNINST $DEST/$pack-*"
done
printf '  rm -rf%s\n' "$UNINST"
printf '  rm -rf %s/.claude/forge %s/forge   # derived index and routing fragment\n' "$PWD" "${HOME}/.claude"
