// Internal reference for Button / LinkButton (src/components/ui/primitives/Button.tsx).
// Not routed — import ButtonDocs into a scratch route during development if
// you need to eyeball it in the browser.
import { Button, LinkButton, buttonClasses } from '../../components/ui/primitives/Button';

export const ButtonDocs = () => (
  <div className="space-y-10 bg-brand-white p-10 text-brand-black">
    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Variants</h2>
      <div className="flex flex-wrap gap-4 bg-brand-black p-6">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Danger</Button>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Sizes</h2>
      <p className="mb-3 text-label text-on-light-secondary">
        "md" (default) is unset — it defers to each variant's own padding so existing call sites
        stay pixel-identical. Only "sm"/"lg" apply an explicit size override.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" size="sm">
          Small
        </Button>
        <Button variant="primary" size="md">
          Medium (default)
        </Button>
        <Button variant="primary" size="lg">
          Large
        </Button>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">States</h2>
      <div className="flex flex-wrap gap-4">
        <Button variant="primary" loading>
          Loading
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">LinkButton</h2>
      <p className="mb-3 text-label text-on-light-secondary">
        Same variant/size system, renders react-router's &lt;Link&gt; instead of &lt;button&gt;.
      </p>
      <LinkButton to="/collection" variant="outline">
        Explore Collection
      </LinkButton>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">
        buttonClasses() — native anchors
      </h2>
      <p className="mb-3 text-label text-on-light-secondary">
        For external &lt;a href&gt; links that can't render &lt;LinkButton&gt; (react-router's
        &lt;Link&gt; only handles in-app routes). Reuses the same variant map.
      </p>
      <a href="https://wa.me/000" className={buttonClasses('primary', 'gap-2')}>
        Send on WhatsApp
      </a>
    </section>

    <section>
      <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Usage</h2>
      <pre className="overflow-x-auto bg-surface-overlay-subtle p-4 text-label">
        {`<Button variant="primary" onClick={addToCart} disabled={isOutOfStock}>
  Add to Cart
</Button>

<LinkButton to="/collection" variant="secondary">
  Explore Collection
</LinkButton>

// External link that needs the same visual system:
<a href={externalUrl} className={buttonClasses('outline', 'gap-2')}>
  Open
</a>`}
      </pre>
    </section>
  </div>
);
