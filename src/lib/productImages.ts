import type { Product, ProductImageAsset, ProductImageVariant } from '../models/types';
import { validateImageFile } from './imageBinary';
import { LOCAL_IMAGE_VARIANTS } from '../constants/localImageVariants';

const targets = { thumb: 320, card: 640, gallery: 1600 } as const;

export const projectGallery = (assets: ProductImageAsset[]): Product['images'] => {
  const primary = assets.find((asset) => asset.isPrimary);
  return {
    front: primary?.originalUrl ?? '',
    angle: assets.find((asset) => !asset.isPrimary && asset.slot === 'angle')?.originalUrl ?? '',
    flatLay: assets.find((asset) => !asset.isPrimary && asset.slot === 'flatLay')?.originalUrl ?? '',
    lifestyle: assets.filter((asset) => !asset.isPrimary && asset.slot !== 'angle' && asset.slot !== 'flatLay').map((asset) => asset.originalUrl),
  };
};

export const legacyGallery = (product: Product): ProductImageAsset[] => {
  const sources = [
    { url: product.images.front, slot: 'front' },
    { url: product.images.angle, slot: 'angle' },
    { url: product.images.flatLay, slot: 'flatLay' },
    ...product.images.lifestyle.map((url) => ({ url, slot: 'lifestyle' })),
  ].filter((entry) => entry.url);
  return sources.map((entry, index) => ({
    id: `legacy-${product.id}-${index}`, originalUrl: entry.url, originalPath: null,
    slot: entry.slot as ProductImageAsset['slot'], position: index, isPrimary: index === 0,
    altText: `${product.name} perfume ${entry.slot === 'front' ? 'bottle front view' : entry.slot === 'angle' ? 'bottle angle view' : entry.slot === 'flatLay' ? 'bottle flat lay' : 'lifestyle photograph'}`,
    variants: {},
  }));
};

export const getImageAsset = (product: Product, url: string) =>
  product.imageAssets?.find((asset) => asset.originalUrl === url);

export const localImageSource = (url: string, size: 'thumb' | 'card' | 'gallery') => {
  const entry = LOCAL_IMAGE_VARIANTS[url];
  if (!entry) return url;
  const target = { thumb: 160, card: 480, gallery: 800 }[size];
  return entry.variants.find((variant) => variant.width >= target)?.url ?? url;
};

export const localImageSrcSet = (url: string) => {
  const entry = LOCAL_IMAGE_VARIANTS[url];
  if (!entry) return undefined;
  return [...entry.variants.map((variant) => `${variant.url} ${variant.width}w`), `${url} ${entry.originalWidth}w`].join(', ');
};

export const localImageDimensions = (url: string) => {
  const entry = LOCAL_IMAGE_VARIANTS[url];
  return entry ? { width: entry.originalWidth, height: entry.originalHeight } : undefined;
};

export const imageSource = (product: Product, url: string, size: 'thumb' | 'card' | 'gallery') => {
  const asset = getImageAsset(product, url);
  if (!asset) return localImageSource(url, size);
  const next = size === 'thumb' ? asset.variants.card ?? asset.variants.gallery : size === 'card' ? asset.variants.gallery : undefined;
  return asset.variants[size]?.url ?? next?.url ?? localImageSource(asset.originalUrl, size);
};

export const imageSrcSet = (product: Product, url: string) => {
  const asset = getImageAsset(product, url);
  if (!asset || Object.keys(asset.variants).length === 0) return localImageSrcSet(url);
  const variants = Object.values(asset.variants) as ProductImageVariant[];
  const widths = new Map<number, string>();
  for (const variant of variants) widths.set(variant.width, variant.url);
  if (asset.originalWidth && asset.originalWidth <= 2200 && asset.originalMime !== 'image/jpeg') widths.set(asset.originalWidth, asset.originalUrl);
  return [...widths.entries()].sort(([a], [b]) => a - b).map(([width, source]) => `${source} ${width}w`).join(', ') || undefined;
};

export const createImageVariants = async (file: File) => {
  const original = await validateImageFile(file, 5 * 1024 * 1024);
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const variants: Partial<Record<keyof typeof targets, Blob>> = {};
  try {
    for (const [name, target] of Object.entries(targets) as [keyof typeof targets, number][]) {
      const width = Math.min(bitmap.width, target);
      const height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error('Image processing is unavailable in this browser.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
      if (!blob || blob.type !== 'image/webp') throw new Error('WebP processing is unavailable in this browser.');
      variants[name] = blob;
    }
  } finally { bitmap.close(); }
  return { original, variants };
};
