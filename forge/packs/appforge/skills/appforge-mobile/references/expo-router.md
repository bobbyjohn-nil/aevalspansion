# Expo Router conventions

## File to route mapping

| Pattern | Syntax | Meaning |
|---|---|---|
| Static route | `app/settings.tsx` | `/settings` |
| Index route | `app/index.tsx` | `/`, the default route for its directory |
| Dynamic segment | `app/user/[id].tsx` | `/user/:id`, read with `useLocalSearchParams()` |
| Route group | `app/(tabs)/index.tsx` | `(tabs)` organizes and nests layouts without appearing in the URL |
| Layout | `app/_layout.tsx` | Renders before any route beneath it. Required at the root. Replaces `App.tsx` root init logic. |
| Not found | `app/+not-found.tsx` | 404 handler |
| Special routes | `+html.tsx`, `+native-intent.tsx`, `+middleware.ts` | Reserved names with router-specific meaning |
| Platform-specific file | `app-tabs.native.tsx` next to `app-tabs.tsx` | `.native.tsx` targets iOS and Android, the extensionless file targets web |
| Non-route code | `src/components/`, `src/hooks/`, anywhere outside `app/` | Everything inside `app/` is a route. Components and hooks must live outside it. |

Catch-all segment notation was not confirmed against the current SDK docs when this pack was written. Check
`docs.expo.dev/router/basics/notation` before emitting it, and mark it `[unverified]` if you cannot.

## Params

```tsx
import { useLocalSearchParams } from 'expo-router';

const { id } = useLocalSearchParams(); // string | string[]
```

The union type is real. A param can arrive as an array when a segment repeats, so narrow it before use rather
than casting it away.

## Linking to a dynamic route

```tsx
<Link href={{ pathname: '/user/[id]', params: { id: 'bacon' } }}>View user</Link>
```

Use the object form with a `pathname` template rather than string interpolation. The template form stays
correct when the route file is renamed, and it encodes params properly.

## Layout structure that holds up

```
app/
  _layout.tsx            root: providers, fonts, splash control, auth gate
  (tabs)/
    _layout.tsx          tab bar definition
    index.tsx            first tab
    profile.tsx          second tab
  user/
    [id].tsx             detail route
  +not-found.tsx
src/
  components/
  hooks/
  api/
```

The root `_layout.tsx` is where app-wide providers belong: query client, theme, session. Putting them in a
screen means they remount on navigation and silently discard cached state.

## Auth gating

Gate at a layout, not at each screen. A screen-level check runs after the screen has already mounted and
started fetching, which leaks a flash of protected UI and fires requests that will 401. A layout-level check
redirects before children render.

Never treat a client-side layout gate as authorization. It is navigation. Every request that returns protected
data is authorized again on the server, in the handler, per `appforge-backend`.

## Deep linking

Every route is deep-linkable automatically. Do not hand-write per-screen linking configuration for an Expo
Router app; there is nothing to configure. What still needs configuration is the platform verification file:
`assetlinks.json` for Android App Links and `apple-app-site-association` for iOS Universal Links.

Test the cold-start path specifically: a deep link that opens an already-running app takes a different code
path from one that launches the process. The second is where missing initialization surfaces.
