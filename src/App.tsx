/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SmoothScroll } from './components/SmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/home/Hero';
import { FeaturedProducts } from './components/home/FeaturedProducts';
import { CategorySplit } from './components/home/CategorySplit';
import { BrandStory } from './components/home/BrandStory';
import { SignatureExperience } from './components/home/SignatureExperience';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="relative overflow-x-hidden">
      <main className="relative min-h-screen bg-brand-black selection:bg-brand-gold selection:text-black">
        {/* Grain Texture Overlay */}
        <div className="noise-overlay fixed inset-0 z-[100] opacity-[0.03] pointer-events-none" />
        
        <Navbar />
        <CartDrawer />
        
        {/* Cinematic Entrance */}
        <Hero />
        
        {/* Curated Grid - Dark to Light transition happens inside the component */}
        <FeaturedProducts />

        {/* Editorial Split */}
        <CategorySplit />

        {/* Narrative Section */}
        <BrandStory />

        {/* Ingredient Storytelling */}
        <SignatureExperience />
        
        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}




