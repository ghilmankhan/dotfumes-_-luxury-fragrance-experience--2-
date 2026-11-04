export interface ProductImageVariant {
  url: string;
  path: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ProductImageAsset {
  id: string;
  originalUrl: string;
  originalPath: string | null;
  originalMime?: string;
  originalWidth?: number;
  originalHeight?: number;
  originalBytes?: number;
  variants: Partial<Record<'thumb' | 'card' | 'gallery', ProductImageVariant>>;
  slot: 'front' | 'angle' | 'flatLay' | 'lifestyle';
  position: number;
  isPrimary: boolean;
  altText: string;
}

export interface Product {
  id: string;
  sku: string;
  productId?: string;
  name: string;
  slug: string;
  price: number;
  sizeMl?: number;
  description: string;
  shortDescription: string;
  category: 'Men' | 'Women' | 'Unisex';
  images: {
    front: string;
    angle: string;
    flatLay: string;
    lifestyle: string[];
  };
  imageAssets?: ProductImageAsset[];
  notes: {
    top: string[];
    heart: string[];
    base: string[];
  };
  stock: number;
  active?: boolean;
  lowStock?: boolean;
  featured?: boolean;
  sortOrder?: number;
}

export interface CartItem extends Product {
  quantity: number;
}
