---
name: appforge-desktop
description: >-
  Builds the desktop surface and picks Tauri or Electron on stated criteria: window wiring, the auto-update
  path, macOS notarization, and Windows signing. Use when asked to build a desktop app, package or ship a
  binary, wire auto-update, sign or notarize a release, or choose between Tauri and Electron. Use this even
  when the user does not name it. Not for mobile builds; use appforge-mobile.
metadata:
  pack: appforge
  kind: specialist
  domain: desktop
  version: "1.0.0"
---

# AppForge Desktop

Builds the desktop client and owns the parts everyone defers until they block a release: updates, signing, and
notarization. Normally called by `appforge-orchestrator`.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-desktop only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-desktop (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Trust the stack posture. If a `tauri.conf.json`, `electron-builder.yml`, or `forge.config.js` exists, the
framework choice is already made and is not reopened. Build inside it.

## When invoked directly

Frame in one line: which platforms, distributed how (store, direct download, internal), and whether updates
must be automatic. Those three answers determine everything below. Assume no shared state.

## Choosing the framework

Only make this choice when no config file already answers it. Decide on these factors, and state which one
decided it:

| Axis | Tauri 2.x | Electron 43.x |
|---|---|---|
| Runtime | OS-native webview (WebView2, WKWebView, WebKitGTK) plus a Rust backend | Bundles Chromium and Node.js |
| Bundle size | Small. The webview is not shipped. | Large. Ships its own Chromium and Node. |
| Backend language | Rust for anything past the JS-exposed plugin surface, or JS through a sidecar | Node.js. One language front to back. |
| Rendering consistency | Lower. Relying on the OS webview means real cross-platform rendering differences. | Higher. The same Chromium everywhere. |
| Mobile targets | iOS and Android supported | Desktop only |
| Ecosystem | Newer, smaller plugin ecosystem | Very mature, large community |
| Node-native modules | Awkward. Needs a Rust plugin or a sidecar. | Native fit. |
| Updater | Built-in signed updater plugin | electron-updater, Electron Forge, or update.electronjs.org |

Three deciding questions, in order:

1. **Does the app depend on Node-native modules or a Node-heavy backend?** Yes means Electron. This decides it
   outright; do not trade it against bundle size.
2. **Do bundle size and memory matter to the product, or does the same codebase need to reach mobile?** Yes,
   and no Node dependency, means Tauri.
3. **Is the team able to maintain Rust when a plugin does not exist?** No means Electron, whatever the size
   argument says. An unmaintainable smaller binary is worse than a maintainable larger one.

If none of the three settles it, default to Tauri for a new app and say which factor was closest. Do not
present a menu back to the user for a reversible choice made this early.

## Auto-update

**Tauri.** The updater plugin mandates signature verification and it cannot be disabled. It requires Rust
1.77.2 or later.

- Generate the keypair with `tauri signer generate`.
- The public key goes in `tauri.conf.json` as `pubkey`. The private key is supplied through an environment
  variable at build time. Never committed, never in a `.env` file.
- `tauri.conf.json` also needs `endpoints`, which supports the `{{current_version}}`, `{{target}}`, and
  `{{arch}}` template variables, and `createUpdaterArtifacts: true`.
- The update server contract is either a static JSON file with version and per-platform url and signature, or
  a dynamic endpoint returning 204 for no update, or 200 with a JSON body carrying version, url, signature,
  notes, and pub_date.
- Windows install modes: `passive` is the default and shows a progress bar; `basicUi` and `quiet` also exist.

**Electron.** Three supported paths:

1. Cloud object storage, serverless: static metadata, `releases.json` for macOS and a Squirrel-format
   `RELEASES` file for Windows.
2. `update.electronjs.org` through `update-electron-app`. Hard requirements: a public GitHub repository,
   builds published to GitHub Releases, and code-signed macOS builds. Unsigned macOS builds are rejected by
   the service.
3. A custom update server for private apps or non-GitHub distribution.

The asymmetry that catches teams: **on macOS, code signing is mandatory for updates to work at all.** On
Windows it is optional but unsigned installers trigger SmartScreen warnings.

## Signing and notarization

Treat both as part of "done", not as a release-day surprise. The first signed build is where the credential
problems surface, so do one early.

**macOS**, for Tauri and Electron alike:

- A paid Apple Developer account is required. A free account cannot notarize.
- Flow: create a CSR, generate a `Developer ID Application` certificate in the Apple Developer portal for
  distribution outside the App Store, install it in the keychain, then confirm it:

  ```bash
  security find-identity -v -p codesigning
  ```

- CI secrets needed: `APPLE_CERTIFICATE` (base64-encoded `.p12`), `APPLE_CERTIFICATE_PASSWORD`,
  `KEYCHAIN_PASSWORD`, `APPLE_SIGNING_IDENTITY`.
- Notarization auth, pick one path: App Store Connect API (`APPLE_API_ISSUER`, `APPLE_API_KEY`,
  `APPLE_API_KEY_PATH`) or Apple ID with an app-specific password (`APPLE_ID`, `APPLE_PASSWORD`).
- Ad-hoc signing (`signingIdentity: "-"`) is for local development only. The user still has to approve it
  through Gatekeeper manually.

**Windows.** Both Tauri and electron-builder consume a `.pfx` or `.p12` certificate plus a password, or a
cloud HSM signing service so the private key never lands on a build runner. An EV or hardware-backed
certificate typically gets immediate SmartScreen reputation; a standard certificate builds reputation over
downloads and time. Unsigned installers work but show an unknown-publisher warning. That is acceptable for an
internal tool and not acceptable for a public consumer app.

## Desktop-specific correctness

- **The renderer is not trusted.** Anything that reads files, spawns processes, or holds credentials belongs
  on the Rust or main-process side, behind an explicit, narrow command surface. Exposing a general
  "run this" bridge to the renderer turns any content injection into arbitrary code execution.
- **Auto-update needs a rollback story before the first update ships.** Publishing a previous version as the
  newest release is the mechanism; confirm it works before you need it.
- **Windows and macOS file paths differ in case sensitivity and separators.** A path bug appears on the
  platform you did not develop on.
- **Test the update path from an installed build, not from a dev shell.** The dev shell does not exercise the
  signature check, which is exactly the part that fails.

## Quality checklist

- [ ] The framework choice cites which of the three deciding questions settled it, or an existing config file.
- [ ] The updater is configured with signature verification and a working endpoint, not left as a stub.
- [ ] The private signing key is supplied by an environment variable and appears in no committed file.
- [ ] A signed build has been produced at least once before release day.
- [ ] macOS notarization is wired if the app is distributed outside the App Store.
- [ ] No privileged operation is reachable from the renderer without a narrow, named command.
- [ ] The update path was tested from an installed build.

## Reference files

| File | Read when |
|---|---|
| `references/tauri-vs-electron.md` | The framework choice is live, or an updater or signing step needs the full detail |
