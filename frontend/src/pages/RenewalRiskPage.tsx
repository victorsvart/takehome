import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RiskFlagsTable } from '@/components/RiskFlagsTable';
import { RiskSummaryCards } from '@/components/RiskSummaryCards';
import { Toolbar } from '@/components/Toolbar';
import {
  calculateRenewalRisk,
  getLatestRenewalRisk,
  triggerRenewalEvent,
} from '@/lib/api';
import type { RenewalRiskResponse } from '@/types/renewal-risk';

const propertyIdFromPath = window.location.pathname.split('/')[2] ?? '';
const defaultPropertyId =
  propertyIdFromPath || import.meta.env.VITE_DEFAULT_PROPERTY_ID || '';

export function RenewalRiskPage() {
  const [propertyId, setPropertyId] = useState(defaultPropertyId);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<RenewalRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [triggerState, setTriggerState] = useState<Record<string, string>>({});

  const sortedFlags = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data.flags].sort((left, right) => right.riskScore - left.riskScore);
  }, [data]);

  useEffect(() => {
    void loadLatestRisk(propertyId);
  }, [propertyId]);

  async function loadLatestRisk(nextPropertyId: string) {
    if (!nextPropertyId) {
      setErrorMessage('Enter a property id to load risk results.');
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = await getLatestRenewalRisk(nextPropertyId);
      setData(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load risk data.',
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCalculate() {
    if (!propertyId) {
      setErrorMessage('Property id is required before calculating risk.');
      return;
    }

    setIsRecalculating(true);
    setErrorMessage('');

    try {
      const payload = await calculateRenewalRisk(propertyId, asOfDate);
      setData(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to calculate risk.',
      );
    } finally {
      setIsRecalculating(false);
    }
  }

  async function handleTrigger(residentId: string) {
    setTriggerState((current) => ({ ...current, [residentId]: 'sending' }));
    setErrorMessage('');

    try {
      const payload = await triggerRenewalEvent(propertyId, residentId);
      setTriggerState((current) => ({
        ...current,
        [residentId]: `sent (${payload.deliveryStatus})`,
      }));
    } catch (error) {
      setTriggerState((current) => ({ ...current, [residentId]: 'failed' }));
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to trigger webhook.',
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Renewal Risk Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Path: /properties/:propertyId/renewal-risk
        </p>
      </div>

      <Toolbar
        propertyId={propertyId}
        asOfDate={asOfDate}
        isLoading={isLoading}
        isRecalculating={isRecalculating}
        onPropertyIdChange={setPropertyId}
        onAsOfDateChange={setAsOfDate}
        onCalculate={() => void handleCalculate()}
        onRefresh={() => void loadLatestRisk(propertyId)}
      />

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : null}

      {!isLoading && data ? (
        <>
          <RiskSummaryCards data={data} />
          <RiskFlagsTable
            flags={sortedFlags}
            triggerState={triggerState}
            onTrigger={(residentId) => void handleTrigger(residentId)}
          />
        </>
      ) : null}
    </main>
  );
}
