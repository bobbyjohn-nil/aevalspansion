#!/usr/bin/env bash
# FORGE skill census. POSIX shell + awk only, no dependencies.
# Prints one JSON object per line to stdout. Never writes any file.
# Usage: scan_skills.sh [project_root]   (default: current directory)

set -u
ROOT="${1:-$PWD}"
HOME_DIR="${HOME:-$(cd ~ && pwd)}"

esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/ /g' | tr -d '\000-\037'; }

emit_manifest() {
  m="$HOME_DIR/.claude/skills/synced/manifest.json"
  [ -f "$m" ] || return 0
  # Flatten to one record per line first: the manifest may be pretty-printed or minified.
  tr '\n' ' ' < "$m" | sed 's/}[ ]*,[ ]*{/\
/g' | awk -v home="$HOME_DIR" '
    function jesc(s) { gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s); return s }
    {
      nm = ""; ds = ""
      if (match($0, /"name"[ ]*:[ ]*"[^"]*"/)) {
        s = substr($0, RSTART, RLENGTH); sub(/^"name"[ ]*:[ ]*"/, "", s); sub(/"$/, "", s); nm = s
      }
      if (nm == "") next
      if (match($0, /"description"[ ]*:[ ]*"[^"]*"/)) {
        s = substr($0, RSTART, RLENGTH); sub(/^"description"[ ]*:[ ]*"/, "", s); sub(/"$/, "", s); ds = s
      }
      if (length(ds) > 200) ds = substr(ds, 1, 200)
      printf "{\"id\":\"%s\",\"scope\":\"synced\",\"source_path\":\"%s/.claude/skills/synced/%s/SKILL.md\",\"plugin\":null,\"pack\":null,\"kind\":\"user\",\"domain\":\"unclassified\",\"owner\":\"user\",\"classification_tier\":\"unclassified\",\"description_excerpt\":\"%s\"}\n", jesc(nm), home, jesc(nm), jesc(ds)
    }
  '
}

# Parse one SKILL.md frontmatter and emit a JSON line.
emit_skill() {
  f="$1"; scope="$2"; plugin="$3"
  [ -f "$f" ] || return 0
  awk -v path="$f" -v scope="$scope" -v plugin="$plugin" '
    function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t\r]+$/, "", s); return s }
    function unq(s) { if (s ~ /^".*"$/ || s ~ /^'\''.*'\''$/) s = substr(s, 2, length(s) - 2); return s }
    function jesc(s) { gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s); return s }
    NR == 1 { if ($0 !~ /^---[ \t\r]*$/) exit; infm = 1; next }
    infm && /^(---|\.\.\.)[ \t\r]*$/ { infm = 0; exit }
    infm {
      line = $0
      if (line ~ /^[A-Za-z_][A-Za-z0-9_-]*:/) {
        key = line; sub(/:.*$/, "", key)
        val = trim(substr(line, index(line, ":") + 1))
        cur = key; inmeta = (key == "metadata")
        if (key == "name") name = unq(val)
        else if (key == "description") { desc = unq(val); if (desc == ">-" || desc == ">" || desc == "|" || desc == "|-") desc = "" }
      } else if (line ~ /^[ \t]/) {
        v = trim(line)
        if (inmeta && v ~ /^[A-Za-z_][A-Za-z0-9_-]*:/) {
          mk = v; sub(/:.*$/, "", mk)
          mv = unq(trim(substr(v, index(v, ":") + 1)))
          if (mk == "pack") pack = mv; else if (mk == "kind") kind = mv; else if (mk == "domain") domain = mv
        } else if (cur == "description") {
          desc = (desc == "" ? v : desc " " v)
        }
      }
    }
    END {
      if (name == "") { n = split(path, parts, "/"); name = parts[n - 1] }
      if (length(desc) > 200) desc = substr(desc, 1, 200)
      if (kind == "") kind = (name ~ /-orchestrator$/) ? "orchestrator" : \
                              (name ~ /-loop$/) ? "loop" : \
                              (name ~ /-taste$/) ? "taste" : \
                              (name ~ /-skillmap$/) ? "skillmap" : \
                              (name ~ /-noslop$/) ? "noslop" : \
                              (name ~ /-perf$/) ? "perf" : \
                              (name ~ /-explain$/) ? "explain" : "user"
      if (pack == "") pack = "null"
      if (domain == "") domain = "unclassified"
      # owner forge only when the pack claim is backed by the file living inside that pack plugin,
      # under either install path: ~/.claude/skills/<pack>/ or ~/.claude/plugins/cache/<pack>/
      inpack = (index(path, "/skills/" pack "/skills/") > 0) || (index(path, "/plugins/cache/" pack "/skills/") > 0)
      owner = ((pack == "webforge" || pack == "appforge" || pack == "ccforge") && inpack) ? "forge" : "user"
      tier  = (pack != "null" && kind != "user") ? "authoritative" : "inferred"
      printf "{\"id\":\"%s\",\"scope\":\"%s\",\"source_path\":\"%s\",\"plugin\":%s,\"pack\":%s,\"kind\":\"%s\",\"domain\":\"%s\",\"owner\":\"%s\",\"classification_tier\":\"%s\",\"description_excerpt\":\"%s\"}\n", \
        jesc(name), scope, jesc(path), (plugin == "" ? "null" : "\"" plugin "\""), (pack == "null" ? "null" : "\"" pack "\""), kind, jesc(domain), owner, tier, jesc(desc)
    }
  ' "$f"
}

emit_manifest

# Personal scope: ~/.claude/skills/<skill>/SKILL.md  (excluding synced/)
for f in "$HOME_DIR"/.claude/skills/*/SKILL.md; do
  case "$f" in *"/synced/"*|*"*"*) continue ;; esac
  emit_skill "$f" personal ""
done

# Skills-directory plugins: ~/.claude/skills/<plugin>/skills/<skill>/SKILL.md
for f in "$HOME_DIR"/.claude/skills/*/skills/*/SKILL.md; do
  case "$f" in *"*"*) continue ;; esac
  pl=${f#"$HOME_DIR"/.claude/skills/}; pl=${pl%%/*}
  emit_skill "$f" plugin "$pl"
done

# Marketplace plugin cache: ~/.claude/plugins/cache/<plugin>/skills/<skill>/SKILL.md
for f in "$HOME_DIR"/.claude/plugins/cache/*/skills/*/SKILL.md; do
  case "$f" in *"*"*) continue ;; esac
  pl=${f#"$HOME_DIR"/.claude/plugins/cache/}; pl=${pl%%/*}
  emit_skill "$f" plugin "$pl"
done

# Project scope, including nested monorepo packages. Prune heavy directories.
if [ -d "$ROOT" ]; then
  find "$ROOT" \
    \( -name node_modules -o -name .git -o -name dist -o -name build -o -name .next -o -name ios -o -name android -o -name target \) -prune -o \
    -path '*/.claude/skills/*/SKILL.md' -print 2>/dev/null | while IFS= read -r f; do
      case "$f" in "$ROOT"/.claude/skills/*) sc=project ;; *) sc=nested ;; esac
      emit_skill "$f" "$sc" ""
    done
fi

# Legacy command files, lowest priority. Name only, no frontmatter expected.
for f in "$ROOT"/.claude/commands/*.md; do
  case "$f" in *"*"*) continue ;; esac
  b=$(basename "$f" .md)
  printf '{"id":"%s","scope":"command","source_path":"%s","plugin":null,"pack":null,"kind":"user","domain":"unclassified","owner":"user","classification_tier":"unclassified","description_excerpt":""}\n' "$(esc "$b")" "$(esc "$f")"
done
