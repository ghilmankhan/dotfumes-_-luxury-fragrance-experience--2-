import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ShieldCheck, Truck, Leaf } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { AssetImage } from '../components/AssetImage';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatCurrency } from '../lib/order';
import { getAvailableStock, isProductOutOfStock } from '../lib/validation';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import { Button, LinkButton } from '../components/ui/primitives/Button';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Stack } from '../components/ui/layout/Stack';
import { focusRing } from '../styles/tokens/interactive';
import { headingMd, headingXs, tracking } from '../styles/tokens/typography';
import { cn } from '../lib/utils';

export const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const product = allProducts.find((item) => item.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const availableStock = product ? getAvailableStock(product) : 0;
  const isOutOfStock = product ? isProductOutOfStock(product) || product.active === false : true;
  const maxSelectableQuantity = Math.max(1, availableStock);
  const selectedQuantity = Math.max(1, Math.min(quantity, maxSelectableQuantity));

  usePageMeta(
    product
      ? {
          title: `${product.name} | DOTFUMES`,
          description: product.description,
          path: `/product/${product.slug}`,
          ogType: 'product',
        }
      : {
          title: 'Fragrance Not Found | DOTFUMES',
          description: 'The requested DOTFUMES fragrance page could not be found.',
          path: '/collection',
        },
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: [product.images.front, product.images.angle, ...product.images.lifestyle],
      brand: {
        '@type': 'Brand',
        name: 'DOTFUMES',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: product.price,
        availability:
          availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      category: `Luxury Perfume ${product.category}`,
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [availableStock, product]);

  const relatedProducts = useMemo(
    () => allProducts.filter((item) => item.slug !== slug).slice(0, 2),
    [allProducts, slug],
  );

  if (!product) {
    return (
      <section className="min-h-screen bg-brand-black px-6 py-40 text-center text-brand-white">
        <p className="text-caption uppercase tracking-widest text-brand-gold">Archive Missing</p>
        <h1 className="mt-8 font-serif text-5xl italic">This fragrance is not available.</h1>
        <LinkButton
          to="/collection"
          variant="ghost"
          className="mt-10 border border-on-dark-subtle px-8 py-4 tracking-wider text-on-dark-secondary hover:text-brand-white"
        >
          Return to Collection
        </LinkButton>
      </section>
    );
  }

  const addToCart = () => {
    const { addItem, openCart } = useCartStore.getState();
    const { pushToast } = useToastStore.getState();

    if (isOutOfStock) {
      pushToast(`${product.name} is currently out of stock.`, 'error');
      return;
    }

    const result = addItem(product, selectedQuantity);
    if (!result.ok) {
      pushToast(result.message, 'error');
      return;
    }
    pushToast(`${result.message} Review your cart before checkout.`, 'success');
    openCart();
  };
  const buyNow = () => {
    const { addItem } = useCartStore.getState();
    const { pushToast } = useToastStore.getState();

    if (isOutOfStock) {
      pushToast(`${product.name} is currently out of stock.`, 'error');
      return;
    }

    const result = addItem(product, selectedQuantity);
    if (!result.ok) {
      pushToast(result.message, 'error');
      return;
    }
    pushToast(`${product.name} added — continuing straight to checkout.`, 'success');
    navigate('/checkout');
  };

  const notesSections: Array<{ label: string; notes: string[] }> = [
    { label: 'Top Notes', notes: product.notes.top },
    { label: 'Heart Notes', notes: product.notes.heart },
    { label: 'Base Notes', notes: product.notes.base },
  ];

  return (
    <section className="safe-bottom-product min-h-screen bg-brand-white text-brand-black md:pb-0">
      <Grid layout="product-detail" className="min-h-screen">
        <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-neutral-100 px-6 pt-16 sm:min-h-screen sm:px-8 sm:pt-20 md:min-h-screen md:items-center md:pt-24 lg:min-h-screen lg:pt-28">
          <AssetImage
            src={product.images.angle}
            alt={`${product.name} perfume bottle angled product view`}
            wrapperClassName="h-screen w-full max-w-2xl bg-transparent sm:h-screen md:h-screen lg:h-screen"
            className="h-full w-full object-contain drop-shadow-xl"
            fetchPriority="high"
          />
        </div>

        <div className="flex flex-col justify-center px-6 py-16 md:px-14 lg:px-16 lg:pt-32">
          <Link
            to="/collection"
            className={cn(
              'mb-10 w-fit text-small uppercase tracking-wide text-on-light-muted transition-colors hover:text-brand-black',
              focusRing,
            )}
          >
            Collection
          </Link>
          <span className="text-caption font-bold uppercase tracking-wider text-brand-gold">
            {product.category} / 100ml / {product.sku}
          </span>
          <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
            {product.name}
          </h1>
          <p className="mt-8 max-w-xl text-body leading-8 text-neutral-500">
            {product.description}
          </p>

          <Stack gap={3} className="mt-12 border-y border-on-light-muted py-8">
            {notesSections.map((section) => (
              <Stack
                key={section.label}
                gap={3}
                className="border-b border-on-light-subtle pb-4 last:border-b-0 last:pb-0"
              >
                <p className="text-caption uppercase tracking-wide text-on-light-muted">
                  {section.label}
                </p>
                <p className={cn(headingXs, 'leading-8')}>{section.notes.join(' · ')}</p>
              </Stack>
            ))}
          </Stack>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="flex w-fit items-center border border-on-light-muted"
              aria-label="Quantity selector"
            >
              <Button
                variant="ghost"
                onClick={() =>
                  setQuantity((value) => Math.max(1, Math.min(selectedQuantity, value) - 1))
                }
                className="p-4 normal-case tracking-normal text-brand-black hover:bg-surface-overlay-subtle hover:text-brand-black"
                aria-label="Decrease quantity"
              >
                <Minus aria-hidden="true" size={14} strokeWidth={1.4} />
              </Button>
              <span className="w-12 text-center text-body" aria-live="polite" aria-atomic="true">
                {selectedQuantity}
              </span>
              <Button
                variant="ghost"
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(
                      maxSelectableQuantity,
                      Math.max(1, Math.min(selectedQuantity, value)) + 1,
                    ),
                  )
                }
                disabled={isOutOfStock || selectedQuantity >= availableStock}
                className="p-4 normal-case tracking-normal text-brand-black hover:bg-surface-overlay-subtle hover:text-brand-black"
                aria-label="Increase quantity"
              >
                <Plus aria-hidden="true" size={14} strokeWidth={1.4} />
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={addToCart}
              disabled={isOutOfStock}
              className="flex-1 px-8 py-4 tracking-wider"
            >
              <ShoppingBag aria-hidden="true" size={15} strokeWidth={1.3} />
              {availableStock > 0
                ? `Add to Cart • ${formatCurrency(product.price)}`
                : 'Out of Stock'}
            </Button>
            <Button
              variant="outline"
              onClick={buyNow}
              disabled={isOutOfStock}
              className="px-8 py-4 tracking-wide"
            >
              Buy Now
            </Button>
          </div>

          <p className="mt-4 text-small text-on-light-secondary">
            Add to Cart opens your cart to review first. Buy Now skips ahead straight to checkout.
          </p>
          <p
            className="mt-3 text-small font-semibold text-on-light-strong"
            role="status"
            aria-live="polite"
          >
            {availableStock > 0 ? `${availableStock} pieces available` : 'Currently out of stock'}
          </p>

          <Card variant="light" className="mt-4 bg-ink-faint">
            <p className="text-small text-on-light-secondary">
              Authentic DOTFUMES selection with manual order support. After checkout and payment
              proof review, confirmation and delivery coordination continue on WhatsApp or email.
            </p>
          </Card>

          <Grid cols={{ sm: 3 }} gap={3} className="mt-8 border-t border-on-light-muted pt-8">
            <TrustBadge
              icon={<ShieldCheck aria-hidden="true" size={14} />}
              label="Extrait concentration"
            />
            <TrustBadge icon={<Truck aria-hidden="true" size={14} />} label="Insured delivery" />
            <TrustBadge icon={<Leaf aria-hidden="true" size={14} />} label="Refill roadmap" />
          </Grid>
        </div>
      </Grid>

      <div className="bg-brand-black text-brand-white">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-screen overflow-hidden">
            <AssetImage
              src={product.images.lifestyle[0]}
              alt={`${product.name} perfume lifestyle campaign scene`}
              wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
              className="h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gradient-shadow-strong via-transparent to-gradient-shadow-subtle" />
          </div>
          <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-20">
            <p className="text-caption uppercase tracking-wider text-brand-gold">Campaign Mood</p>
            <h2 className="mt-8 font-serif text-5xl italic leading-none md:text-7xl">
              The world behind <br />
              <span className="text-on-dark-faint">{product.name}.</span>
            </h2>
            <p className="mt-8 max-w-lg text-body leading-8 text-on-dark-muted">
              {product.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 border-t border-on-dark-subtle lg:grid-cols-2">
          <div className="flex items-center justify-center bg-brand-white p-8 md:p-16">
            <AssetImage
              src={product.images.flatLay}
              alt={`${product.name} perfume bottle top-down flat lay`}
              wrapperClassName="aspect-4/3 w-full max-w-2xl bg-brand-white"
              className="h-full w-full object-contain drop-shadow-xl"
            />
          </div>
          <div className="relative min-h-screen overflow-hidden">
            <AssetImage
              src={product.images.lifestyle[1]}
              alt={`${product.name} still life with fragrance note ingredients`}
              wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gradient-shadow-strong via-transparent to-transparent" />
          </div>
        </div>
      </div>

      <div className="bg-brand-black px-6 py-24 text-brand-white md:px-16 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-caption uppercase tracking-wider text-brand-gold">Related Archives</p>
          <Grid cols={{ md: 2 }} gap={8} className="mt-12">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className={cn(
                  'group flex items-center gap-6 border border-on-dark-subtle p-4 transition-colors hover:border-accent-muted',
                  focusRing,
                )}
              >
                <AssetImage
                  src={item.images.front}
                  alt={`Front view of ${item.name} perfume bottle`}
                  wrapperClassName="h-28 w-24 shrink-0 bg-surface-glass-subtle"
                  className="h-full w-full object-contain"
                />
                <div>
                  <p className={headingMd}>{item.name}</p>
                  <p className="mt-3 text-caption uppercase tracking-wide text-on-dark-secondary">
                    {formatCurrency(item.price)} / {item.category}
                  </p>
                </div>
              </Link>
            ))}
          </Grid>
        </div>
      </div>

      <div className="safe-bottom-mobile-action fixed inset-x-0 bottom-0 z-40 border-t border-on-light-muted bg-surface-light-raised px-3 pt-3 shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className={cn(headingXs, 'truncate')}>{product.name}</p>
            <p className="shrink-0 text-body uppercase tracking-normal text-on-light-secondary">
              {formatCurrency(product.price)}
            </p>
          </div>
          <Grid cols={{ base: 2 }} gap={2}>
            <Button
              variant="primary"
              onClick={addToCart}
              disabled={isOutOfStock}
              className="px-4 py-3 tracking-wide"
            >
              <ShoppingBag aria-hidden="true" size={14} strokeWidth={1.3} />
              {availableStock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            <Button
              variant="outline"
              onClick={buyNow}
              disabled={isOutOfStock}
              className="px-4 py-3 tracking-wide"
            >
              Buy Now
            </Button>
          </Grid>
          {isOutOfStock ? (
            <p
              className={cn(
                'mt-3 text-center text-caption uppercase text-red-700',
                tracking.normal,
              )}
            >
              This fragrance is currently unavailable.
            </p>
          ) : (
            <p className="mt-2 text-center text-small text-on-light-secondary">
              Add to Cart reviews first · Buy Now checks out instantly
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const TrustBadge = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div
    className={cn(
      'flex items-center gap-2 border border-on-light-muted px-3 py-3 text-caption uppercase text-on-light-secondary',
      tracking.normal,
    )}
  >
    <span className="text-on-light-secondary">{icon}</span>
    <span>{label}</span>
  </div>
);
