import { useCallback, useMemo } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  createCartAvailabilitySelector,
  selectCartItemIds,
  selectCartTotal,
  useCartStore,
} from '../store/useCartStore';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import { formatCurrency } from '../lib/order';
import { Modal } from './ui/primitives/Modal';
import { Button } from './ui/primitives/Button';
import { EmptyState } from './ui/feedback/EmptyState';
import { CartLineItem } from './cart/CartLineItem';
import { cn } from '../lib/utils';
import { tracking } from '../styles/tokens/typography';
import { focusRing, touchTarget } from '../styles/tokens/interactive';

const closeCart = () => useCartStore.getState().closeCart();

export const CartDrawer = () => {
  const navigate = useNavigate();
  const isOpen = useCartStore((s) => s.isOpen);
  const itemIds = useCartStore(useShallow(selectCartItemIds));
  const total = useCartStore(selectCartTotal);
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const allowOutOfStockCheckout = useProductCatalogStore(
    (state) => state.settings.allowOutOfStockCheckout,
  );
  const availabilitySelector = useMemo(
    () => createCartAvailabilitySelector(allProducts, allowOutOfStockCheckout),
    [allProducts, allowOutOfStockCheckout],
  );
  const {
    productById,
    availabilityIssueByItem,
    hasUnavailableItems,
    shouldBlockCheckout,
    availabilityMessage,
  } = useCartStore(availabilitySelector);

  const goToCheckout = useCallback(() => {
    if (shouldBlockCheckout) {
      return;
    }
    closeCart();
    navigate('/checkout');
  }, [navigate, shouldBlockCheckout]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeCart}
      ariaLabel="Shopping cart"
      overlayClassName="bg-black/60 z-100"
      dialogClassName="h-full w-full max-w-md bg-brand-white text-neutral-900 z-110 shadow-lg flex flex-col"
    >
      <div className="px-4 py-4 md:px-8 md:py-6 border-b border-neutral-muted flex items-center justify-between">
        <h2 className="font-serif text-2xl tracking-tight text-neutral-900">Your Selection</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeCart}
          className={cn(
            'normal-case tracking-normal text-neutral-900 hover:bg-neutral-50 hover:text-neutral-900',
            touchTarget,
          )}
          aria-label="Close cart"
        >
          <X size={20} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
        {itemIds.length === 0 ? (
          <EmptyState
            bordered={false}
            className="h-full py-0"
            icon={<ShoppingBag size={48} strokeWidth={1} className="text-neutral-200 mb-6" />}
            title="Your cart is empty - explore the collection."
            titleClassName={cn('text-neutral-500 text-body normal-case', tracking.normal)}
            description="Choose a fragrance and it will appear here before checkout."
            descriptionClassName="max-w-60 text-neutral-500"
            action={
              <Link
                to="/collection"
                onClick={closeCart}
                className={cn(
                  'mt-8 text-label font-bold uppercase tracking-widest border-b border-on-light-muted pb-1 hover:border-brand-black transition-colors',
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
              <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-body leading-6 text-neutral-800">
                {availabilityMessage}
                <p className="mt-1 text-neutral-600">
                  Some items are no longer available. Please update your cart before checkout.
                </p>
              </div>
            ) : null}
            {itemIds.map((itemId) => (
              <CartLineItem
                key={itemId}
                itemId={itemId}
                variant="drawer"
                stock={productById.get(itemId)?.stock}
                isUnavailable={availabilityIssueByItem.has(itemId)}
                onNameClick={closeCart}
              />
            ))}
          </div>
        )}
      </div>

      {itemIds.length > 0 && (
        <div className="safe-bottom-cart border-t border-neutral-muted bg-brand-white px-4 py-4 md:px-8 md:py-8">
          <div className="mb-4 flex justify-between items-end md:mb-8">
            <span className={cn('text-caption uppercase text-neutral-500', tracking.wide)}>
              Subtotal
            </span>
            <span className="text-2xl font-serif tracking-tight text-neutral-900">
              {formatCurrency(total)}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={goToCheckout}
            disabled={shouldBlockCheckout}
            className="w-full min-h-11 py-4 text-small tracking-wider"
          >
            Checkout
          </Button>
          <p className="mt-4 text-caption text-center text-neutral-600 uppercase tracking-normal md:mt-6">
            {shouldBlockCheckout && hasUnavailableItems
              ? 'Resolve the unavailable items above to continue.'
              : "You'll review details before placing the order."}
          </p>
        </div>
      )}
    </Modal>
  );
};
