export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
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
}

export interface CartItem extends Product {
  quantity: number;
}
