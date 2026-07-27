import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { FEATURED_PRODUCTS } from '../../constants/products';
import { Button, LinkButton } from '../ui/primitives/Button';
import { cn } from '../../lib/utils';
import { eyebrowLabel, headingXl } from '../../styles/tokens/typography';
import { duration, easing } from '../../styles/tokens/motion';
import type { ImageFocalPoint } from '../../styles/tokens/imageTokens';
import { AssetImage } from '../AssetImage';
import { touchTarget } from '../../styles/tokens/interactive';

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
  focal: ImageFocalPoint;
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
    accentClassName: 'from-hero-accent-warm-start to-hero-accent-warm-end',
    alt: 'Bold Decision cinematic perfume hero in obsidian lighting',
    focal: 'right',
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
    accentClassName: 'from-hero-accent-rose-start to-hero-accent-rose-end',
    alt: 'Soft Promise perfume hero image with warm editorial lighting',
    focal: 'right',
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
    accentClassName: 'from-hero-accent-cool-start to-hero-accent-cool-end',
    alt: 'Wild Silence perfume hero in dark stone-inspired cinematic mood',
    focal: 'right',
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
    accentClassName: 'from-hero-accent-sky-start to-hero-accent-sky-end',
    alt: 'Bleu Heat perfume hero with cool blue and amber highlights',
    focal: 'right',
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
    accentClassName: 'from-hero-accent-gold-start to-hero-accent-gold-end',
    alt: 'First Meet perfume hero with golden-hour cinematic reflections',
    focal: 'right',
  },
];

const TOUCH_RESUME_AFTER_MS = 10000;

// Cadence for the hero's single rehearsed entrance (eyebrow → headline →
// description/mood → CTA), layered on top of each block's existing
// AnimatePresence key/exit below — see copyContainerVariants/ctaContainerVariants.
const FOCAL_STAGGER_STEP = 0.09;

export const Hero = () => {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [slideFallbacks, setSlideFallbacks] = useState<Record<string, boolean>>({});
  const touchResumeTimeoutRef = useRef<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeSlide = HERO_SLIDES[activeIndex];
  const autoRotateMs = 7000;
  const autoplayEnabled = !prefersReducedMotion && !isInteractionPaused && !isAutoplayPaused;

  // Mobile has no hover/blur to resume on, so touching the slide pauses it and
  // a fresh inactivity timer (reset on every touch) resumes it instead.
  const handleTouchStart = () => {
    setIsInteractionPaused(true);
    if (touchResumeTimeoutRef.current) {
      window.clearTimeout(touchResumeTimeoutRef.current);
    }
    touchResumeTimeoutRef.current = window.setTimeout(() => {
      setIsInteractionPaused(false);
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
    if (!autoplayEnabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, autoRotateMs);

    return () => window.clearInterval(interval);
  }, [autoplayEnabled]);

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
    setIsInteractionPaused(false);
  };

  const selectSlide = (index: number, moveFocus = false) => {
    const nextIndex = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    setActiveIndex(nextIndex);
    if (moveFocus) {
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = index + 1;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = index - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = HERO_SLIDES.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectSlide(nextIndex, true);
    }
  };

  const slideProgressWidth = `${((activeIndex + 1) / HERO_SLIDES.length) * 100}%`;

  // Headline → description → mood pill cascade (beat 2 of the entrance).
  const copyContainerVariants = {
    hidden: {},
    show: {
      transition: prefersReducedMotion
        ? {}
        : { staggerChildren: FOCAL_STAGGER_STEP, delayChildren: FOCAL_STAGGER_STEP },
    },
    exit: {
      transition: prefersReducedMotion
        ? {}
        : { staggerChildren: FOCAL_STAGGER_STEP, staggerDirection: -1 },
    },
  };

  const copyItemVariants = {
    hidden: prefersReducedMotion ? {} : { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : duration.slow, ease: easing.standard },
    },
    exit: prefersReducedMotion
      ? {}
      : { opacity: 0, y: -10, transition: { duration: duration.fast, ease: easing.standard } },
  };

  // CTA row is the final beat, starting once the copy cascade above is underway.
  const ctaContainerVariants = {
    hidden: {},
    show: {
      transition: prefersReducedMotion
        ? {}
        : { staggerChildren: FOCAL_STAGGER_STEP, delayChildren: FOCAL_STAGGER_STEP * 3 },
    },
    exit: {
      transition: prefersReducedMotion
        ? {}
        : { staggerChildren: FOCAL_STAGGER_STEP, staggerDirection: -1 },
    },
  };

  return (
    <section
      className="relative min-h-svh w-full overflow-hidden bg-brand-black md:min-h-screen"
      aria-label="Featured fragrance hero carousel"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocusCapture={() => setIsInteractionPaused(true)}
      onBlurCapture={handleBlurCapture}
      onTouchStart={handleTouchStart}
    >
      {/* True crossfade: no `mode="wait"` so the outgoing and incoming slide
          overlap and cross-dissolve instead of fading to black between them. */}
      <AnimatePresence initial={!prefersReducedMotion}>
        <motion.div
          key={activeSlide.slug}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? {} : { opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : duration.cinematic,
            ease: easing.standard,
          }}
          className="absolute inset-0"
          aria-hidden="true"
        >
          {/* Slow continuous zoom for the slide's full dwell time — the one
              authored background moment; disabled outright under reduced motion. */}
          <motion.div
            className="h-full w-full"
            initial={prefersReducedMotion ? false : { scale: 1 }}
            animate={{ scale: prefersReducedMotion ? 1 : 1.06 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: autoRotateMs / 1000, ease: 'linear' }
            }
          >
            <AssetImage
              src={currentSlideImage}
              alt=""
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover motion-reduce:scale-100 motion-reduce:blur-none motion-reduce:transition-none"
              focal={activeSlide.focal}
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
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gradient-shadow-solid via-gradient-shadow-muted to-gradient-shadow-subtle md:from-gradient-shadow-deep md:via-gradient-shadow-soft md:to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gradient-shadow-strong via-gradient-shadow-faint to-gradient-shadow-soft md:from-gradient-shadow-strong md:to-gradient-shadow-subtle" />
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-20" />

      <div className="absolute right-16 top-24 z-20 hidden h-52 w-52 rounded-full bg-hero-glow-warm blur-3xl md:block" />
      <div className="absolute left-1/5 top-28 z-20 hidden h-44 w-44 rounded-full bg-hero-glow-cool blur-3xl md:block" />

      <div
        className="relative z-30 mx-auto flex min-h-svh w-full max-w-440 flex-col justify-between px-6 pb-10 pt-28 md:min-h-screen md:px-16 md:pb-14 md:pt-36 lg:px-24"
        id={`hero-panel-${activeSlide.slug}`}
        role="tabpanel"
        aria-labelledby={`hero-tab-${activeSlide.slug}`}
        tabIndex={0}
      >
        <div className="max-w-180">
          {/* Beat 1: eyebrow leads the cascade. */}
          <AnimatePresence mode="wait" initial={!prefersReducedMotion}>
            <motion.p
              key={`${activeSlide.slug}-eyebrow`}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, x: -8 }}
              transition={{
                duration: prefersReducedMotion ? 0 : duration.base,
                ease: easing.standard,
              }}
              className={cn(
                eyebrowLabel,
                'mb-4 inline-flex items-center gap-3 tracking-wider text-brand-gold md:mb-8',
              )}
            >
              <span>{activeSlide.eyebrow}</span>
              <span
                className={`h-px w-10 bg-gradient-to-r ${activeSlide.accentClassName} md:w-14`}
                aria-hidden="true"
              />
            </motion.p>
          </AnimatePresence>

          {/* Beat 2: headline → description → mood pill, staggered via copyContainerVariants. */}
          <AnimatePresence mode="wait" initial={!prefersReducedMotion}>
            <motion.div
              key={`${activeSlide.slug}-copy`}
              variants={copyContainerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.h1 variants={copyItemVariants} className={headingXl}>
                <span className="block">{activeSlide.headlineLine1}</span>
                <span className="block text-on-dark-secondary">{activeSlide.headlineLine2}</span>
              </motion.h1>

              <motion.p
                variants={copyItemVariants}
                className="mt-8 max-w-[52ch] text-[15px] leading-[1.7] text-on-dark-secondary/70"
              >
                {activeSlide.description}
              </motion.p>

              {/* Notes row: one line only. A short 32px hairline (not a
                  full-width rule) leads into it; the mood word is dropped
                  here since the eyebrow above already carries that role —
                  showing both was redundant and pushed this onto a 3rd,
                  single-word-orphaned line. text-balance keeps any wrap
                  (narrow viewports) landing as two even lines instead. */}
              <motion.div variants={copyItemVariants} className="mt-6 max-w-[38ch]">
                <span aria-hidden="true" className="mb-4 block h-px w-8 bg-brand-gold/40" />
                <p className="text-balance text-[11px] uppercase tracking-[0.12em] text-on-dark-muted">
                  {activeSlide.notes.replace(/\s*•\s*/g, ' · ')}
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex flex-col md:mt-0">
          {/* Beat 3: CTA row lands last, once the copy cascade is underway. */}
          <AnimatePresence mode="wait" initial={!prefersReducedMotion}>
            <motion.div
              key={`${activeSlide.slug}-cta`}
              variants={ctaContainerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex flex-wrap items-stretch gap-6"
            >
              {/* Both CTAs share one fixed geometry (52px tall, 40px horizontal
                  padding, 12px/0.15em-ish type) so the pair reads as one
                  matched system — only fill behavior (ivory sweep vs. no
                  fill) tells them apart. */}
              <motion.div variants={copyItemVariants}>
                <LinkButton
                  to={activeSlide.primaryCtaRoute}
                  variant="secondary"
                  className="h-[52px] px-10 py-0 text-label font-semibold tracking-normal md:h-[52px] md:px-10 md:py-0 md:text-label"
                >
                  {activeSlide.primaryCtaLabel}
                </LinkButton>
              </motion.div>
              <motion.div variants={copyItemVariants}>
                <LinkButton
                  to={activeSlide.secondaryCtaRoute}
                  variant="outlineDark"
                  className="h-[52px] px-10 py-0 text-label font-semibold tracking-normal md:h-[52px] md:px-10 md:py-0 md:text-label"
                >
                  {activeSlide.secondaryCtaLabel}
                </LinkButton>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Shortened out of the CTA visual path — the full manual-review/
              WhatsApp/email explanation already lives in the checkout flow
              itself (CheckoutPage), where it's actually actionable. */}
          <p className="mt-10 max-w-[44ch] text-[10px] leading-[1.6] text-brand-ivory/35">
            Concierge checkout · WhatsApp &amp; email support
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-6 md:mt-6 md:flex-row md:items-end md:justify-between">
          <div
            className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Choose featured fragrance slide"
          >
            {HERO_SLIDES.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <Button
                  key={slide.slug}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  variant="ghost"
                  id={`hero-tab-${slide.slug}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`hero-panel-${slide.slug}`}
                  aria-label={`Show ${slide.name} hero`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectSlide(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={cn(
                    'shrink-0 border-b-2 border-transparent px-1 py-2 font-normal normal-case tracking-wide transition md:px-2 md:text-small',
                    isActive && 'border-brand-gold text-brand-white hover:text-brand-white',
                  )}
                >
                  {slide.name}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAutoplayPaused((paused) => !paused)}
              className={cn('border-0 bg-transparent text-on-dark-subtle hover:text-on-dark-strong', touchTarget)}
              aria-pressed={isAutoplayPaused || Boolean(prefersReducedMotion)}
              aria-label={
                prefersReducedMotion
                  ? 'Autoplay disabled'
                  : isAutoplayPaused
                    ? 'Resume autoplay'
                    : 'Pause autoplay'
              }
              disabled={Boolean(prefersReducedMotion)}
            >
              {prefersReducedMotion || isAutoplayPaused ? (
                <Play size={14} strokeWidth={1.6} aria-hidden="true" />
              ) : (
                <Pause size={14} strokeWidth={1.6} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 h-0.5 w-full max-w-140 overflow-hidden bg-surface-glass-muted">
          <motion.div
            key={`progress-${activeIndex}`}
            className={`h-full bg-gradient-to-r motion-reduce:transition-none ${activeSlide.accentClassName}`}
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: slideProgressWidth }}
            transition={{
              duration: prefersReducedMotion ? 0 : duration.moderate,
              ease: easing.standard,
            }}
          />
        </div>
      </div>

      {HERO_SLIDES.map((slide, index) =>
        index === activeIndex ? null : (
          <div
            key={slide.slug}
            id={`hero-panel-${slide.slug}`}
            role="tabpanel"
            aria-labelledby={`hero-tab-${slide.slug}`}
            hidden
          />
        ),
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {activeIndex + 1} of {HERO_SLIDES.length}. {activeSlide.name}.
      </p>
    </section>
  );
};

export default Hero;
