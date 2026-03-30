-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'dlq');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('active', 'expired', 'terminated');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('fixed', 'month_to_month');

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "zip_code" VARCHAR(10),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "square_footage" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "unit_type_id" UUID NOT NULL,
    "unit_number" VARCHAR(50) NOT NULL,
    "floor" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_pricing" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "unit_id" UUID NOT NULL,
    "base_rent" DECIMAL(10,2) NOT NULL,
    "market_rent" DECIMAL(10,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "move_in_date" DATE,
    "move_out_date" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "lease_start_date" DATE NOT NULL,
    "lease_end_date" DATE NOT NULL,
    "monthly_rent" DECIMAL(10,2) NOT NULL,
    "lease_type" "LeaseType" NOT NULL DEFAULT 'fixed',
    "status" "LeaseStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_ledger" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "transaction_type" VARCHAR(50) NOT NULL,
    "charge_code" VARCHAR(100),
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_offers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "renewal_start_date" DATE NOT NULL,
    "renewal_end_date" DATE,
    "proposed_rent" DECIMAL(10,2),
    "offer_expiration_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_risk_scores" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "as_of_date" DATE NOT NULL,
    "days_to_expiry" INTEGER NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_tier" "RiskTier" NOT NULL,
    "calculated_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_risk_signals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "renewal_risk_score_id" UUID NOT NULL,
    "days_to_expiry_days" INTEGER NOT NULL,
    "payment_history_delinquent" BOOLEAN NOT NULL,
    "no_renewal_offer_yet" BOOLEAN NOT NULL,
    "rent_growth_above_market" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" VARCHAR(100) NOT NULL,
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "renewal_risk_score_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL DEFAULT 'renewal.risk_flagged',
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_delivery_state" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(6),
    "next_retry_at" TIMESTAMP(6),
    "last_http_status" INTEGER,
    "last_error" TEXT,
    "rms_response" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_delivery_attempts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "webhook_state_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "attempted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "status_code" INTEGER,
    "response_body" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_name_key" ON "properties"("name");

-- CreateIndex
CREATE INDEX "idx_properties_status" ON "properties"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unit_types_property_id_name_key" ON "unit_types"("property_id", "name");

-- CreateIndex
CREATE INDEX "idx_units_property_id" ON "units"("property_id");

-- CreateIndex
CREATE INDEX "idx_units_status" ON "units"("status");

-- CreateIndex
CREATE UNIQUE INDEX "units_property_id_unit_number_key" ON "units"("property_id", "unit_number");

-- CreateIndex
CREATE INDEX "idx_unit_pricing_unit_id" ON "unit_pricing"("unit_id");

-- CreateIndex
CREATE INDEX "idx_unit_pricing_effective_date" ON "unit_pricing"("effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "unit_pricing_unit_id_effective_date_key" ON "unit_pricing"("unit_id", "effective_date");

-- CreateIndex
CREATE INDEX "idx_residents_property_id" ON "residents"("property_id");

-- CreateIndex
CREATE INDEX "idx_residents_unit_id" ON "residents"("unit_id");

-- CreateIndex
CREATE INDEX "idx_residents_status" ON "residents"("status");

-- CreateIndex
CREATE INDEX "idx_leases_property_id" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "idx_leases_resident_id" ON "leases"("resident_id");

-- CreateIndex
CREATE INDEX "idx_leases_lease_end_date" ON "leases"("lease_end_date");

-- CreateIndex
CREATE INDEX "idx_leases_status" ON "leases"("status");

-- CreateIndex
CREATE INDEX "idx_resident_ledger_property_id" ON "resident_ledger"("property_id");

-- CreateIndex
CREATE INDEX "idx_resident_ledger_resident_id" ON "resident_ledger"("resident_id");

-- CreateIndex
CREATE INDEX "idx_resident_ledger_transaction_date" ON "resident_ledger"("transaction_date");

-- CreateIndex
CREATE INDEX "idx_resident_ledger_transaction_type" ON "resident_ledger"("transaction_type");

-- CreateIndex
CREATE INDEX "idx_renewal_offers_property_id" ON "renewal_offers"("property_id");

-- CreateIndex
CREATE INDEX "idx_renewal_offers_resident_id" ON "renewal_offers"("resident_id");

-- CreateIndex
CREATE INDEX "idx_renewal_offers_status" ON "renewal_offers"("status");

-- CreateIndex
CREATE INDEX "idx_renewal_risk_scores_property_calculated" ON "renewal_risk_scores"("property_id", "calculated_at");

-- CreateIndex
CREATE INDEX "idx_renewal_risk_scores_property_tier" ON "renewal_risk_scores"("property_id", "risk_tier");

-- CreateIndex
CREATE UNIQUE INDEX "renewal_risk_scores_property_id_resident_id_as_of_date_key" ON "renewal_risk_scores"("property_id", "resident_id", "as_of_date");

-- CreateIndex
CREATE UNIQUE INDEX "renewal_risk_signals_renewal_risk_score_id_key" ON "renewal_risk_signals"("renewal_risk_score_id");

-- CreateIndex
CREATE INDEX "idx_renewal_risk_signals_property_resident" ON "renewal_risk_signals"("property_id", "resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "renewal_events_event_id_key" ON "renewal_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_renewal_events_property_created" ON "renewal_events"("property_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_delivery_state_event_id_key" ON "webhook_delivery_state"("event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_delivery_state_retry_poll" ON "webhook_delivery_state"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "idx_webhook_delivery_state_property_created" ON "webhook_delivery_state"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_webhook_delivery_attempt_state_attempt" ON "webhook_delivery_attempts"("webhook_state_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "unit_types" ADD CONSTRAINT "unit_types_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "unit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_pricing" ADD CONSTRAINT "unit_pricing_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_ledger" ADD CONSTRAINT "resident_ledger_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_ledger" ADD CONSTRAINT "resident_ledger_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_offers" ADD CONSTRAINT "renewal_offers_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_offers" ADD CONSTRAINT "renewal_offers_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_offers" ADD CONSTRAINT "renewal_offers_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_scores" ADD CONSTRAINT "renewal_risk_scores_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_scores" ADD CONSTRAINT "renewal_risk_scores_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_scores" ADD CONSTRAINT "renewal_risk_scores_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_signals" ADD CONSTRAINT "renewal_risk_signals_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_signals" ADD CONSTRAINT "renewal_risk_signals_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_signals" ADD CONSTRAINT "renewal_risk_signals_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_signals" ADD CONSTRAINT "renewal_risk_signals_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_risk_signals" ADD CONSTRAINT "renewal_risk_signals_renewal_risk_score_id_fkey" FOREIGN KEY ("renewal_risk_score_id") REFERENCES "renewal_risk_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_events" ADD CONSTRAINT "renewal_events_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_events" ADD CONSTRAINT "renewal_events_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_events" ADD CONSTRAINT "renewal_events_renewal_risk_score_id_fkey" FOREIGN KEY ("renewal_risk_score_id") REFERENCES "renewal_risk_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery_state" ADD CONSTRAINT "webhook_delivery_state_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "renewal_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery_state" ADD CONSTRAINT "webhook_delivery_state_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery_state" ADD CONSTRAINT "webhook_delivery_state_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_webhook_state_id_fkey" FOREIGN KEY ("webhook_state_id") REFERENCES "webhook_delivery_state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

