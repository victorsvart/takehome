export type RiskTier = 'high' | 'medium' | 'low';

export type RenewalRiskSignal = {
  daysToExpiryDays: number;
  paymentHistoryDelinquent: boolean;
  noRenewalOfferYet: boolean;
  rentGrowthAboveMarket: boolean;
};

export type RiskFlag = {
  residentId: string;
  name: string;
  unitId: string;
  riskScore: number;
  riskTier: RiskTier;
  daysToExpiry: number;
  signals: RenewalRiskSignal;
};

export type RenewalRiskResponse = {
  propertyId: string;
  calculatedAt: string | null;
  totalResidents: number;
  flaggedCount: number;
  riskTiers: Record<RiskTier, number>;
  flags: RiskFlag[];
};

export type TriggerRenewalEventResponse = {
  eventId: string;
  deliveryStatus: string;
  attemptCount: number;
};
