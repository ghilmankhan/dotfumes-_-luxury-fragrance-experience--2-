import { useMemo } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import { getCartAvailabilityIssues, getCartAvailabilityMessage } from '../lib/validation';

export const useCartAvailability = () => {
  const items = useCartStore((s) => s.items);
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const allowOutOfStockCheckout = useProductCatalogStore(
    (state) => state.settings.allowOutOfStockCheckout,
  );

  const productById = useMemo(
    () => new Map(allProducts.map((product) => [product.id, product])),
    [allProducts],
  );

  const availabilityIssues = useMemo(
    () => getCartAvailabilityIssues(items, allProducts),
    [allProducts, items],
  );

  const availabilityIssueByItem = useMemo(
    () => new Map(availabilityIssues.map((issue) => [issue.itemId, issue])),
    [availabilityIssues],
  );

  const hasUnavailableItems = availabilityIssues.length > 0;
  const shouldBlockCheckout =
    items.length === 0 || (hasUnavailableItems && !allowOutOfStockCheckout);

  return {
    productById,
    availabilityIssues,
    availabilityIssueByItem,
    hasUnavailableItems,
    shouldBlockCheckout,
    availabilityMessage: getCartAvailabilityMessage(availabilityIssues),
  };
};
