// Internal reference for Card (src/components/ui/primitives/Card.tsx). Not routed.
import { Card } from '../../components/ui/primitives/Card';

export const CardDocs = () => (
  <div className="space-y-10 bg-neutral-100 p-10 text-brand-black">
    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Variants</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="light">
          <p className="text-label uppercase tracking-widest text-on-light-muted">
            variant="light"
          </p>
          <p className="mt-2 text-body">
            border-on-light-muted bg-brand-white — AdminPage MetricCard, header panel.
          </p>
        </Card>
        <Card variant="inset">
          <p className="text-label uppercase tracking-widest text-on-light-muted">
            variant="inset"
          </p>
          <p className="mt-2 text-body">
            border-neutral-muted bg-brand-white — CartDrawer line items.
          </p>
        </Card>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Polymorphic "as"</h2>
      <p className="mb-3 text-label text-on-light-secondary">
        Defaults to a &lt;div&gt;. Pass "as" to preserve semantic HTML (e.g. an admin dashboard
        header, or an &lt;article&gt; per metric) without duplicating the visual system.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card as="header" variant="light" padding="comfortable">
          <p className="text-label">as="header"</p>
        </Card>
        <Card as="article" variant="light">
          <p className="text-label">as="article" (default padding)</p>
        </Card>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">
        Edge case: padding override
      </h2>
      <p className="mb-3 text-label text-on-light-secondary">
        className overrides win via tailwind-merge — pass p-0 when the child controls its own
        padding (e.g. a table).
      </p>
      <Card variant="light" padding="none" className="overflow-x-auto">
        <p className="p-4 text-label">Custom padding supplied by the child.</p>
      </Card>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Usage</h2>
      <pre className="overflow-x-auto bg-surface-overlay-subtle p-4 text-label">
        {`<Card variant="light" as="article">
  <p>Total Orders</p>
  <p>128</p>
</Card>

<Card variant="inset" className="flex gap-4">
  {/* cart line item */}
</Card>`}
      </pre>
    </section>
  </div>
);
