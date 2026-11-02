import type { FormEvent } from 'react';
import type { Product } from '../../models/types';
import { formatCurrency } from '../../lib/order';

const inputClass = 'mt-2 w-full rounded-md border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15';
const labelClass = 'block text-sm font-medium text-stone-700';
const list = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

type Props = {
  product: Product;
  isNew: boolean;
  busy: boolean;
  onChange: (patch: Partial<Product>) => void;
  onUpload: (slot: 'front' | 'angle' | 'flatLay' | 'lifestyle', file?: File) => void;
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
};

export const StudioProductEditor = ({ product, isNew, busy, onChange, onUpload, onSave, onCancel }: Props) => (
  <form onSubmit={onSave} aria-label="Product editor" className="space-y-8 rounded-xl bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-start justify-between gap-4">
      <div><h2 className="font-serif text-3xl text-stone-900">{isNew ? 'Add a fragrance' : 'Edit fragrance'}</h2><p className="mt-2 text-sm text-stone-500">Start with the essentials. Extra details are optional.</p></div>
      <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#a78045]">Close</button>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <label className={`${labelClass} sm:col-span-2`}>Product name<input className={inputClass} value={product.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="e.g. First Meet" required /></label>
      <label className={labelClass}>Price in PKR<input className={inputClass} type="number" min="0" step="1" value={product.price} onChange={(event) => onChange({ price: Number(event.target.value) })} required /><span className="mt-1.5 block text-xs font-normal text-stone-500">Shown to customers as {formatCurrency(product.price)}.</span></label>
      <label className={labelClass}>Available pieces<input className={inputClass} type="number" min="0" step="1" value={product.stock} onChange={(event) => onChange({ stock: Number(event.target.value) })} required /></label>
      <label className={labelClass}>Category<select className={inputClass} value={product.category} onChange={(event) => onChange({ category: event.target.value as Product['category'] })}><option>Men</option><option>Women</option><option>Unisex</option></select></label>
      <label className={labelClass}>Bottle size (ml)<input className={inputClass} type="number" min="1" step="1" value={product.sizeMl ?? ''} onChange={(event) => onChange({ sizeMl: Number(event.target.value) })} /></label>
    </div>

    <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#f6f3ed]">{product.images.front ? <img src={product.images.front} alt="Product preview" className="h-full w-full object-contain" /> : <span className="px-3 text-center text-xs text-stone-500">No photo yet</span>}</div>
      <div><label className={labelClass}>Main product photo<input className="mt-2 block w-full text-sm text-stone-600 file:mr-4 file:rounded-md file:border-0 file:bg-stone-900 file:px-4 file:py-2.5 file:text-xs file:font-medium file:text-white" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload('front', event.target.files?.[0])} /></label><p className="mt-2 text-xs text-stone-500">JPG, PNG or WEBP, up to 5 MB.</p></div>
    </div>

    <label className={labelClass}>Short description<textarea className={inputClass} rows={2} value={product.shortDescription} onChange={(event) => onChange({ shortDescription: event.target.value })} placeholder="A few words about the scent" /></label>
    <label className={labelClass}>Full description<textarea className={inputClass} rows={4} value={product.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Tell customers what makes it special" /></label>

    <div className="flex flex-wrap gap-5 border-t border-stone-100 pt-6 text-sm text-stone-700">
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#a78045]" checked={product.active ?? false} onChange={(event) => onChange({ active: event.target.checked })} />Show in shop</label>
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#a78045]" checked={product.featured ?? false} onChange={(event) => onChange({ featured: event.target.checked })} />Feature on homepage</label>
    </div>

    <details className="group rounded-lg border border-stone-200 p-4">
      <summary className="cursor-pointer text-sm font-medium text-stone-700 marker:text-[#a78045]">More details: scent notes, extra photos and URL</summary>
      <div className="mt-5 grid gap-5 border-t border-stone-100 pt-5">
        <div className="grid gap-5 sm:grid-cols-2"><label className={labelClass}>Product URL name<input className={inputClass} value={product.slug} onChange={(event) => onChange({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="Generated from name" /></label><label className={labelClass}>SKU<input className={inputClass} value={product.sku} onChange={(event) => onChange({ sku: event.target.value })} placeholder="Generated from name" /></label></div>
        <label className={labelClass}>Display order<input className={inputClass} type="number" step="1" value={product.sortOrder ?? 100} onChange={(event) => onChange({ sortOrder: Number(event.target.value) })} /></label>
        {(['angle', 'flatLay', 'lifestyle'] as const).map((slot) => <label key={slot} className={labelClass}>Add {slot === 'flatLay' ? 'flat lay' : slot} photo<input className="mt-2 block w-full text-sm text-stone-600" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload(slot, event.target.files?.[0])} /></label>)}
        <label className={labelClass}>Main photo URL<input className={inputClass} value={product.images.front} onChange={(event) => onChange({ images: { ...product.images, front: event.target.value } })} placeholder="Use if photo upload is unavailable" /></label>
        <label className={labelClass}>Angle photo URL<input className={inputClass} value={product.images.angle} onChange={(event) => onChange({ images: { ...product.images, angle: event.target.value } })} /></label>
        <label className={labelClass}>Flat lay photo URL<input className={inputClass} value={product.images.flatLay} onChange={(event) => onChange({ images: { ...product.images, flatLay: event.target.value } })} /></label>
        <label className={labelClass}>Lifestyle photo URLs (one per line)<textarea className={inputClass} rows={3} value={product.images.lifestyle.join('\n')} onChange={(event) => onChange({ images: { ...product.images, lifestyle: list(event.target.value) } })} /></label>
        {(['top', 'heart', 'base'] as const).map((note) => <label key={note} className={labelClass}>{note[0].toUpperCase() + note.slice(1)} notes (one per line)<textarea className={inputClass} rows={3} value={product.notes[note].join('\n')} onChange={(event) => onChange({ notes: { ...product.notes, [note]: list(event.target.value) } })} /></label>)}
      </div>
    </details>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-6"><p className="text-xs text-stone-500">{product.active ? 'Changes will appear in the shop after saving.' : 'This product will remain hidden until you turn on “Show in shop”.'}</p><button disabled={busy} className="rounded-md bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50">{busy ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</button></div>
  </form>
);
