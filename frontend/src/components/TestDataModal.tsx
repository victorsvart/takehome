import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TestProperty } from '@/types/renewal-risk';

type TestDataModalProps = {
  open: boolean;
  isLoading: boolean;
  errorMessage: string;
  properties: TestProperty[];
  onClose: () => void;
  onSelectProperty: (propertyId: string) => void;
};

export function TestDataModal({
  open,
  isLoading,
  errorMessage,
  properties,
  onClose,
  onSelectProperty,
}: TestDataModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card
        role="dialog"
        aria-modal="true"
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Testing Helpers</CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Available properties</h2>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading properties...</p> : null}
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            {!isLoading && !errorMessage && properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No properties found. Run backend seed first.
              </p>
            ) : null}
            <ul className="space-y-2">
              {properties.map((property) => (
                <li
                  key={property.id}
                  className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{property.name}</p>
                    <p className="break-all text-xs text-muted-foreground">
                      {property.id}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => onSelectProperty(property.id)}>
                    Use this property
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2 text-sm">
            <h2 className="font-semibold">Webhook URL for testing</h2>
            <p className="text-muted-foreground">
              Use <a className="underline" href="https://webhook.site" target="_blank" rel="noreferrer">webhook.site</a>, copy the unique URL, and set it in
              <code className="ml-1">backend/.env</code> as
              <code className="ml-1">RMS_WEBHOOK_URL</code>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
