# Backend: Renewal Risk API

NestJS + Prisma service for:

- Calculating resident renewal risk
- Persisting risk scores + explainability signals
- Triggering webhook delivery with retries and DLQ

## Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required values:

- `DATABASE_URL`
- `RMS_WEBHOOK_URL`
- `RMS_WEBHOOK_SECRET` (used for `x-westface-signature`)

## Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run start:dev
```

API base URL: `http://localhost:3000/api/v1`
Swagger docs: `http://localhost:3000/api/docs`

## Key Endpoints

- `POST /api/v1/properties/:propertyId/renewal-risk/calculate`
- `GET /api/v1/properties/:propertyId/renewal-risk`
- `POST /api/v1/properties/:propertyId/renewal-risk/:residentId/trigger-event`

## Risk Logic

Weighted signals normalized to 0-100:

- Days to lease expiry: `40%`
- Payment delinquency: `25%`
- No renewal offer: `20%`
- Market rent growth pressure: `15%`

Signals are persisted in `renewal_risk_signals` for explainability.

## Webhook Delivery Notes

- Retry delays: `1s, 2s, 4s, 8s, 16s`
- After 5 failed attempts, status moves to `dlq`
- Duplicate triggers return existing delivery state for idempotency
- Concurrent duplicate triggers are constrained to one `renewal.risk_flagged` event per risk score via DB uniqueness + conflict handling

This take-home uses inline retry for speed and clear verification. Production should use a queue/worker that polls `next_retry_at` to avoid request blocking and improve throughput.

Decision rationale comments are tagged as `DECISION:` in source code for quick reviewer lookup.

### RMS signature verification contract

Requests include:

- `x-idempotency-key`: `evt-*` event identifier
- `x-westface-signature`: HMAC SHA-256 hex digest

Signature generation used by this service:

1. Serialize outgoing payload with `JSON.stringify(payload)`.
2. Compute HMAC with `RMS_WEBHOOK_SECRET`.
3. Send hex digest as `x-westface-signature`.

RMS services should verify the same serialization + secret before accepting the event.

## Edge Case Decisions

- **RMS unreachable:** every attempt is written to `webhook_delivery_attempts`; state transitions to `dlq` after max retries.
- **Expired lease:** excluded from batch because only `LeaseStatus.active` is evaluated.
- **Missing market rent:** score still computes with a partial market signal fallback.
- **Simultaneous batch calls:** risk records are upserted using unique `(property_id, resident_id, as_of_date)`.
- **Month-to-month lease:** modeled as 30 days to expiry for scoring.

## Manual Verification Queries

Inspect delivery state:

```sql
SELECT id, event_id, status, attempt_count, last_attempt_at, next_retry_at
FROM webhook_delivery_state
ORDER BY created_at DESC
LIMIT 10;
```

Inspect attempt history:

```sql
SELECT webhook_state_id, attempt_number, successful, status_code, attempted_at
FROM webhook_delivery_attempts
ORDER BY attempted_at DESC
LIMIT 20;
```
