---
name: webforge-ship
description: >-
  Takes a working web app to a live URL: build config and output mode, environment variables and secret
  hygiene, per-route metadata and Open Graph and sitemap, error tracking and tracing wired before the first
  public deploy, then a post-deploy check that fetches a real status code. Use for "deploy this", "ship it",
  "set up production", or "add SEO". Use this even when the user does not name it. Not for writing tests; use
  webforge-verify.
metadata:
  pack: webforge
  kind: specialist
  domain: deploy,seo,observability
  version: "1.0.0"
---

# WebForge Ship
Build, environment, metadata, observability, deploy, and the post-deploy proof. Called by
`webforge-orchestrator` as the last subgoal, or directly.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-ship only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-ship (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Refusal clause

A deploy to a public URL is irreversible in the ways that matter: it is indexable, it is linkable, and it can
leak. State the target, the domain, and what becomes publicly readable, then get explicit confirmation before
running the deploy command. Never deploy as a side effect of a build request.

If error tracking is not wired, say so before deploying rather than after. Shipping blind means the first
report of a production failure comes from a user.

## When called by the orchestrator

Take the stack posture from MODEL and the gate results from VERIFY. Do not deploy if any registered gate is
red; say which one and stop.

## When invoked directly

Run the gate set from `webforge-verify` first, or say explicitly that you are shipping unverified and why.

## Environment variables and secrets

| Rule | Detail |
|---|---|
| `NEXT_PUBLIC_` means public | Inlined into the client bundle at build time. Never a secret behind it. Treat the prefix as a declaration, not an oversight |
| `.env.local` is git-ignored by default | `.env`, `.env.local`, `.env.production`, `.env.development` follow standard precedence |
| Generate secrets, do not invent them | `openssl rand -base64 32` |
| Self-hosting on multiple instances | Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` explicitly; it must decode to 16, 24, or 32 bytes. Otherwise each server picks its own key per build and cross-instance action closures break |
| `serverRuntimeConfig` / `publicRuntimeConfig` | Removed in Next 16. Use environment variables |

Before any deploy, grep the client bundle surface for leaks:

```bash
grep -rn "NEXT_PUBLIC_" --include="*.ts" --include="*.tsx" . | grep -iE "secret|key|token|password|private"
```

Any hit is a BLOCKER. Rotate the value, do not just rename the variable.

## Build and output mode

| Target | Config | Notes |
|---|---|---|
| Vercel | default | First-class support for the caching, ISR, and OpenTelemetry features out of the box |
| Docker or self-hosted | `output: 'standalone'` | Produces a minimal server bundle plus a traced `node_modules` for a small image. Cache Components and `"use cache"` are supported on Node and container targets |
| Static export | `output: 'export'` | **`"use cache"` and Cache Components are not supported.** Choosing static export means choosing out of the entire caching model |
| Other platforms | `experimental.adapterPath` | Build Adapters API, alpha. Verify before relying on it |

Build once, then serve the built artifact for every check. A number taken from `next dev` is not a
production number.

```bash
npx next build
npx next start &
```

## Metadata, per route and not per app

A single app-wide title and description is the tell that this step was skipped.

```tsx
// static, layout.tsx or page.tsx, Server Components only
export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Plans and pricing for ...',
  alternates: { canonical: 'https://example.com/pricing' },
  openGraph: { title: 'Pricing', url: 'https://example.com/pricing', type: 'website' },
}

// dynamic, data-dependent
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)     // wrap getPost in React cache() so the page does not refetch
  return { title: post.title, description: post.excerpt }
}
```

- Canonical URL per route. Open Graph per route. Both, not one.
- File conventions: `favicon.ico`, `icon.tsx`, `apple-icon.jpg`, `opengraph-image.tsx`, `twitter-image.jpg`,
  `robots.txt`, `sitemap.xml`. Deeper files take precedence, so `app/blog/opengraph-image.jpg` overrides the
  root one for `/blog/*`.
- Dynamic OG images use `ImageResponse` from `next/og`. It supports flexbox and a CSS subset only. **No
  `display: grid`.** A grid layout there silently renders wrong.
- For dynamically rendered pages Next streams metadata separately and injects it once `generateMetadata`
  resolves, except for bots that need it synchronously (Twitterbot, Slackbot, Bingbot), which are detected by
  user agent and served blocking metadata. Prerendered pages resolve metadata at build time.
- JSON-LD has no dedicated API. Render a `<script type="application/ld+json">` in a Server Component with
  schema.org vocabulary matching the page type.

## Observability, wired before the first public deploy

```ts
// instrumentation.ts at the project root, or in src/
import { registerOTel } from '@vercel/otel'
export function register() {
  registerOTel({ serviceName: 'my-app' })
}
```

```bash
npm install @vercel/otel @opentelemetry/sdk-logs @opentelemetry/api-logs @opentelemetry/instrumentation
```

Next auto-instruments itself: root request spans, RSC render spans, `fetch()` calls, `generateMetadata`, and
route handler execution, all with `next.route` and `next.span_type` attributes. `NEXT_OTEL_VERBOSE=1` shows
the full span set. The edge runtime requires `@vercel/otel` specifically; a manual `NodeSDK` setup is Node
runtime only.

Error tracking needs both halves:

1. Client: report from `error.tsx` and `global-error.tsx` in a `useEffect` keyed on `error`.
2. Server: instrument unhandled Server Action and route handler exceptions. A Server Action that throws
   before any response is sent never reaches the client boundary, so a client-only setup misses it entirely.

Correlate production Server Component errors by `error.digest`; the real message is deliberately withheld from
the client.

## Post-deploy check

"Deployed successfully" is not a check. Run all four and quote the output:

```bash
curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" https://example.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://example.com/sitemap.xml
curl -sSI https://example.com/ | grep -iE "content-security-policy|strict-transport-security|cache-control"
npx @lhci/cli autorun --collect.url=https://example.com/
```

Then read a real Core Web Vitals number. Lab data catches regressions pre-merge; only field data at p75 tells
you what users experience. CrUX lags by up to 28 days on a rolling window, so a fix shipped today does not
move that dashboard for weeks. Wire the `web-vitals` library for same-day feedback:

```ts
import { onCLS, onINP, onLCP } from 'web-vitals'
const send = (m) => navigator.sendBeacon('/analytics', JSON.stringify({ name: m.name, value: m.value, id: m.id }))
onCLS(send); onINP(send); onLCP(send)
```

Targets at p75: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less, measured separately for mobile and
desktop.

## Quality checklist

- [ ] No secret is behind a `NEXT_PUBLIC_*` name; the grep above ran and its output is quoted.
- [ ] Every registered gate from `webforge-verify` passed before the deploy command ran.
- [ ] Every public route has its own title, description, and canonical URL.
- [ ] Open Graph image renders; the `next/og` layout uses flexbox, not grid.
- [ ] `robots.txt` and `sitemap.xml` return 200.
- [ ] Error tracking is wired on both the client and the server side, and one test error was seen arriving.
- [ ] The post-deploy check quoted a real HTTP status code and a real Core Web Vitals reading.
- [ ] The user explicitly confirmed the deploy target and domain before the deploy ran.
- [ ] `output: 'export'` is not combined with `"use cache"` or Cache Components.

## Interop

Defer to a project-local deploy, release, or infrastructure skill when one exists, and compose with it: it
owns the target, the pipeline, and the credentials, this skill owns build config, metadata, and the
post-deploy proof. Never invent a deploy command for infrastructure you have not read. Name it in the receipt
line. If the rest of the pack is absent, this skill runs standalone.
