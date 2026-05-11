import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../../models/types';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';
import { AssetImage } from '../AssetImage';

interface ProductCardProps {
  product: Product;
  index: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  const { addItem } = useCartStore();
  const { pushToast } = useToastStore();
  const navigate = useNavigate();

  const quickAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const result = addItem(product);
    pushToast(result.message, result.ok ? 'success' : 'error');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
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
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <AssetImage
            src={product.images.front}
            alt={product.name}
            wrapperClassName="h-4/5 w-4/5 bg-transparent"
            className="h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.05)] group-hover:drop-shadow-[0_30px_60px_rgba(0,0,0,0.08)]"
          />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 z-20 hidden translate-y-8 items-center justify-center opacity-0 transition-all duration-700 ease-[0.16,1,0.3,1] group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <div className="flex gap-4 p-2 bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
            <button
              type="button"
              onClick={quickAdd}
              className="pointer-events-auto flex items-center gap-3 bg-brand-black text-white px-8 py-4 text-[10px] uppercase tracking-[0.4em] font-bold hover:bg-neutral-800 transition-all active:scale-95"
            >
              <ShoppingBag size={14} strokeWidth={1} />
              Add To Order
            </button>
            <span
              className="pointer-events-auto p-4 bg-white text-brand-black shadow-sm border border-black/5"
              aria-hidden="true"
            >
              <Eye size={16} strokeWidth={1} />
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start px-2">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-brand-gold font-bold italic">
            {product.category}
          </span>
          <div className="w-8 h-px bg-brand-gold/10" />
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
        >
          <h3 className="font-serif text-3xl md:text-4xl tracking-tighter text-brand-black mb-3 italic transition-colors hover:text-brand-gold">
            {product.name}
          </h3>
        </Link>

        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-8 max-w-[280px] font-light leading-loose">
          {product.shortDescription}
        </p>

        <div className="w-full flex items-center justify-between border-t border-black/5 pt-6">
          <span className="text-xl font-serif italic text-brand-black">${product.price}.00</span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-brand-black/20 font-bold">
            100ml Edition
          </span>
        </div>

        <div className="mt-5 grid w-full grid-cols-[1fr_auto] gap-3 md:hidden">
          <button
            type="button"
            onClick={quickAdd}
            className="flex items-center justify-center gap-3 bg-brand-black px-5 py-4 text-[10px] font-bold uppercase tracking-[0.28em] text-white"
          >
            <ShoppingBag size={14} strokeWidth={1.2} />
            Quick Add
          </button>
          <Link
            to={`/product/${product.slug}`}
            className="flex items-center justify-center border border-black/10 px-4 text-brand-black"
            aria-label={`View ${product.name}`}
          >
            <Eye size={16} strokeWidth={1.2} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
