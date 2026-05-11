import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AssetImage } from '../AssetImage';
import { COLLECTION_IMAGES } from '../../constants/images';

interface CategoryBlockProps {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  className?: string;
}

const CategoryBlock: React.FC<CategoryBlockProps> = ({
  title,
  subtitle,
  image,
  href,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className={cn(
        'group relative flex-1 h-[60vh] md:h-[80vh] overflow-hidden bg-neutral-900 cursor-pointer flex items-center justify-center',
        className,
      )}
    >
      <Link
        to={href}
        className="absolute inset-0 z-20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
        aria-label={`Explore ${title}`}
      />
      {/* Background Image with Zoom */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 z-0"
      >
        <AssetImage
          src={image}
          alt={title}
          wrapperClassName="h-full w-full bg-neutral-950"
          className="h-full w-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-700" />
      </motion.div>

      {/* Content Overlay */}
      <div className="relative z-10 text-center">
        <motion.span
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[10px] uppercase tracking-[0.5em] text-white/70 mb-4 block"
        >
          {subtitle}
        </motion.span>
        <motion.h3
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-serif text-5xl md:text-7xl text-white tracking-tighter"
        >
          {title}
        </motion.h3>

        {/* Animated Button Underline */}
        <div className="mt-8 overflow-hidden inline-block">
          <motion.div
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="h-[1px] w-full bg-white"
          />
          <span className="text-white text-[10px] uppercase tracking-[0.3em] font-bold mt-2 inline-block">
            Explore Collection
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const CategorySplit = () => {
  return (
    <section className="bg-brand-black flex flex-col md:flex-row w-full overflow-hidden">
      <CategoryBlock
        title="His / Hers"
        subtitle="Bleu Heat + Soft Promise"
        image={COLLECTION_IMAGES.duos.hisHersLifestyle}
        href="/collection"
      />
      <div className="w-px h-full bg-white/10 hidden md:block" />
      <CategoryBlock
        title="Bold / Untamed"
        subtitle="Bold Decision + Wild Silence"
        image={COLLECTION_IMAGES.duos.boldUntamedLifestyle}
        href="/collection"
      />
    </section>
  );
};
