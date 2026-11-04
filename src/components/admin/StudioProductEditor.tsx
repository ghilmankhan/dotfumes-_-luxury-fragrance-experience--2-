import { useState, type FormEvent } from 'react';
import type { Product } from '../../models/types';
import { formatCurrency } from '../../lib/order';
import { legacyGallery, projectGallery, imageSource } from '../../lib/productImages';

const inputClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15';
const labelClass = 'block text-sm font-medium text-stone-700';
const list = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

type Props = {
  product: Product;
  isNew: boolean;
  busy: boolean;
  uploading: boolean;
  onChange: (patch: Partial<Product>) => void;
  onUploadPhotos: (files: File[]) => void;
  onReplacePhoto: (file: File, imageId: string) => void;
  onOptimizePhotos: () => void;
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
};

export const StudioProductEditor = ({ product, isNew, busy, uploading, onChange, onUploadPhotos, onReplacePhoto, onOptimizePhotos, onSave, onCancel }: Props) => {
  const [preview, setPreview] = useState<'desktop' | 'mobile'>('desktop');
  const photos = product.imageAssets ?? legacyGallery(product);
  const changePhotos = (next: typeof photos) => {
    const imageAssets = next.map((asset, position) => ({ ...asset, position }));
    onChange({ imageAssets, images: projectGallery(imageAssets) });
  };
  const removePhoto = (id: string) => {
    const next = photos.filter((photo) => photo.id !== id);
    if (photos.find((photo) => photo.id === id)?.isPrimary && next.length) next[0] = { ...next[0], isPrimary: true };
    changePhotos(next);
  };
  const makeMain = (id: string) => changePhotos(photos.map((photo) => ({ ...photo, isPrimary: photo.id === id })));
  const move = (index: number, offset: number) => {
    const next = [...photos];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    changePhotos(next);
  };
  const primary = photos.find((photo) => photo.isPrimary);

  return <form onSubmit={onSave} aria-label="Product editor" className="space-y-7 rounded-2xl bg-white p-5 ring-1 ring-stone-200/80 sm:p-7">
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-6">
      <div><h2 className="font-serif text-2xl tracking-tight text-stone-950 sm:text-3xl">{isNew ? 'New product' : 'Edit product'}</h2><p className="mt-2 text-sm leading-6 text-stone-600">Add the essentials first. More details can wait.</p></div>
      <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#a78045] disabled:opacity-50">{isNew ? 'Cancel' : 'Close'}</button>
    </div>

    <div><h3 className="mb-5 text-sm font-semibold text-stone-950">Essentials</h3><div className="grid gap-5 sm:grid-cols-2">
      <label className={`${labelClass} sm:col-span-2`}>Product name<input className={inputClass} value={product.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="e.g. First Meet" required /></label>
      <label className={labelClass}>Price in PKR<input className={inputClass} type="number" min="0" step="1" value={product.price} onChange={(event) => onChange({ price: Number(event.target.value) })} required /><span className="mt-1.5 block text-xs font-normal text-stone-500">Shown to customers as {formatCurrency(product.price)}.</span></label>
      <label className={labelClass}>Available pieces<input className={inputClass} type="number" min="0" step="1" value={product.stock} onChange={(event) => onChange({ stock: Number(event.target.value) })} required /></label>
      <label className={labelClass}>Category<select className={inputClass} value={product.category} onChange={(event) => onChange({ category: event.target.value as Product['category'] })}><option>Men</option><option>Women</option><option>Unisex</option></select></label>
      <label className={labelClass}>Bottle size (ml)<input className={inputClass} type="number" min="1" step="1" value={product.sizeMl ?? ''} onChange={(event) => onChange({ sizeMl: Number(event.target.value) })} /></label>
    </div></div>

    <div className="border-t border-stone-100 pt-6">
      <h3 className="mb-2 text-sm font-semibold text-stone-950">Product photos</h3>
      <p className="mb-5 text-xs leading-5 text-stone-600">Select several photos at once. The first photo is the main image; you can change it below. Bottle photos work best around 1200 × 1500 pixels (4:5). Originals are preserved.</p>
      <label className={labelClass}>Upload photos
        <input className="mt-2 block w-full text-sm text-stone-600 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-950 file:px-4 file:py-2.5 file:text-xs file:font-medium file:text-white disabled:opacity-50" type="file" multiple disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={(event) => { onUploadPhotos(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
      </label>
      <p className="mt-2 text-xs text-stone-500" role={uploading ? 'status' : undefined}>JPG, PNG or WEBP, up to 5 MB each. {uploading ? 'Uploading photos…' : 'Save the product after uploading.'}</p>
      {photos.some((photo) => !photo.variants.thumb || !photo.variants.card || !photo.variants.gallery) && !isNew && <button type="button" disabled={busy} onClick={onOptimizePhotos} className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50">Prepare smaller sizes for existing photos</button>}
      {photos.length > 0 && <>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => <div key={photo.id} className="rounded-xl border border-stone-200 p-2">
            <img src={imageSource(product, photo.originalUrl, 'thumb')} alt={photo.altText || `${product.name || 'Product'} photo ${index + 1}`} className="aspect-square w-full rounded-lg bg-[#f6f3ed] object-contain" loading="lazy" width="320" height="320" />
            <p className="mt-2 truncate text-xs font-semibold text-stone-800">{photo.isPrimary ? 'Main photo' : `Photo ${index + 1}`}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">{photo.originalWidth && photo.originalHeight ? `${photo.originalWidth} × ${photo.originalHeight}` : 'Legacy image'}{photo.originalBytes ? ` · ${(photo.originalBytes / 1048576).toFixed(2)} MB` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {!photo.isPrimary && <button type="button" disabled={busy} className="rounded-md px-1 py-1 text-[#785b34] hover:bg-stone-100 disabled:opacity-50" onClick={() => makeMain(photo.id)}>Make main</button>}
              <button type="button" disabled={busy || index === 0} aria-label={`Move photo ${index + 1} earlier`} className="rounded-md px-1 py-1 hover:bg-stone-100 disabled:opacity-40" onClick={() => move(index, -1)}>←</button>
              <button type="button" disabled={busy || index === photos.length - 1} aria-label={`Move photo ${index + 1} later`} className="rounded-md px-1 py-1 hover:bg-stone-100 disabled:opacity-40" onClick={() => move(index, 1)}>→</button>
              <label className="cursor-pointer rounded-md px-1 py-1 hover:bg-stone-100">Replace<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) onReplacePhoto(file, photo.id); event.currentTarget.value = ''; }} /></label>
              <button type="button" disabled={busy} aria-label={`Remove photo ${index + 1}`} className="rounded-md px-1 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={() => removePhoto(photo.id)}>Remove</button>
            </div>
          </div>)}
        </div>
        {primary && <div className="mt-5 rounded-xl border border-stone-200 bg-[#f7f6f2] p-3">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-stone-800">Shop preview</p><div className="flex gap-1"><button type="button" aria-pressed={preview === 'desktop'} onClick={() => setPreview('desktop')} className="rounded-md px-2 py-1 text-xs hover:bg-white">Desktop</button><button type="button" aria-pressed={preview === 'mobile'} onClick={() => setPreview('mobile')} className="rounded-md px-2 py-1 text-xs hover:bg-white">Mobile</button></div></div>
          <div className={`mx-auto mt-3 bg-white p-4 ${preview === 'mobile' ? 'max-w-[200px]' : 'max-w-[320px]'}`}><img src={imageSource(product, primary.originalUrl, 'card')} alt={primary.altText || `${product.name} main photo preview`} className="aspect-square w-full object-contain" /></div>
        </div>}
      </>}
    </div>

    <div className="space-y-5 border-t border-stone-100 pt-6"><h3 className="text-sm font-semibold text-stone-950">Description</h3><label className={labelClass}>Short description<textarea className={inputClass} rows={2} value={product.shortDescription} onChange={(event) => onChange({ shortDescription: event.target.value })} placeholder="A few words about the scent" /></label>
    <label className={labelClass}>Full description<textarea className={inputClass} rows={4} value={product.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Tell customers what makes it special" /></label></div>

    <div className="flex flex-wrap gap-5 border-t border-stone-100 pt-6 text-sm text-stone-700">
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#a78045]" checked={product.active ?? false} onChange={(event) => onChange({ active: event.target.checked })} />Show in shop</label>
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#a78045]" checked={product.featured ?? false} onChange={(event) => onChange({ featured: event.target.checked })} />Feature on homepage</label>
    </div>

    <details className="group rounded-xl bg-[#f7f6f2] p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-semibold text-stone-800 marker:text-[#a78045]">Optional details <span className="ml-1 font-normal text-stone-500">· scent notes, product URL and SKU</span></summary>
      <div className="mt-5 grid gap-5 border-t border-stone-100 pt-5">
        <div className="grid gap-5 sm:grid-cols-2"><label className={labelClass}>Product URL name<input className={inputClass} value={product.slug} onChange={(event) => onChange({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="Generated from name" /></label><label className={labelClass}>SKU<input className={inputClass} value={product.sku} onChange={(event) => onChange({ sku: event.target.value })} placeholder="Generated from name" /></label></div>
        <label className={labelClass}>Display order<input className={inputClass} type="number" step="1" value={product.sortOrder ?? 100} onChange={(event) => onChange({ sortOrder: Number(event.target.value) })} /></label>
        {(['top', 'heart', 'base'] as const).map((note) => <label key={note} className={labelClass}>{note[0].toUpperCase() + note.slice(1)} notes (one per line)<textarea className={inputClass} rows={3} value={product.notes[note].join('\n')} onChange={(event) => onChange({ notes: { ...product.notes, [note]: list(event.target.value) } })} /></label>)}
      </div>
    </details>

    <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:-mx-7 sm:-mb-7 sm:px-7"><p className="max-w-[250px] text-xs leading-5 text-stone-500">{product.active ? 'Changes appear in the shop after saving.' : 'This product stays hidden until “Show in shop” is on.'}</p><button disabled={busy} className="rounded-xl bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78045] disabled:opacity-50">{busy ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</button></div>
  </form>;
};
