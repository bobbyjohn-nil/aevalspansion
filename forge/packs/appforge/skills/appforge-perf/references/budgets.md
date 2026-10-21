# Performance budgets and how to read a measurement

Contents: 1. Setting a budget. 2. Startup. 3. Frames. 4. Memory and battery. 5. Backend latency.
6. Reading `EXPLAIN ANALYZE`. 7. Writing the gate.

## 1. Setting a budget

A budget is a number attached to a percentile and a condition. All three parts are required:

```
cold start TTFD, p90, Pixel 6a on a cold cache, under 2.5s
list scroll, p95 frame time, 120Hz device, under 8ms
POST /api/orders, p95, under 200ms
```

Without a percentile, an average hides the users who are suffering. Without a condition, the number moves
between runs for reasons that have nothing to do with the code. A budget that has never failed is either
generous or unenforced; check which.

## 2. Startup

| Start type | Excessive at | Common causes |
|---|---|---|
| Cold | TTID or TTFD at or over 5s | Heavy work in application init, GC pauses during init, disk or network I/O blocking the first draw, a deep view or composable hierarchy, a custom splash implementation instead of the platform splash API |
| Warm | TTFD at or over 2s | The same init work re-running on Activity recreation |
| Hot | TTFD at or over 1.5s | Work on foreground resume that should have been cached |

TTFD is only meaningful if the app reports it. Call `reportFullyDrawn()` once truly ready, or use
`ReportDrawn()`, `ReportDrawnWhen(predicate)`, or `ReportDrawnAfter(suspendFn)` in Compose.

```bash
adb shell am start -S -W <pkg>/<Activity> \
  -c android.intent.category.LAUNCHER -a android.intent.action.MAIN
```

`-S` force-stops first, which is what makes it a cold start rather than a warm one. Without it you are
measuring something else. Logcat also prints a `Displayed` line per launch.

CI-grade measurement is Macrobenchmark `StartupTimingMetric` with at least 5 iterations, killing the process
between runs. For a deep dive, capture a Perfetto trace and inspect the app-startup derived metric and the
frame and recomposition slices.

## 3. Frames

| Category | Render time | Effect |
|---|---|---|
| On budget | under 16ms at 60fps, 11ms at 90Hz, 8ms at 120Hz | Smooth |
| Jank | 16ms to 700ms | Visible stutter |
| Frozen | 700ms to 5s | UI appears stuck |
| ANR | over 5s unresponsive | System force-close dialog |

The frame scheduler drops the whole frame when the budget is overrun by any amount. Report frame time as a
percentile, never an average: an average of 12ms with a p95 of 40ms is a visibly janky app.

Tools: Perfetto frame timeline, the on-device GPU rendering overlay, `FrameMetricsAggregator`, Macrobenchmark
`FrameTimingMetric` for a CI gate, and `dumpsys gfxinfo` for View-based UI only.

The same 16.67ms math applies to Flutter and React Native. Compositing does not get different physics.

## 4. Memory and battery

- Android: LeakCanary in debug builds surfaces a leak trace pinpointing the retaining reference. It catches
  the class of bug behind OOM crashes, GC-pressure jank, and some ANRs.
- iOS: Instruments Allocations and Leaks for memory, Energy Log for battery.
- A memory leak shows up as a performance problem long before it shows up as a crash. A session that gets
  slower the longer it runs is a leak until proven otherwise.

## 5. Backend latency

Common causes, in the order they are usually found:

| Cause | Signal | Fix |
|---|---|---|
| N+1 queries | Query count scales with row count | Load the relation in one query |
| Missing index | Sequential scan on a large table in the plan | Add the index the predicate needs, then re-measure |
| Over-fetching | Large payload, small rendered subset | Shape the payload to what the screen renders |
| Offset pagination on a deep page | Latency grows with page number | Keyset pagination on an indexed ordering column |
| Connection exhaustion | Latency spikes under concurrency, not under load per request | Pool sizing, and a pooler in a serverless topology |

## 6. Reading `EXPLAIN ANALYZE`

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

Read three things first:

1. **Actual rows versus estimated rows.** A large gap means the planner is working from bad statistics, and
   every plan choice downstream of that node is suspect.
2. **The node type on the largest table.** A sequential scan on a large table with a selective predicate is
   the finding.
3. **Buffers.** Heavy read counts mean the data is not cached, which changes what the timing means.

Capture a plan before and after every index or query change. An index added without a plan pair is a guess
that also costs write throughput.

For a mutating statement, wrap it: `BEGIN; EXPLAIN ANALYZE DELETE ...; ROLLBACK;`.

## 7. Writing the gate

The gate has to fail the build, or it is documentation.

| Surface | Gate | Failure mode |
|---|---|---|
| Android startup | Macrobenchmark `StartupTimingMetric` in CI | Non-zero exit on regression beyond tolerance |
| Android jank | Macrobenchmark `FrameTimingMetric` | Same |
| iOS | XCTest `measure {}` with a stored baseline | Test fails when the run deviates beyond tolerance |
| API latency | k6 thresholds, e.g. `http_req_duration: ['p(95)<200']` | Non-zero exit on breach |
| Bundle size | A size budget check | Non-zero exit on breach |

Set the tolerance from observed run-to-run variance, not from optimism. A gate that flaps gets disabled within
a week, and a disabled gate is worse than no gate because everyone still believes it is running.
