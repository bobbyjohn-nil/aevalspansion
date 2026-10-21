# Non-Next stacks - detect first, then conform

## Contents
1. Detection order
2. Astro
3. Vite plus React Router
4. Remix
5. SvelteKit
6. Nuxt
7. Next.js Pages Router
8. Create React App
9. Rules that hold across all of them

---

## 1. Detection order

Require both the marker file and the confirming dependency. A config file with no matching dependency is a
stale leftover, not signal. Never key off `package.json`'s `"name"` or a README claim.

| Framework | Marker | Dependency |
|---|---|---|
| Next.js | `next.config.*` | `next` |
| Vite SPA | `vite.config.*` | `vite` plus `react-router` or `react-router-dom` |
| Remix | `remix.config.js`, or `@remix-run/dev` in `vite.config` | `@remix-run/*` |
| Astro | `astro.config.mjs`/`.ts` | `astro` |
| SvelteKit | `svelte.config.js` | `@sveltejs/kit` |
| Nuxt | `nuxt.config.ts` | `nuxt` |
| CRA | none | `react-scripts`, no `vite.config` or `next.config` |

## 2. Astro

Content-first sites with islands of interactivity. Pages in `src/pages/`, components in `src/components/`,
layouts in `src/layouts/`. Zero JS ships by default; interactivity is opted into per component with a client
directive (`client:load`, `client:idle`, `client:visible`). Content collections live in `src/content/` with a
schema, which is the reason to pick Astro over a generic SSG for anything with structured content.

Do not port Server Component or Server Action patterns here. They do not exist. Data loading happens in the
frontmatter fence of a `.astro` file, at build time or per request depending on the adapter.

## 3. Vite plus React Router

Client-rendered SPA unless a framework-mode server build is configured. `vite.config.ts` owns the build.
Routes are declared in code, not by file convention, unless the project uses React Router's framework mode
with a `routes.ts`.

Consequences that repeatedly trip up ported Next.js habits: there is no server boundary, so every dependency
is client JS and every secret in the bundle is public; data fetching is a client concern (loaders in framework
mode, otherwise a query library); `next/image` and `next/font` have no equivalent, so image sizing and font
loading must be handled explicitly to avoid CLS.

Tailwind v4 in Vite uses `@tailwindcss/vite`, not the PostCSS plugin.

## 4. Remix

Routes in `app/routes/`, with `loader` for reads and `action` for writes, both server-side. Forms post to the
route's own action, so progressive enhancement is the default rather than an opt-in. Nested routes with
`<Outlet />`. Error handling via `ErrorBoundary` exports.

The mental model is closest to App Router of any non-Next framework, but the APIs share no names. Do not
write `'use server'` or `revalidateTag` here.

## 5. SvelteKit

Routes in `src/routes/` as directories containing `+page.svelte`, `+page.server.ts` (server load and form
actions), `+layout.svelte`, and `+error.svelte`. Data comes from `load` functions; mutations from named form
actions. `$lib` aliases `src/lib`.

## 6. Nuxt

Pages in `pages/`, auto-imported components in `components/`, server routes in `server/api/`. Data via
`useFetch`/`useAsyncData`. `nuxt.config.ts` owns modules and runtime config. Nitro is the server layer, which
is where deployment presets live.

## 7. Next.js Pages Router

`pages/` with no `app/` directory. React Server Components, Server Actions, and Cache Components do not exist
here. Data fetching is `getServerSideProps`, `getStaticProps`, and `getStaticPaths`. API routes live in
`pages/api/` with `(req, res)` handlers, not the Web `Request`/`Response` pair.

Treat this as a distinct architecture. Do not force App Router idioms into it, and do not propose migrating a
working Pages app as a side effect of an unrelated feature request.

A repo with both `pages/` and `app/` is mid-migration. Add new work in `app/` and leave `pages/` alone unless
migration is the actual task.

## 8. Create React App

`react-scripts` in dependencies with no modern bundler config. CRA is unmaintained. Say so once, plainly, and
name the migration target (Vite for an SPA, Next.js if server rendering is wanted). Then conform to what is
there for the current task. A framework migration is its own project with its own confirmation, never a side
effect.

## 9. Rules that hold across all of them

- Match the repo's existing file naming, colocation, and import-alias conventions by reading the nearest
  comparable file, not by applying a personal preference.
- Never introduce a second router, a second CSS approach, a second ORM, or a second test runner into a repo
  that already has one working.
- Accessibility, contrast, interaction states, and the slop audit are framework-independent. They apply
  identically here.
- The gate set changes only in its commands, not in its existence: something must typecheck, lint, unit test,
  and drive a real browser, whatever the framework.
