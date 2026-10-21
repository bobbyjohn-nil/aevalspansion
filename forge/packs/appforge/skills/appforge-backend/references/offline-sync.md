# Offline and sync

Contents: 1. The test question. 2. The seven ideals. 3. Choosing a sync approach. 4. Conflict resolution.
5. Optimistic updates. 6. The states offline forces you to design. 7. Checklist.

## 1. The test question

**Does this design still work with the network off?** Ask it of every screen and every write before building
sync machinery. Most apps do not need a sync engine; they need a queued write, an honest offline state, and a
reconcile on reconnect. Reach for a sync engine when the product genuinely requires multi-device concurrent
editing, not because "offline support" appeared in a requirements list.

## 2. The seven ideals, as a rubric

Local-first architecture is judged against these. Use them to decide how much of this you actually want.

1. No spinners: work happens at the user's fingertips, not round-tripped first.
2. Multi-device: work is not trapped on one machine.
3. Network optional: full offline function, sync when connectivity returns.
4. Seamless collaboration: multi-user editing with automatic conflict resolution.
5. The Long Now: data outlives the vendor.
6. Security and privacy by default: data on device, no centralized honeypot.
7. User retains ownership: copy, export, and delete freely.

Ideal 3 is the sharp one for a product decision. Ideals 4 to 7 are where the cost is.

## 3. Choosing a sync approach

| Approach | Use when | Cost |
|---|---|---|
| Queued mutations plus refetch | Single user across devices, writes are independent, brief offline periods | Low. This is the right answer for most apps. |
| Sync engine | Real offline-first: long offline periods, large local datasets, or concurrent multi-device editing | High: a second data model and a replication service to operate |
| CRDT document model | Genuinely collaborative editing of shared structured content | Highest: the data model itself has to be CRDT-shaped |

PowerSync is the best-verified broad-platform option when a real sync engine is warranted: it replicates from
Postgres, MongoDB, and others, partitions data per user, and streams to SQLite-backed local storage, with
client SDKs including React Native and Expo. ElectricSQL, Zero, and Replicache are real options this pack
could not verify in depth. Name them if the user asks, but check their current docs before prescribing any
specific API, and mark anything you cannot confirm `[unverified]`.

## 4. Conflict resolution

| Strategy | Data-loss risk | Complexity | Use when |
|---|---|---|---|
| Last-write-wins | High. Silently discards the losing write. | Lowest | Single-user-across-devices data, or fields where losing a stale write is fine, such as "last viewed at" |
| CRDT | Low, by construction | Higher: needs a CRDT-shaped model such as Yjs or Automerge | Structured collaborative editing: documents, lists, counters |
| Operational Transformation | Low, but the central server must arbitrate | High, and largely superseded | Legacy reasons only. New builds default to CRDT instead. |

Last-write-wins is a legitimate choice, but it must be a stated choice with a named blast radius, not the
accidental result of having no strategy. Write down which fields are LWW and which are not.

## 5. Optimistic updates

The three-step contract holds regardless of library: snapshot before, roll back on error, reconcile after.

```ts
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
    return { previous };
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`cancelQueries` before the optimistic write is not optional: without it, an in-flight refetch can land after
your optimistic update and overwrite it with stale server data.

An optimistic update whose mutation is queued offline also needs an idempotency key: a reconnect that replays
the queue otherwise produces duplicate writes. Generate the key when the mutation is enqueued, not when it is
sent, so a replay reuses the same key.

## 6. The states offline forces you to design

Every screen that writes needs these, and most apps ship only the first two:

| State | What the user sees |
|---|---|
| Online, saved | Normal. No badge, no toast. Silence is the correct feedback for success. |
| Offline, queued | The change is visible and marked as pending, with plain wording: "Will sync when you are back online." |
| Offline, read-only data is stale | The age of the data is stated, not hidden. "Updated 2 hours ago." |
| Sync failed permanently | Named cause and a specific action. Not "Sync error." |
| Conflict resolved against the user | The user is told what changed and can recover their version, or the field was declared LWW-safe up front |

The last row is the one that gets skipped and the one that loses user data. Decide it before writing sync code.

## 7. Checklist

- [ ] The "does this work with the network off" question was asked of every write in scope.
- [ ] The sync approach is queued-mutations, sync-engine, or CRDT, chosen by a stated requirement.
- [ ] Every field with last-write-wins semantics is written down as such.
- [ ] Every optimistic mutation has snapshot, rollback, and reconcile, and cancels in-flight queries first.
- [ ] Queued offline writes carry idempotency keys.
- [ ] Pending, stale, failed, and conflict states exist in the UI, not just the happy path.
- [ ] The offline path was tested in airplane mode on a device, not simulated by stubbing the network layer.
