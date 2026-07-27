import { ReactNode } from 'react';
import { Card } from '../ui/primitives/Card';

export const DataSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-small uppercase tracking-wider text-on-light-muted">{title}</h2>
    <Card padding="none" className="overflow-x-auto">
      {children}
    </Card>
  </section>
);
