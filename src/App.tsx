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

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  useEffect(() => {
    if (import.meta.env.DEV && isAdminRoute) {
      console.log('[Router] /admin route matched:', location.pathname);
    }
  }, [isAdminRoute, location.pathname]);

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
        </Routes>

        {!isAdminRoute ? <Footer /> : null}
      </main>
    </SmoothScroll>
  );
}
