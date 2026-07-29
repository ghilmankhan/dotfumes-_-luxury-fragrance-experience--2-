import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { useProductCatalogStore } from '../../store/useProductCatalogStore';
import { easing, duration } from '../../styles/tokens/motion';
import { focusRing } from '../../styles/tokens/interactive';
import { cn } from '../../lib/utils';

export const FeaturedProducts = () => {
  const products = useProductCatalogStore((state) => state.products);
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-32 md:py-56 bg-brand-white px-8 md:px-16 lg:px-24">
      <div className="max-w-450 mx-auto">
        {/* Header Section - Refined Editorial Spacing */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-24 md:mb-40 gap-12">
          <div className="max-w-2xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: reduceMotion ? 0 : duration.base }}
              className="flex items-center gap-6 mb-10"
            >
              <span className="text-caption md:text-small uppercase tracking-widest text-brand-gold font-bold">
                The Selection
              </span>
              <div className="h-px w-20 bg-accent-gold-muted" />
            </motion.div>

            <motion.h2
              initial={reduceMotion ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: reduceMotion ? 0 : duration.cinematic,
                ease: easing.cinematic,
              }}
              className="font-serif text-5xl md:text-8xl text-brand-black leading-none tracking-tighter"
            >
              Curated for the <br />{' '}
              <span className="italic text-neutral-300">Refined Palette.</span>
            </motion.h2>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : duration.base }}
          >
            <Link
              to="/collection"
              className={cn(
                'group flex flex-col items-end gap-3 text-caption uppercase tracking-wider font-bold text-on-light-faint hover:text-brand-black transition-colors',
                focusRing,
              )}
            >
              <span>Explore Collection</span>
              <div className="relative w-32 h-px bg-surface-overlay-subtle overflow-hidden">
                <motion.div
                  initial={reduceMotion ? false : { x: '-100%' }}
                  whileHover={reduceMotion ? {} : { x: '100%' }}
                  transition={{ duration: reduceMotion ? 0 : duration.slow }}
                  className="absolute inset-0 bg-brand-black"
                />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Product Grid - Minimal Museum Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
