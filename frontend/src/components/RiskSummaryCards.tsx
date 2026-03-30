import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RenewalRiskResponse } from '@/types/renewal-risk';

type RiskSummaryCardsProps = {
  data: RenewalRiskResponse;
};

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function RiskSummaryCards({ data }: RiskSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard label="Total residents" value={data.totalResidents} />
      <SummaryCard label="Flagged" value={data.flaggedCount} />
      <SummaryCard label="High tier" value={data.riskTiers.high} />
      <SummaryCard label="Medium tier" value={data.riskTiers.medium} />
      <SummaryCard label="Low tier" value={data.riskTiers.low} />
    </div>
  );
}
