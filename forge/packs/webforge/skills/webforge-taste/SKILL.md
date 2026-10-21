---
name: webforge-taste
description: >-
  Sets the design constraints before anything is generated, then audits the result against a table of AI-slop
  tells: purple hero gradients, gradient text, three identical cards, 1px gray borders everywhere, uniform
  radius, bounce easing. Use when a page looks generic, before shipping any visual surface, or when asked to
  make something distinctive or less AI-generated. Use this even unnamed. Not for copy; use webforge-noslop.
metadata:
  pack: webforge
  kind: taste
  domain: frontend,design
  version: "1.0.0"
---

# WebForge Taste
Makes the design decisions on purpose, writes them down before generating, and audits the output against the
slop table. Called by `webforge-orchestrator` before `webforge-ui` builds, and again before ship.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: webforge-taste only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: webforge-taste (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## The one rule this skill exists to enforce

Explicit constraints beat implicit hope. A model's default UI is the statistical median of scraped tutorials,
template marketplaces, and untouched component-library defaults. You do not escape that median by intending
to. You escape it by writing down specific constraints first and grading the output against them after.

So: **the constraint block gets written before the first line of markup, and the slop audit runs before
anything is called done.** Distinctiveness and slop avoidance are the same audit run twice, once generative
and once adversarial.

## When called by the orchestrator

Write the constraint block into `DESIGN.md` at the project root (or append to it), hand it to `webforge-ui`
as fixed input, and return. Re-enter after the build for the audit pass only.

## When invoked directly

If a `DESIGN.md` or an equivalent token file already exists, read it and audit against it. If none exists and
markup already exists, run the audit first and propose the constraint block as the fix, not the other way
round.

## Step 1 - the constraint block, written before generating

Five lines, in a file, not in your head. Later work is graded against this fixed decision instead of drifting
screen to screen.

```markdown
# DESIGN.md
MEMORABLE FOR: <one sentence, mechanism not adjective. "A single 64px serif numeral is the only display
                element on the page; everything else is 14px labels." Not "clean and modern.">
PUSHED DIMENSION: <exactly one of type | color | motion | layout. Loud in every dimension reads as noisy,
                   not distinctive.>
PALETTE: <one dominant hue, one neutral family, one accent. Roughly 60/30/10 by area, asymmetric on purpose.
          Name the source: the subject matter, the brand, a named reference. Never "a nice blue".>
TYPE: <two families, hard cap three, and the third needs a distinct job such as monospace for data. Name the
       scale ratio or the fixed step list.>
BANNED HERE: <the specific defaults you are refusing: e.g. Inter as the only face, purple gradients, the
              three-card row, 1px borders as the default separator.>
```

Reference-driven, not vibe-driven: pick 3 to 5 concrete references and state what each one **specifically
does**, in mechanism terms. "Uses a single accent color and spends it only on the primary action" is usable.
"Clean and modern" is not, and produces exactly as generic an output as it is a description.

## Step 2 - the numbers the constraint block resolves to

**Type scale.** Either a ratio or a fixed step list, never eyeballed values.

| Ratio | Name | Fits |
|---|---|---|
| 1.200 | Minor third | Default for app and product UI |
| 1.250 | Major third | Marketing sites, blogs |
| 1.333 | Perfect fourth | Editorial, content-heavy |
| 1.500 | Perfect fifth | Display-heavy, hero-dominant |

Fixed list, the better default for product UI because pure ratios produce ugly numbers past three steps:
`12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72`. Adjacent steps in actual use must differ by at least 1.25x; a
flatter hierarchy than that is a slop tell.

Line height is inverse to size: body 1.5 to 1.7 at 14 to 18px, headings 1.0 to 1.25, display 1.0. Below 1.3x
on body copy reads as cramped and templated. Measure: 65ch as the single default, 60ch for dense UI, 75ch for
long-form. Hard ceiling 80 characters.

**Spacing.** One fixed scale, nothing in between: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256`. It widens
as it grows on purpose. Proximity encodes relationship, so gaps must be strictly ordered:

```
label to input:      4-8px      same-component parts
field to field:      16-24px    related, same group
group to group:      32-48px    related, different groups
section to section:  64-96px+   unrelated content blocks
```

One gap value used everywhere destroys the only signal telling the eye what belongs together. Start with too
much whitespace and remove it; designs that add breathing room after the fact stay cramped.

**Radius scales with element size.** One value everywhere is a tell.

| Value | Applies to |
|---|---|
| 2px | Badges, checkboxes, shortcut chips |
| 4px | Labels, tags, timestamps, tooltips |
| 6px | Buttons, inputs, selects, nav items |
| 8px | Cards, dropdown menus, floating UI |
| 12px | Modals, page containers |
| 16px | Large media containers |
| 999px | Avatars, status pills only |

Nested radius: `inner = outer - padding`, then check it optically. Cap small and medium containers at 12 to
16px; 24px or more on a small card reads as a soft blob.

**Depth.** Five levels, never a hand-tuned one-off:

```css
--shadow-xs: 0 1px 2px rgb(0 0 0 / .05);                             /* buttons */
--shadow-sm: 0 1px 3px rgb(0 0 0 / .1), 0 1px 2px rgb(0 0 0 / .06);  /* cards */
--shadow-md: 0 4px 6px rgb(0 0 0 / .1), 0 2px 4px rgb(0 0 0 / .06);  /* dropdowns */
--shadow-lg: 0 10px 15px rgb(0 0 0 / .1), 0 4px 6px rgb(0 0 0 / .05);/* modals */
--shadow-xl: 0 20px 25px rgb(0 0 0 / .15), 0 10px 10px rgb(0 0 0 / .05);
```

Commit to one depth cue per surface: a crisp edge **or** soft elevation. A 1px hairline stacked with a wide
diffuse shadow on the same element is a tell.

**Color.** A production UI needs 40 to 80 total values: 8 to 9 gray steps, 5 to 10 primary steps, 5 to 10 per
semantic accent. Fewer means per-screen improvisation; wildly more means no system. Two token layers always:
primitives feed semantic aliases, components consume only the semantic layer. Hex values or raw `gray-500` in
a component file is the tell that this layer is missing.

Building a ramp: anchor the brand color at its natural lightness rather than forcing it into slot 500.
Light tints desaturate aggressively, 30 to 70 percent. Dark shades desaturate only 15 to 25 percent, or they
go muddy. Preserve hue angle throughout.

Saturation by role: full brand saturation only on the primary action and small high-signal areas; 40 to 60
percent on secondary elements; 15 to 25 percent disabled; 5 to 10 percent placeholder. Large surfaces at full
saturation read as cheap. Muted large surfaces plus one saturated accent read as considered.

**Contrast, non-negotiable.** WCAG 2.1 AA: body text 4.5:1, large text (18pt/24px regular or 14pt/18.66px
bold) 3:1, UI component boundaries and focus indicators 3:1. Ratios are not rounded; 4.499:1 fails. Focus uses
`:focus-visible`, not `:focus`, with an indicator at least as large as a 2px perimeter outline:

```css
:focus-visible { outline: 2px solid var(--fg); box-shadow: 0 0 0 4px var(--bg); }
```

**Dark mode is a second hand-authored scale, never an inversion.** Base surface is a `#121212`-class dark
gray, never pure black; pure black next to saturated UI spikes contrast so high it increases eye strain.
Elevation inverts its cue: in dark mode a raised surface gets **lighter**, not a bigger shadow. Desaturate
brand colors slightly for dark backgrounds and use a high-opacity near-white for text rather than pure white
at full opacity.

**Motion.** Never `ease-in` alone for anything entering or leaving; it is slow exactly when attention is
highest. Lead entrances with deceleration. The browser keyword defaults are too weak; supply a curve.

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Durations: button feedback 100-160ms, tooltip 125-200ms, dropdown 150-250ms, modal or drawer 200-500ms, hard
cap around 300ms for ordinary UI motion, list stagger 30-80ms between items. Animate `transform` and `opacity`
only; those run on the compositor. Never animate `width`, `height`, `padding`, `margin`, `top`, `left`.

Reduced motion, inverse-gated so the safe static state is what ships by default:

```css
@media (prefers-reduced-motion: no-preference) { /* motion effects live here */ }
```

Strip transform movement, parallax, autoplay, and scale entrances under reduced motion. Keep opacity and color
transitions; they carry information, not motion sickness.

## Step 3 - the slop audit

Run this before calling any visual surface done. Every row is a defect with a location, logged in the shape
`app/page.tsx hero | 3 identical feature cards | MAJOR | slop-tell`. The full table with the alternative move
for every tell is in `references/slop-tells.md`. These twelve are the highest-frequency, checked every time:

- [ ] No purple-to-blue or indigo-to-violet gradient, especially as a hero background.
- [ ] No gradient text anywhere. Text is a solid color.
- [ ] No radial-gradient halo or glow behind a hero.
- [ ] No row of exactly three identical feature cards (icon tile, heading, two lines).
- [ ] No small rounded-square icon tile centered above every card heading.
- [ ] No colored 3-4px accent border down one side of a card.
- [ ] No flat 1px gray border on every card. Separate in this order: whitespace, then a 3-5 percent
      background-lightness shift, then soft elevation, and a border only if all three genuinely fail.
- [ ] No single radius value used at every size; radius scales (Step 2).
- [ ] No 24px+ radius on a small container.
- [ ] Adjacent type steps differ by 1.25x or more; no flat hierarchy.
- [ ] No bounce or elastic easing on ordinary chrome; no entrance scaling from literal `scale(0)`; floor at
      `scale(0.95)` with `opacity: 0`.
- [ ] No decorative infinite loop: pulsing "live" dot on static data, fake blinking cursor, autoplay logo
      marquee. Animate only when the underlying state is actually changing.

Plus the ones that are functional failures, not taste:

- [ ] Empty state and error state exist and were designed, not defaulted.
- [ ] Nothing is stuck at `opacity: 0` because a scroll-reveal never fired.
- [ ] Heading levels do not skip (`h1` to `h3`).
- [ ] Body text is at least 14px; nothing functional is under 11px.
- [ ] No content flush against the viewport edge; 16px minimum horizontal padding.
- [ ] `100dvh`/`100svh` where a viewport-height unit is used, never bare `100vh`.

## Step 4 - one deliberate distinctive decision

A point of view is a bundle of reinforcing constraints, not one flourish. The worked example: high contrast,
plus deliberately doubled whitespace, plus a monochrome base with exactly one accent, plus sharp geometric
type. Any one of those alone collapses. Monochrome without sharp type reads boring; high contrast without
whitespace reads aggressive.

The generic move is always "add one more of everything": one more card, one more gradient, one more icon, one
more animation. Distinctiveness comes from self-imposed constraint. Take the spacing that feels like enough
and double it. Cap the palette. Two fonts. One pushed dimension.

## Quality checklist

- [ ] `DESIGN.md` exists, was written before the markup, and names one pushed dimension.
- [ ] The palette, type scale, spacing scale, and radius scale are token values, not per-component literals.
- [ ] Every slop-audit row above was checked against a named file and line, not against an impression.
- [ ] Every text and UI-boundary contrast pair was measured, not eyeballed.
- [ ] Dark mode, if present, is a second authored scale with a non-black base.
- [ ] Every motion rule holds under `prefers-reduced-motion: reduce`.
- [ ] No numeric design score was produced. Defects have locations and severities instead.

## Interop

Defer to a project-local design-system, brand, or component skill when one exists, and compose with it: it
supplies the tokens and the house rules, this skill supplies the audit. Never override a project token file
with pack defaults. Name it in the receipt line. If the rest of the pack is absent, this skill runs standalone.

## Reference files

| File | Read when |
|---|---|
| `references/slop-tells.md` | Running the full audit, or a specific tell needs its alternative move |
