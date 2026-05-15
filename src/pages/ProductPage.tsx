import { Link, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ShieldCheck, Truck, Leaf } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { FEATURED_PRODUCTS } from '../constants/products';
import { AssetImage } from '../components/AssetImage';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatCurrency } from '../lib/order';

export const ProductPage = () => {
  const { slug } = useParams();
  const product = FEATURED_PRODUCTS.find((item) => item.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();
  const { pushToast } = useToastStore();

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
          product.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
      category: `Luxury Perfume ${product.category}`,
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [product]);

  const relatedProducts = useMemo(
    () => FEATURED_PRODUCTS.filter((item) => item.slug !== slug).slice(0, 2),
    [slug],
  );

  if (!product) {
    return (
      <section className="min-h-screen bg-brand-black px-6 py-40 text-center text-white">
        <p className="text-[10px] uppercase tracking-[0.5em] text-brand-gold">Archive Missing</p>
        <h1 className="mt-8 font-serif text-5xl italic">This fragrance is not available.</h1>
        <Link
          to="/collection"
          className="mt-10 inline-flex border border-white/15 px-8 py-4 text-[10px] uppercase tracking-[0.35em] text-white/70 transition-colors hover:text-white"
        >
          Return to Collection
        </Link>
      </section>
    );
  }

  const addToCart = () => {
    const result = addItem(product, quantity);
    pushToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      openCart();
    }
  };

  const notesSections: Array<{ label: string; notes: string[] }> = [
    { label: 'Top Notes', notes: product.notes.top },
    { label: 'Heart Notes', notes: product.notes.heart },
    { label: 'Base Notes', notes: product.notes.base },
  ];

  return (
    <section className="min-h-screen bg-brand-white text-brand-black">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
        <div className="relative flex min-h-[78vh] items-center justify-center overflow-hidden bg-neutral-100 px-8 pt-28 lg:min-h-screen">
          <AssetImage
            src={product.images.angle}
            alt={`${product.name} bottle`}
            wrapperClassName="h-[70vh] w-full max-w-2xl bg-transparent"
            className="h-full w-full object-contain drop-shadow-[0_45px_90px_rgba(0,0,0,0.12)]"
            fetchPriority="high"
          />
        </div>

        <div className="flex flex-col justify-center px-6 py-16 md:px-14 lg:px-16 lg:pt-32">
          <Link
            to="/collection"
            className="mb-10 text-[10px] uppercase tracking-[0.35em] text-black/35 transition-colors hover:text-black"
          >
            Collection
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">
            {product.category} / 100ml
          </span>
          <h1 className="mt-7 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
            {product.name}
          </h1>
          <p className="mt-8 max-w-xl text-sm leading-8 text-neutral-500">{product.description}</p>

          <div className="mt-12 grid gap-3 border-y border-black/10 py-8">
            {notesSections.map((section) => (
              <div key={section.label} className="grid gap-3 border-b border-black/5 pb-5 last:border-b-0 last:pb-0">
                <p className="text-[9px] uppercase tracking-[0.32em] text-black/35">{section.label}</p>
                <p className="font-serif text-xl italic leading-8">{section.notes.join(' · ')}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex w-fit items-center border border-black/10" aria-label="Quantity selector">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="p-4 transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={1.4} />
              </button>
              <span className="w-12 text-center text-sm">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                className="p-4 transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={1.4} />
              </button>
            </div>
            <button
              type="button"
              onClick={addToCart}
              className="inline-flex flex-1 items-center justify-center gap-3 bg-brand-black px-8 py-5 text-[10px] font-bold uppercase tracking-[0.35em] text-white transition-colors hover:bg-neutral-800 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
            >
              <ShoppingBag size={15} strokeWidth={1.3} />
              Add / {formatCurrency(product.price)}
            </button>
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-black/35">
            {product.stock} pieces available
          </p>

          <div className="mt-8 grid gap-3 border-t border-black/10 pt-8 sm:grid-cols-3">
            <TrustBadge icon={<ShieldCheck size={14} />} label="Extrait concentration" />
            <TrustBadge icon={<Truck size={14} />} label="Insured delivery" />
            <TrustBadge icon={<Leaf size={14} />} label="Refill roadmap" />
          </div>
        </div>
      </div>

      <div className="bg-brand-black text-white">
        <div className="grid min-h-[80vh] grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[60vh] overflow-hidden">
            <AssetImage
              src={product.images.lifestyle[0]}
              alt={`${product.name} lifestyle campaign`}
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
              alt={`${product.name} flat lay bottle study`}
              wrapperClassName="aspect-[4/3] w-full max-w-2xl bg-white"
              className="h-full w-full object-contain drop-shadow-[0_35px_70px_rgba(0,0,0,0.08)]"
            />
          </div>
          <div className="relative min-h-[52vh] overflow-hidden">
            <AssetImage
              src={product.images.lifestyle[1]}
              alt={`${product.name} still life notes`}
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
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group flex items-center gap-6 border border-white/10 p-5 transition-colors hover:border-brand-gold/40"
              >
                <AssetImage
                  src={item.images.front}
                  alt={item.name}
                  wrapperClassName="h-28 w-24 shrink-0 bg-white/5"
                  className="h-full w-full object-contain"
                />
                <div>
                  <p className="font-serif text-3xl italic">{item.name}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-white/35">
                    {formatCurrency(item.price)} / {item.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const TrustBadge = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center gap-2 border border-black/10 px-3 py-3 text-[9px] uppercase tracking-[0.24em] text-black/55">
    <span className="text-black/70">{icon}</span>
    <span>{label}</span>
  </div>
);
