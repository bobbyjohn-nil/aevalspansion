# Stack detection - run in this order, top to bottom

An existing, detected choice always beats the pack default. Pack defaults apply per concern, only to the
concerns that come back `NONE`. Never silently upgrade a major version.

## Contents
1. Is this an existing project
2. Package manager
3. Framework
4. Next.js router variant
5. Next.js major version
6. CSS framework
7. ORM and data layer
8. Test framework
9. TypeScript strictness
10. Output table shape
11. Pack defaults, applied only where nothing was detected

---

## 1. Is this an existing project

Check for `package.json` at repo root. In a monorepo, check `pnpm-workspace.yaml`, `turbo.json`, `nx.json`,
`lerna.json` first, then look inside `apps/*` and `packages/*`. No `package.json` anywhere means greenfield:
apply pack defaults.

```bash
ls package.json pnpm-workspace.yaml turbo.json nx.json lerna.json 2>/dev/null
```

## 2. Package manager

Using the wrong one corrupts lockfiles. Detect, never assume npm.

| Evidence | Package manager | Install command |
|---|---|---|
| `pnpm-lock.yaml` | pnpm | `pnpm install` |
| `yarn.lock` | Yarn (check the file header or `.yarnrc.yml` for v1 vs Berry) | `yarn install` |
| `bun.lockb` (binary, Bun <1.2) or `bun.lock` (text, Bun 1.2+) | Bun | `bun install` |
| `package-lock.json` | npm | `npm install` |
| `vlt-lock.json` | vlt | `vlt install` |
| `package.json` has `"packageManager": "pnpm@9.x"` and Corepack is active | that field wins over lockfile inference | per field |
| None of the above | npm, but ask before running an install | `npm install` |

`pnpm-lock.yaml`'s `lockfileVersion` maps to the pnpm major: 9.0 to pnpm 9/10, 7.0 to pnpm 9, 6.x to pnpm 8,
5.x to pnpm 7.

## 3. Framework

Require both a marker file and the confirming dependency in `package.json`. A stray config file without the
dependency is a stale leftover, not signal. Never key off `package.json`'s `"name"` or a README claim.

| Framework | Marker file | Confirming dependency |
|---|---|---|
| Next.js | `next.config.js` / `.ts` / `.mjs` | `next` |
| Vite SPA / React Router | `vite.config.ts` / `.js` | `vite` plus `react-router` or `react-router-dom` |
| Remix | `remix.config.js`, or the `@remix-run/dev` Vite plugin | `@remix-run/*` |
| Astro | `astro.config.mjs` / `.ts` | `astro` |
| SvelteKit | `svelte.config.js` | `@sveltejs/kit` |
| Nuxt | `nuxt.config.ts` | `nuxt` |
| Create React App (legacy, discourage) | none | `react-scripts`, with no `vite.config` or `next.config` |

## 4. Next.js router variant

`app/` present means App Router: the pack's server, caching, and action guidance applies. Only `pages/` and no
`app/` means Pages Router: Server Components, Server Actions, and Cache Components do not exist there. Treat
Pages Router as a distinct architecture and do not force App Router idioms onto it.

## 5. Next.js major version

This decides which caching model is legal. Read the `next` version from `package.json` and confirm against the
lockfile or `npx next --version`.

| Detected | Consequence |
|---|---|
| `^16.x` | Cache Components available. `"use cache"` is legal **only** if `next.config.*` sets `cacheComponents: true`. Check the flag; it is opt-in even on 16. `revalidateTag()` requires a `cacheLife` profile as its second argument. Verify the patch is 16.1.7 or later (CVE-2026-27978, `Origin: null` Server Action CSRF, affected 16.0.1 through 16.1.6). |
| `^14.x` or `^15.x` | Legacy implicit-caching model: `fetch()` cached by default, pages static unless a dynamic API is used. Never emit `"use cache"`. PPR only via `experimental.ppr` / the `experimental_ppr` route export. |
| `^13.x` or Pages-only | Pre-App-Router or early App Router. Verify each App Router API individually before using it. |

## 6. CSS framework

| Evidence | Conclusion |
|---|---|
| `@import "tailwindcss";` in a root CSS file, minimal or no `tailwind.config.*` | Tailwind v4, CSS-first config via `@theme` |
| `tailwind.config.js` / `.ts` exporting a `content` array | Tailwind v3, or v4 with the legacy `@config` shim. Disambiguate by reading the `tailwindcss` version in the lockfile |
| `*.module.css` / `*.module.scss` beside components, no Tailwind dependency | CSS Modules |
| `styled-components` or `@emotion/*` in dependencies | CSS-in-JS. Flag as an RSC-compatibility risk if paired with the App Router |
| `components.json` at repo root | shadcn/ui in use. Check whether `@radix-ui/*` or `@base-ui-components/*` is installed to know which primitive layer |

Tailwind v4 breaking changes that silently produce wrong code if you assume v3: `@import "tailwindcss"`
replaces the three `@tailwind` directives; default border color is `currentColor`, not `gray-200`, so borders
vanish after a naive migration; `!flex` became `flex!`; `bg-[--var]` became `bg-(--var)`; the shadow scale
shifted one step (`shadow-sm` became `shadow-xs`); variant stacking is left-to-right; hover is gated behind
`@media (hover: hover)`; the PostCSS plugin is `@tailwindcss/postcss`.

## 7. ORM and data layer

| Evidence | Conclusion |
|---|---|
| `prisma/schema.prisma` | Prisma |
| `drizzle.config.ts` plus `drizzle-orm` | Drizzle |
| `@supabase/supabase-js`, neither of the above | Supabase client, likely RLS-based access |

Match the existing ORM's query style. Never introduce a second ORM into a repo that already has one.

## 8. Test framework

| Evidence | Conclusion |
|---|---|
| `playwright.config.ts` | Playwright E2E already set up. Extend it; do not add Cypress alongside |
| `vitest.config.ts` | Vitest |
| `jest.config.js` / `.ts`, or a `jest` key in `package.json` | Jest |

Multiple present is normal and correct (Vitest for unit, Playwright for E2E). Do not consolidate unasked.

## 9. TypeScript strictness

Read `tsconfig.json`'s `strict` value plus `noUncheckedIndexedAccess`, `verbatimModuleSyntax`,
`isolatedModules`, `exactOptionalPropertyTypes`. If the repo has `strict: false`, either match that
permissiveness or flag the gap explicitly. Do not silently tighten a repo's config as a side effect of a
feature request.

## 10. Output table shape

Emit this in MODEL, before any file is written:

```
CONCERN            RESULT
package manager    DETECTED: pnpm (pnpm-lock.yaml, lockfileVersion 9.0)
framework          DETECTED: next 16.3.1
router variant     DETECTED: App Router (app/ present)
cacheComponents    DETECTED: false (next.config.ts has no cacheComponents key)
css                DETECTED: tailwind 4.1.x (@import "tailwindcss" in app/globals.css)
component lib      DETECTED: shadcn/ui + @base-ui-components
orm                NONE
test runner        DETECTED: vitest 3.x, playwright 1.5x
linter             DETECTED: eslint 9 flat config
ci                 NONE
```

## 11. Pack defaults, applied only where nothing was detected

| Concern | Default | Notes |
|---|---|---|
| Framework | Next.js 16 App Router | `create-next-app` with TypeScript |
| Language | TypeScript, `strict: true` plus `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules` | Next.js 16 requires TypeScript 5.1+ and Node 20.9+ |
| CSS | Tailwind v4, CSS-first `@theme` config | Tailwind v4's browser floor is Firefox 128+, stricter than Next 16's 111+. Say so if old-browser support matters |
| Components | shadcn/ui on Base UI (the default since July 2026); `shadcn init -b radix` for Radix | |
| ORM | Drizzle | Prisma is equally valid and is Rust-free by default since 6.16.0 |
| Unit tests | Vitest | Never unit-test an async Server Component; cover it in Playwright |
| E2E | Playwright | Run against `next build && next start`, not dev |
| Package manager | npm when no lockfile exists | Ask before the first install |
