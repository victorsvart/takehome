ALTER TABLE "webhook_delivery_state"
ADD COLUMN "event_key" VARCHAR(100);

UPDATE "webhook_delivery_state" AS ws
SET "event_key" = re."event_id"
FROM "renewal_events" AS re
WHERE ws."event_id" = re."id"
  AND ws."event_key" IS NULL;

CREATE UNIQUE INDEX "webhook_delivery_state_event_key_key"
ON "webhook_delivery_state"("event_key");
