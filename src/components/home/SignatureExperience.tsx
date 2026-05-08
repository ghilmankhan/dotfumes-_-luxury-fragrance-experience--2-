import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { AssetImage } from '../AssetImage';

const INGREDIENTS = [
  {
    name: "Frozen Bergamot",
    origin: "Bergamo, IT",
    description: "Cold-pressed at exactly 3:00 AM to preserve the sharp, icy spark of the opening spark.",
    image: "/images/ingredients/bergamot-cinematic.webp",
    mood: "Icy Blue"
  },
  {
    name: "Atlas Cedarwood",
    origin: "Morocco",
    description: "Ancient wood, slowly cured over amber embers. Providing the structural silence of the heart.",
    image: "/images/ingredients/cedar-cinematic.webp",
    mood: "Desert Ember"
  },
  {
    name: "Smoked Oud",
    origin: "South Asia",
    description: "A profound molecular reconstruction of sacred oils. Velvety, dark, and eternal.",
    image: "/images/ingredients/oud-cinematic.webp",
    mood: "Smoky Veil"
  }
];

export const SignatureExperience = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const x = useTransform(scrollYProgress, [0.1, 0.9], ["5%", "-35%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [2, -2]);

  return (
    <section ref={containerRef} className="py-48 md:py-80 bg-brand-black text-white overflow-hidden relative">
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
          <span className="text-[10px] md:text-[11px] tracking-[0.5em] uppercase text-brand-gold font-bold italic">The Anatomy</span>
          <div className="h-px w-24 bg-brand-gold/20" />
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-6xl md:text-[120px] italic tracking-tighter max-w-5xl leading-[0.85]"
        >
          Ingredients of <br /> <span className="text-white/20">Absolute Silence.</span>
        </motion.h2>
      </div>

      <div className="relative z-20">
        <motion.div 
          style={{ x }}
          className="flex gap-12 md:gap-24 px-8 md:px-16 lg:px-24"
        >
          {INGREDIENTS.map((item, index) => (
            <motion.div 
              key={item.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0 w-[350px] md:w-[600px] h-full"
            >
              <div className="aspect-[3/4] bg-neutral-900 overflow-hidden mb-12 group relative shadow-[0_40px_80px_rgba(0,0,0,0.4)]">
                <motion.div 
                   style={{ rotate }}
                   className="w-full h-full"
                >
                  <AssetImage 
                    src={item.image} 
                    alt={item.name}
                    wrapperClassName="h-full w-full bg-neutral-950"
                    className="h-full w-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[3s] ease-out opacity-70 group-hover:opacity-90"
                  />
                </motion.div>
                
                {/* Mood Tag */}
                <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md px-6 py-2 border border-white/10">
                   <span className="text-[9px] uppercase tracking-[0.3em] font-bold italic text-brand-gold">{item.mood}</span>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              </div>

              <div className="space-y-6 max-w-lg">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-serif italic text-brand-gold/60">0{index + 1}</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <h3 className="font-serif text-4xl md:text-6xl italic leading-none">{item.name}</h3>
                <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 block mb-4">Provenance: {item.origin}</span>
                <p className="text-sm md:text-base text-white/50 leading-[1.8] font-light italic">
                  {item.description}
                </p>
                
                <div className="pt-8 overflow-hidden inline-block">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.8 }}
                    className="h-px w-32 bg-brand-gold/40"
                  />
                  <span className="text-[9px] uppercase tracking-[0.3em] font-bold mt-3 inline-block">Discover Origin</span>
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
