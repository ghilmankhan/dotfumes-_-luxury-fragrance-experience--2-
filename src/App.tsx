/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SmoothScroll } from './components/SmoothScroll';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { ToastViewport } from './components/ToastViewport';
import { ScrollToTop } from './components/ScrollToTop';
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { ProductPage } from './pages/ProductPage';
import { AboutPage } from './pages/AboutPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { AdminPage } from './pages/AdminPage';
import { ShippingPage } from './pages/ShippingPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ContactPage } from './pages/ContactPage';
import { FaqPage } from './pages/FaqPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { JournalPage } from './pages/JournalPage';
import { SustainabilityPage } from './pages/SustainabilityPage';
import { CareersPage } from './pages/CareersPage';
import { useProductCatalogStore } from './store/useProductCatalogStore';

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const initCatalog = useProductCatalogStore((state) => state.init);

  useEffect(() => {
    if (import.meta.env.DEV && isAdminRoute) {
      console.log('[Router] /admin route matched:', location.pathname);
    }
  }, [isAdminRoute, location.pathname]);

  useEffect(() => {
    void initCatalog();
  }, [initCatalog]);

  return (
    <SmoothScroll>
      <ScrollToTop />
      <main className="relative min-h-screen bg-brand-black selection:bg-brand-gold selection:text-black">
        <div className="noise-overlay fixed inset-0 z-[100] opacity-[0.03] pointer-events-none" />

        {!isAdminRoute ? <Navbar /> : null}
        {!isAdminRoute ? <CartDrawer /> : null}
        <ToastViewport />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/sustainability" element={<SustainabilityPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {!isAdminRoute ? <Footer /> : null}
      </main>
    </SmoothScroll>
  );
}
