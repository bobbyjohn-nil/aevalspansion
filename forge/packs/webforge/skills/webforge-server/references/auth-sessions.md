# Auth, sessions, and authorization

## Contents
1. Library decision matrix
2. Session cookie attributes
3. Stateless versus database sessions
4. Where checks belong
5. Password and credential handling
6. Multi-tenant authorization
7. CSP with nonces
8. Data leak prevention
9. Audit checklist

---

## 1. Library decision matrix

| Library | Model | Best for | Watch out for |
|---|---|---|---|
| Better Auth | Self-hosted, TypeScript-first, org and RBAC as native plugins | New multi-tenant SaaS, predictable cost at scale, data residency requirements | You own backups, email deliverability, and rate limiting |
| Supabase Auth | Hosted, integrated with Postgres RLS | Already on Supabase; want authorization enforced in SQL rather than app code | Coupling to Supabase's Postgres |
| Clerk | Hosted, polished prebuilt UI | Solo and small-scale builds, no EU data-residency constraint | Per-MAU billing scales aggressively past the free tier. Check current pricing rather than quoting a remembered number |
| NextAuth.js / Auth.js v5 | Self-hosted, OAuth-focused | Existing apps already on it, pure OAuth-only needs | Still officially supported, but rarely the strongest pick for a new build compared with Better Auth |

Next's own docs also list Auth0, Descope, Kinde, Logto, Ory, Stack Auth, Stytch, and WorkOS without ranking
them. For hand-rolled sessions, the recommended primitives are `iron-session` or `jose`.

Pricing changes. Never quote a number from memory; point at the pricing page or check it.

## 2. Session cookie attributes

```
Set-Cookie: __Host-SessionID=<value>; Secure; HttpOnly; SameSite=Strict; Path=/
```

| Attribute | Required value | Why |
|---|---|---|
| `HttpOnly` | always | Blocks JS and DOM access, mitigating XSS cookie theft |
| `Secure` | always | HTTPS-only transmission |
| `SameSite` | `Strict` preferred, `Lax` acceptable, never `None` without `Secure` | CSRF mitigation |
| `Path` | as restrictive as possible | Reduces blast radius |
| `__Host-` prefix | on session cookies | Browser-enforced: forces `Secure`, forbids a `Domain` attribute, forces `Path=/`. Cannot be misconfigured |
| Entropy | at least 64 bits, so at least 16 hex characters | Brute-force resistance |
| Idle timeout | 2 to 5 min for banking or admin, 15 to 30 min for low-risk apps | |
| Absolute timeout | 4 to 8 hours | |
| Regeneration | on login and on every privilege escalation | Prevents session fixation |

`Lax` is required only when a link arriving from another site must land authenticated, such as an emailed
magic link. Choose it deliberately and write down why.

## 3. Stateless versus database sessions

| | Stateless (JWT-style, `jose`) | Database sessions |
|---|---|---|
| Where the data lives | encrypted in the cookie | a DB row; the cookie holds only an encrypted session ID |
| Revocation | hard: wait out expiry or maintain a blocklist | instant: delete the row |
| Extra capability | none | log out all devices, last-login tracking, concurrent session limits |
| Payload | minimum identifiers only: user ID, role. Never PII, passwords, or tokens | same principle for any cached optimistic-check payload |

```ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}
```

Generate the key with `openssl rand -base64 32` and store it as `SESSION_SECRET`. When self-hosting on
multiple servers, also set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` explicitly (it must decode to 16, 24, or 32
bytes), or each server picks a different random key per build and cross-instance action closures break.

## 4. Where checks belong

| Layer | Check type | Is it a security boundary |
|---|---|---|
| `proxy.ts` | optimistic, cookie only, no DB round trip | **No.** It runs on every request including prefetches, so a DB call there tanks performance. It exists for redirect UX |
| Layout or page | whatever you put there | **No.** Layouts do not re-render on client navigation, and they do not gate parallel slots, Server Actions, or direct RSC payload fetches |
| DAL / point of data access | DB-verified | **Yes** |
| Inside each Server Action | DB-verified, per resource | **Yes** |

Authentication answers "who is this". Authorization answers "may this user touch this specific row". Checking
only the first is how insecure direct object reference bugs ship. Every action that takes an ID must check
ownership or role against that ID.

Never rely on a client-side `if (!authorized) return null`. There are multiple entry points that never render
the component: a direct Server Action POST, an RSC payload fetch, a route handler.

## 5. Password and credential handling

- Hash with a memory-hard algorithm (argon2id or bcrypt with a current work factor). Never a plain hash.
- Rate-limit login and signup. Without it, a valid credential-stuffing run is free.
- Do not block paste into the password field and do not fight password managers. WCAG 2.2 SC 3.3.8 (AA) makes
  this a compliance issue, not just a courtesy.
- Error copy on failed login must not distinguish "no such user" from "wrong password".
- Reset tokens are single use, short lived, and invalidate all existing sessions when consumed.

## 6. Multi-tenant authorization

- Every tenant-scoped query filters by tenant ID at the DAL, not at the call site. One forgotten filter leaks
  another customer's data.
- Prefer a database-enforced boundary (Postgres row-level security) when available, because it fails closed if
  the app layer forgets.
- Never derive the tenant from a client-supplied header or body field. Derive it from the session.

## 7. CSP with nonces

```ts
// proxy.ts
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}';
    object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
    upgrade-insecure-requests;`.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}
```

**Hard constraint:** a nonce must be fresh per request, so every page using this must be dynamically rendered.
Static generation, ISR, and a PPR static shell are all incompatible with it. If a page needs both static
performance and strict CSP, use build-time subresource integrity (`experimental.sri.algorithm`) instead, which
hashes scripts at build time and stays compatible with static generation.

## 8. Data leak prevention

- `import 'server-only'` in DB clients and any secret-touching module. The build fails if a Client Component
  imports it transitively.
- Return DTOs, never raw rows. Gate per-viewer field visibility with a function such as
  `canSeePhoneNumber(viewer, record)` rather than filtering per record after the fact.
- React's taint APIs (`experimental_taintObjectReference`, `experimental_taintUniqueValue`) are
  defense in depth, not a substitute for a DAL and DTO boundary. Tainting an object does not stop someone
  destructuring a field out of it.
- Environment variables are server-only unless prefixed `NEXT_PUBLIC_`, which inlines them into the client
  bundle at build time.
- Audit `'use client'` prop signatures for overly broad types. `user: User` where `user: { name: string }`
  would do is the single most common accidental leak.

## 9. Audit checklist

- [ ] Every Server Action re-authenticates inside its own body.
- [ ] Every action taking an ID checks ownership or role against that specific ID.
- [ ] Every action validates its arguments at runtime.
- [ ] Session cookie carries `__Host-`, `HttpOnly`, `Secure`, `SameSite`, and at least 64 bits of entropy.
- [ ] Session ID regenerates on login and on privilege escalation.
- [ ] No secret behind a `NEXT_PUBLIC_*` name.
- [ ] `server-only` guards the DAL and every secret-bearing module.
- [ ] Every tenant-scoped query filters by a session-derived tenant ID.
- [ ] Login and signup are rate limited.
- [ ] The password field accepts paste and works with a password manager.
- [ ] No nonce-based CSP on a statically generated route.
- [ ] Installed Next is 16.1.7 or later if the app is on 16, and the version output is quoted.
