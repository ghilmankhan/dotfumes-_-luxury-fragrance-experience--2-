import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../../models/types';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';
import { AssetImage } from '../AssetImage';
import { isProductOutOfStock } from '../../lib/validation';
import { Button, LinkButton } from '../ui/primitives/Button';
import { eyebrowLabel, headingLg } from '../../styles/tokens/typography';
import { cn } from '../../lib/utils';
import { easing } from '../../styles/tokens/motion';

interface ProductCardProps {
  product: Product;
  index: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  const { addItem, openCart } = useCartStore();
  const { pushToast } = useToastStore();
  const navigate = useNavigate();
  const isOutOfStock = isProductOutOfStock(product) || product.active === false;

  const quickAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isOutOfStock) {
      pushToast(`${product.name} is currently out of stock.`, 'error');
      return;
    }

    const result = addItem(product);
    pushToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      openCart();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: index * 0.1, ease: easing.cinematic }}
      className="group relative flex flex-col bg-brand-white p-4 md:p-8"
    >
      <div
        role="link"
        tabIndex={0}
        onClick={() => navigate(`/product/${product.slug}`)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate(`/product/${product.slug}`);
          }
        }}
        className="relative aspect-square w-full mb-10 overflow-hidden flex items-center justify-center bg-[#FDFDFD] shadow-[inset_0_0_80px_rgba(0,0,0,0.02)] md:mb-12 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
        aria-label={`View ${product.name}`}
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 1.5, ease: easing.cinematic }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <AssetImage
            src={product.images.front}
            alt={`Front view of ${product.name} perfume bottle`}
            wrapperClassName="h-4/5 w-4/5 bg-transparent"
            className="h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.05)] group-hover:drop-shadow-[0_30px_60px_rgba(0,0,0,0.08)]"
          />
        </motion.div>

        <div className="pointer-events-none invisible absolute inset-0 z-20 hidden translate-y-8 items-center justify-center opacity-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 md:flex">
          <div className="flex gap-4 p-2 bg-white/40 backdrop-blur-xl border border-white/20 shadow-lg">
            <Button
              variant="primary"
              onClick={quickAdd}
              disabled={isOutOfStock}
              className="pointer-events-auto tracking-[0.4em]"
            >
              <ShoppingBag size={14} strokeWidth={1} />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <LinkButton
              to={`/product/${product.slug}`}
              variant="outline"
              onClick={(event) => event.stopPropagation()}
              className="pointer-events-auto bg-white px-5 tracking-[0.25em] shadow-sm border-black/5 hover:bg-neutral-50"
            >
              View Perfume
            </LinkButton>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start px-2">
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(eyebrowLabel, 'text-[9px] md:text-[10px] text-brand-gold italic')}>
            {product.category}
          </span>
          <div className="w-8 h-px bg-brand-gold/10" />
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
        >
          <h3 className={cn(headingLg, 'text-brand-black mb-3 transition-colors hover:text-brand-gold')}>
            {product.name}
          </h3>
        </Link>

        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-8 max-w-[280px] font-light leading-loose">
          {product.shortDescription}
        </p>

        <div className="w-full flex items-center justify-between border-t border-black/5 pt-6">
          <span className="text-xl font-serif italic text-brand-black">${product.price}.00</span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-brand-black/28 font-bold">
            {product.sku}
          </span>
        </div>

        <div className="mt-5 grid w-full grid-cols-2 gap-3 md:hidden">
          <LinkButton
            to={`/product/${product.slug}`}
            variant="outline"
            className="tracking-[0.22em]"
            aria-label={`View ${product.name}`}
          >
            View Perfume
          </LinkButton>
          <Button
            variant="primary"
            onClick={quickAdd}
            disabled={isOutOfStock}
            className="px-5 py-4 tracking-[0.28em]"
          >
            <ShoppingBag size={14} strokeWidth={1.2} />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
