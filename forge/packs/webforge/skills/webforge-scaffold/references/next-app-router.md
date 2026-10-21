# Next.js App Router - layout, conventions, and config

## Contents
1. Project layout
2. Route file conventions
3. Route organization primitives
4. next.config.ts keys that matter
5. Tailwind v4 setup
6. Images and fonts
7. TypeScript config
8. What changed in 16 that older knowledge gets wrong

---

## 1. Project layout

```
app/
  layout.tsx            root layout, defines <html> and <body>
  page.tsx
  globals.css
  (marketing)/          route group, does not affect the URL
    page.tsx
  dashboard/
    layout.tsx
    page.tsx
    loading.tsx         auto-wraps the segment in <Suspense>
    error.tsx           'use client' required
    not-found.tsx
  api/
    webhooks/stripe/route.ts
lib/
  dal.ts                'server-only' data access layer
  db/schema.ts
components/
  ui/                   shadcn output lands here
proxy.ts                request-level checks, CSP nonce, optimistic auth redirect
instrumentation.ts      OpenTelemetry registration
next.config.ts
```

## 2. Route file conventions

| File | Purpose | Notes |
|---|---|---|
| `layout.tsx` | shared shell for a segment | Does not re-render on client-side navigation. Never the security boundary |
| `page.tsx` | the route's UI | Server Component by default |
| `loading.tsx` | streaming fallback | Automatically wraps the segment in `<Suspense>` |
| `error.tsx` | segment error boundary | Must be a Client Component. Wraps `loading`, `not-found`, `page`, and nested layouts **in the same segment**, not the layout above it |
| `global-error.tsx` | root failure | Must define its own `<html>` and `<body>`. Replaces the root layout entirely and inherits none of its styles |
| `not-found.tsx` | `notFound()` and unmatched routes | Per segment |
| `route.ts` | HTTP endpoint | `GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS`. `context.params` is a Promise: `const { slug } = await params` |
| `default.tsx` | parallel-slot fallback | **Required** for every parallel slot on 16. Builds fail without one. Return `null` or call `notFound()` |

`error.tsx` props are `error` and `retry` as of 16.3.0. `reset()` still works but only clears local error
state; `retry()` re-fetches and re-renders the segment. Most pre-2026 examples only show `reset`, so check the
installed version before assuming which is idiomatic.

Server-Component errors show a generic message plus `error.digest` in production. Correlate the digest with
server logs; the real message is deliberately not sent to the client.

## 3. Route organization primitives

| Convention | Syntax | Affects URL | Use for |
|---|---|---|---|
| Route groups | `(name)/` | no | Organizing routes, or applying a different root layout |
| Parallel routes | `@slot/` | no | Dashboards with independent sections; modals |
| Intercepting routes | `(.)`, `(..)`, `(...)` | matches the target | Modal-over-page with a real deep-linkable URL |
| Dynamic segments | `[param]`, `[...all]` | yes | User-supplied path input. Brackets mean untrusted input; validate |

Parallel-route trap: both slots render server-side regardless of which the layout returns. A role-gated
`@admin` slot still executes its data fetches. Authorize inside each slot's own page or DAL call.

## 4. `next.config.ts` keys that matter

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,        // 16 only. Unifies the old ppr, useCache, dynamicIO flags
  reactCompiler: false,         // stable but opt-in; adds a Babel pass and real build time
  output: 'standalone',         // Docker or self-host. Omit on Vercel
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] },
}
export default nextConfig
```

`serverRuntimeConfig` and `publicRuntimeConfig` were removed in 16. Use environment variables.

`output: 'export'` is incompatible with `"use cache"` and Cache Components. Choosing static export means
choosing out of the entire caching model.

## 5. Tailwind v4 setup

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --font-display: "Fraunces", serif;
  --color-brand-500: oklch(0.62 0.19 259);
  --breakpoint-3xl: 120rem;
}
```

There is no `tailwind.config.js` in a v4-native project. PostCSS plugin is `@tailwindcss/postcss`; CLI is
`@tailwindcss/cli`; Vite projects should use `@tailwindcss/vite` instead of PostCSS.

v3 patterns that silently break on v4: `@tailwind base/components/utilities`; `bg-opacity-*` (now `bg-black/50`);
`flex-shrink-*` (now `shrink-*`); `!flex` (now `flex!`); `bg-[--var]` (now `bg-(--var)`); `ring` defaulting to
3px blue (now `ring-3` and `currentColor`); the shadow scale shifted one step; variant stacking is now
left-to-right. The largest silent one: default border color changed from `gray-200` to `currentColor`, so
borders appear to vanish after a naive migration.

Migration tool: `npx @tailwindcss/upgrade` (needs Node 20+).

## 6. Images and fonts

```tsx
import Image from 'next/image'
import hero from './hero.png'          // static import: width, height, blurDataURL inferred

<Image src={hero} alt="..." priority /> // priority on the actual LCP element, nothing else
```

Remote images need explicit `width`/`height` or `fill`, and an allow-listed `images.remotePatterns` entry.
`images.domains` is deprecated.

Next 16 changed image defaults silently: `minimumCacheTTL` 60s became 14400s; `qualities` narrowed from the
full range to `[75]`, so a `quality={90}` prop is coerced unless `images.qualities` is configured; size `16`
was dropped from the default `imageSizes`; local-IP optimization is off unless `dangerouslyAllowLocalIP` is
set; `maximumRedirects` defaults to 3; a local `src` with a query string now requires `images.localPatterns`.

```tsx
import { Geist } from 'next/font/google'
const geist = Geist({ subsets: ['latin'] })
// <html className={geist.className}>
```

`next/font` self-hosts at build time. The browser never contacts Google, which removes both the third-party
request and the font-swap layout shift. Prefer a variable font; if using a static weight, state `weight`
explicitly. `next/font/local` takes an array of `{ path, weight, style }` for multi-weight families.

## 7. TypeScript config

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "module": "preserve",
    "noEmit": true
  }
}
```

`isolatedModules` is required with Turbopack-style per-file transpilation. Use `"module": "NodeNext"` for
Node-target packages instead.

## 8. What changed in 16 that older knowledge gets wrong

1. Caching inverted. Pre-16, `fetch()` was cached by default and pages were static unless a dynamic API was
   used. With `cacheComponents: true`, everything is dynamic and caching is opt-in through `"use cache"`.
2. Turbopack is the default bundler for dev and build.
3. `revalidateTag(tag)` with one argument is deprecated. It takes a `cacheLife` profile second.
4. Parallel slots require `default.js`.
5. `GET` Route Handlers are dynamic by default.
6. `serverRuntimeConfig` / `publicRuntimeConfig` are gone.
7. `error.tsx` prefers `retry` over `reset`.

Migrating an existing app: run `npx @next/codemod@canary upgrade latest` and read the official
migrating-to-cache-components guide rather than hand-editing route segment configs.
