import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type FC, type MouseEvent } from 'react';
import type { Product } from '../../models/types';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';
import { AssetImage } from '../AssetImage';
import { isProductOutOfStock } from '../../lib/validation';
import { Button, LinkButton } from '../ui/primitives/Button';
import { eyebrowLabel, eyebrowLabelSm, headingLg } from '../../styles/tokens/typography';
import { cn } from '../../lib/utils';
import { easing, motionTiers } from '../../styles/tokens/motion';
import { focusRing, touchTarget } from '../../styles/tokens/interactive';
import { runRingPulse } from '../../lib/luxuryMotion';

interface ProductCardProps {
  product: Product;
  index: number;
}

const QUICK_ADD_CONFIRM_MS = 1200;

export const ProductCard: FC<ProductCardProps> = ({ product, index }) => {
  const reduceMotion = useReducedMotion();
  const isOutOfStock = isProductOutOfStock(product) || product.active === false;
  const [justAdded, setJustAdded] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        window.clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const quickAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isOutOfStock) {
      useToastStore.getState().pushToast(`${product.name} is currently out of stock.`, 'error');
      return;
    }

    const result = useCartStore.getState().addItem(product);
    useToastStore.getState().pushToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      runRingPulse(ringRef.current, Boolean(reduceMotion));
      useCartStore.getState().openCart();
      setJustAdded(true);
      if (confirmTimeoutRef.current) {
        window.clearTimeout(confirmTimeoutRef.current);
      }
      confirmTimeoutRef.current = window.setTimeout(() => {
        setJustAdded(false);
      }, QUICK_ADD_CONFIRM_MS);
    }
  };

  // Bag ↔ check morph confirming the add landed — shared by the desktop
  // hover overlay and mobile grid quick-add buttons below.
  const quickAddIcon = (
    <AnimatePresence mode="wait" initial={false}>
      {justAdded ? (
        <motion.span
          key="check"
          className="inline-flex"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? {} : { opacity: 0, scale: 0.6 }}
          transition={motionTiers.normal}
        >
          <Check aria-hidden="true" size={14} strokeWidth={2} />
        </motion.span>
      ) : (
        <motion.span
          key="bag"
          className="inline-flex"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? {} : { opacity: 0, scale: 0.6 }}
          transition={motionTiers.normal}
        >
          <ShoppingBag aria-hidden="true" size={14} strokeWidth={1} />
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      {...(reduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            transition: {
              duration: 1,
              delay: index * 0.06,
              ease: easing.cinematic,
            },
          })}
      viewport={{ once: true }}
      className="group relative flex flex-col bg-brand-white p-4 md:p-8"
    >
      <div className="relative mb-10 aspect-square w-full overflow-hidden bg-brand-white shadow-lg transition-shadow duration-500 ease-out group-hover:shadow-2xl motion-reduce:transition-none md:mb-12">
        <Link
          to={`/product/${product.slug}`}
          className={cn('flex h-full w-full cursor-pointer items-center justify-center', focusRing)}
          aria-label={`View ${product.name}`}
        >
          <motion.div
            {...(reduceMotion
              ? {}
              : {
                  whileHover: { scale: 1.04 },
                  transition: motionTiers.fast,
                })}
            className="relative flex h-full w-full items-center justify-center"
          >
            <AssetImage
              src={product.images.front}
              alt={`Front view of ${product.name} perfume bottle`}
              wrapperClassName="h-4/5 w-4/5 bg-transparent"
              className="h-full w-full object-contain drop-shadow-xl group-hover:drop-shadow-xl"
            />
          </motion.div>
        </Link>

        {/* "Discover" ghost fade-up, bottom-center of the image. */}
        <div className="pointer-events-none invisible absolute inset-x-0 bottom-6 z-20 hidden translate-y-4 items-center justify-center opacity-0 transition-opacity transition-transform duration-700 ease-out group-hover:visible motion-safe:group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible motion-safe:group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none md:flex">
          <LinkButton
            to={`/product/${product.slug}`}
            variant="ghost"
            className="pointer-events-auto bg-brand-white/90 px-5 py-2 text-brand-black shadow-sm backdrop-blur-xl hover:text-brand-gold"
          >
            Discover
          </LinkButton>
        </div>

        {/* Quick-add "+" icon button, bottom-right of the image. */}
        <div className="pointer-events-none invisible absolute bottom-4 right-4 z-20 hidden translate-y-4 opacity-0 transition-opacity transition-transform duration-700 ease-out group-hover:visible motion-safe:group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible motion-safe:group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none md:flex">
          <div className="relative">
            <span
              ref={ringRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-brand-gold/60 opacity-0 motion-reduce:hidden"
            />
            <Button
              variant="primary"
              size="icon"
              onClick={quickAdd}
              disabled={isOutOfStock}
              className={cn('pointer-events-auto', touchTarget)}
              aria-label={isOutOfStock ? `${product.name} out of stock` : `Add ${product.name} to cart`}
            >
              {quickAddIcon}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start px-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(eyebrowLabel, 'text-micro md:text-caption text-brand-gold italic')}>
            {product.category}
          </span>
          <div className="w-4 h-px bg-accent-gold-subtle" />
        </div>

        <Link to={`/product/${product.slug}`} className={focusRing}>
          <h3
            className={cn(
              headingLg,
              'text-brand-black mb-3 transition-colors hover:text-brand-gold',
            )}
          >
            {product.name}
          </h3>
        </Link>

        <p className="mb-8 line-clamp-2 min-h-[2.6em] max-w-70 text-body font-light normal-case leading-relaxed tracking-normal text-neutral-500/60">
          {product.shortDescription}
        </p>

        <div className="w-full flex items-center justify-between border-t border-on-light-subtle pt-6">
          <span className="text-xl font-serif italic text-brand-black">${product.price}.00</span>
          <span className={cn(eyebrowLabelSm, 'text-on-light-faint')}>{product.sku}</span>
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-3 md:hidden">
          <LinkButton
            to={`/product/${product.slug}`}
            variant="outline"
            className="tracking-wide"
            aria-label={`View ${product.name}`}
          >
            View Perfume
          </LinkButton>
          <Button
            variant="primary"
            onClick={quickAdd}
            disabled={isOutOfStock}
            className="px-4 py-4 tracking-wide"
          >
            {quickAddIcon}
            {isOutOfStock ? 'Out of Stock' : justAdded ? 'Added' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
