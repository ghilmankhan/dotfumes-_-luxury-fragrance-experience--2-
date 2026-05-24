import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ProductCard } from '../components/home/ProductCard';
import { Product } from '../models/types';
import { AssetImage } from '../components/AssetImage';
import { COLLECTION_IMAGES } from '../constants/images';
import { usePageMeta } from '../hooks/usePageMeta';
import { useProductCatalogStore } from '../store/useProductCatalogStore';

type CategoryFilter = 'All' | Product['category'];

const filters: CategoryFilter[] = ['All', 'Unisex', 'Women', 'Men'];

export const CollectionPage = () => {
  const productsCatalog = useProductCatalogStore((state) => state.products);
  usePageMeta({
    title: 'Collection | DOTFUMES',
    description: 'Explore the full DOTFUMES fragrance archive across men, women, and unisex scents.',
    path: '/collection',
  });

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const collectionHeroImage = heroImageFailed
    ? COLLECTION_IMAGES.familyMood
    : '/images/hero/dotfumes-collection-hero-textsafe-five-bottles-2560x1440.webp';

  const products = useMemo(() => {
    if (activeFilter === 'All') {
      return productsCatalog;
    }

    return productsCatalog.filter((product) => product.category === activeFilter);
  }, [activeFilter, productsCatalog]);

  return (
    <section className="min-h-screen bg-brand-white text-brand-black">
      <div className="relative min-h-[72vh] overflow-hidden bg-brand-black px-6 pt-36 text-white md:px-16 md:pt-44 lg:px-24">
        <AssetImage
          src={collectionHeroImage}
          alt="Dotfumes five-fragrance collection campaign in cinematic lighting"
          wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
          className="h-full w-full object-cover object-[72%_center] opacity-56 md:object-[76%_center] md:opacity-62 lg:object-right lg:opacity-64"
          fetchPriority="high"
          onError={() => setHeroImageFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/36 md:from-black md:via-black/66 md:to-black/14 lg:from-black lg:via-black/48 lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/42 md:hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-white via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[52vh] max-w-5xl flex-col justify-end pb-20 md:max-w-4xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.55em] text-brand-gold">
            The Collection
          </span>
          <h1 className="luxury-text-shadow mt-8 max-w-[12ch] font-serif text-[3.15rem] italic leading-[0.9] tracking-tight md:max-w-[10ch] md:text-7xl lg:max-w-none lg:text-8xl">
            Five worlds. <br />
            <span className="text-white/45">One house.</span>
          </h1>
          <p className="mt-7 max-w-[32ch] text-sm leading-7 text-white/78 md:mt-8 md:max-w-[42ch] md:leading-8 md:text-white/74 lg:max-w-xl lg:text-white/55">
            A cinematic fragrance family staged across decisive woods, soft florals, volcanic quiet,
            athletic blue heat, and golden first light.
          </p>
        </div>
      </div>

      <div className="px-6 pb-28 pt-20 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1800px]">
          <div className="mb-20 grid items-center gap-10 border-y border-black/5 py-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-brand-gold">
                Family Lineup
              </p>
              <h2 className="mt-6 font-serif text-4xl italic leading-none md:text-6xl">
                The full archive, <br />
                <span className="text-neutral-300">cleanly staged.</span>
              </h2>
            </div>
            <AssetImage
              src={COLLECTION_IMAGES.familyLineup}
              alt="Dotfumes all five bottles line up"
              wrapperClassName="aspect-[16/9] w-full bg-white"
              className="h-full w-full object-contain drop-shadow-[0_35px_70px_rgba(0,0,0,0.08)]"
            />
          </div>

          <div className="mb-14 flex flex-col gap-10 md:mb-24 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="text-[10px] font-bold uppercase tracking-[0.55em] text-brand-gold">
                Shop Perfumes
              </span>
              <h2 className="mt-8 font-serif text-5xl italic leading-[0.92] tracking-tight md:text-7xl">
                Pick your scent, <br />
                <span className="text-neutral-300">then continue to checkout.</span>
              </h2>
              <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-black/52">
                Manual review, payment-proof verification, and WhatsApp or email support included.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Filter collection">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`border px-5 py-3 text-[10px] uppercase tracking-[0.28em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold ${
                    activeFilter === filter
                      ? 'border-brand-black bg-brand-black text-white'
                      : 'border-black/10 text-black/50 hover:border-black/30 hover:text-black'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {products.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2 lg:grid-cols-3"
            >
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </motion.div>
          ) : (
            <div className="border border-black/10 py-24 text-center">
              <p className="text-[11px] uppercase tracking-[0.35em] text-black/45">
                No fragrances currently match this archive.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
