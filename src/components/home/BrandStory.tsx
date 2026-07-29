import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { AssetImage } from '../AssetImage';
import { FEATURED_PRODUCTS } from '../../constants/products';
import { motionTiers, easing, duration } from '../../styles/tokens/motion';
import { focusRing } from '../../styles/tokens/interactive';
import { cn } from '../../lib/utils';

export const BrandStory = () => {
  const containerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);
  const textScale = useTransform(scrollYProgress, [0, 1], [0.9, 1.1]);

  return (
    <section
      ref={containerRef}
      className="relative py-32 md:py-64 bg-brand-white overflow-hidden px-8 md:px-16"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-24 md:gap-40">
        {/* Editorial Image Block - Emotional Storytelling */}
        <div className="group relative flex w-full flex-col pt-20 md:w-1/2">
          <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-on-light-subtle -translate-y-12 translate-x-12 hidden lg:block" />

          <div className="relative aspect-2/3 overflow-hidden bg-neutral-100 shadow-xl">
            {/* Cinematic Atmosphere Layer */}
            <motion.div
              style={reduceMotion ? {} : { y: imageY }}
              className="relative h-full w-full"
            >
              <AssetImage
                src={FEATURED_PRODUCTS[2].images.lifestyle[0]}
                alt="Wild Silence volcanic twilight campaign atmosphere"
                wrapperClassName="h-full w-full bg-neutral-200"
                className="h-full w-full object-cover grayscale motion-safe:hover:grayscale-0 transition-opacity duration-2000 ease-out motion-reduce:transition-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-gradient-shadow-soft via-transparent to-transparent opacity-60"
              />
            </motion.div>
          </div>

          {/* Detailed Metadata Overlay */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: reduceMotion ? 0 : duration.cinematic,
              ease: easing.cinematic,
            }}
            className="absolute -bottom-16 -right-8 md:-right-16 bg-brand-black p-10 md:p-14 text-brand-white max-w-80 shadow-lg"
          >
            <div aria-hidden="true" className="w-8 h-px bg-brand-gold mb-6" />
            <blockquote className="font-serif text-3xl mb-6 italic leading-tight">
              "Where silence becomes terrain."
            </blockquote>
            <p className="text-caption md:text-small uppercase tracking-wider text-on-dark-muted leading-loose font-light">
              Each extrait is staged as a world: mineral, floral, athletic, golden, or decisive. The
              image is never decoration; it is the first breath of the scent.
            </p>
          </motion.div>
        </div>

        {/* Story Text Content - Refined Editorial Hierarchy */}
        <div className="relative flex w-full flex-col items-start pb-20 md:w-1/2">
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : duration.base }}
            className="text-caption md:text-small uppercase tracking-widest text-brand-gold mb-12 font-bold flex items-center gap-4"
          >
            <div aria-hidden="true" className="w-2 h-2 rounded-full bg-brand-gold" />
            The Manifesto
          </motion.span>

          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: reduceMotion ? 0 : duration.cinematic,
              ease: easing.cinematic,
            }}
            className="font-serif text-5xl md:text-8xl text-brand-black leading-none mb-12 tracking-tighter italic"
          >
            Refining the <br /> <span className="ml-16 text-neutral-300">Unspoken.</span>
          </motion.h2>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: reduceMotion ? 0 : duration.cinematic,
              delay: reduceMotion ? 0 : 0.3,
            }}
            className="space-y-12 text-neutral-500 font-sans text-body md:text-body max-w-lg leading-loose font-light"
          >
            <p className="first-letter:text-5xl first-letter:font-serif first-letter:float-left first-letter:mr-4 first-letter:text-brand-black first-letter:mt-2">
              Dotfumes was born from a singular obsession: to make fragrance feel cinematic before
              it ever touches skin. We believe true luxury is not a louder signal; it is atmosphere
              with discipline.
            </p>
            <p>
              Each signature scent is paired with its own visual world: a walnut desk at dusk, a
              pink marble boudoir, volcanic twilight, a dawn boxing gym, or a terrace lit like a
              first confession.
            </p>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : duration.base }}
          >
            <Link
              to="/about#ethics"
              className={cn(
                'mt-16 group flex items-center gap-6 text-small uppercase tracking-wider font-bold text-brand-black',
                focusRing,
              )}
            >
              Explore The Ethics
              <div className="relative w-16 h-px bg-surface-overlay-subtle overflow-hidden">
                <motion.div
                  initial={reduceMotion ? false : { x: '-100%' }}
                  whileHover={reduceMotion ? {} : { x: '100%' }}
                  transition={reduceMotion ? { duration: 0 } : motionTiers.normal}
                  className="absolute inset-0 bg-brand-black"
                />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Atmospheric Background Element */}
      <motion.div
        style={reduceMotion ? {} : { scale: textScale }}
        className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 -rotate-90 hidden xl:block opacity-5 pointer-events-none"
      >
        <span className="text-9xl font-serif uppercase tracking-wide whitespace-nowrap italic">
          SILENT DIALOGUE
        </span>
      </motion.div>
    </section>
  );
};
