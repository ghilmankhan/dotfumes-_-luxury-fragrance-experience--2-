export type AdminOrder = {
  orderId: string;
  createdAt: string;
  customerName: string;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  slipUrl: string;
};

export type AdminProductStock = {
  slug: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  category: string;
};
