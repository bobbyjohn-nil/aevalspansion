# Webhooks and idempotency

Contents: 1. The two rules. 2. Stripe specifics. 3. RevenueCat specifics. 4. Rolling your own idempotency
layer. 5. Handler shape. 6. Failure table.

## 1. The two rules

1. **Dedupe by event ID.** The same logical event can be delivered more than once. Log processed IDs and skip
   repeats.
2. **Never assume ordering.** A subscription creation can emit `customer.subscription.created`,
   `invoice.created`, `invoice.paid`, and `charge.created` in any delivery order. Refetch the related objects
   from the API instead of trusting arrival order to reconstruct state.

Every other rule below follows from these two.

## 2. Stripe

**Signature verification.** Verify the `Stripe-Signature` header, an HMAC-SHA256 over `{timestamp}.{raw body}`,
using the official SDK helper. If you must hand-roll it, use a constant-time comparison.

- Default replay tolerance between the signature timestamp and now is **5 minutes**. Never set tolerance to 0;
  that disables the check entirely. Keep the server clock NTP-synced.
- Verification needs the **raw** body. A framework that parses JSON before your handler sees it will break the
  signature. Configure the raw-body path for that route specifically.
- Exempt the webhook route from CSRF middleware. Frameworks that apply CSRF to every POST reject legitimate
  deliveries.
- Rotate signing secrets periodically. The old secret stays valid for up to a 24h overlap during rotation, so
  accept both while rotating.

**Ack fast.** Return 2xx before any slow processing. Stripe times out and retries otherwise. Do the real work,
ledger writes and email sends, asynchronously after acking.

**Retries.** Live mode retries with exponential backoff for up to 3 days. Test mode retries a few times over a
few hours. Manual resend from the dashboard works up to 15 days after the event, and
`stripe events resend` up to 30 days. Neither cancels the automatic schedule, so a manual resend can arrive
alongside an automatic one. Dedupe covers this.

**Idempotency keys on outbound calls.**

- Send `Idempotency-Key` on POST requests only. GET and DELETE are idempotent already.
- Stripe caches the first request's result for that key, status code and body, including error responses, and
  replays it verbatim on retry, even a 500.
- Keys are pruned after at least 24 hours. Reuse after pruning starts a fresh request.
- Maximum key length 255 characters. Use a v4 UUID or an equivalent-entropy random string. Never put PII in
  the key.
- If retried parameters do not match the original request, Stripe errors rather than silently replaying. That
  is a deliberate misuse guard; replicate it in any layer you build.
- Results are cached only once endpoint execution begins, so a request that fails validation or races another
  request with the same key is safe to retry.

## 3. RevenueCat, for mobile in-app purchases

- Must return **200**. A non-200 triggers up to 5 retries at 5, 10, 20, 40, and 80 minutes.
- Delivery is at-least-once. Dedupe by the event's `id` field, the same discipline as Stripe.
- Typical latency is 5 to 60 seconds; cancellation events can take up to 2 hours. Do not build UI that assumes
  an entitlement change appears instantly.
- The response timeout is **60 seconds**. Ack immediately, process after.
- Do not trust client-side receipt validation as the source of truth for entitlement. After a webhook, call
  `GET /subscribers` server-side to resync. The client can lie or be offline; the webhook plus an API pull is
  the authoritative path.

## 4. Rolling your own idempotency layer

```sql
idempotency_keys (
  user_id,
  idempotency_key,          -- UNIQUE (user_id, idempotency_key)
  locked_at,                -- held while a request is in flight
  request_params jsonb,     -- compared on retry; mismatch returns 409
  recovery_point text,      -- state machine label: STARTED -> CHARGE_CREATED -> FINISHED
  response_code int,
  response_body jsonb
)
```

Decompose the handler into atomic phases separated by any call to foreign state, for example the actual card
charge. Each phase commits its own transaction and advances `recovery_point`, so a crash mid-flow resumes from
the last completed phase instead of re-running side effects. Use a SERIALIZABLE transaction, or an equivalent,
on key creation to close the race between two concurrent requests carrying the same key.

## 5. Handler shape

```
1. read raw body
2. verify signature  -> 400 on failure, and do not process
3. parse event
4. SELECT on processed_events WHERE id = event.id  -> already seen, return 200 immediately
5. INSERT the event id, enqueue the work
6. return 200
7. process asynchronously; on failure, retry the job, not the webhook
```

Step 4 before step 5 is not enough on its own under concurrency. Make the insert the dedupe mechanism: a
unique constraint on the event ID, and treat a duplicate-key error as "already handled, return 200".

## 6. Failure table

| Symptom | Cause | Fix |
|---|---|---|
| Signature verification fails on every event | Body parsed before the handler saw it | Configure a raw-body route |
| Duplicate charges or duplicate emails | No dedupe by event ID | Unique constraint on event ID, insert before processing |
| State machine ends in the wrong state | Handler assumed delivery order | Refetch objects from the API, derive state from them |
| Provider marks the endpoint failing | Slow processing before the ack | Ack first, process asynchronously |
| Retries stop working after a secret rotation | Only the new secret is accepted | Accept both during the overlap window |
| Legitimate deliveries return 403 | CSRF middleware applied to the route | Exempt the webhook route |
| Entitlement wrong after purchase | Trusting the client receipt | Resync server-side after the webhook |
