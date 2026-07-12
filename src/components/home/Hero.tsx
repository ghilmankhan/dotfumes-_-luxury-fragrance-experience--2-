import { useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FEATURED_PRODUCTS } from '../../constants/products';
import { Button, LinkButton } from '../ui/primitives/Button';
import { cn } from '../../lib/utils';
import { eyebrowLabel, headingXl } from '../../styles/tokens/typography';
import { easing } from '../../styles/tokens/motion';

type HeroSlide = {
  slug: string;
  name: string;
  image: string;
  fallbackImage: string;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  description: string;
  mood: string;
  notes: string;
  primaryCtaLabel: string;
  primaryCtaRoute: string;
  secondaryCtaLabel: string;
  secondaryCtaRoute: string;
  accentClassName: string;
  alt: string;
  desktopObjectPosition: string;
  mobileObjectPosition: string;
};

const getProductBySlug = (slug: string) =>
  FEATURED_PRODUCTS.find((product) => product.slug === slug) ?? FEATURED_PRODUCTS[0];

const HERO_SLIDES: HeroSlide[] = [
  {
    slug: 'bold-decision',
    name: 'Bold Decision',
    image: '/images/hero/dotfumes-home-hero-bold-decision-2560x1440.webp',
    fallbackImage: getProductBySlug('bold-decision').images.lifestyle[0],
    eyebrow: 'House Signature',
    headlineLine1: 'Command',
    headlineLine2: 'the room.',
    description:
      'A commanding extrait shaped with citrus voltage, black pepper, and polished woods for decisive evening presence.',
    mood: 'Commanding',
    notes: 'Citrus voltage • Black pepper • Polished woods',
    primaryCtaLabel: 'Explore Bold Decision',
    primaryCtaRoute: '/product/bold-decision',
    secondaryCtaLabel: 'Shop Perfumes',
    secondaryCtaRoute: '/collection',
    accentClassName: 'from-amber-300/80 to-amber-600/70',
    alt: 'Bold Decision cinematic perfume hero in obsidian lighting',
    desktopObjectPosition: '72% center',
    mobileObjectPosition: '60% center',
  },
  {
    slug: 'soft-promise',
    name: 'Soft Promise',
    image: '/images/hero/dotfumes-home-hero-soft-promise-2560x1440.webp',
    fallbackImage: getProductBySlug('soft-promise').images.lifestyle[0],
    eyebrow: 'Maison Extrait',
    headlineLine1: 'Quiet',
    headlineLine2: 'intimacy.',
    description:
      'A luminous floral trail of peony, gardenia, and warm skin musk composed for intimate, refined moments.',
    mood: 'Quiet Elegance',
    notes: 'Soft floral • Warm skin • Powdered musk',
    primaryCtaLabel: 'Explore Soft Promise',
    primaryCtaRoute: '/product/soft-promise',
    secondaryCtaLabel: 'Shop Perfumes',
    secondaryCtaRoute: '/collection',
    accentClassName: 'from-rose-200/80 to-amber-400/70',
    alt: 'Soft Promise perfume hero image with warm editorial lighting',
    desktopObjectPosition: '70% center',
    mobileObjectPosition: '62% center',
  },
  {
    slug: 'wild-silence',
    name: 'Wild Silence',
    image: '/images/hero/dotfumes-home-hero-wild-silence-2560x1440.webp',
    fallbackImage: getProductBySlug('wild-silence').images.lifestyle[0],
    eyebrow: 'Nocturne Edit',
    headlineLine1: 'Mineral',
    headlineLine2: 'stillness.',
    description:
      'Volcanic quiet and cool woods unfold through mineral air, creating a serene signature with composed depth.',
    mood: 'Volcanic Quiet',
    notes: 'Mineral air • Cool woods • Forest slate',
    primaryCtaLabel: 'Explore Wild Silence',
    primaryCtaRoute: '/product/wild-silence',
    secondaryCtaLabel: 'Shop Perfumes',
    secondaryCtaRoute: '/collection',
    accentClassName: 'from-cyan-200/70 to-slate-300/60',
    alt: 'Wild Silence perfume hero in dark stone-inspired cinematic mood',
    desktopObjectPosition: '74% center',
    mobileObjectPosition: '64% center',
  },
  {
    slug: 'bleu-heat',
    name: 'Bleu Heat',
    image: '/images/hero/dotfumes-home-hero-bleu-heat-2560x1440.webp',
    fallbackImage: getProductBySlug('bleu-heat').images.lifestyle[0],
    eyebrow: 'Modern Energy',
    headlineLine1: 'Blue fire,',
    headlineLine2: 'disciplined.',
    description:
      'Electric citrus and athletic spice meet warm cedar in a modern extrait made for confident movement.',
    mood: 'Modern Energy',
    notes: 'Blue citrus • Athletic spice • Warm cedar',
    primaryCtaLabel: 'Explore Bleu Heat',
    primaryCtaRoute: '/product/bleu-heat',
    secondaryCtaLabel: 'Shop Perfumes',
    secondaryCtaRoute: '/collection',
    accentClassName: 'from-sky-300/80 to-blue-500/70',
    alt: 'Bleu Heat perfume hero with cool blue and amber highlights',
    desktopObjectPosition: '72% center',
    mobileObjectPosition: '62% center',
  },
  {
    slug: 'first-meet',
    name: 'First Meet',
    image: '/images/hero/dotfumes-home-hero-first-meet-2560x1440.webp',
    fallbackImage: getProductBySlug('first-meet').images.lifestyle[0],
    eyebrow: 'Golden Series',
    headlineLine1: 'First',
    headlineLine2: 'impression.',
    description:
      'Golden warmth, fruit skin, and refined woods create an immediate, polished signature for first encounters.',
    mood: 'Golden Confidence',
    notes: 'Golden warmth • Fruit skin • Refined woods',
    primaryCtaLabel: 'Explore First Meet',
    primaryCtaRoute: '/product/first-meet',
    secondaryCtaLabel: 'Shop Perfumes',
    secondaryCtaRoute: '/collection',
    accentClassName: 'from-yellow-200/80 to-amber-500/80',
    alt: 'First Meet perfume hero with golden-hour cinematic reflections',
    desktopObjectPosition: '73% center',
    mobileObjectPosition: '60% center',
  },
];

const TOUCH_RESUME_AFTER_MS = 10000;

export const Hero = () => {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideFallbacks, setSlideFallbacks] = useState<Record<string, boolean>>({});
  const touchResumeTimeoutRef = useRef<number | null>(null);

  const activeSlide = HERO_SLIDES[activeIndex];
  const autoRotateMs = 7000;

  // Mobile has no hover/blur to resume on, so touching the slide pauses it and
  // a fresh inactivity timer (reset on every touch) resumes it instead.
  const handleTouchStart = () => {
    setIsPaused(true);
    if (touchResumeTimeoutRef.current) {
      window.clearTimeout(touchResumeTimeoutRef.current);
    }
    touchResumeTimeoutRef.current = window.setTimeout(() => {
      setIsPaused(false);
    }, TOUCH_RESUME_AFTER_MS);
  };

  useEffect(() => {
    return () => {
      if (touchResumeTimeoutRef.current) {
        window.clearTimeout(touchResumeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, autoRotateMs);

    return () => window.clearInterval(interval);
  }, [isPaused, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const nextIndex = (activeIndex + 1) % HERO_SLIDES.length;
    const nextSlide = HERO_SLIDES[nextIndex];
    const preload = new Image();
    preload.src = slideFallbacks[nextSlide.slug] ? nextSlide.fallbackImage : nextSlide.image;
  }, [activeIndex, prefersReducedMotion, slideFallbacks]);

  const currentSlideImage = slideFallbacks[activeSlide.slug]
    ? activeSlide.fallbackImage
    : activeSlide.image;

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsPaused(false);
  };

  const slideProgressWidth = useMemo(
    () => `${((activeIndex + 1) / HERO_SLIDES.length) * 100}%`,
    [activeIndex],
  );

  return (
    <section
      className="relative min-h-[92svh] w-full overflow-hidden bg-brand-black md:min-h-screen"
      aria-label="Featured fragrance hero carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlurCapture}
      onTouchStart={handleTouchStart}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 1.1, ease: easing.standard }}
          className="absolute inset-0"
        >
          <img
            src={currentSlideImage}
            alt={activeSlide.alt}
            className="h-full w-full object-cover md:hidden"
            style={{ objectPosition: activeSlide.mobileObjectPosition }}
            loading={activeIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
            decoding="async"
            sizes="100vw"
            onError={() =>
              setSlideFallbacks((prev) => ({
                ...prev,
                [activeSlide.slug]: true,
              }))
            }
          />
          <img
            src={currentSlideImage}
            alt=""
            aria-hidden="true"
            className="hidden h-full w-full object-cover md:block"
            style={{ objectPosition: activeSlide.desktopObjectPosition }}
            loading={activeIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
            decoding="async"
            sizes="100vw"
            onError={() =>
              setSlideFallbacks((prev) => ({
                ...prev,
                [activeSlide.slug]: true,
              }))
            }
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/58 to-black/18 md:from-black/82 md:via-black/44 md:to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/76 via-black/18 to-black/35 md:from-black/70 md:to-black/20" />
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.18]" />

      <div className="absolute right-[8%] top-[18%] z-20 hidden h-52 w-52 rounded-full bg-amber-300/15 blur-[110px] md:block" />
      <div className="absolute left-[20%] top-[22%] z-20 hidden h-44 w-44 rounded-full bg-sky-200/10 blur-[120px] md:block" />

      <main className="relative z-30 mx-auto flex min-h-[92svh] w-full max-w-[1760px] flex-col justify-between px-6 pb-10 pt-28 md:min-h-screen md:px-16 md:pb-14 md:pt-36 lg:px-24">
        <div className="max-w-[720px]">
          <p className={cn(eyebrowLabel, 'mb-5 inline-flex items-center gap-3 tracking-[0.46em] text-brand-gold md:mb-7')}>
            <span>{activeSlide.eyebrow}</span>
            <span
              className={`h-px w-10 bg-gradient-to-r ${activeSlide.accentClassName} md:w-14`}
              aria-hidden="true"
            />
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeSlide.slug}-copy`}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, ease: easing.standard }}
            >
              <h1 className={headingXl}>
                <span className="block">{activeSlide.headlineLine1}</span>
                <span className="block text-white/80">{activeSlide.headlineLine2}</span>
              </h1>

              <p className="mt-7 max-w-xl text-[13px] leading-7 text-white/82 md:mt-8 md:text-[15px] md:leading-8">
                {activeSlide.description}
              </p>

              <div className="mt-6 inline-flex flex-wrap items-center gap-3 border border-white/15 bg-black/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.34em] text-brand-gold/85">Mood</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/90">{activeSlide.mood}</p>
                <span className="hidden text-white/45 md:inline">•</span>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">{activeSlide.notes}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex flex-col gap-6 md:mt-0">
          <div className="flex flex-wrap gap-3">
            <LinkButton
              to={activeSlide.primaryCtaRoute}
              variant="secondary"
              className="font-semibold md:text-[11px]"
            >
              {activeSlide.primaryCtaLabel}
            </LinkButton>
            <LinkButton
              to={activeSlide.secondaryCtaRoute}
              className="border border-white/25 bg-black/25 px-6 py-3 font-semibold text-white hover:border-white/60 hover:bg-white/12 hover:text-white md:px-8 md:py-4 md:text-[11px]"
            >
              {activeSlide.secondaryCtaLabel}
            </LinkButton>
          </div>

          <p className="max-w-[640px] text-[11px] uppercase tracking-[0.2em] text-white/68">
            Manual payment review, order confirmation, and delivery coordination with WhatsApp or
            email support.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-5 md:mt-6 md:flex-row md:items-end md:justify-between">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Choose featured fragrance slide"
          >
            {HERO_SLIDES.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <Button
                  key={slide.slug}
                  variant="ghost"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`hero-slide-${slide.slug}`}
                  aria-label={`Show ${slide.name} hero`}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'shrink-0 border px-3 py-2 font-normal normal-case tracking-[0.22em] text-[10px] transition md:px-4 md:text-[11px]',
                    isActive
                      ? 'border-brand-gold bg-brand-gold/20 text-white hover:text-white'
                      : 'border-white/20 bg-black/25 text-white/72 hover:border-white/45 hover:text-white',
                  )}
                >
                  {slide.name}
                </Button>
              );
            })}
          </div>

          <div className="hidden items-center gap-3 self-start md:flex md:self-auto">
            <Button
              variant="ghost"
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
              }
              className="h-10 w-10 border border-white/22 bg-black/22 p-0 normal-case tracking-normal text-white/85 hover:border-white/55 hover:text-white"
              aria-label="Show previous fragrance slide"
            >
              ‹
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="h-10 w-10 border border-white/22 bg-black/22 p-0 normal-case tracking-normal text-white/85 hover:border-white/55 hover:text-white"
              aria-label="Show next fragrance slide"
            >
              ›
            </Button>
          </div>
        </div>

        <div className="mt-4 h-[2px] w-full max-w-[560px] overflow-hidden bg-white/20">
          <motion.div
            key={`progress-${activeIndex}`}
            className={`h-full bg-gradient-to-r ${activeSlide.accentClassName}`}
            initial={{ width: 0 }}
            animate={{ width: slideProgressWidth }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.5, ease: easing.standard }}
          />
        </div>
      </main>

      <p className="sr-only" aria-live="polite" id={`hero-slide-${activeSlide.slug}`}>
        Slide {activeIndex + 1} of {HERO_SLIDES.length}. {activeSlide.name}.
      </p>
    </section>
  );
};

export default Hero;
