import { Card } from '../ui/primitives/Card';

export const MetricCard = ({ label, value }: { label: string; value: string }) => {
  return (
    <Card as="article">
      <p className="text-caption uppercase tracking-normal text-on-light-muted">{label}</p>
      <p className="mt-2 text-heading font-semibold text-brand-black">{value}</p>
    </Card>
  );
};
