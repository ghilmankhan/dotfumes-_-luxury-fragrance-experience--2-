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

export const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const product = allProducts.find((item) => item.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();
  const { pushToast } = useToastStore();
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
        availability: availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
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
      <section className="min-h-screen bg-brand-black px-6 py-40 text-center text-white">
        <p className="text-[10px] uppercase tracking-[0.5em] text-brand-gold">Archive Missing</p>
        <h1 className="mt-8 font-serif text-5xl italic">This fragrance is not available.</h1>
        <LinkButton
          to="/collection"
          variant="ghost"
          className="mt-10 border border-white/15 px-8 py-4 tracking-[0.35em] text-white/70 hover:text-white"
        >
          Return to Collection
        </LinkButton>
      </section>
    );
  }

  const addToCart = () => {
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
    <section className="min-h-screen bg-brand-white pb-[calc(7rem+env(safe-area-inset-bottom))] text-brand-black md:pb-0">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
        <div className="relative flex min-h-[62vh] items-start justify-center overflow-hidden bg-neutral-100 px-6 pt-16 sm:min-h-[68vh] sm:px-8 sm:pt-20 md:min-h-[72vh] md:items-center md:pt-24 lg:min-h-screen lg:pt-28">
          <AssetImage
            src={product.images.angle}
            alt={`${product.name} perfume bottle angled product view`}
            wrapperClassName="h-[56vh] w-full max-w-2xl bg-transparent sm:h-[62vh] md:h-[66vh] lg:h-[70vh]"
            className="h-full w-full object-contain drop-shadow-[0_45px_90px_rgba(0,0,0,0.12)]"
            fetchPriority="high"
          />
        </div>

        <div className="flex flex-col justify-center px-6 py-16 md:px-14 lg:px-16 lg:pt-32">
          <Link
            to="/collection"
            className="mb-10 text-[11px] uppercase tracking-[0.26em] text-black/55 transition-colors hover:text-black"
          >
            Collection
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">
            {product.category} / 100ml / {product.sku}
          </span>
          <h1 className="mt-7 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
            {product.name}
          </h1>
          <p className="mt-8 max-w-xl text-sm leading-8 text-neutral-500">{product.description}</p>

          <Stack gap={3} className="mt-12 border-y border-black/10 py-8">
            {notesSections.map((section) => (
              <Stack key={section.label} gap={3} className="border-b border-black/5 pb-5 last:border-b-0 last:pb-0">
                <p className="text-[10px] uppercase tracking-[0.26em] text-black/58">{section.label}</p>
                <p className="font-serif text-xl italic leading-8">{section.notes.join(' · ')}</p>
              </Stack>
            ))}
          </Stack>

          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex w-fit items-center border border-black/10" aria-label="Quantity selector">
              <Button
                variant="ghost"
                onClick={() => setQuantity((value) => Math.max(1, Math.min(selectedQuantity, value) - 1))}
                className="p-4 normal-case tracking-normal text-black hover:bg-black/5 hover:text-black"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={1.4} />
              </Button>
              <span className="w-12 text-center text-sm">{selectedQuantity}</span>
              <Button
                variant="ghost"
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(maxSelectableQuantity, Math.max(1, Math.min(selectedQuantity, value)) + 1),
                  )
                }
                disabled={isOutOfStock || selectedQuantity >= availableStock}
                className="p-4 normal-case tracking-normal text-black hover:bg-black/5 hover:text-black"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={1.4} />
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={addToCart}
              disabled={isOutOfStock}
              className="flex-1 px-8 py-5 tracking-[0.35em]"
            >
              <ShoppingBag size={15} strokeWidth={1.3} />
              {availableStock > 0
                ? `Add to Cart • ${formatCurrency(product.price)}`
                : 'Out of Stock'}
            </Button>
            <Button
              variant="outline"
              onClick={buyNow}
              disabled={isOutOfStock}
              className="px-8 py-5 tracking-[0.28em]"
            >
              Buy Now
            </Button>
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-black/45">
            Add to Cart opens your cart to review first. Buy Now skips ahead straight to checkout.
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-black/58">
            {availableStock > 0 ? `${availableStock} pieces available` : 'Currently out of stock'}
          </p>

          <Card variant="light" className="mt-5 bg-black/[0.02] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-black/65">
              Authentic DOTFUMES selection with manual order support. After checkout and payment
              proof review, confirmation and delivery coordination continue on WhatsApp or email.
            </p>
          </Card>

          <Grid cols={{ sm: 3 }} gap={3} className="mt-8 border-t border-black/10 pt-8">
            <TrustBadge icon={<ShieldCheck size={14} />} label="Extrait concentration" />
            <TrustBadge icon={<Truck size={14} />} label="Insured delivery" />
            <TrustBadge icon={<Leaf size={14} />} label="Refill roadmap" />
          </Grid>
        </div>
      </div>

      <div className="bg-brand-black text-white">
        <div className="grid min-h-[80vh] grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[60vh] overflow-hidden">
            <AssetImage
              src={product.images.lifestyle[0]}
              alt={`${product.name} perfume lifestyle campaign scene`}
              wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
              className="h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          </div>
          <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-20">
            <p className="text-[10px] uppercase tracking-[0.45em] text-brand-gold">Campaign Mood</p>
            <h2 className="mt-8 font-serif text-5xl italic leading-[0.95] md:text-7xl">
              The world behind <br />
              <span className="text-white/30">{product.name}.</span>
            </h2>
            <p className="mt-8 max-w-lg text-sm leading-8 text-white/50">{product.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 border-t border-white/10 lg:grid-cols-2">
          <div className="flex items-center justify-center bg-white p-8 md:p-16">
            <AssetImage
              src={product.images.flatLay}
              alt={`${product.name} perfume bottle top-down flat lay`}
              wrapperClassName="aspect-[4/3] w-full max-w-2xl bg-white"
              className="h-full w-full object-contain drop-shadow-[0_35px_70px_rgba(0,0,0,0.08)]"
            />
          </div>
          <div className="relative min-h-[52vh] overflow-hidden">
            <AssetImage
              src={product.images.lifestyle[1]}
              alt={`${product.name} still life with fragrance note ingredients`}
              wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          </div>
        </div>
      </div>

      <div className="bg-brand-black px-6 py-24 text-white md:px-16 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.45em] text-brand-gold">Related Archives</p>
          <Grid cols={{ md: 2 }} gap={8} className="mt-12">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group flex items-center gap-6 border border-white/10 p-5 transition-colors hover:border-brand-gold/40"
              >
                <AssetImage
                  src={item.images.front}
                  alt={`Front view of ${item.name} perfume bottle`}
                  wrapperClassName="h-28 w-24 shrink-0 bg-white/5"
                  className="h-full w-full object-contain"
                />
                <div>
                  <p className="font-serif text-3xl italic">{item.name}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/60">
                    {formatCurrency(item.price)} / {item.category}
                  </p>
                </div>
              </Link>
            ))}
          </Grid>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-14px_45px_rgba(0,0,0,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="truncate font-serif text-xl italic">{product.name}</p>
            <p className="shrink-0 text-sm uppercase tracking-[0.16em] text-black/65">
              {formatCurrency(product.price)}
            </p>
          </div>
          <Grid cols={{ base: 2 }} gap={2}>
            <Button
              variant="primary"
              onClick={addToCart}
              disabled={isOutOfStock}
              className="px-4 py-3 tracking-[0.22em]"
            >
              <ShoppingBag size={14} strokeWidth={1.3} />
              {availableStock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            <Button
              variant="outline"
              onClick={buyNow}
              disabled={isOutOfStock}
              className="px-4 py-3 tracking-[0.22em]"
            >
              Buy Now
            </Button>
          </Grid>
          {isOutOfStock ? (
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-red-700">
              This fragrance is currently unavailable.
            </p>
          ) : (
            <p className="mt-2 text-center text-[9px] uppercase tracking-[0.16em] text-black/45">
              Add to Cart reviews first · Buy Now checks out instantly
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const TrustBadge = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center gap-2 border border-black/10 px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-black/62">
    <span className="text-black/70">{icon}</span>
    <span>{label}</span>
  </div>
);
