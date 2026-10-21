---
name: appforge-mobile
description: >-
  Builds the React Native and Expo surface: screens and navigation with Expo Router, native modules,
  permissions and purpose strings, push, deep links, and secure token storage. Use when asked to add a screen,
  tab, or navigation flow, wire push or deep links, request a camera or location permission, or store a login
  token. Use this even when the user does not name it. Not for store submission; use appforge-release.
metadata:
  pack: appforge
  kind: specialist
  domain: mobile
  version: "1.0.0"
---

# AppForge Mobile

Builds the mobile client surface: routing, native capability, permissions, and on-device state. Normally
called by `appforge-orchestrator` after the data contract exists.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-mobile only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-mobile (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Trust the stack posture table and the assumption ledger. Read only the versions you are about to depend on,
and build. Re-verify only what changed.

## When invoked directly

Run a one-line frame: which screen or capability, on which platforms, and what "done" looks like on a device.
Then read `package.json` for the `expo` and `react-native` versions before emitting any API call. Assume no
shared state exists.

## Non-negotiables

1. **The New Architecture is mandatory from RN 0.82 and Expo SDK 55.** `newArchEnabled=false` and
   `RCT_NEW_ARCH_ENABLED=0` are ignored on those versions. Never emit a legacy-architecture escape hatch as a
   fix for a native module incompatibility. The fix is to update or replace the dependency. A project that
   genuinely must run Legacy has to stay on Expo SDK 54 or earlier, and that is a product decision, not a
   config flag. Migration path for a repo still on Legacy: move to RN 0.81 or SDK 54 first, enable the New
   Architecture there, verify, then upgrade.
2. **Auth tokens go in `expo-secure-store`, never `AsyncStorage`.** AsyncStorage is an unencrypted plaintext
   file. This is the single highest-frequency real security defect in mobile code and it maps to OWASP Mobile
   M9, Insecure Data Storage.
3. **Never scaffold Legacy Native Modules.** They are deprecated. If an existing repo has them, flag them and
   offer to port.
4. **Anything inside `app/` is a route.** Components, hooks, and utilities live outside it, for example under
   `src/`. Putting a component in `app/` creates a phantom route.
5. **Never put a real secret in an `EXPO_PUBLIC_*` variable.** Those are bundled into the client and are
   readable by anyone with the APK or IPA.

## Version reads before you write code

```bash
grep -E '"(expo|react-native|expo-router)"' package.json
npx expo-doctor@latest        # dependency compatibility against the React Native Directory
```

React Native 0.82 and later surface previously-swallowed uncaught promise rejections as `console.error`. A
visible error spike right after that upgrade is not a regression; it is errors becoming visible. Triage them,
do not silence them.

## Routing

Expo Router maps files to routes, and every route is deep-linkable automatically with no per-screen linking
config. That single property is the strongest reason to default to it over hand-wired navigation. Full
convention table is in `references/expo-router.md`. The four that matter most:

| Pattern | Syntax | Meaning |
|---|---|---|
| Layout | `app/_layout.tsx` | Renders before anything beneath it. Required at the root; replaces `App.tsx` init logic. |
| Dynamic segment | `app/user/[id].tsx` | `/user/:id`, read with `useLocalSearchParams()` |
| Route group | `app/(tabs)/index.tsx` | `(tabs)` organizes layouts without appearing in the URL |
| Not found | `app/+not-found.tsx` | 404 handler |

## State: two different problems, two different tools

Server state and client state are not the same problem. Mixing them is a top source of stale-cache bugs.

| State | Owner | Rule |
|---|---|---|
| Anything that originated on a server | TanStack Query or equivalent | It owns fetching, caching, revalidation, dedupe, and mutations. Never copy fetched data into a client store to "keep it handy". |
| UI state: theme, filters, wizard step, draft input | Zustand by default, Context for small low-frequency values, Jotai for fine-grained derived state | Context re-renders every consumer on any change unless you split it manually. Do not use it for high-frequency updates. |

Optimistic updates follow one contract regardless of library: snapshot before, roll back on error, reconcile
after.

```ts
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
    return { previous };
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

Skipping the rollback branch is the common defect: the optimistic write stays on screen after the server
rejected it, and the user believes their change saved.

## Native modules, decided on the hot path

| Framework | Reach for it when | Notes |
|---|---|---|
| Expo Modules API | Inside an Expo-managed app, want Swift and Kotlin ergonomics, not perf-critical | Ships with the Expo SDK. Untyped unless you add types. |
| Turbo Modules | Already in RN core, no extra dependency, want TypeScript-spec codegen types | Objective-C bridge, no Swift-native path |
| Nitro Modules | Genuine hot path: crypto, image or video processing, high-frequency native calls | Third-party dependency, typed via Nitrogen codegen. Measurably the fastest of the three on micro-benchmarks. |
| Legacy Native Modules | Never for new code | Deprecated |

Do not add Nitro for a module called once per screen. The published throughput gaps come from extreme
micro-benchmarks, not from real app workloads.

## Push notifications

```bash
npx expo install expo-notifications expo-constants
```

Add `"expo-notifications"` to the `plugins` array in `app.json`. Android requires FCM v1 credentials; iOS
requires an APNs key, which EAS offers to generate on the first build with push enabled.

```ts
const { status } = await Notifications.requestPermissionsAsync();
const token = await Notifications.getExpoPushTokenAsync({
  projectId: Constants?.expoConfig?.extra?.eas?.projectId,
});
```

Test with the Expo push tool at `expo.dev/notifications` before building a backend sender. A permission denial
is a normal outcome, not an error path to swallow: the app must still work with notifications off.

## Deep linking

| Mechanism | Scheme | Guarantee | If the app is not installed |
|---|---|---|---|
| Custom URL scheme | `myapp://path` | None. The OS may show a disambiguation dialog if two apps register the scheme. | The link fails |
| Android App Links | `https://`, verified by `assetlinks.json` | Opens the app directly, no dialog | Falls through to your website |
| iOS Universal Links | `https://`, verified by `apple-app-site-association` | Opens the app directly | Falls through to your website |

Ship Universal Links and App Links for anything a marketing or transactional email will contain. A custom
scheme alone breaks every pre-install click.

## Secure storage constraints

| Platform | Mechanism | Survives uninstall |
|---|---|---|
| iOS | Keychain (`kSecClassGenericPassword`) | Sometimes, when reinstalled under the same bundle ID. Never rely on it. |
| Android | SharedPreferences encrypted through the Android Keystore | No |

Key names are limited to alphanumerics plus `.`, `-`, and `_`. Values are for small secrets only: some iOS
releases have had a soft limit near 2048 bytes for a single value, so handle the platform error rather than
assuming success. Bulk or non-sensitive data belongs in AsyncStorage. Data written with
`requireAuthentication: true` becomes unreadable if the user changes biometric enrollment, so never make a
biometric-gated value the only copy of something unrecoverable.

## Quality checklist

- [ ] `expo` and `react-native` versions were read from `package.json` this session, not assumed.
- [ ] No legacy-architecture flag, workaround, or `newArchEnabled=false` appears anywhere in the change.
- [ ] Every token, refresh token, and API credential is in `expo-secure-store`, not AsyncStorage.
- [ ] No secret is in an `EXPO_PUBLIC_*` variable.
- [ ] Nothing that is not a route lives under `app/`.
- [ ] Every permission request has a purpose string and a working denied path.
- [ ] Every optimistic mutation has all three of snapshot, rollback, and reconcile.
- [ ] Server data lives in the query cache, not copied into a client store.
- [ ] Every screen added has loading, empty, error, and offline states, or a stated reason one does not apply.

## Reference files

| File | Read when |
|---|---|
| `references/expo-router.md` | Adding routes, layouts, groups, or params |
| `references/native-permissions.md` | Requesting any permission, or touching the privacy manifest |
