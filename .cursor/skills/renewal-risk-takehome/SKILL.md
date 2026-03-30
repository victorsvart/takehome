---
name: renewal-risk-takehome
description: Enforces implementation and delivery behavior for the Renewal Risk take-home. Use when working in this repository on API, schema, webhook delivery, React dashboard, testing docs, or project setup decisions.
---

# Renewal Risk Take-Home

## Source Documents

- `renewal_risk_takehome.md`
- `seed_and_testing.md`

Always treat these files as the source of truth for scope and acceptance criteria.

## Stack Baseline

- Backend: Node.js `24.x`, NestJS `11.x`, TypeScript, PostgreSQL
- Frontend: latest stable React + TypeScript

Prefer current stable package versions compatible with this baseline.

## Non-Negotiable Deliverables

1. Schema/migrations for risk scores, risk signals, and webhook delivery lifecycle
2. Risk calculation API endpoint and response contract
3. React dashboard page for at-risk residents
4. Triggered webhook delivery with retries + idempotency + DLQ
5. Readmes with local run, seed, and manual verification steps

Do not add unrelated features (auth, advanced analytics, multi-property extras) unless explicitly requested.

## API Contract Requirements

- Implement `POST /api/v1/properties/:propertyId/renewal-risk/calculate`.
- Request body must support:
  - `propertyId`
  - `asOfDate`
- Response must include:
  - `propertyId`, `calculatedAt`, `totalResidents`, `flaggedCount`
  - `riskTiers` object (`high`, `medium`, `low`)
  - `flags[]` with `residentId`, `name`, `unitId`, `riskScore`, `riskTier`, `daysToExpiry`, and `signals`

Keep the route and shape aligned with the prompt examples.

## Risk Scoring Guidance

Use weighted signals (normalize to 0-100):

- Days to lease expiry: `40%`
- Payment delinquency: `25%`
- No renewal offer yet: `20%`
- Market rent vs current rent: `15%`

Implementation must persist both final score and underlying signal values for explainability.

## Schema and Query Constraints

- Single PostgreSQL database, multi-tenant by `property_id`.
- Model webhook attempts/state for auditability (`attempt_count`, timestamps, status, retry schedule).
- Ensure atomic state transitions for webhook delivery updates.
- Add indexes for common read paths:
  - property + risk retrieval
  - event/state lookup
  - retry polling (`next_retry_at`, status)
- Avoid N+1 access patterns for resident risk output.

## Dashboard Requirements

Implement `/properties/:propertyId/renewal-risk` with:

- Resident name
- Unit ID
- Days to lease expiry
- Risk score and tier (color coded)
- Expandable "why flagged" signal details
- "Trigger Renewal Event" action per resident
- Loading and error states

Filtering/sorting by tier is optional if time permits.

## Webhook Delivery Requirements

When "Trigger Renewal Event" is clicked:

1. Create renewal event record
2. Send webhook to configured RMS endpoint
3. Retry failures using exponential backoff: `1s, 2s, 4s, 8s, 16s`
4. After 5 failed attempts, move to DLQ state
5. Guarantee idempotent handling of duplicate deliveries

Target operational expectation: p95 delivery within 2 seconds for successful paths.

Webhook payload must include:

- `event` (`renewal.risk_flagged`)
- `eventId`
- `timestamp`
- `propertyId`
- `residentId`
- `data` (`riskScore`, `riskTier`, `daysToExpiry`, `signals`)

Document authenticity strategy (for example request signing) even if minimally implemented.

## Edge Cases to Handle and Document

- RMS endpoint unreachable
- Lease already expired
- Missing market rent
- Batch calculation triggered simultaneously
- Month-to-month lease behavior

If ambiguous, make a decision and document rationale.

## Testing and Demo Expectations

Use `seed_and_testing.md` as acceptance checklist:

- Seed data creates meaningful risk scenarios
- API returns expected structure and non-empty flagged set
- Dashboard loads and renders flagged residents
- Trigger action sends webhook to webhook.site or mock RMS
- Retry flow increments attempts and updates next retry time
- Failed deliveries transition to DLQ after max attempts
- Idempotency prevents duplicate delivered events

## Work Style for This Take-Home

- Prefer working, testable, minimal implementation over architecture polish.
- Keep code readable and defensive; handle errors explicitly.
- Include concise tradeoff notes in README (especially reliability decisions).
