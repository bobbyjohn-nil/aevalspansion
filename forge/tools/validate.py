#!/usr/bin/env python3
"""FORGE structural validation. Stdlib only. Exit 0 clean, 1 on any failure."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKS = ["webforge", "appforge", "ccforge"]
ALLOWED_KEYS = {"name", "description", "metadata", "allowed-tools"}
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# Real leftover stubs only. `TODO.md` is a ledger filename and `todo:` is a Conventional Comments
# label; both are legitimate content, so neither matches here.
PLACEHOLDER = re.compile(
    r"(?<![\w.])TODO(?!\.md)\b"
    r"|\bTBD\b|\bFIXME\b|\bXXX\b"
    r"|lorem ipsum dolor"
    r"|\bPLACEHOLDER\b|<placeholder>|\[placeholder\]"
    r"|\bCOMING SOON\b|\bcoming soon\b"
    r"|\byour name here\b|\bfill (?:this |me )?in\b"
)
BANNED_SUBSTR = ("claude", "anthropic")
CAPS = {"orchestrator": 500, "loop": 350, "skillmap": 250,
        "noslop": 250, "perf": 250, "explain": 250}
DEFAULT_CAP = 300

fail = []
warn = []
counts = {}


def parse_frontmatter(text, path):
    if not text.startswith("---\n"):
        fail.append(f"{path}: no opening --- frontmatter fence")
        return None, text
    end = text.find("\n---\n", 3)
    if end == -1:
        fail.append(f"{path}: unterminated frontmatter block")
        return None, text
    block = text[4:end + 1]
    body = text[end + 5:]
    data, key, buf = {}, None, []
    for raw in block.split("\n"):
        if raw.strip() == "" and key is None:
            continue
        if raw.startswith((" ", "\t")) or raw.strip() == "":
            if key is None:
                fail.append(f"{path}: indented line before any key: {raw!r}")
                return None, body
            buf.append(raw.strip())
            continue
        if key is not None:
            data[key] = " ".join(x for x in buf if x)
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", raw)
        if not m:
            fail.append(f"{path}: unparseable frontmatter line: {raw!r}")
            return None, body
        key = m.group(1)
        v = m.group(2).strip()
        buf = [] if v in (">-", ">", "|", "|-", "") else [v]
    if key is not None:
        data[key] = " ".join(x for x in buf if x)
    return data, body


for pack in PACKS:
    pdir = os.path.join(ROOT, "packs", pack)
    sdir = os.path.join(pdir, "skills")
    if not os.path.isdir(sdir):
        fail.append(f"{pack}: no skills/ directory")
        continue
    names = sorted(d for d in os.listdir(sdir) if os.path.isdir(os.path.join(sdir, d)))
    counts[pack] = len(names)
    for name in names:
        skill = os.path.join(sdir, name)
        rel = f"packs/{pack}/skills/{name}"
        md = os.path.join(skill, "SKILL.md")
        if not os.path.isfile(md):
            fail.append(f"{rel}: no SKILL.md")
            continue
        text = open(md, encoding="utf-8").read()
        fm, body = parse_frontmatter(text, rel + "/SKILL.md")
        if fm is None:
            continue
        if fm.get("name") != name:
            fail.append(f"{rel}: frontmatter name {fm.get('name')!r} != directory {name!r}")
        if not NAME_RE.match(name) or len(name) > 64:
            fail.append(f"{rel}: illegal skill name")
        if not name.startswith(pack + "-"):
            fail.append(f"{rel}: name not prefixed with pack {pack}")
        for bad in BANNED_SUBSTR:
            if bad in name:
                fail.append(f"{rel}: name contains reserved substring {bad!r}")
        extra = set(fm) - ALLOWED_KEYS
        if extra:
            fail.append(f"{rel}: forbidden frontmatter keys {sorted(extra)}")
        desc = fm.get("description", "")
        if not desc:
            fail.append(f"{rel}: empty description")
        elif not 250 <= len(desc) <= 450:
            fail.append(f"{rel}: description {len(desc)} chars, want 250-450")
        if "<" in desc or ">" in desc:
            fail.append(f"{rel}: angle bracket in description")
        kind = name.split("-")[-1]
        cap = CAPS.get(kind, DEFAULT_CAP)
        n = len(body.strip().split("\n"))
        if n > cap:
            fail.append(f"{rel}: body {n} lines, cap {cap}")
        if "## Activation receipt" not in body:
            fail.append(f"{rel}: missing Activation receipt section")

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in (".git", "research", "tools")]
    for fn in filenames:
        p = os.path.join(dirpath, fn)
        r = os.path.relpath(p, ROOT)
        if os.path.getsize(p) == 0:
            fail.append(f"{r}: empty file")
            continue
        if fn.endswith((".md", ".json", ".sh", ".jsonc")):
            t = open(p, encoding="utf-8", errors="replace").read()
            if not t.strip():
                fail.append(f"{r}: whitespace-only file")
            for m in PLACEHOLDER.finditer(t):
                fail.append(f"{r}: placeholder text {m.group(0)!r}")
            if "—" in t or "–" in t:
                fail.append(f"{r}: em/en dash present")
            if r.startswith("packs" + os.sep) or r in ("README.md", "QUICKSTART.md",
                                                       "ADDING-YOUR-OWN-SKILLS.md", "install.sh"):
                for i, line in enumerate(t.split("\n"), 1):
                    if any(ord(c) > 127 for c in line):
                        fail.append(f"{r}:{i}: non-ASCII character")
                        break
        if fn.endswith(".json"):
            try:
                json.load(open(p, encoding="utf-8"))
            except Exception as e:
                fail.append(f"{r}: invalid JSON: {e}")
        if fn.endswith(".sh") and not os.access(p, os.X_OK):
            fail.append(f"{r}: script not executable")

mk = os.path.join(ROOT, ".claude-plugin", "marketplace.json")
if not os.path.isfile(mk):
    fail.append(".claude-plugin/marketplace.json: missing")
else:
    m = json.load(open(mk, encoding="utf-8"))
    for k in ("name", "owner", "plugins"):
        if k not in m:
            fail.append(f"marketplace.json: missing required key {k!r}")
    if "name" not in m.get("owner", {}):
        fail.append("marketplace.json: owner.name required")
    listed = set()
    for e in m.get("plugins", []):
        if "name" not in e or "source" not in e:
            fail.append(f"marketplace.json: plugin entry missing name or source: {e}")
            continue
        listed.add(e["name"])
        src = e["source"]
        if not isinstance(src, str) or not src.startswith("./") or ".." in src:
            fail.append(f"marketplace.json: bad relative source {src!r}")
        elif not os.path.isdir(os.path.join(ROOT, src)):
            fail.append(f"marketplace.json: source does not exist: {src}")
    if listed != set(PACKS):
        fail.append(f"marketplace.json: plugins {sorted(listed)} != {PACKS}")

for pack in PACKS:
    pj = os.path.join(ROOT, "packs", pack, ".claude-plugin", "plugin.json")
    if not os.path.isfile(pj):
        fail.append(f"packs/{pack}/.claude-plugin/plugin.json: missing")
        continue
    d = json.load(open(pj, encoding="utf-8"))
    if d.get("name") != pack:
        fail.append(f"packs/{pack}/plugin.json: name {d.get('name')!r} != {pack!r}")
    for k in d:
        if k not in {"name", "displayName", "description", "version", "author", "homepage",
                     "repository", "license", "keywords", "metadata", "defaultEnabled",
                     "skills", "commands", "agents", "hooks", "mcpServers", "lspServers"}:
            fail.append(f"packs/{pack}/plugin.json: unknown key {k!r}")
    if "userConfig" in d:
        fail.append(f"packs/{pack}/plugin.json: userConfig forbidden (forces a config step)")
    if os.path.isdir(os.path.join(ROOT, "packs", pack, ".claude-plugin")):
        stray = [f for f in os.listdir(os.path.join(ROOT, "packs", pack, ".claude-plugin"))
                 if f != "plugin.json"]
        if stray:
            fail.append(f"packs/{pack}/.claude-plugin: only plugin.json allowed, found {stray}")

print("skills per pack:", ", ".join(f"{p}={counts.get(p, 0)}" for p in PACKS))
for p in PACKS:
    if counts.get(p) != 12:
        fail.append(f"{p}: {counts.get(p)} skills, expected 12")
for w in warn:
    print("WARN:", w)
if fail:
    print(f"\nFAIL ({len(fail)}):")
    for f in fail:
        print(" -", f)
    sys.exit(1)
print("PASS: frontmatter, names, JSON, files, manifests all valid")
