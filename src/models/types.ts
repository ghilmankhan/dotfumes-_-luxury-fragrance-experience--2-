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
