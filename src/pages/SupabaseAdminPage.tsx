import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CreditCard, LogOut, Package, Plus, Search, ShoppingBag } from 'lucide-react';
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
const fieldClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition-colors focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15';
const labelClass = 'block text-sm font-medium text-stone-700';
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

  const filteredProducts = products.filter((product) => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pendingOrders = orders.filter((order) => order.order_status !== 'Cancelled' && order.order_status !== 'Delivered').length;
  const sections = [
    { key: 'products' as const, label: 'Products', count: products.length, Icon: Package },
    { key: 'orders' as const, label: 'Orders', count: pendingOrders, Icon: ShoppingBag },
    { key: 'payments' as const, label: 'Payments', count: null, Icon: CreditCard },
  ];

  return <section className="min-h-screen bg-[#f7f6f2] text-stone-950 selection:bg-[#e8d6b7] selection:text-stone-950">
    {!userId ? <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-7 sm:px-8">
      <div className="flex items-center justify-between border-b border-stone-200 pb-5">
        <span className="font-serif text-2xl tracking-tight">dotfumes<span className="text-[#ae8a52]">.</span></span>
        <Link to="/collection" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950">View shop <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">Sign in to manage your Dotfumes store.</p>
          {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
          <form onSubmit={signIn} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-[0_16px_50px_-32px_rgba(28,25,23,0.35)] sm:p-8">
            <label className={labelClass}>Email address<input className={fieldClass} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className={labelClass}>Password<input className={fieldClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <button disabled={busy} className="w-full rounded-xl bg-stone-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78045] disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in to admin'}</button>
            <button type="button" disabled={busy} className="text-sm font-medium text-[#785b34] underline decoration-[#c5a059]/50 underline-offset-4 hover:text-stone-950 disabled:opacity-50" onClick={() => void requestPasswordLink()}>Set or reset password</button>
          </form>
        </div>
      </div>
    </div> : <div className="mx-auto min-h-screen max-w-[1720px] lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="border-b border-stone-200 bg-[#eeebe4] px-5 py-5 sm:px-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div className="flex items-center justify-between">
          <span className="font-serif text-2xl tracking-tight">dotfumes<span className="text-[#ae8a52]">.</span></span>
          <span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">Admin</span>
        </div>
        <p className="mt-2 hidden text-xs text-stone-500 lg:block">Store workspace</p>
        <nav aria-label="Admin sections" className="mt-6 grid grid-cols-3 gap-1 lg:mt-12 lg:flex lg:flex-col" role="tablist">
          {sections.map(({ key, label, count, Icon }) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setError(''); }} className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#a78045] sm:text-sm lg:w-full lg:justify-start lg:gap-3 lg:px-3.5 ${tab === key ? 'bg-stone-950 text-white' : 'text-stone-600 hover:bg-white/80 hover:text-stone-950'}`}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0" /><span className="truncate lg:flex-1">{label}</span>{count !== null && <span className={`hidden rounded-md px-2 py-0.5 text-xs tabular-nums sm:inline ${tab === key ? 'bg-white/15 text-white' : 'bg-white text-stone-600'}`}>{count}</span>}
          </button>)}
        </nav>
        <div className="mt-6 hidden space-y-1 border-t border-stone-300/70 pt-5 lg:block">
          <Link className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-white/80 hover:text-stone-950" to="/collection"><ArrowUpRight size={18} aria-hidden="true" />View shop</Link>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-white/80 hover:text-stone-950" onClick={() => { setProducts([]); setOrders([]); setIsAdmin(false); setEditing(null); void supabase?.auth.signOut(); }}><LogOut size={18} aria-hidden="true" />Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 px-5 pb-16 pt-7 sm:px-8 lg:px-10 lg:pt-11 xl:px-14">
        <div className="mx-auto max-w-[1320px]">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b border-stone-200 pb-7">
            <div><h1 className="font-serif text-4xl tracking-tight sm:text-[2.85rem]">{tab === 'products' ? 'Products' : tab === 'orders' ? 'Orders' : 'Payment accounts'}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{tab === 'products' ? 'Keep your fragrance collection up to date.' : tab === 'orders' ? 'Review requests and keep each order moving.' : 'Choose which receiving accounts customers can use.'}</p></div>
            {tab === 'products' && isAdmin && !editing && <button type="button" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78045] disabled:opacity-50" onClick={() => { setEditing(blankProduct()); setError(''); }}><Plus size={17} aria-hidden="true" />Add product</button>}
            <div className="flex items-center gap-4 lg:hidden"><Link to="/collection" className="text-sm text-stone-600 underline underline-offset-4">View shop</Link><button type="button" className="text-sm text-stone-600 underline underline-offset-4" onClick={() => { setProducts([]); setOrders([]); setIsAdmin(false); setEditing(null); void supabase?.auth.signOut(); }}>Sign out</button></div>
          </header>
          {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
          {showPasswordSetup && <form onSubmit={setAdminPassword} className="mt-7 max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <div><h2 className="font-serif text-2xl">Set admin password</h2><p className="mt-1 text-sm text-stone-600">Use at least 12 characters for your new password.</p></div>
            <label className={labelClass}>New password<input className={fieldClass} type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
            <button disabled={busy} className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Save password</button>
          </form>}
          {!isAdmin ? <p className="mt-10 text-sm text-stone-600">{error ? 'Admin access is unavailable for this account.' : 'Checking admin access…'}</p> : <div className="pt-8">
            {tab === 'products' && <div className={`grid gap-7 ${editing ? 'xl:grid-cols-[minmax(0,1fr)_minmax(390px,520px)]' : ''}`}>
              <div className={editing ? 'hidden min-w-0 xl:block' : 'min-w-0'}>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5"><p className="text-sm text-stone-600"><span className="font-semibold tabular-nums text-stone-950">{products.length}</span> fragrances in your catalog</p><p className="text-xs text-stone-500">{products.filter((product) => product.active).length} visible in shop</p></div>
                <label className="relative mb-5 block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" /><span className="sr-only">Search products</span><input id="product-search" className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-500 focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15" placeholder="Search by name, category or SKU" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
                  {filteredProducts.map((product, index) => <div key={product.id} className={`flex flex-wrap items-center gap-4 px-4 py-4 transition-colors hover:bg-[#faf8f3] sm:flex-nowrap sm:px-5 ${index > 0 ? 'border-t border-stone-100' : ''}`}>
                    <img src={product.images.front} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-[#f4f1eb] object-contain sm:h-18 sm:w-18" />
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold text-stone-950 sm:text-base">{product.name}</h2><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${product.active ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{product.active ? 'Live' : 'Hidden'}</span></div><p className="mt-1.5 text-xs text-stone-600">{product.category} · {product.sizeMl} ml · <span className="tabular-nums">{product.stock}</span> in stock</p><p className="mt-1 text-sm font-medium tabular-nums text-stone-950">{formatCurrency(product.price)}</p></div>
                    <div className="ml-auto flex shrink-0 items-center gap-1"><button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#a78045]" onClick={() => setEditing(product)}>Edit</button>{product.active && <button type="button" disabled={busy} className="rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50" onClick={() => void archive(product)}>Hide</button>}</div>
                  </div>)}
                  {products.length === 0 && <div className="px-6 py-14 text-center"><Package size={26} strokeWidth={1.5} className="mx-auto text-[#a78045]" aria-hidden="true" /><p className="mt-4 font-serif text-xl">Your collection starts here</p><p className="mt-2 text-sm text-stone-600">Add a product to make it available in your store.</p></div>}
                  {products.length > 0 && filteredProducts.length === 0 && <div className="px-6 py-14 text-center"><p className="font-serif text-xl">No matching products</p><p className="mt-2 text-sm text-stone-600">Try a different name, category or SKU.</p></div>}
                </div>
              </div>
              {editing && <div className="min-w-0 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto"><StudioProductEditor product={editing} isNew={!products.some((product) => product.id === editing.id)} busy={busy} onChange={update} onUpload={(slot, file) => void upload(slot, file)} onSave={save} onCancel={() => setEditing(null)} /></div>}
            </div>}
            {tab === 'orders' && <StudioOrders orders={orders} busy={busy} onStatus={(id, patch) => void updateOrder(id, patch)} onProof={(path) => void openSlip(path)} />}
            {tab === 'payments' && <StudioPaymentAccounts accounts={paymentAccounts} busy={busy} onSave={saveAccount} />}
          </div>}
        </div>
      </main>
    </div>}
  </section>;
};
