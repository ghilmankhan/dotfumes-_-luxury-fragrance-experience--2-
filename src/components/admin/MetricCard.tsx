import { Card } from '../ui/primitives/Card';

export const MetricCard = ({ label, value }: { label: string; value: string }) => {
  return (
    <Card as="article">
      <p className="text-[10px] uppercase tracking-[0.18em] text-black/55">{label}</p>
      <p className="mt-2 text-lg font-medium text-black">{value}</p>
    </Card>
  );
};
