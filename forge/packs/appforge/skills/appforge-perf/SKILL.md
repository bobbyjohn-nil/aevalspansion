---
name: appforge-perf
description: >-
  Refuses app performance work until a before-number exists, then fixes the named phase: cold, warm, and hot
  start, dropped frames and jank, list scrolling, JS versus UI thread attribution, memory, and query latency.
  Every fix ships a regression gate. Use when an app feels slow or laggy, a screen stutters, startup drags, or
  someone asks to profile or optimize it. Use this even when unnamed. Not for how a screen should look.
metadata:
  pack: appforge
  kind: perf
  domain: mobile,desktop,performance
  version: "1.0.0"
---

# AppForge Perf

Performance work that starts with a measurement and ends with a gate. Standalone: it assumes nothing else in
this session ran.

## Activation receipt

Standing rule for the rest of this session, every turn, not just the first:

Whenever this skill's guidance shapes your response, end the reply with exactly one line, after a blank
line, as the last thing in the visible output:

    [skills: name1 > name2]

List every skill that fired this turn, FORGE or not, in the order it fired, by its full name. If this skill
ran alone, write `[skills: appforge-perf only]`. If a skill you intended to call was not on disk, add one
short parenthetical: `[skills: appforge-perf (<missing-skill> absent)]`.

Never write a second such line, a heading above it, a banner, or any explanation of it. Never put it inside a
code fence. This line is the only permitted trace of the machinery; everything else about phases, defect
logs, and refinement cycles stays hidden.

## Interop

If a project-local skill in `.claude/skills/` covers this subgoal more specifically, invoke it and defer to it
on domain rules: it decides what is correct in this repo. Compose rather than override, with this skill
supplying only the craft layer, and never silently duplicate work it already owns. Name every skill that
fired in the receipt line.

## When called by the orchestrator

Take the named phase and the captured before-number as given, and go straight to the refusal gate below.

## When invoked directly

Ask what is slow, on what device, and what number says so. If the answer is a feeling, measure first. Assume
no shared state exists.

## The refusal

No optimization without a captured before-number, from a named tool, at a named percentile or condition.
"It feels slow" is not a ticket. If there is no number, the next action is measurement, not code.

Run this gate before writing a single line of optimization:

- [ ] There is a before-number, from a named tool, at a named percentile or condition.
- [ ] The subsystem about to be touched is actually over its budget, rather than merely feeling slow.
- [ ] The exact phase this change targets can be named: cold-start init, frame render, JS thread work, query
      planning time, network wait.
- [ ] If this adds a cache: the TTL, the invalidation trigger, and the blast radius of a wrong invalidation
      are all written down.
- [ ] If this touches a query or index: there is a before-and-after `EXPLAIN ANALYZE` pair.
- [ ] The fix ships with a regression test so the same regression cannot land silently twice.

Any unchecked box means the diagnosis is not finished.

**No "faster" claim without evidence.** Either a field percentile from real users, or a lab median over at
least 5 runs. A single run is an anecdote: CPU scheduling, thermal state, and background work all move it.

**Budget veto.** If a subsystem is already inside its budget, it is by definition not the bottleneck. Find
what is actually over budget instead of optimizing the thing that is easiest to reason about.

## Budgets

Android startup, from the platform's own vitals thresholds:

| Start type | What it is | Excessive at |
|---|---|---|
| Cold | Process created from scratch | TTID or TTFD 5s or more |
| Warm | Process may exist, Activity recreated | TTFD 2s or more |
| Hot | Existing Activity brought to the foreground | TTFD 1.5s or more |

TTID is time to initial display, the first frame. TTFD is time to full display, meaning actually interactive
including async content. TTFD only means anything if the app reports it: call `reportFullyDrawn()`, or in
Compose use `ReportDrawn()`, `ReportDrawnWhen(predicate)`, or `ReportDrawnAfter(suspendFn)`. Without that
call, TTFD is whatever the framework guessed.

Frames:

| Category | Render time | Effect |
|---|---|---|
| On budget | under 16ms at 60fps, 11ms at 90Hz, 8ms at 120Hz | Smooth |
| Jank | 16ms to 700ms | Visible stutter |
| Frozen frame | 700ms to 5s | UI appears stuck |
| ANR | over 5s unresponsive | System force-close dialog |

The frame budget is a cliff, not a slope. A frame that overruns by 1ms is dropped whole. There is no partial
credit, which is why an average frame time hides the problem and a percentile does not.

## Measure, do not feel

```bash
# Android cold start: prints ThisTime / TotalTime / WaitTime in ms
adb shell am start -S -W com.example.app/.MainActivity \
  -c android.intent.category.LAUNCHER -a android.intent.action.MAIN

# Android frame stats (View-based UI toolkit only, not Vulkan/Unity/GL surfaces)
adb shell dumpsys gfxinfo com.example.app

# Postgres plan with real timings and buffer stats
EXPLAIN (ANALYZE, BUFFERS) <query>;

# Safe plan capture on a mutating statement
BEGIN; EXPLAIN ANALYZE DELETE FROM large_table WHERE condition; ROLLBACK;
```

| Environment | Tool | Answers |
|---|---|---|
| Android | Android Studio Profiler, Perfetto, Macrobenchmark, `dumpsys gfxinfo` | Cold start, jank, memory |
| Android memory | LeakCanary, debug builds only | Retained-object leaks that become OOM crashes and GC jank |
| iOS | Xcode Instruments: Time Profiler, Allocations, Leaks, Energy Log, File Activity, Network | Everything, on a real device |
| iOS field | Xcode Organizer, MetricKit | Launch time, hangs, memory, energy, broken down by device and percentile |
| React Native | JS profiler on release builds, plus the native profiler per platform | JS thread versus UI thread attribution |
| Flutter | DevTools Performance view, `--profile` builds only | Frame timeline, rebuild counts |
| Database | `EXPLAIN (ANALYZE, BUFFERS)` | Plan, actual versus estimated rows, cache hits |
| Load and latency | k6 with thresholds | p95 latency under load, with a non-zero exit on breach |

**Profile release or profile builds, never debug.** Debug-mode timing is meaningless: the JS thread is
materially slower in dev, and Flutter's own guidance is that debug timing is invalid. Profile on a real device
rather than a simulator, especially once you know a specific device class is the problem.

## React Native attribution

The JS thread runs app logic and batches native view updates at the end of each event-loop tick. The UI thread
runs native animations and scrolling independently. Which thread is busy determines the fix, and guessing
wrong wastes the whole cycle.

| Symptom | Likely cause | Fix |
|---|---|---|
| Everything stutters during a transition | Heavy JS during navigation | Native-stack navigator; move animation to the native driver |
| Animation stutters, scrolling is fine | Animation driven from JS | `useNativeDriver: true`, animate transform and opacity only |
| Scrolling is fine but scroll-linked UI lags | JS-driven scroll callbacks | Move the work off the scroll callback |
| A tap feels dropped | Expensive work in `onPress` before the visual updates | Render the pressed state first, defer the work to the next frame |
| A long list stutters as it grows | Per-item measurement, or a non-virtualized list | A virtualized list with a fixed item layout, so per-item measurement is skipped |
| Images scale slowly on iOS | Animating image width and height | Animate `transform: [{ scale }]` |
| Dev build is fine, release users complain | Profiled the wrong build | Profile release builds only; strip `console.log` calls from production |

## Attributing a regression

1. Confirm it is real, not noise: a field percentile movement, or a lab median over at least 5 runs.
2. Bisect by deploy. Re-run the same assertion at each candidate commit rather than eyeballing a new manual
   test each time.
3. Diff the trace between last-good and first-bad under identical conditions and throttling.
4. Attribute to a phase, not a vibe. Name the phase before writing the fix.
5. Encode the fix as a gate before closing it out. A fixed regression with no new gate is a regression that
   will happen again.

## Regression gates

| Surface | Gate |
|---|---|
| Android startup | Macrobenchmark `StartupTimingMetric`, iterations of 5 or more, in CI |
| Android jank | Macrobenchmark `FrameTimingMetric` |
| iOS | XCTest `measure {}` block with a stored baseline |
| API latency | k6 with a threshold, for example `http_req_duration: ['p(95)<200']`, which exits non-zero on breach |
| Bundle size | A size budget check that exits non-zero on breach |

## Quality checklist

- [ ] A before-number exists, with the tool and the condition named.
- [ ] The phase being fixed is named, not implied.
- [ ] Measurements came from a release or profile build on a real device.
- [ ] The after-number was captured the same way as the before-number.
- [ ] The improvement is stated as a percentile or a median of 5 or more runs, never a single run.
- [ ] A regression gate exists and ran this turn.
- [ ] No cache was added without a written TTL, invalidation trigger, and blast radius.

## Reference files

| File | Read when |
|---|---|
| `references/budgets.md` | Setting a budget, or a measurement needs interpreting against a threshold |
