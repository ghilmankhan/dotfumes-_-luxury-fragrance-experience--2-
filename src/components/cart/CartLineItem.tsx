import { memo, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { AssetImage } from '../AssetImage';
import { Button } from '../ui/primitives/Button';
import { Card } from '../ui/primitives/Card';
import { cn } from '../../lib/utils';
import { tracking } from '../../styles/tokens/typography';
import { focusRing, touchTarget } from '../../styles/tokens/interactive';
import { formatCurrency } from '../../lib/order';
import { selectCartItemById, useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';
import { runCollapseSequence, runScalePulse } from '../../lib/luxuryMotion';

type CartLineItemProps = {
  itemId: string;
  variant: 'drawer' | 'checkout';
  stock: number | undefined;
  isUnavailable: boolean;
  onNameClick?: () => void;
};

export const CartLineItem = memo(function CartLineItem({
  itemId,
  variant,
  stock,
  isUnavailable,
  onNameClick,
}: CartLineItemProps) {
  const itemSelector = useMemo(() => selectCartItemById(itemId), [itemId]);
  const item = useCartStore(itemSelector);
  const reduceMotion = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const quantityRef = useRef<HTMLSpanElement>(null);

  // Trash click (or decrementing to zero) collapses the row in place via
  // Anime.js, then removes it from the store once it's visually gone and
  // offers a quiet "Undo" toast instead of an inline confirmation step.
  const performRemove = useCallback(() => {
    const finalize = () => {
      const removedItem = useCartStore.getState().removeItem(itemId);
      if (!removedItem) {
        return;
      }
      useToastStore
        .getState()
        .pushToast(
          `${removedItem.name} removed from ${variant === 'drawer' ? 'cart' : 'your selection'}.`,
          'neutral',
          {
            durationMs: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                useCartStore.getState().addItem(removedItem, removedItem.quantity);
              },
            },
          },
        );
    };

    const node = rootRef.current;
    if (!node) {
      finalize();
      return;
    }
    runCollapseSequence(node, reduceMotion, finalize);
  }, [itemId, variant, reduceMotion]);

  const handleDecrement = useCallback(() => {
    const currentItem = selectCartItemById(itemId)(useCartStore.getState());
    if (!currentItem) {
      return;
    }
    if (currentItem.quantity <= 1) {
      performRemove();
      return;
    }
    useCartStore.getState().decrementOrRemove(currentItem.id);
    runScalePulse(quantityRef.current, reduceMotion);
  }, [itemId, performRemove, reduceMotion]);

  const handleIncrement = useCallback(() => {
    const currentItem = selectCartItemById(itemId)(useCartStore.getState());
    if (currentItem) {
      useCartStore.getState().updateQuantity(currentItem.id, currentItem.quantity + 1);
      runScalePulse(quantityRef.current, reduceMotion);
    }
  }, [itemId, reduceMotion]);

  if (!item) {
    return null;
  }

  const availableStock = stock ?? item.stock ?? 0;
  const atMaxStock = item.quantity >= availableStock;

  if (variant === 'drawer') {
    return (
      <div ref={rootRef}>
        <Card
          variant="inset"
          padding="lineItem"
          className={cn('flex gap-4 md:gap-6', isUnavailable && 'opacity-50')}
        >
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
                  onClick={onNameClick}
                  className={cn(
                    'font-serif text-base leading-tight text-neutral-900 transition-colors hover:text-brand-gold md:text-heading',
                    focusRing,
                  )}
                >
                  {item.name}
                </Link>
                <Button
                  variant="ghost"
                  onClick={performRemove}
                  className={cn(
                    'shrink-0 p-2 normal-case tracking-normal text-neutral-500 hover:bg-neutral-100 hover:text-red-600',
                    touchTarget,
                  )}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </Button>
              </div>
              <p className="mb-3 text-caption uppercase tracking-normal text-neutral-500 md:mb-4">
                {item.category} / {item.sku}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  onClick={handleDecrement}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center p-0 normal-case tracking-normal text-neutral-700 hover:bg-neutral-100 hover:text-neutral-700 disabled:text-neutral-300 disabled:hover:bg-transparent',
                    touchTarget,
                  )}
                  aria-label={`Decrease ${item.name} quantity`}
                >
                  <Minus size={12} strokeWidth={1.5} />
                </Button>
                <span
                  ref={quantityRef}
                  className="inline-block w-9 text-center text-body font-semibold text-neutral-900"
                >
                  {item.quantity}
                </span>
                <Button
                  variant="ghost"
                  onClick={handleIncrement}
                  disabled={atMaxStock}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center p-0 normal-case tracking-normal text-neutral-700 hover:bg-neutral-100 hover:text-neutral-700 disabled:text-neutral-300 disabled:hover:bg-transparent',
                    touchTarget,
                  )}
                  aria-label={`Increase ${item.name} quantity`}
                >
                  <Plus size={12} strokeWidth={1.5} />
                </Button>
              </div>
              <span className="font-serif text-base font-semibold text-neutral-900 md:text-heading">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
            <p className="mt-2 text-caption uppercase tracking-normal text-neutral-600">
              {isUnavailable
                ? 'Out of stock — remove to continue'
                : atMaxStock
                  ? 'Maximum stock selected'
                  : `${Math.max(0, availableStock - item.quantity)} remaining`}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn('flex gap-6 border-b border-on-light-subtle pb-6', isUnavailable && 'opacity-50')}>
      <AssetImage
        src={item.images.front}
        alt={item.name}
        wrapperClassName="h-28 w-20 shrink-0 bg-neutral-50"
        className="h-full w-full object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-xl italic">{item.name}</p>
            <p className="mt-2 text-caption uppercase tracking-wide text-on-light-muted">
              {formatCurrency(item.price)} / {item.sku}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={performRemove}
            className={cn(
              'p-1 normal-case tracking-normal text-on-light-muted hover:text-red-500',
              touchTarget,
            )}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </Button>
        </div>

        <div className="mt-4 flex w-fit items-center border border-on-light-muted">
          <Button
            variant="ghost"
            onClick={handleDecrement}
            className={cn(
              'p-2 normal-case tracking-normal text-brand-black hover:text-brand-black',
              touchTarget,
            )}
            aria-label={`Decrease ${item.name}`}
          >
            <Minus size={12} strokeWidth={1.5} />
          </Button>
          <span ref={quantityRef} className="inline-block w-8 text-center text-label">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            onClick={handleIncrement}
            disabled={atMaxStock}
            className={cn(
              'p-2 normal-case tracking-normal text-brand-black hover:text-brand-black',
              touchTarget,
            )}
            aria-label={`Increase ${item.name}`}
          >
            <Plus size={12} strokeWidth={1.5} />
          </Button>
        </div>
        <p className={cn('mt-3 text-caption uppercase text-on-light-muted', tracking.normal)}>
          {isUnavailable ? 'Out of stock — remove to continue' : `Stock: ${availableStock}`}
        </p>
      </div>
    </div>
  );
});
