import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { FEATURED_PRODUCTS } from '../../constants/products';

export const FeaturedProducts = () => {
  return (
    <section className="py-32 md:py-56 bg-brand-white px-8 md:px-16 lg:px-24">
      <div className="max-w-[1800px] mx-auto">
        {/* Header Section - Refined Editorial Spacing */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-24 md:mb-40 gap-12">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-6 mb-10"
            >
               <span className="text-[10px] md:text-[11px] uppercase tracking-[0.6em] text-brand-gold font-bold">The Selection</span>
               <div className="h-px w-20 bg-brand-gold/20" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-5xl md:text-8xl text-brand-black leading-[0.9] tracking-tighter"
            >
              Curated for the <br /> <span className="italic text-neutral-300">Refined Palette.</span>
            </motion.h2>
          </div>
          
          <motion.a
            href="/shop"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="group flex flex-col items-end gap-3 text-[10px] uppercase tracking-[0.4em] font-bold text-brand-black/40 hover:text-brand-black transition-colors"
          >
            <span>Explore All Anthology</span>
            <div className="relative w-32 h-px bg-brand-black/10 overflow-hidden">
               <motion.div 
                 initial={{ x: '-100%' }}
                 whileHover={{ x: '100%' }}
                 transition={{ duration: 0.8 }}
                 className="absolute inset-0 bg-brand-black"
               />
            </div>
          </motion.a>
        </div>

        {/* Product Grid - Minimal Museum Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
          {FEATURED_PRODUCTS.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
