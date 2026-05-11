import { Hero } from '../components/home/Hero';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { CategorySplit } from '../components/home/CategorySplit';
import { BrandStory } from '../components/home/BrandStory';
import { SignatureExperience } from '../components/home/SignatureExperience';

export const HomePage = () => {
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
