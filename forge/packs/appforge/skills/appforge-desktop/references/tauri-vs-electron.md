# Tauri and Electron: the full decision and setup detail

Contents: 1. When this choice is already made. 2. Full comparison. 3. Migration cost. 4. Tauri updater setup.
5. Electron updater setup. 6. Signing detail. 7. Failure modes seen at release time.

## 1. When this choice is already made

Any of these files means the decision exists and is not reopened without a stated reason from the user:

```
tauri.conf.json          src-tauri/            -> Tauri
electron-builder.yml     forge.config.js       -> Electron
package.json devDependency "electron"          -> Electron
```

Reopening a framework choice inside a working repo costs a rewrite of every native integration. It is a
product decision, not a craft improvement.

## 2. Full comparison

| Axis | Tauri 2.x | Electron 43.x |
|---|---|---|
| Runtime | OS-native webview plus Rust backend | Bundled Chromium and Node.js |
| Typical bundle | Small; no browser engine shipped | Large; ships its own engine |
| Frontend | Any web framework | Any web framework |
| Backend logic | Rust, or JS through a sidecar process | Node.js |
| Mobile | iOS and Android supported since 2.0 | Desktop only |
| Ecosystem maturity | Newer, smaller plugin set | Very mature, large community |
| Cross-platform rendering | Real differences between WebView2, WKWebView, and WebKitGTK | Consistent, same Chromium everywhere |
| Support cadence | Tauri 2.11.5 was current in mid-2026 | Latest three majors supported, roughly an eight-week major cadence |

Both are reasonable. The failure is not picking the "wrong" one; it is picking without naming the factor, then
rediscovering the factor three weeks in.

## 3. Migration cost, if someone asks

Frontend code moves nearly unchanged; both render a web frontend. What does not move: every privileged call.
Electron's `ipcMain` handlers and Node API usage have to be rewritten as Tauri commands in Rust or routed
through a sidecar, and Tauri's permission and capability configuration has no Electron equivalent to copy.
Budget the migration by counting privileged call sites, not by counting screens.

## 4. Tauri updater setup

```bash
tauri signer generate      # produces a keypair; keep the private key out of the repo
```

`tauri.conf.json` needs three things:

- `pubkey`: the generated public key.
- `endpoints`: one or more URLs. Supports `{{current_version}}`, `{{target}}`, and `{{arch}}`.
- `createUpdaterArtifacts: true`, or `"v1Compatible"` when older clients must still update.

The private key is passed through an environment variable at build time. Not a `.env` file, not a committed
file, not a CI variable printed in logs.

Server contract, whichever you implement:

- Static JSON: version plus a per-platform url and signature.
- Dynamic endpoint: `204` when there is no update, `200` with a JSON body carrying version, url, signature,
  notes, and pub_date.

Signature verification is mandatory and cannot be turned off. Requires Rust 1.77.2 or later. Supported update
platforms: Windows, Linux, macOS, Android, iOS.

Windows install modes: `passive` (default, progress bar), `basicUi`, `quiet`.

## 5. Electron updater setup

| Path | Requirements | Use when |
|---|---|---|
| Cloud object storage | Host `releases.json` (macOS) and a Squirrel `RELEASES` file (Windows) yourself | You want no extra service and control the bucket |
| `update.electronjs.org` via `update-electron-app` | Public GitHub repo, releases published to GitHub Releases, code-signed macOS builds | Open-source app, simplest path |
| Custom server (Hazel, Nuts, electron-release-server, Nucleus) | You operate it | Private apps or non-GitHub distribution |

Unsigned macOS builds are rejected by `update.electronjs.org`. This is not a warning; the update simply does
not work.

## 6. Signing detail

**macOS.** Paid Apple Developer account required; a free account cannot notarize.

```bash
security find-identity -v -p codesigning     # confirm the identity is installed
```

CI secrets: `APPLE_CERTIFICATE` (base64 `.p12`), `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`,
`APPLE_SIGNING_IDENTITY`.

Notarization credentials, one of:

- App Store Connect API: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`.
- Apple ID: `APPLE_ID`, `APPLE_PASSWORD` (an app-specific password, not the account password).

`signingIdentity: "-"` is ad-hoc signing for local development only. Users still face a Gatekeeper prompt.

**Windows.** A `.pfx` or `.p12` plus password, or a cloud HSM signing service. EV or hardware-backed
certificates typically carry immediate SmartScreen reputation; standard certificates accumulate it over
downloads and time.

## 7. Failure modes seen at release time

| Failure | Root cause | Prevention |
|---|---|---|
| Update silently does nothing on macOS | Build is unsigned | Sign and notarize before the first public release |
| Update fails signature verification | Public key in config does not match the private key used to sign | Regenerate the pair and rebuild both sides together |
| App launches on the dev machine and nowhere else | A dev-only path, an unsigned dylib, or a missing entitlement | Test an installed build on a clean machine |
| Windows installer blocked as unknown publisher | Unsigned, or a new standard certificate with no reputation | Sign; expect a reputation ramp on non-EV certificates |
| Renderer can read arbitrary files | A broad bridge exposed to the renderer | Expose narrow, named commands only |
| Works on macOS, breaks on Windows | Path separators or case-sensitivity assumptions | Build and smoke-test both before every release |
