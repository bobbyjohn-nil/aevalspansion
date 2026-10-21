---
name: webforge-server
description: >-
  Owns everything behind the client boundary in a web app: server and client split, caching and revalidation,
  Server Actions, route handlers, the data access layer, ORM queries, authentication, authorization, and
  session cookie security. Use when adding an API, a login, a database read or write, a mutation, caching, or
  a webhook endpoint. Use this even when the user does not name it. Not for visual components or interaction
  states; use webforge-ui.
metadata:
  pack: webforge
  kind: specialist
  domain: backend,security
  version: "1.0.0"
---

# WebForge Server
Owns the server side of a web app: data, caching, actions, auth, and the security boundary. Called by
`webforge-orchestrator`, usually before `webforge-ui`, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-server only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-server (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Three rules that override everything else in this file

1. **Every Server Action is a public HTTP endpoint.** A `'use server'` export is reachable by POST to its
   action ID by anyone, whether or not any UI calls it. Re-authenticate, re-authorize per resource, and
   validate every argument **inside the action itself**.
2. **A layout-level or page-level auth check protects nothing.** Layouts do not re-render on client-side
   navigation, and they do not stop parallel-route slots, Server Actions in the subtree, or direct RSC payload
   fetches from executing. Check auth at the point of data access, every time.
3. **Never write a secret into a `NEXT_PUBLIC_*` variable.** That prefix means public by design, inlined into
   the client bundle at build time. It is not an oversight to catch in review; it is a declaration.

## When called by the orchestrator

Take the stack posture and the assumption ledger from MODEL. Verify the Next major and the `cacheComponents`
flag yourself before writing any cache directive; that is a load-bearing assumption, not a default.

## When invoked directly

Read `package.json` for the `next`, `zod`, and ORM versions, and `next.config.*` for `cacheComponents`, before
writing anything. Those four facts decide which APIs exist.

## Server and client split

Default is a Server Component. `'use client'` goes at the smallest interactive leaf, never at a route root or
layout. Import `server-only` in any module that must never reach the client: DB clients, secret-bearing
modules, the data access layer. The build fails if a Client Component imports it transitively.

Push slow work and `await cookies()` / `await headers()` **down** into nested Server Components wrapped in
`<Suspense>`. An `await` at the top of a shared layout blocks the first streamed byte for every route using
that layout.

Client Components cannot import the DAL. Run `verifySession()` in a parent Server Component and pass the
result down as props.

## Data access layer

The recommended architecture for new projects. Pick exactly one data model per project and do not mix:
HTTP APIs called from Server Components; a data access layer; or direct component-level queries (prototypes
only, and the highest risk of shipping full rows to a client).

```ts
// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) redirect('/login')
  return { isAuth: true, userId: session.userId }
})

export const getUser = cache(async () => {
  const session = await verifySession()
  const rows = await db.query.users.findMany({
    where: eq(users.id, session.userId),
    columns: { id: true, name: true, email: true },   // never select *
  })
  return rows[0]
})
```

React's `cache()` dedupes repeated calls within one render pass, which is what lets `generateMetadata` and the
page body share a query instead of running it twice.

Never return a raw row to a Client Component. Return a DTO with exactly the fields the UI needs. Passing a
whole `User` object as a prop into a `'use client'` component is the most common accidental data leak; audit
`'use client'` prop signatures for overly broad types.

## Server Actions

```ts
'use server'
export async function deletePost(postId: string) {
  const session = await verifySession()                       // authentication
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) })
  if (!post) throw new Error('Not found')
  if (post.authorId !== session.userId) throw new Error('Forbidden')  // authorization, per resource
  await db.delete(posts).where(eq(posts.id, postId))
}
```

- Validate every argument at runtime. TypeScript types are erased; a client can send any shape.
- Return only what the UI needs, never a raw row.
- Variables captured in an inline `'use server'` closure are encrypted with a per-build key. Arguments passed
  via `.bind()` are **not** encrypted. Do not rely on either to hide a secret.
- CSRF: actions accept POST only, and Next compares `Origin` to `Host`. That is an origin check, not a token
  system. Behind a reverse proxy or multi-domain setup, configure
  `experimental.serverActions.allowedOrigins` explicitly.
- **Verify the installed patch is Next 16.1.7 or later.** 16.0.1 through 16.1.6 carry CVE-2026-27978: the
  origin check treated `Origin: null`, sent by sandboxed iframes, as missing rather than cross-origin.

## Route handlers versus actions versus tRPC

| Question | Answer |
|---|---|
| Does anything outside this app need to call it (mobile client, third party, Stripe or GitHub webhook, OAuth callback)? | Route Handler. Actions cannot serve a webhook: no stable URL or verb |
| Purely internal mutation from this app's own UI, and should work without JavaScript? | Server Action with a native `<form action>` |
| One typed contract shared across several frontends or services? | tRPC |

`context.params` in a route handler is a Promise: `const { slug } = await params`. Both route handlers and
actions need identical authn and authz discipline. "Not in `/api/`" does not mean private.

Rate limiting is not built in. Apply it at the proxy or in the handler with a sliding-window store backed by
something that survives across serverless instances. In-memory counters do not. Apply it to login and signup,
any action that sends email or SMS or calls a paid third-party API, and every public route handler.

## Caching

Read `references/caching.md` before writing any cache directive. The one-paragraph version:

The caching model **inverted** in Next.js 16. Under `cacheComponents: true`, `fetch()` is uncached and pages
are dynamic by default; caching is opt-in via `"use cache"`. Under 14 and 15, `fetch()` is cached by default
and pages are static unless a dynamic API is used, and `"use cache"` does not exist. Any recalled knowledge
about Next caching is wrong for at least one of these models. Check the version and the flag, then read the
reference.

Revalidation, three different tools. Do not conflate them:

- The user just did something and must see their own change now: `updateTag(tag)` inside the action.
- Background freshness for shared public content: `revalidateTag(tag, profile)`. On 16 the `cacheLife` profile
  second argument is required; the single-argument form is deprecated.
- An uncached widget elsewhere on the page needs to reflect a just-made change: `refresh()`.

## Auth and sessions

Session cookie, exact attributes:

```
Set-Cookie: __Host-SessionID=<value>; Secure; HttpOnly; SameSite=Strict; Path=/
```

| Attribute | Value | Why |
|---|---|---|
| `HttpOnly` | always | Blocks JS access, mitigating XSS cookie theft |
| `Secure` | always | HTTPS only |
| `SameSite` | `Strict` preferred, `Lax` only when an emailed link must arrive authenticated | CSRF mitigation |
| `__Host-` prefix | always for session cookies | Browser-enforced: forces `Secure`, forbids `Domain`, forces `Path=/` |
| Entropy | at least 64 bits | Brute-force resistance |
| Idle timeout | 2 to 5 min for high-value apps, 15 to 30 min otherwise | |
| Absolute timeout | 4 to 8 hours | |
| Regeneration | on login and on every privilege escalation | Prevents session fixation |

Note that Next's own tutorial code uses `sameSite: 'lax'`. Prefer `Strict` unless the app genuinely needs
cross-site top-level navigation to arrive authenticated.

Two check layers, and only one of them is a security boundary:

- **Optimistic** (`proxy.ts`, cookie only, no DB round trip) runs on every request including prefetches. It
  exists for redirect UX. It is never the security boundary.
- **Secure** (in the DAL, at the point of data access, inside every action) is the real boundary.

Session payload carries identifiers only: user ID, role. Never PII, passwords, or tokens. Stateless sessions
cannot be revoked without a blocklist; database sessions can be deleted instantly and support "log out all
devices". Choose deliberately and say which.

Library choice depends on constraints, not fashion: self-hosted TypeScript-first with org and RBAC built in
(Better Auth) for a new multi-tenant SaaS; Postgres RLS-integrated (Supabase Auth) when authorization should
live in SQL; hosted with prebuilt UI (Clerk) for speed at small scale, where per-MAU billing and data
residency are the things to check before committing. Read `references/auth-sessions.md` for the full matrix.

## Content security

A nonce-based CSP requires every page using it to be dynamically rendered. Static generation, ISR, and PPR's
static shell are all incompatible with a per-request nonce. If a page needs both static performance and strict
CSP, use build-time subresource integrity instead. Writing a nonce CSP into a statically generated route is a
defect that only shows up in production.

## Quality checklist

- [ ] Every Server Action re-authenticates and re-authorizes per resource inside its own body.
- [ ] Every action validates its arguments at runtime, not by type annotation alone.
- [ ] No raw database row crosses into a `'use client'` component.
- [ ] `server-only` is imported in the DAL and in every secret-bearing module.
- [ ] No secret is behind a `NEXT_PUBLIC_*` name.
- [ ] Session cookie has `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite`, and at least 64 bits of entropy.
- [ ] Session ID is regenerated on login and on privilege escalation.
- [ ] Cache directives match the installed Next major and the actual `cacheComponents` value read from config.
- [ ] `revalidateTag` calls on 16 pass a `cacheLife` profile as the second argument.
- [ ] For Next 16, `npx next --version` printed 16.1.7 or later and the output is quoted.
- [ ] Rate limiting exists on auth endpoints and on any action that spends money or sends messages.

## Interop

Defer to a project-local API, auth, database, or domain-logic skill when one exists, and compose with it: it
owns the schema and the business rules, this skill owns the security boundary and the framework semantics.
Name it in the receipt line. If the rest of the pack is absent, this skill runs standalone.

## Reference files

| File | Read when |
|---|---|
| `references/caching.md` | Before writing any cache, revalidation, or `"use cache"` code |
| `references/auth-sessions.md` | Building or auditing login, session, or authorization code |
