import { create } from 'zustand';
import { FEATURED_PRODUCTS } from '../constants/products';
import {
  fetchProductCatalogFromGoogleSheets,
  isGoogleSheetsBackendEnabled,
  type GoogleSheetsFrontendSettings,
  type GoogleSheetsProductRow,
} from '../lib/googleSheetsBackend';
import { Product } from '../models/types';

export type ProductCatalogSource = 'local' | 'google-sheets';

export interface ProductCatalogState {
  products: Product[];
  allProducts: Product[];
  settings: GoogleSheetsFrontendSettings;
  source: ProductCatalogSource;
  isLoading: boolean;
  hydrated: boolean;
  lastError: string;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultSettings: GoogleSheetsFrontendSettings = {
  sheetProductDatabase: false,
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

const buildSheetLookup = (rows: GoogleSheetsProductRow[]) => {
  const bySlug = new Map<string, GoogleSheetsProductRow>();
  const byProductId = new Map<string, GoogleSheetsProductRow>();
  const byName = new Map<string, GoogleSheetsProductRow>();

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

const mergeLocalWithSheetProducts = (localProducts: Product[], rows: GoogleSheetsProductRow[]): Product[] => {
  const lookup = buildSheetLookup(rows);

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

const applyVisibilityRules = (products: Product[], settings: GoogleSheetsFrontendSettings) => {
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
  settings: GoogleSheetsFrontendSettings;
  source: ProductCatalogSource;
}> => {
  if (!isGoogleSheetsBackendEnabled()) {
    const localProducts = FEATURED_PRODUCTS.map((product) => ({ ...product, active: product.active ?? true }));
    return {
      allProducts: localProducts,
      products: localProducts,
      settings: defaultSettings,
      source: 'local',
    };
  }

  try {
    const catalog = await fetchProductCatalogFromGoogleSheets();
    const merged = mergeLocalWithSheetProducts(FEATURED_PRODUCTS, catalog.products);

    if (!catalog.settings.sheetProductDatabase) {
      const localProducts = FEATURED_PRODUCTS.map((product) => ({ ...product, active: product.active ?? true }));
      return {
        allProducts: localProducts,
        products: localProducts,
        settings: { ...defaultSettings, ...catalog.settings },
        source: 'local',
      };
    }

    const visible = applyVisibilityRules(merged, catalog.settings);

    return {
      allProducts: merged,
      products: visible,
      settings: { ...defaultSettings, ...catalog.settings },
      source: 'google-sheets',
    };
  } catch {
    const localProducts = FEATURED_PRODUCTS.map((product) => ({ ...product, active: product.active ?? true }));
    return {
      allProducts: localProducts,
      products: localProducts,
      settings: defaultSettings,
      source: 'local',
    };
  }
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
