import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RiskFlag } from '@/types/renewal-risk';

type RiskFlagsTableProps = {
  flags: RiskFlag[];
  triggerState: Record<string, string>;
  onTrigger: (residentId: string) => void;
};

function tierVariant(
  riskTier: RiskFlag['riskTier'],
): 'destructive' | 'secondary' | 'outline' {
  if (riskTier === 'high') {
    return 'destructive';
  }
  if (riskTier === 'medium') {
    return 'secondary';
  }
  return 'outline';
}

export function RiskFlagsTable({
  flags,
  triggerState,
  onTrigger,
}: RiskFlagsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flagged Residents</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resident</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Days to expiry</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Signals</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No flagged residents in the latest snapshot.
                </TableCell>
              </TableRow>
            ) : (
              flags.map((flag) => (
                <TableRow key={flag.residentId}>
                  <TableCell>{flag.name}</TableCell>
                  <TableCell>{flag.unitId}</TableCell>
                  <TableCell>{flag.daysToExpiry}</TableCell>
                  <TableCell>{flag.riskScore}</TableCell>
                  <TableCell>
                    <Badge variant={tierVariant(flag.riskTier)}>{flag.riskTier}</Badge>
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    <Accordion type="single" collapsible>
                      <AccordionItem value={`signals-${flag.residentId}`}>
                        <AccordionTrigger>Why flagged</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                            <li>daysToExpiryDays: {flag.signals.daysToExpiryDays}</li>
                            <li>
                              paymentHistoryDelinquent:{' '}
                              {String(flag.signals.paymentHistoryDelinquent)}
                            </li>
                            <li>
                              noRenewalOfferYet: {String(flag.signals.noRenewalOfferYet)}
                            </li>
                            <li>
                              rentGrowthAboveMarket:{' '}
                              {String(flag.signals.rentGrowthAboveMarket)}
                            </li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TableCell>
                  <TableCell className="space-y-1 whitespace-normal">
                    <Button
                      size="sm"
                      onClick={() => onTrigger(flag.residentId)}
                      disabled={triggerState[flag.residentId] === 'sending'}
                    >
                      {triggerState[flag.residentId] === 'sending'
                        ? 'Sending...'
                        : 'Trigger Renewal Event'}
                    </Button>
                    {triggerState[flag.residentId] ? (
                      <p className="text-xs text-muted-foreground">
                        {triggerState[flag.residentId]}
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
