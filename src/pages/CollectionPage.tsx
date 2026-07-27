import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ProductCard } from '../components/home/ProductCard';
import { Product } from '../models/types';
import { AssetImage } from '../components/AssetImage';
import { COLLECTION_IMAGES } from '../constants/images';
import { usePageMeta } from '../hooks/usePageMeta';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import { Button } from '../components/ui/primitives/Button';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { Grid } from '../components/ui/layout/Grid';
import { cn } from '../lib/utils';

type CategoryFilter = 'All' | Product['category'];

const filters: CategoryFilter[] = ['All', 'Unisex', 'Women', 'Men'];

export const CollectionPage = () => {
  const reduceMotion = useReducedMotion();
  const productsCatalog = useProductCatalogStore((state) => state.products);
  usePageMeta({
    title: 'Collection | DOTFUMES',
    description:
      'Explore the full DOTFUMES fragrance archive across men, women, and unisex scents.',
    path: '/collection',
  });

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const collectionHeroImage = heroImageFailed
    ? COLLECTION_IMAGES.familyMood
    : '/images/hero/dotfumes-collection-hero-textsafe-five-bottles-2560x1440.webp';

  const products =
    activeFilter === 'All'
      ? productsCatalog
      : productsCatalog.filter((product) => product.category === activeFilter);

  return (
    <section className="min-h-screen bg-brand-white text-brand-black">
      <div className="relative min-h-screen overflow-hidden bg-brand-black px-6 pt-36 text-brand-white md:px-16 md:pt-44 lg:px-24">
        <AssetImage
          src={collectionHeroImage}
          alt="Dotfumes five-fragrance collection campaign in cinematic lighting"
          wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
          className="h-full w-full object-cover opacity-56 md:opacity-62 lg:opacity-64"
          focal="right"
          fetchPriority="high"
          onError={() => setHeroImageFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-gradient-shadow-deep to-gradient-shadow-soft md:from-brand-black md:via-gradient-shadow-muted md:to-gradient-shadow-subtle lg:from-brand-black lg:via-gradient-shadow-soft lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-gradient-shadow-soft via-gradient-shadow-faint to-gradient-shadow-soft md:hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-white via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-screen max-w-5xl flex-col justify-end pb-20 md:max-w-4xl">
          <span className="text-caption font-bold uppercase tracking-widest text-brand-gold">
            The Collection
          </span>
          <h1 className="luxury-text-shadow mt-8 max-w-xs font-serif text-5xl italic leading-none tracking-tight md:max-w-sm md:text-7xl lg:max-w-none lg:text-8xl">
            Five worlds. <br />
            <span className="text-on-dark-muted">One house.</span>
          </h1>
          <p className="mt-8 max-w-md text-body leading-7 text-on-dark-secondary md:mt-8 md:max-w-lg md:leading-8 md:text-on-dark-secondary lg:max-w-xl lg:text-on-dark-muted">
            A cinematic fragrance family staged across decisive woods, soft florals, volcanic quiet,
            athletic blue heat, and golden first light.
          </p>
        </div>
      </div>

      <div className="px-6 pb-28 pt-20 md:px-16 lg:px-24">
        <div className="mx-auto max-w-450">
          <Grid
            layout="media-copy"
            gap={10}
            className="mb-20 items-center border-y border-on-light-subtle py-10"
          >
            <div>
              <p className="text-caption font-bold uppercase tracking-wider text-brand-gold">
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
              wrapperClassName="aspect-video w-full bg-brand-white"
              className="h-full w-full object-contain drop-shadow-xl"
            />
          </Grid>

          <div className="mb-14 flex flex-col gap-10 md:mb-24 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="text-caption font-bold uppercase tracking-widest text-brand-gold">
                Shop Perfumes
              </span>
              <h2 className="mt-8 font-serif text-5xl italic leading-none tracking-tight md:text-7xl">
                Pick your scent, <br />
                <span className="text-neutral-300">then continue to checkout.</span>
              </h2>
              <p className="mt-6 text-small uppercase tracking-wide text-on-light-muted">
                Manual review, payment-proof verification, and WhatsApp or email support included.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Filter collection">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant="ghost"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    'border px-4 py-3 font-normal normal-case tracking-wide text-caption',
                    activeFilter === filter
                      ? 'border-brand-black bg-brand-black text-brand-white hover:text-brand-white'
                      : 'border-on-light-muted text-on-light-muted hover:border-on-light-strong hover:text-brand-black',
                  )}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {products.length > 0 ? (
            <motion.div
              layout={!reduceMotion}
              className="grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2 lg:grid-cols-3"
            >
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </motion.div>
          ) : (
            <EmptyState title="No fragrances currently match this archive." />
          )}
        </div>
      </div>
    </section>
  );
};
