import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { AssetImage } from '../AssetImage';
import { FEATURED_PRODUCTS } from '../../constants/products';
import { eyebrowLabelSm } from '../../styles/tokens/typography';
import { cn } from '../../lib/utils';
import { easing, duration } from '../../styles/tokens/motion';

const INGREDIENTS = [
  {
    name: 'Citrus Pepper',
    origin: 'Bold Decision',
    description:
      'A sharp still-life of citrus peel, black pepper, and linen restraint. The opening reads bright, dry, and decisive.',
    image: FEATURED_PRODUCTS[0].images.lifestyle[1],
    mood: 'Dusk Authority',
  },
  {
    name: 'Peony Bloom',
    origin: 'Soft Promise',
    description:
      'Peony and gardenia are treated as atmosphere, not sweetness: luminous, intimate, and quietly textural.',
    image: FEATURED_PRODUCTS[1].images.lifestyle[1],
    mood: 'Floral Veil',
  },
  {
    name: 'Tropical Gold',
    origin: 'First Meet',
    description:
      'Solar fruit and travertine warmth create the golden transition between skin, memory, and desire.',
    image: FEATURED_PRODUCTS[4].images.lifestyle[1],
    mood: 'Golden Hour',
  },
];

export const SignatureExperience = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const x = useTransform(scrollYProgress, [0.1, 0.9], ['5%', '-35%']);
  const rotate = useTransform(scrollYProgress, [0, 1], [2, -2]);

  // Below md, the scroll-linked x transform never travels far enough to reveal
  // the last card (its range is a fixed % of track width, not viewport-aware),
  // so mobile gets native horizontal swipe instead of the scroll-jacked parallax.
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateMatch = () => setIsMobileViewport(mediaQuery.matches);
    updateMatch();
    mediaQuery.addEventListener('change', updateMatch);
    return () => mediaQuery.removeEventListener('change', updateMatch);
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-48 md:py-80 bg-brand-black text-white overflow-hidden relative"
    >
      {/* Background Atmosphere Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-black via-transparent to-transparent z-10" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
      </div>

      <div className="px-8 md:px-16 lg:px-24 mb-32 relative z-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-6 mb-8"
        >
          <span className="text-[10px] md:text-[11px] tracking-[0.5em] uppercase text-brand-gold font-bold italic">
            The Anatomy
          </span>
          <div className="h-px w-24 bg-brand-gold/20" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: easing.cinematic }}
          className="font-serif text-6xl md:text-[120px] italic tracking-tighter max-w-5xl leading-[0.85]"
        >
          Worlds of <br /> <span className="text-white/20">Scent Memory.</span>
        </motion.h2>
      </div>

      <div className="relative z-20 overflow-x-auto md:overflow-visible [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <motion.div
          style={isMobileViewport ? {} : { x }}
          className="flex gap-12 md:gap-24 px-8 md:px-16 lg:px-24 snap-x snap-mandatory md:snap-none"
        >
          {INGREDIENTS.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: duration.cinematic, delay: index * 0.15, ease: easing.cinematic }}
              className="flex-shrink-0 w-[350px] md:w-[600px] h-full snap-start md:snap-align-none"
            >
              <div className="aspect-[3/4] bg-neutral-900 overflow-hidden mb-12 group relative shadow-xl">
                <motion.div style={{ rotate }} className="w-full h-full">
                  <AssetImage
                    src={item.image}
                    alt={item.name}
                    wrapperClassName="h-full w-full bg-neutral-950"
                    className="h-full w-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[1.8s] ease-[cubic-bezier(0.16,1,0.3,1)] opacity-70 group-hover:opacity-90"
                  />
                </motion.div>

                {/* Mood Tag */}
                <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md px-6 py-2 border border-white/10">
                  <span className={cn(eyebrowLabelSm, 'italic text-brand-gold')}>
                    {item.mood}
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              </div>

              <div className="space-y-6 max-w-lg">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-serif italic text-brand-gold/60">0{index + 1}</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <h3 className="font-serif text-4xl md:text-6xl italic leading-none">{item.name}</h3>
                <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 block mb-4">
                  Provenance: {item.origin}
                </span>
                <p className="text-sm md:text-base text-white/50 leading-[1.8] font-light italic">
                  {item.description}
                </p>

                <div className="pt-8 overflow-hidden inline-block">
                  <motion.div
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: duration.slow }}
                    className="h-px w-32 bg-brand-gold/40"
                  />
                  <span className={cn(eyebrowLabelSm, 'mt-3 inline-block')}>
                    Discover Origin
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Background Decorative Typography */}
      <div className="absolute bottom-20 left-0 w-full opacity-[0.02] pointer-events-none select-none">
        <span className="text-[300px] font-serif uppercase tracking-[0.1em] italic leading-none block marquee">
          SCENT ARCHITECTURE
        </span>
      </div>
    </section>
  );
};
