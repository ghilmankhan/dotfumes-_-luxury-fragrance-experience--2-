import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem } from '../../models/types';
import { AssetImage } from '../AssetImage';
import { Button } from '../ui/primitives/Button';
import { Card } from '../ui/primitives/Card';
import { cn } from '../../lib/utils';
import { tracking } from '../../styles/tokens/typography';
import { focusRing, touchTarget } from '../../styles/tokens/interactive';

type CartLineItemProps = {
  item: CartItem;
  variant: 'drawer' | 'checkout';
  stock: number;
  isUnavailable: boolean;
  isPendingRemove: boolean;
  onRequestRemove: (id: string) => void;
  onConfirmRemove: (id: string) => void;
  onCancelRemove: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onDecrement: (id: string) => void;
  onNameClick?: () => void;
  priceLabel?: string;
};

export const CartLineItem = memo(function CartLineItem({
  item,
  variant,
  stock,
  isUnavailable,
  isPendingRemove,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
  onUpdateQuantity,
  onDecrement,
  onNameClick,
  priceLabel,
}: CartLineItemProps) {
  const atMaxStock = item.quantity >= stock;

  const handleDecrement = () => {
    if (item.quantity <= 1) {
      onRequestRemove(item.id);
      return;
    }
    onDecrement(item.id);
  };

  const handleIncrement = () => onUpdateQuantity(item.id, item.quantity + 1);
  const handleRequestRemove = () => onRequestRemove(item.id);
  const handleConfirmRemove = () => onConfirmRemove(item.id);

  const removeConfirm = (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border border-red-200 bg-red-50 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-red-700',
        variant === 'drawer' ? 'mt-2' : 'mt-3',
      )}
    >
      <span>Remove this item?</span>
      <div className="flex items-center gap-2">
        <Button
          variant="danger"
          className="px-3 py-1.5 text-[9px] tracking-[0.16em]"
          onClick={handleConfirmRemove}
        >
          Remove
        </Button>
        <Button
          variant="ghost"
          onClick={onCancelRemove}
          className={cn(
            'px-3 py-1.5 normal-case tracking-[0.16em] text-[9px] underline underline-offset-2',
            variant === 'drawer'
              ? 'text-neutral-600 hover:text-neutral-900'
              : 'text-black/60 hover:text-black',
          )}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  if (variant === 'drawer') {
    return (
      <Card
        variant="inset"
        className="flex gap-4 rounded-2xl px-3 py-3 md:gap-6 md:px-4 md:py-4"
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
                  'font-serif text-base leading-tight text-neutral-900 transition-colors hover:text-brand-gold md:text-lg',
                  focusRing,
                )}
              >
                {item.name}
              </Link>
              <Button
                variant="ghost"
                onClick={handleRequestRemove}
                className={cn(
                  'shrink-0 rounded-full p-2 normal-case tracking-normal text-neutral-500 hover:bg-neutral-100 hover:text-red-600',
                  touchTarget,
                )}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </Button>
            </div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-neutral-500 md:mb-4">
              {item.category} / {item.sku}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center rounded-lg border border-neutral-300 bg-neutral-50/90">
              <Button
                variant="ghost"
                onClick={handleDecrement}
                className="flex h-11 w-11 items-center justify-center p-0 normal-case tracking-normal text-neutral-700 hover:bg-neutral-100 hover:text-neutral-700 disabled:text-neutral-300 disabled:hover:bg-transparent md:h-10 md:w-10"
                aria-label={`Decrease ${item.name} quantity`}
              >
                <Minus size={12} strokeWidth={1.5} />
              </Button>
              <span className="w-9 text-center text-sm font-semibold text-neutral-900">
                {item.quantity}
              </span>
              <Button
                variant="ghost"
                onClick={handleIncrement}
                disabled={atMaxStock}
                className="flex h-11 w-11 items-center justify-center p-0 normal-case tracking-normal text-neutral-700 hover:bg-neutral-100 hover:text-neutral-700 disabled:text-neutral-300 disabled:hover:bg-transparent md:h-10 md:w-10"
                aria-label={`Increase ${item.name} quantity`}
              >
                <Plus size={12} strokeWidth={1.5} />
              </Button>
            </div>
            <span className="font-serif text-base font-semibold text-neutral-900 md:text-lg">
              ${item.price * item.quantity}.00
            </span>
          </div>
          {isPendingRemove ? (
            removeConfirm
          ) : (
            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-600">
              {isUnavailable
                ? 'Currently unavailable'
                : atMaxStock
                  ? 'Maximum stock selected'
                  : `${Math.max(0, stock - item.quantity)} remaining`}
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex gap-5 border-b border-black/5 pb-6">
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
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-black/55">
              {priceLabel} / {item.sku}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={handleRequestRemove}
            className={cn(
              'p-1 normal-case tracking-normal text-black/50 hover:text-red-500',
              touchTarget,
            )}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={15} strokeWidth={1.4} />
          </Button>
        </div>

        <div className="mt-5 flex w-fit items-center border border-black/10">
          <Button
            variant="ghost"
            onClick={handleDecrement}
            className={cn(
              'p-2 normal-case tracking-normal text-black hover:text-black',
              touchTarget,
            )}
            aria-label={`Decrease ${item.name}`}
          >
            <Minus size={12} strokeWidth={1.4} />
          </Button>
          <span className="w-8 text-center text-xs">{item.quantity}</span>
          <Button
            variant="ghost"
            onClick={handleIncrement}
            disabled={atMaxStock}
            className={cn(
              'p-2 normal-case tracking-normal text-black hover:text-black',
              touchTarget,
            )}
            aria-label={`Increase ${item.name}`}
          >
            <Plus size={12} strokeWidth={1.4} />
          </Button>
        </div>
        {isPendingRemove ? (
          removeConfirm
        ) : (
          <p className={cn('mt-3 text-[10px] uppercase text-black/55', tracking.normal)}>
            {isUnavailable ? 'Currently unavailable' : `Stock: ${stock}`}
          </p>
        )}
      </div>
    </div>
  );
});
