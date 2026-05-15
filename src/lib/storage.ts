import { OrderPayload } from '../models/order';

const LAST_ORDER_KEY = 'dotfumes-last-order';

export const saveLatestOrder = (order: OrderPayload) => {
  sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
};

export const readLatestOrder = (): OrderPayload | null => {
  const raw = sessionStorage.getItem(LAST_ORDER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OrderPayload;
  } catch {
    return null;
  }
};

export const clearLatestOrder = () => {
  sessionStorage.removeItem(LAST_ORDER_KEY);
};
