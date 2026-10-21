#!/usr/bin/env bash
# FORGE skill census scanner.
# POSIX shell plus awk. No third-party dependency, no YAML library.
# Prints one JSON object per line to stdout. Reads only; never edits, renames, or moves any file.
#
# Usage: scan_skills.sh [project_root]     project_root defaults to $PWD

set -u

ROOT="${1:-$PWD}"
HOMEDIR="${HOME:-$(cd ~ 2>/dev/null && pwd)}"

# emit_skill <path> <scope> <plugin-or-empty>
emit_skill() {
  awk -v path="$1" -v scope="$2" -v plugin="$3" '
    function jesc(s) {
      gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s)
      gsub(/\t/, " ", s); gsub(/\r/, "", s)
      return s
    }
    function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
    function unquote(s,   q) {
      s = trim(s); q = substr(s, 1, 1)
      if ((q == "\"" || q == "'"'"'") && substr(s, length(s), 1) == q) s = substr(s, 2, length(s) - 2)
      return s
    }
    BEGIN { infm = 0; done = 0; fold = ""; inmeta = 0 }
    done { next }
    NR == 1 { if ($0 ~ /^---[ \t]*$/) { infm = 1 } else { done = 1 } ; next }
    infm && $0 ~ /^(---|\.\.\.)[ \t]*$/ { done = 1; next }
    infm {
      line = $0; sub(/\r$/, "", line)
      if (line ~ /^[A-Za-z_][A-Za-z0-9_-]*:/) {
        fold = ""; inmeta = 0
        k = line; sub(/:.*$/, "", k)
        v = trim(substr(line, index(line, ":") + 1))
        if (k == "metadata") { inmeta = 1; next }
        if (v == ">" || v == ">-" || v == ">+" || v == "|" || v == "|-" || v == "|+") { fold = k; next }
        if (k == "name") name = unquote(v)
        else if (k == "description") desc = unquote(v)
        else if (k == "allowed-tools") tools = unquote(v)
        next
      }
      if (line ~ /^[ \t]/) {
        t = trim(line)
        if (t == "") next
        if (fold == "description") { desc = (desc == "" ? t : desc " " t); next }
        if (fold == "name") { name = (name == "" ? t : name " " t); next }
        if (inmeta && t ~ /^[A-Za-z_][A-Za-z0-9_-]*:/) {
          mk = t; sub(/:.*$/, "", mk)
          mv = unquote(trim(substr(t, index(t, ":") + 1)))
          if (mk == "pack") pack = mv
          else if (mk == "kind") kind = mv
          else if (mk == "domain") domain = mv
          else if (mk == "version") ver = mv
        }
      }
    }
    END {
      n = split(path, p, "/"); dir = (n > 1 ? p[n - 1] : "")
      if (name == "") name = dir
      if (name == "" || name == ".") name = "unknown"
      # Invocation slug: directory name for personal/project/nested skills (frontmatter name is only a
      # display label there); plugin-namespaced for plugin skills.
      if (scope == "plugin") invoke = "/" plugin ":" name
      else invoke = "/" (dir == "" ? name : dir)
      excerpt = substr(desc, 1, 200)
      if (kind == "") {
        if (name ~ /-orchestrator$/) kind = "orchestrator"
        else if (name ~ /-skillmap$/) kind = "skillmap"
        else if (name ~ /-loop$/) kind = "loop"
        else if (name ~ /-taste$/) kind = "taste"
        else if (name ~ /-noslop$/) kind = "noslop"
        else if (name ~ /-perf$/) kind = "perf"
        else if (name ~ /-explain$/) kind = "explain"
        else kind = "user"
      }
      isforge = (pack == "webforge" || pack == "appforge" || pack == "ccforge")
      owner = isforge ? "forge" : ((scope == "plugin" || scope == "synced") ? "thirdparty" : "user")
      tier = (isforge && domain != "") ? "authoritative" : "inferred"
      if (domain == "") domain = "unclassified"
      printf "{\"id\":\"%s\",\"invoke_as\":\"%s\",\"scope\":\"%s\",\"plugin\":%s,\"source_path\":\"%s\",", \
        jesc(name), jesc(invoke), jesc(scope), (plugin == "" ? "null" : "\"" jesc(plugin) "\""), jesc(path)
      printf "\"pack\":%s,\"kind\":\"%s\",\"domain\":\"%s\",\"owner\":\"%s\",", \
        (pack == "" ? "null" : "\"" jesc(pack) "\""), jesc(kind), jesc(domain), owner
      printf "\"classification_tier\":\"%s\",\"version\":\"%s\",\"allowed_tools\":\"%s\",", \
        tier, jesc(ver), jesc(tools)
      printf "\"description_len\":%d,\"description_excerpt\":\"%s\"}\n", length(desc), jesc(excerpt)
    }
  ' "$1"
}

# 1. Synced manifest. Already a structured census; point at it instead of opening each SKILL.md.
SYNCED="$HOMEDIR/.claude/skills/synced/manifest.json"
if [ -f "$SYNCED" ]; then
  printf '{"_kind":"pointer","source":"synced_manifest","path":"%s","action":"Read this one file; do not open each synced SKILL.md"}\n' "$SYNCED"
else
  for f in "$HOMEDIR"/.claude/skills/synced/*/SKILL.md; do
    [ -f "$f" ] && emit_skill "$f" "synced" ""
  done
fi

# 2. Personal skills, and personal skills-directory plugins.
for f in "$HOMEDIR"/.claude/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  case "$f" in */synced/*) continue ;; esac
  emit_skill "$f" "personal" ""
done
for f in "$HOMEDIR"/.claude/skills/*/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  case "$f" in */synced/*) continue ;; esac
  pl=${f#"$HOMEDIR"/.claude/skills/}; pl=${pl%%/*}
  emit_skill "$f" "plugin" "$pl"
done

# 3. Marketplace plugin cache.
for f in "$HOMEDIR"/.claude/plugins/cache/*/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  pl=${f#"$HOMEDIR"/.claude/plugins/cache/}; pl=${pl%%/*}
  emit_skill "$f" "plugin" "$pl"
done

# 4. Project skills, repo-wide, including nested monorepo packages not yet activated.
if [ -d "$ROOT" ]; then
  find "$ROOT" \
    \( -name node_modules -o -name .git -o -name dist -o -name build -o -name .next \
       -o -name target -o -name vendor -o -name .venv \) -prune -o \
    -type f -path '*/.claude/skills/*/SKILL.md' -print 2>/dev/null | while IFS= read -r f; do
      case "$f" in "$ROOT"/.claude/skills/*) sc="project" ;; *) sc="nested" ;; esac
      emit_skill "$f" "$sc" ""
    done
fi

# 5. Legacy command files. Lose to any same-named skill.
for f in "$ROOT"/.claude/commands/*.md; do
  [ -f "$f" ] || continue
  b=${f##*/}; b=${b%.md}
  printf '{"id":"%s","invoke_as":"/%s","scope":"command","plugin":null,"source_path":"%s","pack":null,"kind":"user","domain":"unclassified","owner":"user","classification_tier":"unclassified","version":"","allowed_tools":"","description_len":0,"description_excerpt":""}\n' "$b" "$b" "$f"
done

exit 0
