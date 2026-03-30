import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ToolbarProps = {
  propertyId: string;
  asOfDate: string;
  isLoading: boolean;
  isRecalculating: boolean;
  onPropertyIdChange: (value: string) => void;
  onAsOfDateChange: (value: string) => void;
  onCalculate: () => void;
  onRefresh: () => void;
  onOpenTestData: () => void;
};

export function Toolbar({
  propertyId,
  asOfDate,
  isLoading,
  isRecalculating,
  onPropertyIdChange,
  onAsOfDateChange,
  onCalculate,
  onRefresh,
  onOpenTestData,
}: ToolbarProps) {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_220px_auto_auto_auto] md:items-end">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="property-id">
          Property ID
        </label>
        <Input
          id="property-id"
          value={propertyId}
          onChange={(event) => onPropertyIdChange(event.target.value)}
          placeholder="Enter property UUID"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="as-of-date">
          As of date
        </label>
        <Input
          id="as-of-date"
          type="date"
          value={asOfDate}
          onChange={(event) => onAsOfDateChange(event.target.value)}
        />
      </div>

      <Button onClick={onCalculate} disabled={isRecalculating || !propertyId}>
        {isRecalculating ? 'Calculating...' : 'Calculate Risk'}
      </Button>

      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        Refresh
      </Button>

      <Button variant="secondary" onClick={onOpenTestData}>
        Test Data
      </Button>
    </div>
  );
}
