import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AssetImage } from '../AssetImage';
import { COLLECTION_IMAGES } from '../../constants/images';
import { motionTiers, duration } from '../../styles/tokens/motion';
import { focusRing } from '../../styles/tokens/interactive';

interface CategoryBlockProps {
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  href: string;
  reduceMotion: boolean;
  className?: string;
}

const CategoryBlock = ({
  title,
  subtitle,
  image,
  imageAlt,
  href,
  reduceMotion,
  className,
}: CategoryBlockProps) => {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: reduceMotion ? 0 : duration.base }}
      className={cn(
        'group relative flex-1 h-screen md:h-screen overflow-hidden bg-neutral-900 cursor-pointer flex items-center justify-center',
        className,
      )}
    >
      <Link
        to={href}
        className={cn('absolute inset-0 z-20', focusRing)}
        aria-label={`Explore ${title}`}
      />
      {/* Background Image with Zoom */}
      <motion.div
        whileHover={reduceMotion ? {} : { scale: 1.05 }}
        transition={reduceMotion ? { duration: 0 } : motionTiers.fast}
        className="absolute inset-0 z-0"
      >
        <AssetImage
          src={image}
          alt={imageAlt}
          wrapperClassName="h-full w-full bg-neutral-950"
          className="h-full w-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-opacity duration-700 ease-out motion-reduce:transition-none"
        />
        <div className="absolute inset-0 bg-surface-overlay-subtle group-hover:bg-transparent transition-colors duration-700 ease-out motion-reduce:transition-none" />
      </motion.div>

      {/* Content Overlay */}
      <div className="relative z-10 text-center">
        <motion.span
          initial={reduceMotion ? false : { y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : duration.slow,
            delay: reduceMotion ? 0 : 0.2,
          }}
          className="text-caption uppercase tracking-widest text-on-dark-secondary mb-4 block"
        >
          {subtitle}
        </motion.span>
        <motion.h3
          initial={reduceMotion ? false : { y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : duration.slow,
            delay: reduceMotion ? 0 : 0.3,
          }}
          className="font-serif text-5xl md:text-7xl text-brand-white tracking-tighter"
        >
          {title}
        </motion.h3>

        {/* Animated Button Underline */}
        <div className="mt-8 overflow-hidden inline-block">
          <motion.div
            initial={reduceMotion ? false : { x: '-100%' }}
            whileHover={reduceMotion ? {} : { x: '100%' }}
            transition={reduceMotion ? { duration: 0 } : motionTiers.fast}
            className="h-px w-full bg-brand-white"
          />
          <span className="text-brand-white text-caption uppercase tracking-wider font-bold mt-2 inline-block">
            Explore Collection
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const CategorySplit = () => {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className="bg-brand-black flex flex-col md:flex-row w-full overflow-hidden">
      <CategoryBlock
        title="His / Hers"
        subtitle="Bleu Heat + Soft Promise"
        image={COLLECTION_IMAGES.duos.hisHersLifestyle}
        imageAlt="Bleu Heat and Soft Promise perfume duo on a marble vanity still life"
        href="/collection"
        reduceMotion={reduceMotion}
      />
      <div className="w-px h-full bg-surface-glass-subtle hidden md:block" />
      <CategoryBlock
        title="Bold / Untamed"
        subtitle="Bold Decision + Wild Silence"
        image={COLLECTION_IMAGES.duos.boldUntamedLifestyle}
        imageAlt="Bold Decision and Wild Silence perfume duo arranged on textured slate"
        href="/collection"
        reduceMotion={reduceMotion}
      />
    </section>
  );
};
