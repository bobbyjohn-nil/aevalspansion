---
name: appforge-taste
description: >-
  Makes product and interaction decisions on purpose: platform-native navigation and gestures, touch targets
  and thumb reach, the loading, empty, error, and offline state of every screen, and what makes an app feel
  fast. Audits the result against a table of AI-slop tells. Use when asked to make a screen look good, when
  one feels generic or web-shaped, or before shipping a visual surface, even when unnamed. Not for prose; use
  appforge-noslop.
metadata:
  pack: appforge
  kind: taste
  domain: mobile,desktop,design
  version: "1.0.0"
---

# AppForge Taste

Product and interaction craft for app surfaces. Runs twice on any visual work: once generatively, to set
constraints before anything is drawn, and once adversarially, to audit what was made.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-taste only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-taste (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Run the constraint block before the first screen is generated, then the slop audit before delivery. If a
screen already exists, skip to the audit and report defects with locations.

## When invoked directly

Ask what the app is and what it should be remembered for, in one sentence. Then run the constraint block. If
the user brought an existing screen, audit it and return a defect table, not a redesign nobody asked for.

## Constraint block, written before generating anything

Explicit constraints beat implicit hope. A model left to its own defaults reproduces the median of its
training data, which is exactly the look everyone recognizes as generated. Write these down first, in the
repo, in a `DESIGN.md` or a token file the build reads:

1. **One sentence naming what this app should be remembered for.** A mechanism, not an adjective. "The list
   never blocks: every row is editable in place" beats "clean and modern".
2. **Pick exactly one dimension to push hard**: type, or color, or motion, or layout. Not all four. Loud in
   every dimension reads as noisy, not distinctive.
3. **Palette cap.** One dominant hue at roughly 60 percent of the surface, one neutral at 30, one accent at
   10. A production UI needs 40 to 80 total color values across ramps. Fewer means per-screen one-offs; wildly
   more means no system.
4. **Two font families, three at the absolute cap.**
5. **A fixed spacing scale with no in-between values allowed**: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. This
   one constraint eliminates most eyeballed inconsistency.
6. **Three to five concrete references, each described by mechanism.** Not "like Linear". "A single 64px
   numeral is the only display element on the screen; everything else is a 14px label."

Start with too much whitespace and remove it. Designs that add breathing room afterwards stay cramped.

## Platform feel

A native app that feels web-shaped is the app equivalent of a purple gradient. The tells are structural:

| Web-shaped tell | Native move |
|---|---|
| A custom in-app back button in the header, no edge-swipe | Use the platform navigator so the iOS back-swipe and the Android system back both work. Losing the back gesture is the single most common native-feel failure. |
| Hamburger drawer as the primary navigation on a phone | Tabs for 3 to 5 primary destinations. A drawer hides everything behind a tap and puts it out of thumb reach. |
| A modal that cannot be dismissed by dragging down | Sheets are draggable. If it looks like a sheet, it dismisses like one. |
| Pull-to-refresh missing from a feed that has fresh data | Add it, and let it be the only manual refresh affordance for a list |
| Long lists with no momentum or a hijacked scroll | Never intercept scroll physics. Platform scrolling is a signature users read instantly. |
| Web-style hover states on touch surfaces | Touch has pressed, not hover. Gate any hover style behind a pointer query on the desktop build. |
| Full-page spinner replacing content that was already on screen | Keep the stale content, mark it refreshing. Replacing rendered content with a spinner is a visible step backwards. |
| A toast for every successful action | Silence is the correct feedback for a routine success. Reserve confirmation for actions the user cannot see the result of. |

**Touch targets and reach.** iOS convention is a 44 by 44 point minimum; Material's baseline recommendation is
48dp. The accessibility floor is 24 by 24 CSS pixels, or a smaller target with at least 24px of clearance to
the next one. Treat 44 to 48 as the target and 24 as the absolute floor, and put primary actions in the lower
half of the screen where the thumb reaches without a grip change. A destructive action next to a common one,
both at minimum size, is a mis-tap generator.

## Every screen ships four states

Not one. Missing states are the highest-frequency defect in generated app UI, and they are all invisible until
the unhappy path happens to a real user.

| State | Rule |
|---|---|
| Loading | Under 0.1s, no indicator. 0.1 to 1s, no indicator needed but do not block input. 1 to 10s, a busy indicator. Over 10s, a determinate progress indicator and a way to cancel. |
| Empty | State the system status in plain language, teach what would appear here, and give a direct action. "No records for the selected date range" plus a Create button. Not a blank void. |
| Error | Name the failure and the next action, inline and next to the thing that failed. "Upload failed: file exceeds 25 MB." Never "Oops! Something went wrong." |
| Offline | Say the app is offline, say what still works, and mark queued writes as pending. Offline is a normal state on a phone, not an exception. |

Skeleton over spinner when the resulting layout is predictable: a list, a feed, a profile. A skeleton that
mirrors the final layout reduces perceived wait and prevents the layout shift on resolve. A spinner is fine
for a short wait with an unpredictable result shape.

Error copy rules that hold everywhere: inline next to the offending field, never hover-only, never color
alone (pair an icon left of the message), validate after the user finishes a field rather than on every
keystroke, and treat three repeated errors on the same field as a design defect rather than a user error.

## Making it feel fast when it is not

Perceived speed is mostly about who waits and whether anything moved.

1. **Acknowledge the touch before doing the work.** Render the pressed state first and defer expensive work,
   for example inside `requestAnimationFrame`, so the press never feels dropped.
2. **Optimistic writes with a real rollback.** The list updates immediately; the network catches up. Without
   the rollback branch this is a lie, not a technique.
3. **Never replace rendered content with a loading state.** Keep what is on screen, mark it refreshing.
4. **Prefetch on intent**, not on mount: when the row scrolls into view, when the tab is pressed.
5. **Animate on the UI thread.** Use the native driver, animate transform and opacity only. Animating width,
   height, or layout properties recalculates layout every frame and produces exactly the stutter you were
   trying to hide.
6. **Preserve scroll position and form input across navigation.** Losing either reads as slow even when it is
   instant, because the user has to redo work.
7. **Keep the frame budget.** 16.67ms at 60fps, 8ms at 120Hz. A frame that overruns by 1ms is dropped whole;
   there is no partial credit.

## Motion

- Duration bands: press feedback 100 to 160ms, tooltip 125 to 200ms, dropdown 150 to 250ms, modal or sheet 200
  to 500ms. Ordinary UI motion caps around 300ms. Over 400ms reads as sluggish.
- Never use `ease-in` alone for something appearing or disappearing. It is slow at the start, exactly when the
  user's attention is highest. Lead entrances with deceleration.
- Reserve spring and elastic easing for things being physically dragged: a sheet dismiss, a swipe to delete.
  Bounce on ordinary chrome reads as dated. Keep bounce constrained.
- Never scale an entrance from literal zero. Floor it around 0.9 to 0.97 with opacity.
- No decorative infinite loops: pulsing "live" dots on static data, blinking fake cursors, auto-scrolling
  marquees. Animate when state actually changes.
- Respect the reduced-motion setting. Strip transform movement, parallax, and autoplay. Keep opacity and color
  transitions; they carry information rather than motion sickness.

## Slop audit, run before delivery

Full table with alternatives is in `references/slop-tells.md`. These are the ones that hit app surfaces
hardest, and each is a BLOCKER or MAJOR defect with a location, not a matter of preference:

- Purple-to-blue or indigo-to-violet gradient anywhere, especially behind a header. Gradient text at all.
- A row of exactly three identical cards with an icon tile centered above each heading.
- A flat 1px gray border on every container. Separate content in this order: whitespace, then a 3 to 5 percent
  background shift, then soft elevation, and a border only if all three genuinely fail.
- A colored 3 to 4px accent border down one side of a card.
- One radius value everywhere, or 24px-plus radius on a small card. Cap small and medium containers at 12 to
  16px, and scale radius with element size.
- A flat type hierarchy. Adjacent scale steps need at least a 1.25 ratio.
- Emoji used as functional icons in product UI.
- Dark mode produced by inverting the light scale. Author a second scale. Base near #121212, never pure black,
  and never pure white text on it.
- Body text under 14 to 16px, or any functional text under 11px.
- Copy tells: "Get Started Now", "Oops! Something went wrong", "Success! Your changes have been saved
  seamlessly." A button label is an imperative verb phrase. A toast is one word when one word is true.

## Quality checklist

- [ ] The constraint block exists in the repo and was written before the first screen was generated.
- [ ] Exactly one dimension is pushed; the others are held to the system.
- [ ] Every screen touched has loading, empty, error, and offline states, each named with a file location.
- [ ] Every interactive target is at least 44 by 44 points on iOS or 48dp on Android, and nothing falls below
      the 24px floor.
- [ ] Platform back, edge-swipe, and sheet-drag gestures all work on the surfaces added.
- [ ] Contrast measured, not eyeballed: 4.5:1 for body text, 3:1 for large text and UI boundaries.
- [ ] Motion animates transform and opacity only, and honors the reduced-motion setting.
- [ ] The slop table was run explicitly, and every hit is either fixed or logged with a location and a reason.

## Reference files

| File | Read when |
|---|---|
| `references/slop-tells.md` | Running the audit, or a specific tell needs its alternative move |
