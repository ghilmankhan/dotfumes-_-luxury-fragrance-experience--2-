import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../../models/types';
import { useCartStore } from '../../store/useCartStore';
import { AssetImage } from '../AssetImage';

interface ProductCardProps {
  product: Product;
  index: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  const { addItem } = useCartStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col bg-brand-white p-4 md:p-8"
    >
      {/* Product Image Stage - Museum Display */}
      <div className="relative aspect-square w-full mb-12 overflow-hidden flex items-center justify-center bg-[#FDFDFD] shadow-[inset_0_0_80px_rgba(0,0,0,0.02)]">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <AssetImage
            src={product.images.transparent}
            alt={product.name}
            wrapperClassName="h-4/5 w-4/5 bg-transparent"
            className="h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.05)] group-hover:drop-shadow-[0_30px_60px_rgba(0,0,0,0.08)]"
          />
        </motion.div>
        
        {/* Subtle Luxury Interaction - Hidden until hover */}
        <div className="absolute inset-0 flex items-center justify-center translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 ease-[0.16, 1, 0.3, 1] z-20">
           <div className="flex gap-4 p-2 bg-white/40 backdrop-blur-xl border border-white/20 shadow-2xl">
              <button 
                onClick={() => addItem(product)}
                className="flex items-center gap-3 bg-brand-black text-white px-8 py-4 text-[10px] uppercase tracking-[0.4em] font-bold hover:bg-neutral-800 transition-all active:scale-95"
              >
                <ShoppingBag size={14} strokeWidth={1} /> 
                Add To Order
              </button>
              <button className="p-4 bg-white text-brand-black hover:bg-neutral-50 transition-colors shadow-sm active:scale-95 border border-black/5">
                <Eye size={16} strokeWidth={1} />
              </button>
           </div>
        </div>
      </div>

      {/* Product Details - Refined Typography */}
      <div className="flex flex-col items-start px-2">
        <div className="flex items-center gap-3 mb-4">
           <span className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-brand-gold font-bold italic">
             {product.category}
           </span>
           <div className="w-8 h-px bg-brand-gold/10" />
        </div>
        
        <h3 className="font-serif text-3xl md:text-4xl tracking-tighter text-brand-black mb-3 italic">
          {product.name}
        </h3>
        
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-8 max-w-[280px] font-light leading-loose">
          {product.shortDescription}
        </p>
        
        <div className="w-full flex items-center justify-between border-t border-black/5 pt-6">
           <span className="text-xl font-serif italic text-brand-black">
             ${product.price}.00
           </span>
           <span className="text-[9px] uppercase tracking-[0.3em] text-brand-black/20 font-bold">100ml Edition</span>
        </div>
      </div>
    </motion.div>
  );
};
