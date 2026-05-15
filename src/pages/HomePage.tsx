import { Hero } from '../components/home/Hero';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { CategorySplit } from '../components/home/CategorySplit';
import { BrandStory } from '../components/home/BrandStory';
import { SignatureExperience } from '../components/home/SignatureExperience';
import { usePageMeta } from '../hooks/usePageMeta';

export const HomePage = () => {
  usePageMeta({
    title: 'DOTFUMES | Luxury Fragrance Experience',
    description:
      'Discover DOTFUMES extrait fragrances through a cinematic luxury ecommerce experience.',
    path: '/',
  });

  return (
    <>
      <Hero />
      <FeaturedProducts />
      <CategorySplit />
      <BrandStory />
      <SignatureExperience />
    </>
  );
};
