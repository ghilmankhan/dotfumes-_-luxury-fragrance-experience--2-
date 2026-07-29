import { CartItem, Product } from '../models/types';
export type CartAvailabilityIssueType =
  | 'missing'
  | 'inactive'
  | 'out-of-stock'
  | 'quantity-exceeded';

export interface CartAvailabilityIssue {
  itemId: string;
  itemName: string;
  type: CartAvailabilityIssueType;
  requestedQuantity: number;
  availableStock: number;
}

export const getAvailableStock = (product: Pick<Product, 'stock'> | Pick<CartItem, 'stock'>) => {
  const stock = Number(product.stock);
  if (!Number.isFinite(stock)) {
    return 0;
  }
  return Math.max(0, Math.floor(stock));
};

export const isProductOutOfStock = (product: Pick<Product, 'stock'> | Pick<CartItem, 'stock'>) =>
  getAvailableStock(product) <= 0;

export const validateCartQuantities = (items: CartItem[]) => {
  for (const item of items) {
    if (item.quantity <= 0) {
      return `${item.name} has an invalid quantity.`;
    }

    const availableStock = getAvailableStock(item);

    if (availableStock <= 0) {
      return `${item.name} is currently unavailable.`;
    }

    if (item.quantity > availableStock) {
      return `${item.name} exceeds the available stock.`;
    }
  }

  return '';
};

export const getCartAvailabilityIssues = (items: CartItem[], products: Product[]) => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const issues: CartAvailabilityIssue[] = [];

  for (const item of items) {
    const latest = productMap.get(item.id);
    if (!latest) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'missing',
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
      continue;
    }

    if (latest.active === false) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'inactive',
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
      continue;
    }

    const availableStock = getAvailableStock(latest);
    if (availableStock <= 0) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'out-of-stock',
        requestedQuantity: item.quantity,
        availableStock,
      });
      continue;
    }

    if (item.quantity > availableStock) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'quantity-exceeded',
        requestedQuantity: item.quantity,
        availableStock,
      });
    }
  }

  return issues;
};

export const getCartAvailabilityMessage = (issues: CartAvailabilityIssue[]) => {
  if (issues.length === 0) {
    return '';
  }

  const first = issues[0];

  if (first.type === 'missing') {
    return `${first.itemName} is no longer available. Please refresh your selection.`;
  }

  if (first.type === 'inactive') {
    return `${first.itemName} is currently unavailable. Please update your selection.`;
  }

  if (first.type === 'out-of-stock') {
    return `${first.itemName} is currently out of stock. Please update your selection.`;
  }

  return `${first.itemName} exceeds available stock. Please reduce quantity to continue.`;
};
