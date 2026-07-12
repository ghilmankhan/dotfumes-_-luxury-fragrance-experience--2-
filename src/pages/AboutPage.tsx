import { useState } from 'react';
import { AssetImage } from '../components/AssetImage';
import { LinkButton } from '../components/ui/primitives/Button';
import { Grid } from '../components/ui/layout/Grid';
import { COLLECTION_IMAGES } from '../constants/images';
import { usePageMeta } from '../hooks/usePageMeta';

export const AboutPage = () => {
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const aboutHeroImage = heroImageFailed
    ? COLLECTION_IMAGES.familyMood
    : '/images/hero/dotfumes-about-hero-maison-split-1800x2400.webp';

  usePageMeta({
    title: 'The House | DOTFUMES',
    description: 'Learn the DOTFUMES house philosophy, materials, and fragrance craftsmanship.',
    path: '/about',
  });

  return (
    <section className="bg-brand-black text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center px-6 pb-16 pt-36 md:px-16 lg:px-24">
          <span className="text-[10px] font-bold uppercase tracking-[0.55em] text-brand-gold">
            The House
          </span>
          <h1 className="mt-8 font-serif text-6xl italic leading-[0.88] tracking-tight md:text-8xl">
            Scent as <br />
            <span className="text-white/30">cinema.</span>
          </h1>
          <p className="mt-10 max-w-xl text-sm leading-8 text-white/55">
            Dotfumes composes fragrances as quiet scenes: mineral air, warm skin, polished woods,
            and the pause before a room remembers you.
          </p>
          <LinkButton
            to="/collection"
            variant="secondary"
            className="mt-12 w-fit px-9 py-5 tracking-[0.38em]"
          >
            Explore Collection
          </LinkButton>
        </div>

        <div className="relative min-h-[70vh] overflow-hidden">
          <AssetImage
            src={aboutHeroImage}
            alt="Dotfumes maison portrait hero with cinematic bottle arrangement"
            wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
            className="h-full w-full object-cover object-[58%_center] opacity-72 md:object-[64%_center]"
            fetchPriority="high"
            onError={() => setHeroImageFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/48 to-black/12" />
        </div>
      </div>

      <div id="ethics" className="border-t border-white/10 px-6 py-24 md:px-16 lg:px-24">
        <Grid cols={{ md: 3 }} gap={12} className="mx-auto max-w-6xl">
          {[
            [
              'Slow Extraction',
              'Measured batches protect character, texture, and material integrity.',
            ],
            [
              'Responsible Materials',
              'Our production roadmap favors traceable ingredients and refillable objects.',
            ],
            [
              'Private Luxury',
              'No noise, no crowd logic. Just emotionally precise fragrance architecture.',
            ],
          ].map(([title, copy]) => (
            <article key={title} className="border-t border-white/10 pt-8">
              <h2 className="font-serif text-3xl italic">{title}</h2>
              <p className="mt-5 text-sm leading-7 text-white/45">{copy}</p>
            </article>
          ))}
        </Grid>
      </div>
    </section>
  );
};
