import { expect, test } from '@playwright/test';

test('browser creates full-aspect WebP variants from a real bottle photo', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/productImages.ts';
    const { createImageVariants } = await import(modulePath) as typeof import('../../src/lib/productImages');
    const response = await fetch('/images/products/bold-decision/dotfumes-bold-decision-extrait-parfum-bottle-front-white-bg.webp');
    const file = new File([await response.blob()], 'bottle.webp', { type: 'image/webp' });
    const { original, variants } = await createImageVariants(file);
    const sizes: Record<string, { width: number; height: number; mime: string }> = {};
    for (const [name, blob] of Object.entries(variants)) {
      if (!blob) continue;
      const bitmap = await createImageBitmap(blob);
      sizes[name] = { width: bitmap.width, height: bitmap.height, mime: blob.type };
      bitmap.close();
    }
    return { original, sizes };
  });
  expect(result.original).toMatchObject({ mime: 'image/webp', width: 1122, height: 1402 });
  expect(result.sizes.thumb).toMatchObject({ width: 320, mime: 'image/webp' });
  expect(result.sizes.card).toMatchObject({ width: 640, mime: 'image/webp' });
  expect(result.sizes.gallery).toMatchObject({ width: 1122, mime: 'image/webp' });
  for (const item of Object.values(result.sizes)) expect(item.width / item.height).toBeCloseTo(1122 / 1402, 2);
});
