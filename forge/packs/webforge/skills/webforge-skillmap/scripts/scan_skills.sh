#!/usr/bin/env bash
# FORGE skill census scanner. POSIX shell + awk only. No third-party dependencies.
# Prints one JSON object per line to stdout. Never edits, renames, or moves any file.
#
# Usage: scan_skills.sh [project_root]
#   project_root defaults to the current working directory.

set -u

PROJECT_ROOT="${1:-$PWD}"
HOME_DIR="${HOME:-$(cd ~ && pwd)}"

emit() {
  # emit <source_path> <scope> <plugin_or_empty>
  awk -v path="$1" -v scope="$2" -v plugin="$3" '
    function esc(s) {
      gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s)
      gsub(/\t/, " ", s); gsub(/\r/, "", s)
      return s
    }
    function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
    function unquote(s) {
      s = trim(s)
      if (s ~ /^".*"$/) { s = substr(s, 2, length(s) - 2) }
      else if (s ~ /^'"'"'.*'"'"'$/) { s = substr(s, 2, length(s) - 2) }
      return s
    }
    function setval(k, v) {
      if (k == "name") name = v
      else if (k == "description") desc = v
      else if (k == "allowed-tools") tools = v
    }
    function setmeta(k, v) {
      if (k == "pack") pack = v
      else if (k == "kind") kind = v
      else if (k == "domain") domain = v
      else if (k == "version") ver = v
    }
    BEGIN { infm = 0; done = 0; fold = ""; inmeta = 0
            name = ""; desc = ""; pack = ""; kind = ""; domain = ""; ver = ""; tools = "" }
    done { next }
    NR == 1 { if ($0 ~ /^---[ \t]*$/) { infm = 1; next } else { done = 1; next } }
    infm && $0 ~ /^(---|\.\.\.)[ \t]*$/ { done = 1; next }
    infm {
      line = $0
      sub(/\r$/, "", line)
      if (line ~ /^[A-Za-z_][A-Za-z0-9_-]*:/) {
        fold = ""; inmeta = 0
        k = line; sub(/:.*$/, "", k)
        v = line; sub(/^[^:]*:[ \t]*/, "", v)
        v = trim(v)
        if (k == "metadata") { inmeta = 1; next }
        if (v == ">-" || v == ">" || v == "|" || v == "|-" || v == ">+" || v == "|+") { fold = k; next }
        setval(k, unquote(v))
        next
      }
      if (line ~ /^[ \t]+/) {
        t = trim(line)
        if (t == "") next
        if (fold != "") {
          if (fold == "name") name = (name == "" ? t : name " " t)
          else if (fold == "description") desc = (desc == "" ? t : desc " " t)
          next
        }
        if (inmeta && t ~ /^[A-Za-z_][A-Za-z0-9_-]*:/) {
          mk = t; sub(/:.*$/, "", mk)
          mv = t; sub(/^[^:]*:[ \t]*/, "", mv)
          setmeta(mk, unquote(mv))
          next
        }
      }
    }
    END {
      if (name == "") {
        n = split(path, parts, "/")
        name = parts[n - 1]
        if (name == "" || name == ".") name = "unknown"
      }
      excerpt = substr(desc, 1, 200)
      printf "{\"id\":\"%s\",\"scope\":\"%s\",\"plugin\":\"%s\",\"source_path\":\"%s\",", \
             esc(name), esc(scope), esc(plugin), esc(path)
      printf "\"description_excerpt\":\"%s\",\"description_len\":%d,", esc(excerpt), length(desc)
      printf "\"meta_pack\":\"%s\",\"meta_kind\":\"%s\",\"meta_domain\":\"%s\",\"meta_version\":\"%s\",", \
             esc(pack), esc(kind), esc(domain), esc(ver)
      printf "\"allowed_tools\":\"%s\"}\n", esc(tools)
    }
  ' "$1"
}

# 1. Synced manifest: structured census produced by the platform. Read it once, do not open each SKILL.md.
SYNCED_MANIFEST="$HOME_DIR/.claude/skills/synced/manifest.json"
if [ -f "$SYNCED_MANIFEST" ]; then
  printf '{"_kind":"pointer","source":"synced_manifest","path":"%s","action":"Read this file once; do not open each synced SKILL.md"}\n' "$SYNCED_MANIFEST"
else
  for f in "$HOME_DIR"/.claude/skills/synced/*/SKILL.md; do
    [ -f "$f" ] && emit "$f" "synced" ""
  done
fi

# 2. Personal skills and personal skills-directory plugins.
for f in "$HOME_DIR"/.claude/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  case "$f" in */synced/*) continue ;; esac
  emit "$f" "personal" ""
done
for f in "$HOME_DIR"/.claude/skills/*/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  case "$f" in */synced/*) continue ;; esac
  p="${f#"$HOME_DIR"/.claude/skills/}"; p="${p%%/*}"
  emit "$f" "plugin" "$p"
done

# 3. Marketplace plugin cache.
for f in "$HOME_DIR"/.claude/plugins/cache/*/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  p="${f#"$HOME_DIR"/.claude/plugins/cache/}"; p="${p%%/*}"
  emit "$f" "plugin" "$p"
done

# 4. Project skills, repo-wide, including nested monorepo packages not yet activated.
if [ -d "$PROJECT_ROOT" ]; then
  find "$PROJECT_ROOT" -type d \( -name node_modules -o -name .git -o -name dist -o -name .next \) -prune -o \
       -type f -path '*/.claude/skills/*/SKILL.md' -print 2>/dev/null | while IFS= read -r f; do
    d="${f%/.claude/skills/*}"
    if [ "$d" = "$PROJECT_ROOT" ]; then emit "$f" "project" ""; else emit "$f" "nested" ""; fi
  done
fi

# 5. Legacy command files. These lose to any same-named skill.
for f in "$PROJECT_ROOT"/.claude/commands/*.md; do
  [ -f "$f" ] || continue
  n="${f##*/}"; n="${n%.md}"
  printf '{"_kind":"command","id":"%s","scope":"project","source_path":"%s"}\n' "$n" "$f"
done
