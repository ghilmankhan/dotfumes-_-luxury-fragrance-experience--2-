import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { archiveSupabaseProduct, fetchSupabaseProducts, saveSupabaseProduct, uploadProductImage } from '../lib/supabaseCatalog';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import type { Product } from '../models/types';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatCurrency } from '../lib/order';
import { fetchPaymentAccounts, savePaymentAccount, type PaymentAccount } from '../lib/paymentAccounts';
import { StudioProductEditor } from '../components/admin/StudioProductEditor';
import { StudioPaymentAccounts } from '../components/admin/StudioPaymentAccounts';
import { StudioOrders, type StudioOrder } from '../components/admin/StudioOrders';

const blankProduct = (): Product => ({
  id: crypto.randomUUID(), sku: '', name: '', slug: '', price: 0, stock: 0, sizeMl: 50,
  category: 'Unisex', active: false, featured: false, sortOrder: 100, description: '', shortDescription: '',
  images: { front: '', angle: '', flatLay: '', lifestyle: [] },
  notes: { top: [], heart: [], base: [] },
});
const fieldClass = 'mt-1 w-full border border-black/20 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-amber-700';
const labelClass = 'block text-xs font-medium text-black/70';
const makeSlug = (name: string) => name.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SupabaseAdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [tab, setTab] = useState<'products' | 'orders' | 'payments'>('products');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refreshCatalog = useProductCatalogStore((state) => state.refresh);
  usePageMeta({ title: 'Catalog Admin | DOTFUMES', description: 'DOTFUMES product management.', path: '/admin', robots: 'noindex,nofollow' });

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id ?? null);
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.hash.includes('type=invite'))) {
        setShowPasswordSetup(true);
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    void (async () => {
      const { data, error: accessError } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (accessError || !data) { setIsAdmin(false); setError('This account does not have catalog admin access.'); setBusy(false); return; }
      setIsAdmin(true);
      try {
        const rows = await fetchSupabaseProducts();
        const { data: orderRows, error: ordersError } = await supabase.from('orders').select('id,created_at,customer_name,email,phone,city,address,payment_method,payer_name,payment_reference,total,payment_status,order_status,slip_path,items').order('created_at', { ascending: false }).limit(100);
        if (ordersError) throw ordersError;
        if (!cancelled) { setProducts(rows); setOrders((orderRows ?? []) as StudioOrder[]); }
        try { const accounts = await fetchPaymentAccounts(); if (!cancelled) setPaymentAccounts(accounts); }
        catch { if (!cancelled) setNotice('Payment account settings are not available yet.'); }
      }
      catch (loadError) { if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load products.'); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setPassword(''); setBusy(false);
    if (authError) setError(authError.message);
  };

  const requestPasswordLink = async () => {
    if (!supabase || !email.trim()) { setError('Enter your admin email first.'); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin`,
    });
    if (resetError) setError(resetError.message);
    else setNotice('Check your email for the password setup link.');
    setBusy(false);
  };

  const setAdminPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 12) { setError('Use at least 12 characters.'); return; }
    setBusy(true); setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setNewPassword('');
    if (updateError) setError(updateError.message);
    else { setShowPasswordSetup(false); setNotice('Password saved. Your admin account is ready.'); }
    setBusy(false);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setError(''); setNotice('');
    const isNew = !products.some((product) => product.id === editing.id);
    const generatedSlug = makeSlug(editing.name);
    const product = { ...editing, slug: editing.slug.trim() || generatedSlug, sku: editing.sku.trim() || `DF-${generatedSlug.toUpperCase()}` };
    if (!product.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug) || !Number.isInteger(product.price) || product.price < 0 || !Number.isInteger(product.stock) || product.stock < 0 || !product.images.front) {
      setError('Add a name, valid PKR price, whole-number stock and main photo.'); return;
    }
    if (isNew && products.some((existing) => existing.slug === product.slug || existing.sku === product.sku)) {
      setError('A product with this name already exists. Open More details to set a unique URL name and SKU.'); return;
    }
    setBusy(true);
    try {
      await saveSupabaseProduct({ ...product, active: product.active ?? false });
      setProducts(await fetchSupabaseProducts());
      await refreshCatalog();
      setEditing(null); setNotice('Product saved.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save product.'); }
    finally { setBusy(false); }
  };

  const archive = async (product: Product) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await archiveSupabaseProduct(product.id);
      setProducts(await fetchSupabaseProducts());
      await refreshCatalog();
      setNotice(`${product.name} is hidden from the shop.`);
    } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : 'Unable to hide product.'); }
    finally { setBusy(false); }
  };

  const update = (patch: Partial<Product>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const updateOrder = async (id: string, patch: Partial<Pick<StudioOrder, 'payment_status' | 'order_status'>>) => {
    if (!supabase) return;
    setBusy(true); setError('');
    const current = orders.find((order) => order.id === id);
    if (!current) { setBusy(false); return; }
    const { error: updateError } = await supabase.rpc('admin_set_order_status', {
      p_order_id: id,
      p_payment_status: patch.payment_status ?? current.payment_status,
      p_order_status: patch.order_status ?? current.order_status,
    });
    if (updateError) setError(updateError.message);
    else {
      const { data: latestOrders, error: reloadError } = await supabase.from('orders').select('id,created_at,customer_name,email,phone,city,address,payment_method,payer_name,payment_reference,total,payment_status,order_status,slip_path,items').order('created_at', { ascending: false }).limit(100);
      if (reloadError) setError(reloadError.message);
      else setOrders((latestOrders ?? []) as StudioOrder[]);
      await refreshCatalog();
      setProducts(await fetchSupabaseProducts());
    }
    setBusy(false);
  };
  const openSlip = async (path: string) => {
    if (!supabase) return;
    const { data, error: slipError } = await supabase.storage.from('payment-slips').createSignedUrl(path, 60);
    if (slipError || !data?.signedUrl) { setError(slipError?.message || 'Unable to open payment proof.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };
  const upload = async (slot: 'front' | 'angle' | 'flatLay' | 'lifestyle', file?: File) => {
    if (!file || !editing) return;
    setBusy(true); setError('');
    try {
      const url = await uploadProductImage(file, editing.id);
      setEditing((current) => current ? { ...current, images: slot === 'lifestyle'
        ? { ...current.images, lifestyle: [...current.images.lifestyle, url] }
        : { ...current.images, [slot]: url } } : current);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };
  const saveAccount = async (account: PaymentAccount) => {
    setBusy(true); setError(''); setNotice('');
    try { await savePaymentAccount(account); setPaymentAccounts(await fetchPaymentAccounts()); setNotice(`${account.label} settings saved.`); }
    catch (accountError) { setError(accountError instanceof Error ? accountError.message : 'Unable to save payment account.'); }
    finally { setBusy(false); }
  };

  return <section className="min-h-screen bg-[#f5f2eb] px-5 py-12 text-black md:px-10">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-black/15 pb-7">
        <div><h1 className="font-serif text-4xl italic md:text-5xl">Catalog studio</h1><p className="mt-2 text-sm text-black/60">Manage the fragrances shown in the shop.</p></div>
        <div className="flex gap-3"><Link className="border border-black/30 px-4 py-2 text-xs uppercase tracking-widest" to="/collection">View shop</Link>{userId && <button className="border border-black/30 px-4 py-2 text-xs uppercase tracking-widest" onClick={() => { setProducts([]); setOrders([]); setIsAdmin(false); setEditing(null); void supabase?.auth.signOut(); }}>Sign out</button>}</div>
      </div>
      {error && <p role="alert" className="mt-6 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-6 border border-green-300 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {userId && showPasswordSetup && <form onSubmit={setAdminPassword} className="mt-8 max-w-md space-y-5 bg-white p-7">
        <h2 className="font-serif text-2xl italic">Set admin password</h2>
        <label className={labelClass}>New password<input className={fieldClass} type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
        <button disabled={busy} className="bg-black px-6 py-3 text-xs uppercase tracking-widest text-white disabled:opacity-50">Save password</button>
      </form>}
      {!userId ? <form onSubmit={signIn} className="mt-12 max-w-md space-y-5 rounded-xl bg-white p-7 shadow-sm">
        <h2 className="font-serif text-2xl italic">Admin sign in</h2>
        <label className={labelClass}>Email<input className={fieldClass} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className={labelClass}>Password<input className={fieldClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button disabled={busy} className="bg-black px-6 py-3 text-xs uppercase tracking-widest text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" disabled={busy} className="block text-xs underline disabled:opacity-50" onClick={() => void requestPasswordLink()}>Set or reset password by email</button>
      </form> : isAdmin ? <div className="mt-8 space-y-8">
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-4" role="tablist" aria-label="Studio sections">
          {([['products', `Products (${products.length})`], ['orders', `Orders (${orders.length})`], ['payments', 'Payment accounts']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setEditing(null); setError(''); }} className={`rounded-md px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#a78045] ${tab === key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-white'}`}>{label}</button>)}
        </div>
        {tab === 'products' && <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-serif text-3xl">Your fragrances</h2><p className="mt-1 text-sm text-stone-600">Edit a fragrance or add a new one in a few steps.</p></div><button type="button" disabled={busy} className="rounded-md bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50" onClick={() => { setEditing(blankProduct()); setError(''); }}>Add product</button></div>
            <label className="sr-only" htmlFor="product-search">Search products</label><input id="product-search" className="w-full rounded-md border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#a78045]" placeholder="Search fragrances" value={search} onChange={(event) => setSearch(event.target.value)} />
            <div className="space-y-3">{products.filter((product) => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(search.toLowerCase())).map((product) => <div key={product.id} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
              <img src={product.images.front} alt="" className="h-16 w-16 shrink-0 rounded-md bg-[#f6f3ed] object-contain" />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{product.name}</p><p className="mt-1 text-xs text-stone-600">{formatCurrency(product.price)} · {product.stock} available · {product.category}</p><p className="mt-1 text-xs text-stone-500">{product.active ? 'Visible in shop' : 'Hidden from shop'}</p></div>
              <button type="button" className="rounded-md px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100" onClick={() => setEditing(product)}>Edit</button>
              {product.active && <button type="button" disabled={busy} className="rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50" onClick={() => void archive(product)}>Hide</button>}
            </div>)}{products.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-stone-600">No fragrances yet. Add your first product.</p>}{products.length > 0 && !products.some((product) => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(search.toLowerCase())) && <p className="rounded-xl bg-white p-6 text-sm text-stone-600">No products match that search.</p>}</div>
          </div>
          {editing && <StudioProductEditor product={editing} isNew={!products.some((product) => product.id === editing.id)} busy={busy} onChange={update} onUpload={(slot, file) => void upload(slot, file)} onSave={save} onCancel={() => setEditing(null)} />}
        </div>}
        {tab === 'orders' && <StudioOrders orders={orders} busy={busy} onStatus={(id, patch) => void updateOrder(id, patch)} onProof={(path) => void openSlip(path)} />}
        {tab === 'payments' && <StudioPaymentAccounts accounts={paymentAccounts} busy={busy} onSave={saveAccount} />}
      </div> : <p className="mt-10 text-sm text-black/60">{error ? 'Admin access is unavailable for this account.' : 'Checking admin access…'}</p>}
    </div>
  </section>;
};
