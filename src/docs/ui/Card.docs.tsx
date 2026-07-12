// Internal reference for Card (src/components/ui/primitives/Card.tsx). Not routed.
import { Card } from '../../components/ui/primitives/Card';

export const CardDocs = () => (
  <div className="space-y-10 bg-neutral-100 p-10 text-brand-black">
    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Variants</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="light">
          <p className="text-xs uppercase tracking-widest text-black/50">variant="light"</p>
          <p className="mt-2 text-sm">border-black/10 bg-white — AdminPage MetricCard, header panel.</p>
        </Card>
        <Card variant="inset">
          <p className="text-xs uppercase tracking-widest text-black/50">variant="inset"</p>
          <p className="mt-2 text-sm">border-neutral-200/80 bg-white — CartDrawer line items.</p>
        </Card>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Polymorphic "as"</h2>
      <p className="mb-3 text-xs text-black/60">
        Defaults to a &lt;div&gt;. Pass "as" to preserve semantic HTML (e.g. an admin dashboard
        header, or an &lt;article&gt; per metric) without duplicating the visual system.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card as="header" variant="light" className="p-6">
          <p className="text-xs">as="header"</p>
        </Card>
        <Card as="article" variant="light">
          <p className="text-xs">as="article" (default padding)</p>
        </Card>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Edge case: padding override</h2>
      <p className="mb-3 text-xs text-black/60">
        className overrides win via tailwind-merge — pass p-0 when the child controls its own
        padding (e.g. a table).
      </p>
      <Card variant="light" className="overflow-x-auto p-0">
        <p className="p-4 text-xs">Custom padding supplied by the child.</p>
      </Card>
    </section>

    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest">Usage</h2>
      <pre className="overflow-x-auto bg-black/5 p-4 text-xs">
        {`<Card variant="light" as="article">
  <p>Total Orders</p>
  <p>128</p>
</Card>

<Card variant="inset" className="flex gap-4 rounded-2xl px-4 py-4">
  {/* cart line item */}
</Card>`}
      </pre>
    </section>
  </div>
);
