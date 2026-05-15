import { Link } from 'react-router-dom';
import { AssetImage } from '../components/AssetImage';
import { COLLECTION_IMAGES } from '../constants/images';
import { usePageMeta } from '../hooks/usePageMeta';

export const AboutPage = () => {
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
          <Link
            to="/collection"
            className="mt-12 inline-flex w-fit border border-brand-gold/35 px-9 py-5 text-[10px] uppercase tracking-[0.38em] text-white transition-colors hover:bg-brand-gold hover:text-black"
          >
            Explore Collection
          </Link>
        </div>

        <div className="relative min-h-[70vh] overflow-hidden">
          <AssetImage
            src={COLLECTION_IMAGES.familyMood}
            alt="Dotfumes campaign atmosphere"
            wrapperClassName="absolute inset-0 h-full w-full bg-neutral-950"
            className="h-full w-full object-cover opacity-70"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-transparent to-black/20" />
        </div>
      </div>

      <div id="ethics" className="border-t border-white/10 px-6 py-24 md:px-16 lg:px-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-3">
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
        </div>
      </div>
    </section>
  );
};
