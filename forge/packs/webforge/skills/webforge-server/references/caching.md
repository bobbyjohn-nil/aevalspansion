# Caching and revalidation - version-gated

Read the version first. There are two incompatible models and most recalled knowledge belongs to the older
one.

## Contents
1. Which model is in play
2. The Next 16 Cache Components model
3. `"use cache"` exact syntax and constraints
4. The revalidation API table
5. Multi-instance and CDN gotchas
6. The Next 14 and 15 legacy model
7. HTTP cache headers, which are model-independent
8. Route handler defaults

---

## 1. Which model is in play

```bash
grep -m1 '"next"' package.json
grep -n 'cacheComponents' next.config.* 2>/dev/null || echo "cacheComponents: not set"
```

| Result | Model |
|---|---|
| `next` is `^16` and `cacheComponents: true` | Cache Components. Dynamic by default, caching opt-in |
| `next` is `^16`, flag absent or false | Dynamic by default, but `"use cache"` is not enabled. Do not emit it |
| `next` is `^14` or `^15` | Legacy implicit caching. `"use cache"` does not exist |
| `next` is `^13` or Pages-only | Verify each API individually before using it |

## 2. The Next 16 Cache Components model

| | 13 to 15 (legacy) | 16 with `cacheComponents: true` |
|---|---|---|
| `fetch()` default | cached indefinitely unless opted out | uncached, dynamic |
| Page rendering default | static unless a dynamic API is used | dynamic; caching is opt-in |
| How to cache | do nothing | add `"use cache"` explicitly |
| Partial prerendering | experimental, opt-in per route | built into `cacheComponents`, no separate flag |

```ts
// next.config.ts
const nextConfig = { cacheComponents: true }
export default nextConfig
```

That one flag replaces the three former experimental flags `ppr`, `useCache`, and `dynamicIO`.

Migrating an existing app: run `npx @next/codemod@canary upgrade latest` and follow the official
migrating-to-cache-components guide. A codebase mixing pre-16 route segment configs
(`export const dynamic = 'force-static'`, `experimental_ppr`) with the new model hits removed and renamed
APIs. Do not hand-migrate route by route.

## 3. `"use cache"` exact syntax and constraints

The cached target must be `async`. Scope can be file, component, or function level.

```tsx
// File level: every export in the file becomes cached
'use cache'
export default async function Page() { /* ... */ }

// Component level
async function Bookings({ type }: { type: string }) {
  'use cache'
  const data = await fetch(`/api/bookings?type=${type}`)
  return /* ... */
}

// Function level: data and computation, not JSX
export async function getData() {
  'use cache'
  return fetch('/api/data')
}
```

Cache key = build ID (or `deploymentId`) + function ID (a hash of location and signature) + serialized
arguments + a dev-only HMR hash. Closure-captured variables become part of the key automatically.

Constraints that break the build or the request when violated:

- **No `cookies()`, `headers()`, or `searchParams` inside a cached scope.** Read them outside and pass them in
  as arguments. Violating this surfaces as `next-request-in-use-cache` at request time on a dynamic route:
  `next build` looks clean and `next start` fails, which is why it is so easy to ship.
- `React.cache()` is isolated per `use cache` boundary. It cannot smuggle data in from a parent.
- Unsupported argument and return types: class instances, plain functions (except pass-through), Symbols,
  WeakMaps, WeakSets, `URL` instances. Supported: primitives, plain objects and arrays, Dates, Maps, Sets,
  TypedArrays, ArrayBuffers, and JSX as a return value.
- Pass-through is the sanctioned way to keep `children` or a Server Action dynamic inside a cached wrapper. Do
  not introspect or call the passed value inside the cached body.
- Nesting a short-lived cache inside one with no explicit `cacheLife` fails the build during prerendering.
- The build hangs and times out at 50 seconds if a cached function awaits a Promise resolving to runtime data
  created outside the cache boundary, such as a `cookies()` promise passed as a prop.

## 4. The revalidation API table

| API | Callable where | Semantics | Use when |
|---|---|---|---|
| `cacheLife(profile)` | inside a `"use cache"` scope | Time-based; sets stale, revalidate, expire. Built-in profiles: `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`. Omitted default: stale 5 min client, revalidate 15 min server, never time-expires | Content that may be eventually consistent |
| `cacheTag(tag)` | inside a `"use cache"` scope | Tags the entry for on-demand invalidation | Paired with a mutation elsewhere |
| `revalidateTag(tag, profile)` | anywhere server-side | **On 16 the profile second argument is required.** Stale-while-revalidate: the user gets cached data immediately, fresh data computes in the background | Background freshness for shared or public content |
| `updateTag(tag)` | Server Actions only | Read-your-writes: expires and re-reads fresh data within the same request and response | The user just submitted a form and must see their own change |
| `refresh()` | Server Actions only | Refreshes uncached data elsewhere on the page. Touches nothing in the cache | A counter or live status widget must reflect a just-made change |
| `revalidatePath(path)` | anywhere server-side | Invalidates a route's auto-generated soft tags and its ancestor layout tags | Blunt instrument. Invalidates a whole route tree |

Decision rule: did the user just do something and need to see it now? `updateTag`. Is this background
freshness for shared content? `revalidateTag(tag, 'max')` or a `cacheLife` profile. Is the thing uncached?
`refresh()`.

## 5. Multi-instance and CDN gotchas

- A revalidation regenerates both the HTML and the RSC payload from the same render, and they are stored
  together. If a CDN caches them separately with different TTLs, client-side navigation can show mismatched
  content. Respect the `Vary` header Next sets; do not split HTML and RSC caching at the CDN.
- `revalidateTag()` invalidates only the instance that ran it. Behind a load balancer, other instances keep
  serving stale content until a custom cache handler's `refreshTags()` hook pulls invalidation state from
  shared storage such as Redis or DynamoDB. Single-instance and filesystem-cache self-hosting do not need
  this; anything horizontally scaled does.
- Rolling deployments: set `deploymentId` so a client and server version mismatch triggers a hard navigation
  instead of serving skewed content.
- A custom cache handler must return `undefined` on a read failure, meaning a miss. A thrown error propagates
  as a render error instead of falling back to a fresh render.

## 6. The Next 14 and 15 legacy model

- `fetch()` results are cached indefinitely unless `{ cache: 'no-store' }` or a `revalidate` option is set.
- A page is static unless it uses a dynamic API (`cookies()`, `headers()`, `searchParams`, `noStore()`).
- Route segment config exports control it: `export const dynamic`, `export const revalidate`,
  `export const fetchCache`.
- PPR is experimental only, via `experimental.ppr` in config plus `export const experimental_ppr = true` per
  route.
- `"use cache"`, `cacheLife`, `cacheTag`, and `updateTag` do not exist. Emitting them produces a build error
  or, worse, a silently dead directive.

## 7. HTTP cache headers, model-independent

```
# hashed or versioned static asset - cache forever, never revalidate
Cache-Control: public, max-age=31536000, immutable

# HTML that must reflect the latest content, conditional GET is fine
Cache-Control: no-cache

# personalized or sensitive response
Cache-Control: private, no-store

# API response tolerant of brief staleness
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

`no-cache` means revalidate before use, not "do not cache". `no-store` is the one that means do not store.
Getting these two backwards is the most common cache-header error.

## 8. Route handler defaults

`GET` route handlers became dynamic by default as of Next 15.0.0-RC, and remain so in 16. If a handler should
be cached, set `export const revalidate = 60` explicitly or wrap its logic in `"use cache"`. A handler that
was cached "for free" in a Next 13 codebase will silently start hitting the origin on every request after an
upgrade.
