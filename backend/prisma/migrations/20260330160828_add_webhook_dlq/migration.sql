-- CreateTable
CREATE TABLE "webhook_dead_letter_queue" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "webhook_state_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "last_error" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letter_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_dead_letter_queue_webhook_state_id_key" ON "webhook_dead_letter_queue"("webhook_state_id");

-- CreateIndex
CREATE INDEX "idx_webhook_dlq_property_created" ON "webhook_dead_letter_queue"("property_id", "created_at");

-- AddForeignKey
ALTER TABLE "webhook_dead_letter_queue" ADD CONSTRAINT "webhook_dead_letter_queue_webhook_state_id_fkey" FOREIGN KEY ("webhook_state_id") REFERENCES "webhook_delivery_state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_dead_letter_queue" ADD CONSTRAINT "webhook_dead_letter_queue_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "renewal_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_dead_letter_queue" ADD CONSTRAINT "webhook_dead_letter_queue_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_dead_letter_queue" ADD CONSTRAINT "webhook_dead_letter_queue_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
