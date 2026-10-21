---
name: appforge-backend
description: >-
  Owns the backend behind an app: schema and migrations, auth and authorization, multi-tenancy, background
  jobs, webhooks and idempotency, rate limits, uploads, and offline sync. Use when asked to add a table or
  migration, wire login or roles, handle a Stripe or RevenueCat webhook, add a queue, upload files, or make
  the app work offline. Use this even when unnamed. Not for screens; use appforge-mobile.
metadata:
  pack: appforge
  kind: specialist
  domain: backend,data
  version: "1.0.0"
---

# AppForge Backend

Owns the data contract and everything server-side that the app surfaces depend on. Normally called by
`appforge-orchestrator` first, because every screen depends on the shape decided here.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-backend only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-backend (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Trust the stack posture table for ORM, database, and language. Produce the schema, the authorization rule, and
the request and response contract before any client code is written against them.

## When invoked directly

Frame in one line: which entity, who may read and write it, and whether the write has to survive being retried.
Then read the existing schema before adding to it. Assume no shared state.

## Non-negotiables

1. **Authorization is re-checked in every handler and every data-access function.** A check in a middleware
   layer, a route group, or a client-side layout protects nothing on its own. This is OWASP Top 10 2025 A01,
   Broken Access Control, still the number one category.
2. **Every webhook handler dedupes by event ID and is order-independent.** Providers guarantee neither single
   delivery nor ordering.
3. **A non-idempotent operation is never auto-retried without an idempotency key.**
4. **Uploads go through presigned URLs.** The app server never proxies file bytes.
5. **Validate at every trust boundary**, both the API handler and the form, with one schema. Not one or the
   other.
6. **Secrets stay server-side.** A client bundle is not a secrets store.

## ORM choice, when the repo has none

| Axis | Prisma | Drizzle |
|---|---|---|
| Schema | Own DSL in `schema.prisma`, generates a client | TypeScript objects, close to hand-written SQL |
| Engine | Rust-free TypeScript and WASM query compiler is the production default from 6.16.0. Bundle dropped from roughly 14 MB to roughly 1.6 MB, and complex queries got materially faster by removing cross-language serialization. | Always a thin TS layer over SQL, no engine binary |
| Edge and serverless | Good, since the native binary is gone | Good from the start |
| Abstraction | Higher, more generated code | Lower, you read something close to SQL |

The old rule "Prisma is too heavy for edge" is dead at 6.16.0 and later. Check the installed version before
repeating it. Default to Drizzle for a new lightweight or edge-deployed service where the team is comfortable
near SQL; Prisma is equally defensible when the team wants more generated ergonomics.

Drizzle Kit commands:

| Command | Does |
|---|---|
| `drizzle-kit generate` | Diffs the TS schema against history, writes a new SQL migration file |
| `drizzle-kit migrate` | Applies migration files |
| `drizzle-kit push` | Pushes schema straight to the database with no migration file. Local iteration only. |
| `drizzle-kit pull` | Introspects an existing database into a Drizzle schema. This is the escape hatch for a repo with a database and no schema file. |
| `drizzle-kit check` | Validates migration history for race conditions |

Use `generate` plus `migrate` in every environment that matters, so every schema change is a reviewable,
revertible SQL file in version control. `push` in production leaves no diff to review and no artifact to roll
back.

## Authorization model

| Model | Use when | Cost |
|---|---|---|
| RBAC | A small, clear set of roles per tenant: admin, editor, viewer | Lowest. Start here. |
| ABAC | Access depends on dynamic context: department, resource sensitivity, time of day, combined with role | Moderate |
| ReBAC | Permissions follow a relationship graph: per-document owner, editor, viewer, with nested sharing | Highest. Do not reach for it by default. |

These compose: RBAC for the coarse tenant-role skeleton, ABAC layered on for context rules, ReBAC only when
the product genuinely has document-level nested sharing.

## Multi-tenancy, decided before the first table

| Pattern | Isolation | Ops cost |
|---|---|---|
| Pool: shared schema with a `tenant_id` column | Lowest. A missing `WHERE tenant_id = ?` leaks across tenants. | Simplest: one set of migrations, one backup |
| Bridge: schema per tenant | Better than pool, still one database blast radius | Migrations run per schema and multiply with tenant count |
| Silo: database per tenant | Maximum, including noisy-neighbor isolation | Highest: N databases to patch, monitor, and back up |

Start with pool. Move to silo only when compliance, scale, or per-tenant customization forces it. Bridge adds
real per-schema migration overhead without buying compliance-grade isolation, so skip it in most products.

With pool, the tenant filter is not a convention you remember. Put it in the data-access layer so a query
without it cannot be written, and add a test that proves a cross-tenant read fails.

## Background jobs

| Situation | Reach for |
|---|---|
| Already on Vercel | Vercel Queues plus Workflow and Cron |
| Multi-step durable workflows, want it managed | Inngest, the default pick. Function-as-a-step, each step retried and observed independently. |
| Same need, want open source and self-hostable | Trigger.dev |
| Simple fire-and-forget plus cron, serverless origin | Upstash QStash |
| Long-lived Node workers, comfortable operating Redis | BullMQ |
| Durable execution without a new datastore | Hatchet, Postgres-backed |
| Genuinely complex multi-day sagas, polyglot services, enterprise scale | Temporal |

Standing up Temporal for what is really a handful of retryable async tasks is premature infrastructure. Say so
plainly if it is proposed.

## File uploads

Use presigned URLs so the client uploads directly to object storage with the signer's permissions and never
receives real credentials. Keep the app server out of the bytes' path entirely.

Expiration is `min(configured expiration, underlying credential expiry)`. A URL signed with temporary STS
credentials cannot outlive them, commonly one to six hours, regardless of the expiry you asked for. The SDK
and CLI maximum is seven days. Harden further with an `s3:signatureAge` bucket-policy condition, and a
source-IP restriction when the flow is server-mediated.

## Rate limiting

| Algorithm | Behavior | Use when |
|---|---|---|
| Token bucket | Allows controlled bursts, smooths to an average rate | Strongest general default for a public API |
| Sliding window counter | Close approximation, low memory | Practical default for distributed limiting at scale |
| Sliding window log | Exact, stores every timestamp | Security-sensitive endpoints needing exact fairness |
| Leaky bucket | Strictly constant output, no bursts | Protecting a fragile downstream, stopping retry storms |
| Fixed window | Allows 2x the limit across a window boundary | Rarely correct for a public endpoint |

## Email

SPF, DKIM, and DMARC on the sending domain, not the provider's shared domain, before any real send volume.
Without them, deliverability degrades regardless of which API you call. Provider webhooks are at-least-once
like every other webhook in this skill: dedupe by the delivery ID, and sort by `created_at` if order matters.

## Security floor

OWASP Top 10 2025 changed. Two categories are new and both are ordinary application code, not infrastructure:
A03 Software Supply Chain Failures, and A10 Mishandling of Exceptional Conditions. Dependency provenance and
error-path correctness are now named security categories. A01 Broken Access Control still holds the top spot.

Validation uses one schema shared between client and server in a TypeScript stack, so the rules cannot drift
apart. Parse into a typed value; do not validate and then use the raw input.

## Quality checklist

- [ ] Every handler and data-access function re-checks authorization; no check lives only in middleware.
- [ ] With pool tenancy, the tenant filter is enforced in the data layer, and a test proves a cross-tenant read
      fails.
- [ ] Every migration is a reviewable file in version control; no `push` was used against a shared database.
- [ ] Every webhook handler dedupes by event ID, tolerates out-of-order delivery, and acks before slow work.
- [ ] Every retryable non-idempotent operation carries an idempotency key.
- [ ] Uploads use presigned URLs; no route proxies file bytes.
- [ ] Every input crossing a trust boundary is parsed by a schema, on both sides.
- [ ] No secret appears in a client-bundled variable or a committed file.
- [ ] Every new external call has a timeout and a stated retry policy.

## Reference files

| File | Read when |
|---|---|
| `references/webhooks-idempotency.md` | Handling any webhook, or building an idempotency layer |
| `references/offline-sync.md` | The app must work offline, or optimistic updates and conflict resolution are in scope |
