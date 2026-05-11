import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { AssetImage } from './AssetImage';

export const CartDrawer = () => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isOpen, items, closeCart, updateQuantity, removeItem, total } = useCartStore();

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
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[110] shadow-2xl flex flex-col"
          >
            <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between">
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

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <ShoppingBag size={48} strokeWidth={1} className="text-neutral-200 mb-6" />
                  <p className="text-neutral-400 text-sm uppercase tracking-widest">
                    Your selection is empty
                  </p>
                  <Link
                    to="/collection"
                    onClick={closeCart}
                    className="mt-8 text-xs font-bold uppercase tracking-widest border-b border-black/20 pb-1 hover:border-black transition-all"
                  >
                    Start Exploring
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-6">
                      <div className="w-24 h-32 bg-neutral-50 flex-shrink-0 flex items-center justify-center p-4">
                        <AssetImage
                          src={item.images.front}
                          alt={item.name}
                          wrapperClassName="h-full w-full bg-transparent"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <Link
                              to={`/product/${item.slug}`}
                              onClick={closeCart}
                              className="font-serif text-lg leading-tight transition-colors hover:text-brand-gold"
                            >
                              {item.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-neutral-300 hover:text-red-500 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                          </div>
                          <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">
                            {item.category}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-neutral-100">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-neutral-50 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                              aria-label={`Decrease ${item.name} quantity`}
                            >
                              <Minus size={12} strokeWidth={1.5} />
                            </button>
                            <span className="w-8 text-center text-xs font-medium">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-neutral-50 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                              aria-label={`Increase ${item.name} quantity`}
                            >
                              <Plus size={12} strokeWidth={1.5} />
                            </button>
                          </div>
                          <span className="font-serif text-base font-medium">
                            ${item.price * item.quantity}.00
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-8 py-8 border-t border-neutral-100 bg-white">
                <div className="flex justify-between items-end mb-8">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
                    Subtotal
                  </span>
                  <span className="text-2xl font-serif tracking-tight">${total()}.00</span>
                </div>

                <button
                  type="button"
                  onClick={goToCheckout}
                  className="w-full bg-brand-black text-white py-5 text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                >
                  Proceed to Checkout
                </button>
                <p className="mt-6 text-[9px] text-center text-neutral-400 uppercase tracking-widest">
                  Shipping and taxes calculated at checkout
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
