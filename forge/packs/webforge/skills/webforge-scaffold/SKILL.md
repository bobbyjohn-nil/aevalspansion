---
name: webforge-scaffold
description: >-
  Stands up a new web project, or a new surface inside an existing one, matching the stack already in the repo
  rather than imposing a default: package manager from the lockfile, framework major from package.json, CSS and
  ORM from their configs. Use for "start a new site" or "add a dashboard section". Use this even when the user
  does not name it. Not for building components; use webforge-ui.
metadata:
  pack: webforge
  kind: specialist
  domain: frontend,tooling
  version: "1.0.0"
---

# WebForge Scaffold
Creates the project skeleton, config, and dependency set. Called by `webforge-orchestrator` as subgoal 1, or
directly for a greenfield start.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-scaffold only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-scaffold (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## The escape hatch, stated first

**An existing, detected choice always beats the pack default, per concern.** The defaults below apply only to
concerns that came back `NONE` in the orchestrator's stack posture table. A repo on Next 15 with Tailwind v3
and Jest gets Next 15, Tailwind v3, and Jest. Conforming to a repo you did not choose is this skill working
correctly.

Never silently upgrade a major version. If a version needs to move, say so, say why, and get confirmation.

## When called by the orchestrator

Read the stack posture table from MODEL. Do not re-run detection. Fill only the `NONE` rows.

## When invoked directly

Run the detection order in `references/non-next-stacks.md` section 1 (or the orchestrator's
`stack-detection.md` if present), print the resulting table, then scaffold.

## Package manager

The lockfile decides. Using the wrong one corrupts the lockfile.

| Lockfile | Manager | Install |
|---|---|---|
| `pnpm-lock.yaml` | pnpm | `pnpm install` |
| `yarn.lock` | Yarn | `yarn install` |
| `bun.lockb` or `bun.lock` | Bun | `bun install` |
| `package-lock.json` | npm | `npm install` |
| `vlt-lock.json` | vlt | `vlt install` |
| none | npm, after asking | `npm install` |

`"packageManager"` in `package.json` wins over lockfile inference when Corepack is active.

## Pack default stack, greenfield only

| Concern | Default | Why not the alternative |
|---|---|---|
| Framework | Next.js 16, App Router | Server Components remove a whole client-data-fetching layer. Pick Astro instead when the site is content-first with islands of interactivity; pick Vite plus React Router when there is no server rendering requirement at all |
| Language | TypeScript, `strict: true` | Plus `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`. `"module": "preserve"` and `"noEmit": true` for bundler-based builds |
| CSS | Tailwind v4, CSS-first `@theme` config | CSS Modules is the escape hatch when the team wants locality without utilities. Do not start a new App Router project on runtime CSS-in-JS |
| Components | shadcn/ui on Base UI | `shadcn init -b radix` for Radix. Both are first-class; detect which one an existing repo installed rather than assuming |
| ORM | Drizzle | Prisma is equally valid and has been Rust-free by default since 6.16.0, which made its bundles roughly 90 percent smaller and edge-viable. The old "Prisma is too heavy" rule is dead |
| Unit tests | Vitest | |
| E2E | Playwright | |
| Lint | ESLint flat config | |

Minimum versions Next.js 16 requires: Node 20.9.0, TypeScript 5.1. Browser floor is Chrome/Edge/Firefox 111+
and Safari 16.4+, except that Tailwind v4 raises the Firefox floor to 128+. If old-browser support matters,
say this before installing Tailwind v4.

## Next.js major gate

This gate decides whether whole APIs exist. Read `next` from `package.json` before writing a single line.

| Detected major | `"use cache"` | Caching default | Other |
|---|---|---|---|
| `^16` with `cacheComponents: true` in `next.config.*` | legal | dynamic by default, caching is opt-in | PPR is built in, no separate flag |
| `^16` without the flag | **illegal, do not emit** | dynamic by default | Turn the flag on deliberately, or write no cache directives |
| `^14` / `^15` | **illegal, does not exist** | `fetch()` cached by default, pages static unless a dynamic API is used | PPR only via `experimental.ppr` |
| `^13` or Pages-only | illegal | legacy | Verify each App Router API individually before use |

On any Next 16 scaffold, verify the patch is 16.1.7 or later. Versions 16.0.1 through 16.1.6 carry
CVE-2026-27978: the Server Action origin check treated `Origin: null` (sent by sandboxed iframes) as missing
rather than cross-origin, allowing forged Server Action calls.

```bash
npx next --version
```

## Greenfield commands

```bash
npx create-next-app@latest myapp --typescript --tailwind --app --eslint
cd myapp
npx shadcn@latest init            # add -b radix only if Radix is wanted
npx shadcn@latest add button input label
npm install drizzle-orm && npm install -D drizzle-kit
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
npm init playwright
```

Swap `npx`/`npm` for the detected manager's equivalents. Do not run installs in a repo whose package manager
you could not determine; ask first.

## New surface inside an existing repo

1. Read the nearest existing example of the same kind of surface and match its conventions: file naming,
   colocation, barrel files or not, where types live, how data is fetched.
2. Add the route or module in the place the existing structure implies, not in a new top-level directory.
3. Add dependencies only when nothing installed already does the job. Check `package.json` first; the most
   common scaffold defect is installing a second library that duplicates one already present.
4. Do not touch shared config (`tsconfig.json`, `next.config.*`, lint config) unless the new surface genuinely
   requires it, and log the reason when you do.

## Files this skill does not create unless asked

No `README.md`, `CONTRIBUTING.md`, or `CHANGELOG.md`. No extra sections added to an existing README. No
`.env.example` full of invented keys. Generated documentation nobody requested is the scaffold form of slop.

## Quality checklist

- [ ] The package manager used matches the lockfile present, or none existed and the user was asked.
- [ ] Every version written into `package.json` was read from a real registry response or an existing file,
      not recalled.
- [ ] No major version was changed as a side effect of this task.
- [ ] `"use cache"` appears only under Next 16 with `cacheComponents: true` confirmed in the config file.
- [ ] For a Next 16 scaffold, `npx next --version` printed 16.1.7 or later, and the output is quoted.
- [ ] `npx tsc --noEmit` exits 0 on the fresh scaffold before anything else is built on it.
- [ ] No unrequested documentation file was created.

## Interop

Defer to a project-local scaffold, generator, or template skill when one exists, and compose with it: it owns
the house structure, this skill only fills concerns it does not cover. Name it in the receipt line. If the
rest of the pack is absent, this skill runs standalone.

## Reference files

| File | Read when |
|---|---|
| `references/next-app-router.md` | The target is Next.js App Router: file conventions, config keys, project layout |
| `references/non-next-stacks.md` | The repo is Astro, Vite, Remix, SvelteKit, Nuxt, or Pages Router |
