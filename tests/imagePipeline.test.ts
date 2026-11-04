import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { inspectImageBytes } from '../src/lib/imageBinary';
import { legacyGallery, projectGallery, imageSrcSet, imageSource, localImageSource, localImageSrcSet } from '../src/lib/productImages';
import { FEATURED_PRODUCTS } from '../src/constants/products';

test('real local WebP signature and dimensions are detected', () => {
  const bytes = new Uint8Array(readFileSync('public/images/products/bold-decision/dotfumes-bold-decision-extrait-parfum-bottle-front-white-bg.webp'));
  const result = inspectImageBytes(bytes);
  assert.equal(result.mime, 'image/webp');
  assert.equal(result.width, 1122);
  assert.equal(result.height, 1402);
});

test('invalid image signatures are rejected', () => {
  assert.throws(() => inspectImageBytes(new Uint8Array(64)), /valid JPG, PNG, or WebP/);
});

test('legacy gallery keeps exactly one primary and projects original URLs', () => {
  const product = FEATURED_PRODUCTS[0];
  const assets = legacyGallery(product);
  assert.equal(assets.filter((asset) => asset.isPrimary).length, 1);
  assert.deepEqual(projectGallery(assets), product.images);
});

test('responsive sources are selected in width order', () => {
  const product = { ...FEATURED_PRODUCTS[0], imageAssets: [{
    ...legacyGallery(FEATURED_PRODUCTS[0])[0],
    originalWidth: 1200,
    variants: {
      thumb: { url: '/thumb.webp', path: 'thumb', width: 320, height: 400, bytes: 1000 },
      card: { url: '/card.webp', path: 'card', width: 640, height: 800, bytes: 2000 },
    },
  }] };
  assert.equal(imageSrcSet(product, product.images.front), `/thumb.webp 320w, /card.webp 640w, ${product.images.front} 1200w`);
});

test('verified local variants serve legacy thumbnails while preserving original gallery URL', () => {
  const product = FEATURED_PRODUCTS[0];
  const front = product.images.front;
  const thumb = localImageSource(front, 'thumb');
  assert.match(thumb, /\/images\/derivatives\/products\/bold-decision\/.+160x200\.webp$/);
  assert.equal(localImageSource(front, 'gallery'), front);
  assert.ok(localImageSrcSet(front)?.includes(`${front} 1122w`));
  assert.ok(readFileSync(`public${thumb}`).length < readFileSync(`public${front}`).length);
});

test('administrator variants take precedence over local derivatives', () => {
  const original = FEATURED_PRODUCTS[0];
  const asset = { ...legacyGallery(original)[0], variants: {
    thumb: { url: '/admin-thumb.webp', path: 'thumb', width: 320, height: 400, bytes: 9000 },
  } };
  const product = { ...original, imageAssets: [asset] };
  assert.equal(imageSource(product, original.images.front, 'thumb'), '/admin-thumb.webp');
  assert.match(imageSrcSet(product, original.images.front) ?? '', /admin-thumb\.webp 320w/);
});

test('Supabase legacy image records can use local derivatives without replacing their original URL', () => {
  const original = FEATURED_PRODUCTS[0];
  const product = { ...original, imageAssets: legacyGallery(original) };
  assert.equal(imageSource(product, original.images.front, 'thumb'), localImageSource(original.images.front, 'thumb'));
  assert.equal(imageSrcSet(product, original.images.front), localImageSrcSet(original.images.front));
  assert.equal(product.imageAssets[0].originalUrl, original.images.front);
});
