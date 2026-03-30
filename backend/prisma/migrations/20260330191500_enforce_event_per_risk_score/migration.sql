CREATE UNIQUE INDEX "renewal_events_risk_score_event_type_key"
ON "renewal_events"("renewal_risk_score_id", "event_type");
