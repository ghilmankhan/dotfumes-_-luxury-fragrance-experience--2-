import { ReactNode } from 'react';
import { Card } from '../ui/primitives/Card';

export const DataSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-[11px] uppercase tracking-[0.3em] text-black/55">{title}</h2>
    <Card className="overflow-x-auto p-0">{children}</Card>
  </section>
);
