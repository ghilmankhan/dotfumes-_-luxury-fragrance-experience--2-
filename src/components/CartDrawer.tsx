import { useCallback, useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, selectCartTotal } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { useCartAvailability } from '../hooks/useCartAvailability';
import { Modal } from './ui/primitives/Modal';
import { Button } from './ui/primitives/Button';
import { EmptyState } from './ui/feedback/EmptyState';
import { CartLineItem } from './cart/CartLineItem';
import { cn } from '../lib/utils';
import { tracking } from '../styles/tokens/typography';
import { focusRing, touchTarget } from '../styles/tokens/interactive';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const isOpen = useCartStore((s) => s.isOpen);
  const items = useCartStore((s) => s.items);
  const closeCart = useCartStore((s) => s.closeCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const decrementOrRemove = useCartStore((s) => s.decrementOrRemove);
  const total = useCartStore(selectCartTotal);
  const pushToast = useToastStore((s) => s.pushToast);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const {
    productById,
    availabilityIssueByItem,
    hasUnavailableItems,
    shouldBlockCheckout,
    availabilityMessage,
  } = useCartAvailability();

  const handleRequestRemove = useCallback((id: string) => setPendingRemoveId(id), []);
  const handleCancelRemove = useCallback(() => setPendingRemoveId(null), []);
  const handleConfirmRemove = useCallback(
    (id: string) => {
      const item = items.find((cartItem) => cartItem.id === id);
      updateQuantity(id, 0);
      setPendingRemoveId(null);
      if (item) {
        pushToast(`${item.name} removed from cart.`, 'neutral');
      }
    },
    [items, updateQuantity, pushToast],
  );
  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => updateQuantity(id, quantity),
    [updateQuantity],
  );
  const handleDecrement = useCallback(
    (id: string) => decrementOrRemove(id),
    [decrementOrRemove],
  );

  const goToCheckout = () => {
    if (shouldBlockCheckout) {
      return;
    }
    closeCart();
    navigate('/checkout');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeCart}
      ariaLabel="Shopping cart"
      overlayClassName="bg-black/40 z-[100]"
      dialogClassName="h-full w-full max-w-md bg-white text-neutral-900 z-[110] shadow-lg flex flex-col"
    >
      <div className="px-5 py-5 md:px-8 md:py-6 border-b border-neutral-200/80 flex items-center justify-between">
              <h2 className="font-serif text-2xl tracking-tight text-neutral-900">
                Your Selection
              </h2>
              <Button
                variant="ghost"
                onClick={closeCart}
                className={cn(
                  'p-2 normal-case tracking-normal text-neutral-900 hover:bg-neutral-50 hover:text-neutral-900 rounded-full',
                  touchTarget,
                )}
                aria-label="Close cart"
              >
                <X size={20} strokeWidth={1.5} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
              {items.length === 0 ? (
                <EmptyState
                  bordered={false}
                  className="h-full py-0"
                  icon={<ShoppingBag size={48} strokeWidth={1} className="text-neutral-200 mb-6" />}
                  title="Your cart is empty - explore the collection."
                  titleClassName={cn('text-neutral-500 text-sm normal-case', tracking.normal)}
                  description="Choose a fragrance and it will appear here before checkout."
                  descriptionClassName="max-w-[240px] text-neutral-500"
                  action={
                    <Link
                      to="/collection"
                      onClick={closeCart}
                      className={cn(
                        'mt-8 text-xs font-bold uppercase tracking-widest border-b border-black/20 pb-1 hover:border-black transition-all',
                        focusRing,
                      )}
                    >
                      Explore Collection
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {hasUnavailableItems ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">
                      {availabilityMessage}
                      <div className="mt-1">
                        Some items are no longer available. Please update your cart before checkout.
                      </div>
                    </div>
                  ) : null}
                  {items.map((item) => (
                    <CartLineItem
                      key={item.id}
                      item={item}
                      variant="drawer"
                      stock={productById.get(item.id)?.stock ?? item.stock ?? 0}
                      isUnavailable={availabilityIssueByItem.has(item.id)}
                      isPendingRemove={pendingRemoveId === item.id}
                      onRequestRemove={handleRequestRemove}
                      onConfirmRemove={handleConfirmRemove}
                      onCancelRemove={handleCancelRemove}
                      onUpdateQuantity={handleUpdateQuantity}
                      onDecrement={handleDecrement}
                      onNameClick={closeCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 border-t border-neutral-200/80 bg-white">
                <div className="mb-5 flex justify-between items-end md:mb-8">
                  <span className={cn('text-[10px] uppercase text-neutral-500', tracking.wide)}>
                    Subtotal
                  </span>
                  <span className="text-2xl font-serif tracking-tight text-neutral-900">${total}.00</span>
                </div>

                <Button
                  variant="primary"
                  onClick={goToCheckout}
                  disabled={shouldBlockCheckout}
                  className="w-full min-h-11 py-4 text-[11px] tracking-[0.34em]"
                >
                  Checkout
                </Button>
                <p className="mt-4 text-[10px] text-center text-neutral-600 uppercase tracking-[0.18em] md:mt-6">
                  You'll review details before placing the order.
                </p>
              </div>
            )}
    </Modal>
  );
};
