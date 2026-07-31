import { create } from 'zustand';
import { FEATURED_PRODUCTS } from '../constants/products';
import {
  fetchProductCatalogFromSupabase,
  isSupabaseBackendEnabled,
  type CatalogProductRow,
  type CatalogSettings,
} from '../lib/supabaseBackend';
import { Product } from '../models/types';

export type ProductCatalogSource = 'local' | 'supabase';

export interface ProductCatalogState {
  products: Product[];
  allProducts: Product[];
  settings: CatalogSettings;
  source: ProductCatalogSource;
  isLoading: boolean;
  hydrated: boolean;
  lastError: string;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultSettings: CatalogSettings = {
  hideInactiveProducts: false,
  showOutOfStockProducts: true,
  allowOutOfStockCheckout: false,
  lowStockThreshold: 3,
  currency: 'USD',
};

const normalize = (value: string | undefined) => (value || '').trim().toLowerCase();

const toFiniteNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeCategory = (value: string | undefined, fallback: Product['category']): Product['category'] => {
  if (value === 'Men' || value === 'Women' || value === 'Unisex') {
    return value;
  }
  return fallback;
};

const buildCatalogLookup = (rows: CatalogProductRow[]) => {
  const bySlug = new Map<string, CatalogProductRow>();
  const byProductId = new Map<string, CatalogProductRow>();
  const byName = new Map<string, CatalogProductRow>();

  rows.forEach((row) => {
    const slug = normalize(row.slug);
    const productId = normalize(row.productId || row.sku);
    const name = normalize(row.name);

    if (slug) {
      bySlug.set(slug, row);
    }
    if (productId) {
      byProductId.set(productId, row);
    }
    if (name) {
      byName.set(name, row);
    }
  });

  return { bySlug, byProductId, byName };
};

// Supabase is the source of truth for price/stock/active; local product
// constants only supply static creative content (images, copy, notes) that
// has no equivalent column in the products table.
const mergeLocalWithCatalogProducts = (localProducts: Product[], rows: CatalogProductRow[]): Product[] => {
  const lookup = buildCatalogLookup(rows);

  return localProducts.map((localProduct) => {
    const match =
      lookup.bySlug.get(normalize(localProduct.slug)) ||
      lookup.byProductId.get(normalize(localProduct.sku)) ||
      lookup.byProductId.get(normalize(localProduct.id)) ||
      lookup.byName.get(normalize(localProduct.name));

    if (!match) {
      return {
        ...localProduct,
        active: localProduct.active ?? true,
      };
    }

    const nextPrice = toFiniteNumber(match.price, localProduct.price);
    const nextStock = Math.max(0, Math.floor(toFiniteNumber(match.stock, localProduct.stock)));

    return {
      ...localProduct,
      productId: match.productId || match.sku || localProduct.productId || localProduct.sku,
      price: nextPrice,
      stock: nextStock,
      active: typeof match.active === 'boolean' ? match.active : localProduct.active ?? true,
      lowStock: Boolean(match.lowStock),
      category: normalizeCategory(match.category, localProduct.category),
    };
  });
};

const applyVisibilityRules = (products: Product[], settings: CatalogSettings) => {
  return products.filter((product) => {
    if (settings.hideInactiveProducts && product.active === false) {
      return false;
    }

    if (!settings.showOutOfStockProducts && product.stock <= 0) {
      return false;
    }

    return true;
  });
};

const loadCatalog = async (): Promise<{
  allProducts: Product[];
  products: Product[];
  settings: CatalogSettings;
  source: ProductCatalogSource;
}> => {
  if (!isSupabaseBackendEnabled()) {
    throw new Error(
      'Product backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  const catalog = await fetchProductCatalogFromSupabase();
  const merged = mergeLocalWithCatalogProducts(FEATURED_PRODUCTS, catalog.products);
  const visible = applyVisibilityRules(merged, catalog.settings);

  return {
    allProducts: merged,
    products: visible,
    settings: { ...defaultSettings, ...catalog.settings },
    source: 'supabase',
  };
};

export const useProductCatalogStore = create<ProductCatalogState>((set, get) => ({
  products: FEATURED_PRODUCTS.map((product) => ({ ...product, active: product.active ?? true })),
  allProducts: FEATURED_PRODUCTS.map((product) => ({ ...product, active: product.active ?? true })),
  settings: defaultSettings,
  source: 'local',
  isLoading: false,
  hydrated: false,
  lastError: '',
  init: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }

    set({ isLoading: true, lastError: '' });

    try {
      const next = await loadCatalog();
      set({
        allProducts: next.allProducts,
        products: next.products,
        settings: next.settings,
        source: next.source,
        hydrated: true,
        isLoading: false,
        lastError: '',
      });
    } catch (error) {
      // Live catalog failed to load: keep the static placeholder catalog on
      // screen but do not mark it as hydrated/live, and surface the error so
      // callers know pricing/stock are not confirmed.
      set({
        isLoading: false,
        lastError: error instanceof Error ? error.message : 'Unable to load the product catalog.',
      });
    }
  },
  refresh: async () => {
    if (get().isLoading) {
      return;
    }

    set({ isLoading: true, lastError: '' });

    try {
      const next = await loadCatalog();
      set({
        allProducts: next.allProducts,
        products: next.products,
        settings: next.settings,
        source: next.source,
        hydrated: true,
        isLoading: false,
        lastError: '',
      });
    } catch (error) {
      set({
        isLoading: false,
        lastError: error instanceof Error ? error.message : 'Unable to refresh catalog.',
      });
    }
  },
}));

export const findProductBySlug = (products: Product[], slug: string | undefined) => {
  if (!slug) {
    return null;
  }

  return products.find((item) => item.slug === slug) || null;
};
