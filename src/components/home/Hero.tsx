import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { AssetImage } from '../AssetImage';
import { FEATURED_PRODUCTS } from '../../constants/products';
import { COLLECTION_IMAGES } from '../../constants/images';

export const Hero = () => {
  const heroProduct = FEATURED_PRODUCTS[0];
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const bottleY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);
  const bottleRotate = useTransform(scrollYProgress, [0, 1], [0, -2]);
  const metadataY = useTransform(scrollYProgress, [0, 1], ['0%', '-4%']);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-brand-black"
    >
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0 scale-110">
        <AssetImage
          src={COLLECTION_IMAGES.familyMood}
          alt="Dotfumes obsidian cinematic fragrance campaign"
          wrapperClassName="h-full w-full bg-[#090806]"
          className="h-full w-full object-cover opacity-45"
          sizes="100vw"
          fetchPriority="high"
        />
      </motion.div>

      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,201,255,0.16),transparent_38%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/85" />
        <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-black via-black/40 to-transparent" />
        <motion.div
          animate={{ opacity: [0.18, 0.28, 0.18], x: [0, 18, 0], y: [0, -12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-12 top-[16%] h-[28rem] w-[28rem] rounded-full bg-[#6fb4e2]/18 blur-[160px]"
        />
        <motion.div
          animate={{ opacity: [0.08, 0.16, 0.08], x: [0, -18, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[12%] left-[10%] h-[20rem] w-[32rem] rounded-full bg-white/10 blur-[150px]"
        />
      </div>

      <main className="relative z-20 mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 px-6 pb-14 pt-28 md:px-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)_minmax(280px,0.75fr)] lg:px-20 lg:pb-12 lg:pt-24">
        <div className="flex max-w-xl flex-col justify-center py-10 lg:py-0">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="mb-8 flex items-center gap-4"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.6em] text-brand-gold">
              Featured Anthology
            </span>
            <div className="h-px w-16 bg-brand-gold/40" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif text-[4rem] italic leading-[0.78] tracking-[-0.06em] text-white md:text-[6rem] lg:text-[8.5rem]"
          >
            Bold
            <br />
            <span className="ml-[14%] text-white/78">Decision</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.45 }}
            className="mt-8 max-w-sm text-sm leading-7 text-brand-gray md:text-[15px]"
          >
            A commanding extrait of citrus voltage, cracked pepper, and polished woods. Built like a
            private campaign, worn like a decision already made.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.65 }}
            className="mt-10 flex flex-wrap items-center gap-5"
          >
            <Link
              to="/collection"
              className="group relative overflow-hidden border border-brand-gold/35 px-10 py-5 text-[10px] font-semibold uppercase tracking-[0.5em] text-white transition-colors duration-700 hover:text-brand-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
            >
              <span className="relative z-10">Discover Anthology</span>
              <span className="absolute inset-0 translate-y-full bg-brand-gold transition-transform duration-500 ease-[0.16,1,0.3,1] group-hover:translate-y-0" />
            </Link>
            <span className="text-[10px] uppercase tracking-[0.38em] text-white/45">
              Extrait de Memoire / 100ml
            </span>
          </motion.div>
        </div>

        <div className="relative order-first flex min-h-[24rem] items-center justify-center py-8 lg:order-none lg:min-h-0">
          <motion.div
            style={{ y: bottleY, rotate: bottleRotate }}
            initial={{ opacity: 0, scale: 0.92, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[28rem]"
          >
            <motion.div
              animate={{ y: [0, -18, 0], rotate: [0, 1.4, 0, -1.2, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <AssetImage
                src={heroProduct.images.angle}
                alt={`${heroProduct.name} fragrance bottle`}
                wrapperClassName="bg-transparent"
                className="relative z-10 h-auto w-full drop-shadow-[0_50px_100px_rgba(0,0,0,0.55)]"
                sizes="(min-width: 1024px) 32rem, 75vw"
                fetchPriority="high"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.42, 0.2], x: [-10, 14, -10] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-y-[9%] left-[22%] z-20 w-[20%] rounded-full bg-white/30 blur-[26px] mix-blend-screen pointer-events-none"
              />
            </motion.div>
            <motion.div
              animate={{ opacity: [0.18, 0.28, 0.18], scaleX: [1, 1.08, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-4 left-1/2 h-10 w-[68%] -translate-x-1/2 rounded-full bg-black blur-[44px]"
            />
          </motion.div>
        </div>

        <motion.aside
          style={{ y: metadataY }}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.75 }}
          className="flex flex-col justify-end py-8 lg:items-end lg:justify-center lg:py-0"
        >
          <div className="w-full max-w-xs border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md lg:ml-auto">
            <div className="text-[10px] uppercase tracking-[0.45em] text-brand-gold/90">
              Provenance
            </div>
            <div className="mt-4 font-serif text-5xl italic text-white">${heroProduct.price}</div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.32em] text-white/40">
              International Archives / 100ml
            </div>

            <div className="mt-10 border-t border-white/10 pt-8">
              <div className="mb-6 text-[10px] uppercase tracking-[0.45em] text-brand-gold/90">
                The Accord
              </div>
              <div className="space-y-5">
                {[
                  ['Overture', heroProduct.notes.top[0]],
                  ['Heart', heroProduct.notes.heart[0]],
                  ['Dry Down', heroProduct.notes.base[0]],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[9px] uppercase tracking-[0.36em] text-white/28">
                      {label}
                    </div>
                    <div className="mt-2 font-serif text-xl italic text-white/88">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.aside>
      </main>
    </section>
  );
};
