import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { AssetImage } from './AssetImage';
import { getCartAvailabilityIssues, getCartAvailabilityMessage } from '../lib/validation';
import { useProductCatalogStore } from '../store/useProductCatalogStore';

export const CartDrawer = () => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isOpen, items, closeCart, updateQuantity, removeItem, total } = useCartStore();
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const allowOutOfStockCheckout = useProductCatalogStore(
    (state) => state.settings.allowOutOfStockCheckout,
  );
  const productById = useMemo(
    () => new Map(allProducts.map((product) => [product.id, product])),
    [allProducts],
  );
  const availabilityIssues = useMemo(
    () => getCartAvailabilityIssues(items, allProducts),
    [allProducts, items],
  );
  const availabilityIssueByItem = useMemo(
    () => new Map(availabilityIssues.map((issue) => [issue.itemId, issue])),
    [availabilityIssues],
  );
  const hasUnavailableItems = availabilityIssues.length > 0;
  const shouldBlockCheckout = hasUnavailableItems && !allowOutOfStockCheckout;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCart();
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeCart, isOpen]);

  const goToCheckout = () => {
    if (shouldBlockCheckout) {
      return;
    }
    closeCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            aria-hidden="true"
          />

          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white text-neutral-900 z-[110] shadow-2xl flex flex-col"
          >
            <div className="px-5 py-5 md:px-8 md:py-6 border-b border-neutral-200/80 flex items-center justify-between">
              <h2 className="font-serif text-2xl tracking-tight text-neutral-900">
                Your Selection
              </h2>
              <button
                type="button"
                onClick={closeCart}
                className="p-2 hover:bg-neutral-50 rounded-full transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                aria-label="Close cart"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <ShoppingBag size={48} strokeWidth={1} className="text-neutral-200 mb-6" />
                  <p className="text-neutral-500 text-sm uppercase tracking-[0.2em]">
                    Your cart is empty - explore the collection.
                  </p>
                  <p className="mt-3 max-w-[240px] text-xs leading-6 text-neutral-500">
                    Choose a fragrance and it will appear here before checkout.
                  </p>
                  <Link
                    to="/collection"
                    onClick={closeCart}
                    className="mt-8 text-xs font-bold uppercase tracking-widest border-b border-black/20 pb-1 hover:border-black transition-all"
                  >
                    Explore Collection
                  </Link>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {hasUnavailableItems ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">
                      {getCartAvailabilityMessage(availabilityIssues)}
                      <div className="mt-1">
                        Some items are no longer available. Please update your cart before checkout.
                      </div>
                    </div>
                  ) : null}
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-2xl border border-neutral-200/80 bg-white px-3 py-3 md:gap-6 md:px-4 md:py-4">
                      <div className="h-24 w-20 bg-neutral-50 flex-shrink-0 flex items-center justify-center p-3 md:w-24 md:h-32 md:p-4">
                        <AssetImage
                          src={item.images.front}
                          alt={item.name}
                          wrapperClassName="h-full w-full bg-transparent"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                          <div className="mb-2 flex justify-between items-start gap-3">
                            <Link
                              to={`/product/${item.slug}`}
                              onClick={closeCart}
                              className="font-serif text-base leading-tight text-neutral-900 transition-colors hover:text-brand-gold md:text-lg"
                            >
                              {item.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="shrink-0 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-red-600 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                          </div>
                          <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-neutral-500 md:mb-4">
                            {item.category} / {item.sku}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-neutral-300 bg-neutral-50/90">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="flex h-10 w-10 items-center justify-center text-neutral-700 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent"
                              aria-label={`Decrease ${item.name} quantity`}
                            >
                              <Minus size={12} strokeWidth={1.5} />
                            </button>
                            <span className="w-9 text-center text-sm font-semibold text-neutral-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={
                                item.quantity >= (productById.get(item.id)?.stock ?? item.stock ?? 0)
                              }
                              className="flex h-10 w-10 items-center justify-center text-neutral-700 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent"
                              aria-label={`Increase ${item.name} quantity`}
                            >
                              <Plus size={12} strokeWidth={1.5} />
                            </button>
                          </div>
                          <span className="font-serif text-base font-semibold text-neutral-900 md:text-lg">
                            ${item.price * item.quantity}.00
                          </span>
                        </div>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                          {availabilityIssueByItem.has(item.id)
                            ? 'Currently unavailable'
                            : item.quantity >= (productById.get(item.id)?.stock ?? item.stock ?? 0)
                              ? 'Maximum stock selected'
                              : `${Math.max(
                                  0,
                                  (productById.get(item.id)?.stock ?? item.stock ?? 0) - item.quantity,
                                )} remaining`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 border-t border-neutral-200/80 bg-white">
                <div className="mb-5 flex justify-between items-end md:mb-8">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    Subtotal
                  </span>
                  <span className="text-2xl font-serif tracking-tight text-neutral-900">${total()}.00</span>
                </div>

                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={shouldBlockCheckout}
                  className="w-full bg-brand-black text-white py-4 min-h-11 text-[11px] uppercase tracking-[0.34em] font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:hover:bg-neutral-300"
                >
                  Checkout
                </button>
                <p className="mt-4 text-[10px] text-center text-neutral-600 uppercase tracking-[0.18em] md:mt-6">
                  You'll review details before placing the order.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
