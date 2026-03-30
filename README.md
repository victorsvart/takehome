# Renewal Risk Detection System

## Implementation Decisions

Key ambiguity/tradeoff decisions are documented inline in code comments tagged with `DECISION:`.
To review them quickly, search your IDE for `DECISION:`.

This repository delivers the take-home requirements using/through:

- NestJS (running on Express) + Prisma backend for risk scoring and webhook delivery
- PostgreSQL schema + migration SQL
- React dashboard for `/properties/:propertyId/renewal-risk`
- Seed + manual acceptance verification steps

## Prerequisites

- Docker Engine/Desktop

## One-Command Startup (DB + Backend + Frontend + Web Hook Mock Server)

From repo root:

```bash
docker compose up -d
```

This starts:

- PostgreSQL 18 (`localhost:5432`)
- Backend API (`http://localhost:3000/api/v1`)
- Swagger docs (`http://localhost:3000/api/docs`)
- Mock RMS webhook receiver (`http://localhost:3001/webhook`)
- Frontend dashboard (`http://localhost:5173`)

Backend migrations + seed run automatically on startup.

By default, backend points to the in-compose mock webhook receiver.
If a reviewer wants to use webhook.site instead, start compose with:

```bash
RMS_WEBHOOK_URL="https://webhook.site/<your-unique-id>" docker compose up -d
```

To stop all services:

```bash
docker compose down
```

Then open:

- `http://localhost:5173/properties/<propertyId>/renewal-risk`

Use the dashboard `Test Data` button to pick a valid seeded property id.

## Manual Acceptance Checks

### Get a testable property ID

- Run backend seed (`npm run db:seed`) and copy the printed `propertyId`.
- Or use the dashboard `Test Data` button to open a modal listing available properties.
- You can also set `VITE_DEFAULT_PROPERTY_ID` in `frontend/.env` to preload one.

### Get a valid webhook.site URL

1. Open [webhook.site](https://webhook.site/).
2. Copy your unique URL from the page.
3. Set `RMS_WEBHOOK_URL="<your webhook.site url>"` in `backend/.env`.
4. Restart backend if it is already running.

For local-only failure-path testing, set an unreachable URL such as `http://127.0.0.1:65535/webhook`.

### Use the built-in mock RMS server

Compose starts a mock webhook server at `http://localhost:3001` with helpful test endpoints:

- `GET /health` checks mock server status
- `POST /mock/fail` toggles failure mode (`503`) for retry/DLQ testing
- `GET /mock/events` lists captured webhook events

Examples:

```bash
# Confirm mock server is running
curl http://localhost:3001/health

# Enable failure mode (simulate RMS outage)
curl -X POST http://localhost:3001/mock/fail \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Disable failure mode (back to success)
curl -X POST http://localhost:3001/mock/fail \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Inspect received idempotent events
curl http://localhost:3001/mock/events
```

### Calculate Endpoint Structure + Tier Counts

```bash
curl -X POST "http://localhost:3000/api/v1/properties/<propertyId>/renewal-risk/calculate" \
  -H "Content-Type: application/json" \
  -d '{"propertyId":"<propertyId>","asOfDate":"2025-01-02"}'
```

Validate these fields exist:

- `propertyId`, `calculatedAt`, `totalResidents`, `flaggedCount`
- `riskTiers.high|medium|low`
- `flags[]` entries with nested `signals`

### Dashboard Data Contract

Open dashboard route and confirm rows render with:

- resident name
- unit id
- days to expiry
- risk score + tier
- expandable signals list
- `Test Data` modal allows selecting a seeded property

### Webhook Delivery (success path)

Set `RMS_WEBHOOK_URL` in `backend/.env` to your [webhook.site](https://webhook.site/) URL, then:

- Click `Trigger Renewal Event` for any resident
- Confirm payload arrives at webhook.site quickly

### Webhook authenticity verification (RMS side)

Each webhook request includes:

- `x-idempotency-key`: external event id (`evt-*`)
- `x-westface-signature`: HMAC SHA-256 hex digest

Signature implementation in this project:

1. Build the webhook payload JSON object.
2. Serialize with `JSON.stringify(payload)`.
3. Compute `HMAC_SHA256(serializedPayload, RMS_WEBHOOK_SECRET)`.
4. Send the hex digest in `x-westface-signature`.

Minimal RMS verification sketch:

```js
import { createHmac } from 'crypto';

function verifySignature(serializedPayload, incomingSignature, secret) {
  const expected = createHmac('sha256', secret)
    .update(serializedPayload)
    .digest('hex');
  return expected === incomingSignature;
}
```

### Retry + DLQ (failure path)

Set `RMS_WEBHOOK_URL` to an unreachable URL (example `http://127.0.0.1:65535/webhook`) and trigger again.
Then run:

```sql
SELECT id, status, attempt_count, last_attempt_at, next_retry_at
FROM webhook_delivery_state
ORDER BY created_at DESC
LIMIT 5;
```

Expected:

- attempts progress up to `5`
- final status is `dlq`
- backoff schedule uses `1s, 2s, 4s, 8s, 16s`

### Duplicate Trigger Idempotency

Trigger the same resident twice.
Confirm no duplicate delivered records for the same event:

```sql
SELECT event_id, status, COUNT(*) AS row_count
FROM webhook_delivery_state
GROUP BY event_id, status
HAVING COUNT(*) > 1;
```

Expected: empty result set.

## Edge Case Behavior

- **RMS endpoint unreachable:** each attempt is recorded; retries follow `1s, 2s, 4s, 8s, 16s`; final state moves to `dlq` after 5 failed attempts.
- **Lease already expired:** batch calculation only processes leases with status `active`; expired leases are excluded from risk output.
- **Missing market rent:** calculation still succeeds; market-rent signal uses a conservative partial value so the resident can still be scored.
- **Batch triggered simultaneously:** risk rows are keyed by `(property_id, resident_id, as_of_date)` and upserted, preventing duplicate score rows for the same snapshot.
- **Month-to-month lease:** treated as `30` days to expiry for risk scoring.
