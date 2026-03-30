# Renewal Risk Detection System

This repository delivers the take-home requirements:

- NestJS + Prisma backend for risk scoring and webhook delivery
- PostgreSQL schema + migration SQL
- React dashboard for `/properties/:propertyId/renewal-risk`
- Seed + manual acceptance verification steps

## Prerequisites

- Node.js `lts/krypton` (Node 24.x)
- Docker Desktop

## 1) Start PostgreSQL

```bash
docker compose up -d
```

## 2) Setup Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run start:dev
```

Backend runs at `http://localhost:3000` with API prefix `/api/v1`.

## 3) Setup Frontend

Open a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Then open:

- `http://localhost:5173/properties/<propertyId>/renewal-risk`

Use the property id printed by backend seed script.

## Manual Acceptance Checks

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

### Webhook Delivery (success path)

Set `RMS_WEBHOOK_URL` in `backend/.env` to your [webhook.site](https://webhook.site/) URL, then:

- Click `Trigger Renewal Event` for any resident
- Confirm payload arrives at webhook.site quickly

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
