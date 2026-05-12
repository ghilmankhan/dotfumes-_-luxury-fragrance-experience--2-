import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { AssetImage } from '../AssetImage';
import { FEATURED_PRODUCTS } from '../../constants/products';

export const Hero = () => {
  const heroProduct = FEATURED_PRODUCTS[0];
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Cinematic parallax transformations
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);
  const bottleY = useTransform(scrollYProgress, [0, 1], ['0%', '-6%']);
  const bottleOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.15]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-brand-black"
    >
      {/* CINEMATIC DEPTH LAYER 1: BACKGROUND ATMOSPHERE */}
      <motion.div
        style={{ opacity: backgroundOpacity }}
        className="absolute inset-0 z-0"
      >
        <div className="h-full w-full bg-gradient-to-b from-[#1a1815] via-[#0f0d0a] to-[#0a0905]" />
        {/* Subtle grain texture for cinematic quality */}
        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 0.5px, transparent 0.5px)',
          backgroundSize: '4px 4px'
        }} />
      </motion.div>

      {/* CINEMATIC DEPTH LAYER 2: VOLUMETRIC LIGHT & ATMOSPHERIC HAZE */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Warm amber reflection (right side) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -right-32 h-[80vh] w-[50vw] rounded-full bg-amber-900/15 blur-[140px]"
        />
        {/* Cool blue-white glow (left-top) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-40 left-1/3 h-[70vh] w-[60vw] rounded-full bg-slate-400/8 blur-[160px]"
        />
        {/* Soft smoke drift (bottom-left) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-32 left-1/4 h-[60vh] w-[70vw] rounded-full bg-white/5 blur-[150px]"
        />
      </div>

      {/* CINEMATIC DEPTH LAYER 3: DARK OVERLAY FOR CONTRAST */}
      <div className="absolute inset-0 z-11 pointer-events-none">
        {/* Vignette from edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,transparent_20%,rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/25" />
        {/* Subtle top-to-bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />
      </div>

      {/* MAIN CONTENT: CINEMATIC EDITORIAL LAYOUT */}
      <main className="relative z-20 h-full w-full flex flex-col items-center justify-center px-6 md:px-12 lg:px-24">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* BOTTLE HERO: Centered, physically staged */}
          <motion.div
            style={{ y: bottleY, opacity: bottleOpacity }}
            className="relative z-30 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* BOTTLE GLOW: Cinematic edge lighting */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 80px rgba(197, 160, 89, 0.15), inset -20px -20px 60px rgba(0,0,0,0.4)',
                    '0 0 120px rgba(197, 160, 89, 0.22), inset -20px -20px 60px rgba(0,0,0,0.3)',
                    '0 0 80px rgba(197, 160, 89, 0.15), inset -20px -20px 60px rgba(0,0,0,0.4)',
                  ],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-12 rounded-full pointer-events-none"
              />

              {/* BOTTLE IMAGE */}
              <div className="relative w-80 h-96 md:w-96 md:h-full flex items-center justify-center">
                <motion.div
                  animate={{
                    filter: [
                      'drop-shadow(0 40px 60px rgba(0,0,0,0.5)) drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                      'drop-shadow(0 50px 80px rgba(0,0,0,0.6)) drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                      'drop-shadow(0 40px 60px rgba(0,0,0,0.5)) drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                    ],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <AssetImage
                    src={heroProduct.images.angle}
                    alt={`${heroProduct.name} - Ultra-premium luxury fragrance`}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    wrapperClassName="w-full h-full"
                    sizes="(max-width: 768px) 300px, 400px"
                    fetchPriority="high"
                  />
                </motion.div>
              </div>

              {/* ATMOSPHERIC HAZE: Foreground smoke effect */}
              <motion.div
                animate={{
                  opacity: [0.08, 0.15, 0.08],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-white/10 blur-3xl pointer-events-none"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* TYPOGRAPHY: Asymmetrical editorial positioning */}
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="absolute inset-0 flex flex-col items-start justify-center px-6 md:px-16 lg:px-24 pointer-events-none z-40"
        >
          {/* TOP METADATA: Restrained uppercase information */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-12 md:mb-20"
          >
            <div className="flex items-center gap-3">
              <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.7em] text-brand-gold/80">
                Limited Extrait
              </span>
              <motion.div
                animate={{ scaleX: [0, 1] }}
                transition={{ duration: 0.9, delay: 0.6 }}
                className="h-px w-12 md:w-16 bg-gradient-to-r from-brand-gold/60 to-transparent"
              />
            </div>
          </motion.div>

          {/* HEADLINE: Large italic serif with asymmetrical break */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-serif text-[3.5rem] md:text-[5.5rem] lg:text-7xl italic leading-[0.9] tracking-[-0.04em] text-white max-w-2xl">
              <span className="block">{heroProduct.name.split(' ')[0]}</span>
              <motion.span
                className="block text-white/70 font-light"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
              >
                {heroProduct.name.split(' ')[1]}
              </motion.span>
            </h1>
          </motion.div>

          {/* PRODUCT NOTES: Poetic fragrance description */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-10 md:mt-14 max-w-md text-xs md:text-sm leading-7 md:leading-8 text-brand-gray/90 font-light tracking-wide"
          >
            {heroProduct.description}
          </motion.p>

          {/* FRAGRANCE NOTES: Editorial typography */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.9 }}
            className="mt-8 md:mt-12 space-y-4"
          >
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div>
                <p className="text-[8px] uppercase tracking-[0.4em] text-brand-gold/60 mb-2">
                  Top
                </p>
                <p className="text-xs text-white/70 leading-relaxed font-light">
                  {heroProduct.notes.top.slice(0, 2).join(' • ')}
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.4em] text-brand-gold/60 mb-2">
                  Heart
                </p>
                <p className="text-xs text-white/70 leading-relaxed font-light">
                  {heroProduct.notes.heart.slice(0, 2).join(' • ')}
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.4em] text-brand-gold/60 mb-2">
                  Base
                </p>
                <p className="text-xs text-white/70 leading-relaxed font-light">
                  {heroProduct.notes.base.slice(0, 2).join(' • ')}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* CTA: Understated, cinematic button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="absolute bottom-12 md:bottom-16 lg:bottom-20 z-40 pointer-events-auto"
        >
          <Link
            to={`/product/${heroProduct.slug}`}
            className="group relative inline-block overflow-hidden"
          >
            <div className="flex items-center gap-3 px-8 py-4 md:px-12 md:py-5">
              {/* Subtle background glow on hover */}
              <div className="absolute inset-0 translate-y-full bg-white/5 transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:translate-y-0" />

              {/* Text with underline animation */}
              <span className="relative text-[10px] md:text-xs font-semibold uppercase tracking-[0.5em] text-white transition-colors duration-500 group-hover:text-brand-gold">
                Explore
              </span>
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-6 h-px bg-gradient-to-r from-white/40 to-transparent"
              />
            </div>

            {/* Border */}
            <div className="absolute inset-0 border border-white/10 group-hover:border-brand-gold/40 transition-colors duration-700" />
          </Link>
        </motion.div>
      </main>

      {/* SCROLL INDICATOR: Subtle cinematic hint */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
