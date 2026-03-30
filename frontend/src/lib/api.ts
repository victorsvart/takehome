import type {
  RenewalRiskResponse,
  TriggerRenewalEventResponse,
} from '@/types/renewal-risk';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function getLatestRenewalRisk(
  propertyId: string,
): Promise<RenewalRiskResponse> {
  const response = await fetch(
    `${API_BASE_URL}/properties/${propertyId}/renewal-risk`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load risk data (${response.status})`);
  }

  return (await response.json()) as RenewalRiskResponse;
}

export async function calculateRenewalRisk(
  propertyId: string,
  asOfDate: string,
): Promise<RenewalRiskResponse> {
  const response = await fetch(
    `${API_BASE_URL}/properties/${propertyId}/renewal-risk/calculate`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        asOfDate,
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Calculation failed (${response.status}): ${details}`);
  }

  return (await response.json()) as RenewalRiskResponse;
}

export async function triggerRenewalEvent(
  propertyId: string,
  residentId: string,
): Promise<TriggerRenewalEventResponse> {
  const response = await fetch(
    `${API_BASE_URL}/properties/${propertyId}/renewal-risk/${residentId}/trigger-event`,
    { method: 'POST' },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Trigger failed (${response.status}): ${details}`);
  }

  return (await response.json()) as TriggerRenewalEventResponse;
}
