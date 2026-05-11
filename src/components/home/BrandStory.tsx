import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { AssetImage } from '../AssetImage';
import { FEATURED_PRODUCTS } from '../../constants/products';

export const BrandStory = () => {
  const containerRef = useRef<HTMLElement>(null);
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
        <div className="relative w-full md:w-[45%] group flex flex-col pt-20">
          <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-brand-black/5 -translate-y-12 translate-x-12 hidden lg:block" />

          <div className="aspect-[2/3] overflow-hidden bg-neutral-100 relative shadow-2xl">
            {/* Cinematic Atmosphere Layer */}
            <motion.div style={{ y: imageY }} className="w-full h-[130%] relative">
              <AssetImage
                src={FEATURED_PRODUCTS[2].images.lifestyle[0]}
                alt="Wild Silence volcanic twilight campaign atmosphere"
                wrapperClassName="h-full w-full bg-neutral-200"
                className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-[3s] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
            </motion.div>
          </div>

          {/* Detailed Metadata Overlay */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-16 -right-8 md:-right-16 bg-brand-black p-10 md:p-14 text-white max-w-[320px] shadow-[30px_30px_60px_rgba(0,0,0,0.1)]"
          >
            <div className="w-8 h-px bg-brand-gold mb-6" />
            <h4 className="font-serif text-3xl mb-6 italic leading-tight">
              "Where silence becomes terrain."
            </h4>
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/40 leading-[2] font-light">
              Each extrait is staged as a world: mineral, floral, athletic, golden, or decisive. The
              image is never decoration; it is the first breath of the scent.
            </p>
          </motion.div>
        </div>

        {/* Story Text Content - Refined Editorial Hierarchy */}
        <div className="w-full md:w-[55%] flex flex-col items-start relative pb-20">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-[10px] md:text-[11px] uppercase tracking-[0.5em] text-brand-gold mb-12 font-bold flex items-center gap-4"
          >
            <div className="w-2 h-2 rounded-full bg-brand-gold" />
            The Manifesto
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif text-5xl md:text-8xl text-brand-black leading-[0.9] mb-12 tracking-tighter italic"
          >
            Refining the <br /> <span className="ml-[15%] text-neutral-300">Unspoken.</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="space-y-12 text-neutral-500 font-sans text-sm md:text-[15px] max-w-lg leading-[1.8] font-light"
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link
              to="/about#ethics"
              className="mt-16 group flex items-center gap-6 text-[11px] uppercase tracking-[0.4em] font-bold text-brand-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
            >
              Explore The Ethics
              <div className="relative w-16 h-px bg-brand-black/10 overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-brand-black"
                />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Atmospheric Background Element */}
      <motion.div
        style={{ scale: textScale }}
        className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 rotate-[-90deg] hidden xl:block opacity-[0.03] pointer-events-none"
      >
        <span className="text-[250px] font-serif uppercase tracking-[0.2em] whitespace-nowrap italic">
          SILENT DIALOGUE
        </span>
      </motion.div>
    </section>
  );
};
