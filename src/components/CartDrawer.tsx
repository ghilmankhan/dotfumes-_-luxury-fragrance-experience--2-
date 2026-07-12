import { useMemo, useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { getCartAvailabilityIssues, getCartAvailabilityMessage } from '../lib/validation';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import { Modal } from './ui/primitives/Modal';
import { Button } from './ui/primitives/Button';
import { EmptyState } from './ui/feedback/EmptyState';
import { CartLineItem } from './cart/CartLineItem';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const { isOpen, items, closeCart, updateQuantity, total } = useCartStore();
  const { pushToast } = useToastStore();
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
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
                className="min-h-11 min-w-11 p-2 normal-case tracking-normal text-neutral-900 hover:bg-neutral-50 hover:text-neutral-900 rounded-full md:min-h-0 md:min-w-0"
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
                  titleClassName="text-neutral-500 text-sm normal-case tracking-[0.2em]"
                  description="Choose a fragrance and it will appear here before checkout."
                  descriptionClassName="max-w-[240px] text-neutral-500"
                  action={
                    <Link
                      to="/collection"
                      onClick={closeCart}
                      className="mt-8 text-xs font-bold uppercase tracking-widest border-b border-black/20 pb-1 hover:border-black transition-all focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                    >
                      Explore Collection
                    </Link>
                  }
                />
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
                    <CartLineItem
                      key={item.id}
                      item={item}
                      variant="drawer"
                      stock={productById.get(item.id)?.stock ?? item.stock ?? 0}
                      isUnavailable={availabilityIssueByItem.has(item.id)}
                      isPendingRemove={pendingRemoveId === item.id}
                      onRequestRemove={() => setPendingRemoveId(item.id)}
                      onConfirmRemove={() => {
                        updateQuantity(item.id, 0);
                        setPendingRemoveId(null);
                        pushToast(`${item.name} removed from cart.`, 'neutral');
                      }}
                      onCancelRemove={() => setPendingRemoveId(null)}
                      onUpdateQuantity={(quantity) => updateQuantity(item.id, quantity)}
                      onNameClick={closeCart}
                    />
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
