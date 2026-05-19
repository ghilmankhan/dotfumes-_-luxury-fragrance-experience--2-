import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { appConfig } from '../lib/config';
import { usePageMeta } from '../hooks/usePageMeta';

type AdminOrder = {
  orderId: string;
  createdAt: string;
  customerName: string;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  slipUrl: string;
};

type AdminProductStock = {
  slug: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  category: string;
};

type AdminMetricSummary = {
  totalOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  verifiedPayments: number;
  newOrders: number;
  deliveredOrders: number;
};

type BestSellingPerfume = {
  name: string;
  unitsSold: number;
};

type AdminDashboardData = {
  currency: string;
  summary: AdminMetricSummary;
  bestSellingPerfume: BestSellingPerfume | null;
  lowStockProducts: AdminProductStock[];
  recentOrders: AdminOrder[];
  paymentVerificationQueue: AdminOrder[];
  productStock: AdminProductStock[];
};

type DashboardApiResponse = {
  success?: boolean;
  message?: unknown;
  data?: unknown;
};

type JsonObject = Record<string, unknown>;
type DashboardAction = 'dashboard' | 'orders' | 'products' | 'settings';

const DEFAULT_ADMIN_ERROR =
  'The dashboard is unavailable right now. Please refresh or verify your backend setup.';
const ADMIN_READ_TIMEOUT_MS = 18000;
const ADMIN_JSONP_TIMEOUT_MS = 15000;

const normalizeDashboardErrorMessage = (input: string) => {
  const lowered = input.toLowerCase();

  if (lowered.includes('unauthorized admin token')) {
    return 'Admin token is not authorized. Verify VITE_ADMIN_READ_TOKEN and the Apps Script ADMIN_READ_TOKEN property, then redeploy the Web App.';
  }

  if (lowered.includes('missing script property: admin_read_token')) {
    return 'Apps Script is missing ADMIN_READ_TOKEN in Script Properties.';
  }

  if (lowered.includes('invalid json')) {
    return 'Dashboard endpoint returned invalid JSON. Ensure Apps Script doGet action=dashboard is deployed.';
  }

  if (lowered.includes('failed to fetch')) {
    return 'Dashboard request failed in the browser. This usually means CORS or an outdated Apps Script deployment. Verify doGet is deployed and try again.';
  }

  if (lowered.includes('script function not found: doget')) {
    return 'Apps Script deployment is outdated. Copy the latest backend file with doGet(e), then redeploy as a new Web App version.';
  }

  return input;
};

const parseNumber = (value: unknown): number => {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : 0;
};

const parseText = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

const isRecord = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const ensureArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeOrder = (raw: unknown): AdminOrder | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const orderId = parseText(raw.orderId ?? raw['Order ID']);
  if (!orderId) {
    return null;
  }

  return {
    orderId,
    createdAt: parseText(raw.createdAt ?? raw['Created At']),
    customerName: parseText(raw.customerName ?? raw['Customer Name'], 'Unknown Client'),
    total: parseNumber(raw.total ?? raw.Total),
    paymentStatus: parseText(raw.paymentStatus ?? raw['Payment Status'], 'Pending Verification'),
    orderStatus: parseText(raw.orderStatus ?? raw['Order Status'], 'New'),
    slipUrl: parseText(raw.slipUrl ?? raw['Slip URL']),
  };
};

const normalizeProduct = (raw: unknown): AdminProductStock | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const name = parseText(raw.name ?? raw.Name);
  if (!name) {
    return null;
  }

  return {
    slug: parseText(raw.slug ?? raw.Slug),
    name,
    price: parseNumber(raw.price ?? raw.Price),
    stock: parseNumber(raw.stock ?? raw.Stock),
    active: Boolean(raw.active ?? raw.Active ?? true),
    category: parseText(raw.category ?? raw.Category, 'Uncategorized'),
  };
};

const parseDashboardResponse = (raw: string) => {
  if (!raw.trim()) {
    throw new Error('Dashboard API returned an empty response.');
  }

  if (raw.includes('Script function not found: doGet')) {
    throw new Error(
      'Script function not found: doGet. Redeploy the latest Apps Script version containing doGet(e).',
    );
  }

  if (raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html')) {
    throw new Error(
      'Dashboard API returned an HTML page. Ensure the Apps Script Web App URL is correct and redeployed.',
    );
  }

  let parsed: DashboardApiResponse;
  try {
    parsed = JSON.parse(raw) as DashboardApiResponse;
  } catch (error) {
    throw new Error('Dashboard API returned invalid JSON.', { cause: error });
  }

  if (!isRecord(parsed)) {
    throw new Error('Dashboard API returned an invalid payload.');
  }

  const payload = parsed.data;
  if (!isRecord(payload)) {
    const message = parseText(parsed.message, DEFAULT_ADMIN_ERROR);
    throw new Error(message);
  }

  if (parsed.success === false) {
    const message = parseText(parsed.message, DEFAULT_ADMIN_ERROR);
    throw new Error(message);
  }

  const summaryRaw = isRecord(payload.summary) ? payload.summary : {};
  const bestRaw = isRecord(payload.bestSellingPerfume) ? payload.bestSellingPerfume : null;

  const summary: AdminMetricSummary = {
    totalOrders: parseNumber(summaryRaw.totalOrders),
    totalRevenue: parseNumber(summaryRaw.totalRevenue),
    pendingPayments: parseNumber(summaryRaw.pendingPayments),
    verifiedPayments: parseNumber(summaryRaw.verifiedPayments),
    newOrders: parseNumber(summaryRaw.newOrders),
    deliveredOrders: parseNumber(summaryRaw.deliveredOrders),
  };

  const bestSellingPerfume = bestRaw
    ? {
        name: parseText(bestRaw.name, 'N/A'),
        unitsSold: parseNumber(bestRaw.unitsSold),
      }
    : null;

  const productStockSource = Array.isArray(payload.productStock)
    ? payload.productStock
    : payload.productStockTable;

  return {
    currency: parseText(payload.currency, 'USD'),
    summary,
    bestSellingPerfume,
    lowStockProducts: ensureArray(payload.lowStockProducts).map(normalizeProduct).filter(Boolean),
    recentOrders: ensureArray(payload.recentOrders).map(normalizeOrder).filter(Boolean),
    paymentVerificationQueue: ensureArray(payload.paymentVerificationQueue)
      .map(normalizeOrder)
      .filter(Boolean),
    productStock: ensureArray(productStockSource).map(normalizeProduct).filter(Boolean),
  } as AdminDashboardData;
};

const validateBackendUrl = (urlValue: string) => {
  if (!urlValue) {
    return { exists: false, valid: false, url: null as URL | null };
  }

  try {
    const url = new URL(urlValue);
    const isValidProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    const isExecPath = url.pathname.endsWith('/exec') || url.pathname.endsWith('/dev');
    return { exists: true, valid: isValidProtocol && isExecPath, url };
  } catch {
    return { exists: true, valid: false, url: null as URL | null };
  }
};

const redactAdminTokenInUrl = (inputUrl: URL) => {
  const redacted = new URL(inputUrl.toString());
  if (redacted.searchParams.has('adminToken')) {
    redacted.searchParams.set('adminToken', '[REDACTED]');
  }
  if (redacted.searchParams.has('token')) {
    redacted.searchParams.set('token', '[REDACTED]');
  }
  return redacted.toString();
};

const loadViaJsonp = (endpoint: URL) =>
  new Promise<DashboardApiResponse>((resolve, reject) => {
    const callbackKey = `dotfumesAdminRead_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const jsonpUrl = new URL(endpoint.toString());
    jsonpUrl.searchParams.set('callback', callbackKey);

    const script = document.createElement('script');
    script.src = jsonpUrl.toString();
    script.async = true;

    let timeoutId = 0;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackKey];
    };

    (window as unknown as Record<string, unknown>)[callbackKey] = (payload: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve((payload ?? {}) as DashboardApiResponse);
    };

    script.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error('Dashboard JSONP fallback failed to load.'));
    };

    timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error('Dashboard JSONP fallback timed out.'));
    }, ADMIN_JSONP_TIMEOUT_MS);

    document.body.appendChild(script);
  });

export const AdminPage = () => {
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);

  const hasAdminPassword = Boolean(appConfig.adminPassword);
  const hasAdminReadToken = Boolean(appConfig.adminReadToken);
  const urlValidation = useMemo(
    () => validateBackendUrl(appConfig.googleAppsScriptWebAppUrl),
    [],
  );

  usePageMeta({
    title: 'Admin | DOTFUMES',
    description: 'Internal DOTFUMES operational dashboard.',
    path: '/admin',
    robots: 'noindex,nofollow',
  });

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AdminPage] mounted');
      console.log('[AdminPage] backend URL exists:', urlValidation.exists);
      console.log('[AdminPage] backend URL valid:', urlValidation.valid);
      console.log('[AdminPage] admin password exists:', hasAdminPassword);
      console.log('[AdminPage] admin token exists:', hasAdminReadToken);
    }
  }, [hasAdminPassword, hasAdminReadToken, urlValidation.exists, urlValidation.valid]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(
        `[AdminPage] auth state: ${isAuthenticated ? 'authenticated' : 'password-required'}`,
      );
    }
  }, [isAuthenticated]);

  const loadDashboard = useCallback(async () => {
    if (!urlValidation.exists || !appConfig.googleAppsScriptWebAppUrl) {
      setDashboardError(
        'Admin backend is not configured. Add VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL and restart the app.',
      );
      setDashboard(null);
      return;
    }

    if (!urlValidation.valid || !urlValidation.url) {
      setDashboardError(
        'Admin backend URL is invalid. Use a deployed Google Apps Script URL ending with /exec.',
      );
      setDashboard(null);
      return;
    }

    if (!hasAdminReadToken) {
      setDashboardError(
        'Admin read token is missing. Add VITE_ADMIN_READ_TOKEN and restart the app.',
      );
      setDashboard(null);
      return;
    }

    setIsLoading(true);
    setDashboardError('');

    const endpoint = new URL(urlValidation.url.toString());
    endpoint.searchParams.set('action', 'dashboard');
    endpoint.searchParams.set('adminToken', appConfig.adminReadToken);
    const redactedEndpoint = redactAdminTokenInUrl(endpoint);
    const currentAction: DashboardAction = 'dashboard';

    if (import.meta.env.DEV) {
      console.log('[AdminPage] dashboard request action:', 'dashboard');
      console.log('[AdminPage] dashboard request URL:', redactedEndpoint);
      console.log('[AdminPage] backend URL exists:', urlValidation.exists);
      console.log('[AdminPage] backend URL valid:', urlValidation.valid);
      console.log('[AdminPage] admin token exists:', hasAdminReadToken);
      console.log('[AdminPage] hasScriptUrl:', Boolean(appConfig.googleAppsScriptWebAppUrl));
      console.log('[AdminPage] scriptUrlLooksValid:', urlValidation.valid);
      console.log('[AdminPage] hasAdminToken:', hasAdminReadToken);
      console.log('[AdminPage] fetch method:', 'GET');
      console.log('[AdminPage] fetch mode:', 'cors');
      console.log('[AdminPage] backend URL is /exec:', endpoint.pathname.endsWith('/exec'));
      console.log('[AdminPage] backend URL is /dev:', endpoint.pathname.endsWith('/dev'));
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ADMIN_READ_TIMEOUT_MS);

    try {
      let parsedFromJsonp = false;
      let raw = '';
      let responseStatus = 0;
      let responseContentType = '';

      try {
        const response = await fetch(endpoint.toString(), {
          method: 'GET',
          signal: controller.signal,
        });

        responseStatus = response.status;
        responseContentType = response.headers.get('content-type') || '';
        raw = await response.text();
      } catch (fetchError) {
        if (!(fetchError instanceof TypeError)) {
          throw fetchError;
        }

        if (import.meta.env.DEV) {
          console.log('[AdminPage] fetch failed, attempting JSONP fallback:', fetchError.message);
        }

        const jsonpPayload = await loadViaJsonp(endpoint);
        parsedFromJsonp = true;

        if (jsonpPayload.success === false) {
          throw new Error(parseText(jsonpPayload.message, DEFAULT_ADMIN_ERROR), {
            cause: fetchError,
          });
        }

        raw = JSON.stringify(jsonpPayload);
      }

      if (import.meta.env.DEV) {
        console.log('[AdminPage] dashboard response status:', responseStatus || 'jsonp');
        console.log('[AdminPage] dashboard response content-type:', responseContentType || 'jsonp');
        console.log('[AdminPage] dashboard response source:', parsedFromJsonp ? 'jsonp' : 'fetch');
      }

      const parsed = parseDashboardResponse(raw);
      setDashboard(parsed);
    } catch (error) {
      let message = DEFAULT_ADMIN_ERROR;

      if (error instanceof DOMException && error.name === 'AbortError') {
        message = 'Dashboard request timed out. Please retry in a moment.';
      } else if (error instanceof Error && error.message) {
        message = normalizeDashboardErrorMessage(error.message);
      }

      if (import.meta.env.DEV) {
        console.log('[AdminPage] dashboard request action:', currentAction);
        console.log('[AdminPage] dashboard request URL:', redactedEndpoint);
        console.log('[AdminPage] error name:', error instanceof Error ? error.name : 'unknown');
        console.log('[AdminPage] error message:', error instanceof Error ? error.message : String(error));
        console.log('[AdminPage] response success false message:', message);
      }

      setDashboardError(message);
      setDashboard(null);
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
    }
  }, [hasAdminReadToken, urlValidation.exists, urlValidation.url, urlValidation.valid]);

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasAdminPassword) {
      setAuthError('Admin password is not configured. Add VITE_ADMIN_PASSWORD and restart the app.');
      return;
    }

    if (password.trim() !== appConfig.adminPassword) {
      setAuthError('Incorrect password. Please try again.');
      return;
    }

    setAuthError('');
    setIsAuthenticated(true);
    void loadDashboard();
  };

  if (!isAuthenticated) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-white md:px-12">
        <div className="mx-auto max-w-md border border-white/15 bg-black/30 p-7 md:p-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-brand-gold">DOTFUMES Admin</p>
          <h1 className="mt-6 font-serif text-4xl italic leading-tight">Secure Access</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            Enter the admin password to access the operational control room.
          </p>

          <form onSubmit={handleUnlock} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.25em] text-white/45">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (authError) {
                    setAuthError('');
                  }
                }}
                className="mt-2 w-full border border-white/20 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold"
                autoComplete="current-password"
                required
              />
            </label>

            {authError ? (
              <p className="border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
                {authError}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full border border-brand-gold/60 bg-brand-gold px-4 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-black transition-colors hover:bg-white"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </section>
    );
  }

  const summary = dashboard?.summary;
  const currency = dashboard?.currency || 'USD';

  return (
    <section className="min-h-screen bg-brand-white px-6 pb-20 pt-20 text-brand-black md:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="border border-black/10 bg-white p-6 md:p-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-brand-gold">DOTFUMES Admin</p>
          <h1 className="mt-5 font-serif text-4xl italic leading-tight md:text-5xl">Control Room</h1>
          <p className="mt-3 text-sm text-black/60">
            Read-only operational dashboard for orders, payments, and stock visibility.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              void loadDashboard();
            }}
            disabled={isLoading}
            className="border border-black/20 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.28em] text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              setPassword('');
              setDashboard(null);
              setDashboardError('');
            }}
            className="border border-black/20 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.28em] text-black/75 transition-colors hover:bg-black hover:text-white"
          >
            Lock Admin
          </button>
        </div>

        {dashboardError ? (
          <div className="border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {dashboardError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Orders" value={summary ? String(summary.totalOrders) : '--'} />
          <MetricCard
            label="Total Revenue"
            value={summary ? `${currency} ${summary.totalRevenue.toFixed(2)}` : '--'}
          />
          <MetricCard
            label="Pending Payments"
            value={summary ? String(summary.pendingPayments) : '--'}
          />
          <MetricCard
            label="Verified Payments"
            value={summary ? String(summary.verifiedPayments) : '--'}
          />
          <MetricCard label="New Orders" value={summary ? String(summary.newOrders) : '--'} />
          <MetricCard
            label="Delivered Orders"
            value={summary ? String(summary.deliveredOrders) : '--'}
          />
          <MetricCard
            label="Best Selling Perfume"
            value={dashboard?.bestSellingPerfume?.name || 'N/A'}
          />
          <MetricCard
            label="Units Sold"
            value={dashboard?.bestSellingPerfume ? String(dashboard.bestSellingPerfume.unitsSold) : '0'}
          />
        </div>

        <DataSection title="Payment Verification Queue">
          <OrdersTable orders={dashboard?.paymentVerificationQueue ?? []} emptyLabel="No pending verification orders." />
        </DataSection>

        <DataSection title="Recent Orders">
          <OrdersTable orders={dashboard?.recentOrders ?? []} emptyLabel="No recent orders found." />
        </DataSection>

        <DataSection title="Low Stock Products">
          <ProductTable
            products={dashboard?.lowStockProducts ?? []}
            emptyLabel="No products are currently below the low-stock threshold."
          />
        </DataSection>

        <DataSection title="Product Stock Table">
          <ProductTable products={dashboard?.productStock ?? []} emptyLabel="No product rows found." />
        </DataSection>
      </div>
    </section>
  );
};

const MetricCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <article className="border border-black/10 bg-white p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-black/55">{label}</p>
      <p className="mt-2 text-lg font-medium text-black">{value}</p>
    </article>
  );
};

const DataSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-[11px] uppercase tracking-[0.3em] text-black/55">{title}</h2>
    <div className="overflow-x-auto border border-black/10 bg-white">{children}</div>
  </section>
);

const OrdersTable = ({ orders, emptyLabel }: { orders: AdminOrder[]; emptyLabel: string }) => {
  return (
    <table className="min-w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-black/10 bg-black/[0.02] text-[10px] uppercase tracking-[0.16em] text-black/60">
          <th className="px-4 py-3 font-semibold">Order ID</th>
          <th className="px-4 py-3 font-semibold">Created</th>
          <th className="px-4 py-3 font-semibold">Customer</th>
          <th className="px-4 py-3 font-semibold">Total</th>
          <th className="px-4 py-3 font-semibold">Payment</th>
          <th className="px-4 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold">Slip</th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-black/55" colSpan={7}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr key={`${order.orderId}-${order.createdAt}`} className="border-b border-black/5">
              <td className="px-4 py-4 font-medium">{order.orderId}</td>
              <td className="px-4 py-4">{order.createdAt || '—'}</td>
              <td className="px-4 py-4">{order.customerName}</td>
              <td className="px-4 py-4">${order.total.toFixed(2)}</td>
              <td className="px-4 py-4">{order.paymentStatus}</td>
              <td className="px-4 py-4">{order.orderStatus}</td>
              <td className="px-4 py-4">
                {order.slipUrl ? (
                  <a
                    href={order.slipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-black underline underline-offset-4"
                  >
                    View Slip
                  </a>
                ) : (
                  <span className="text-black/45">Unavailable</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

const ProductTable = ({
  products,
  emptyLabel,
}: {
  products: AdminProductStock[];
  emptyLabel: string;
}) => {
  return (
    <table className="min-w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-black/10 bg-black/[0.02] text-[10px] uppercase tracking-[0.16em] text-black/60">
          <th className="px-4 py-3 font-semibold">Name</th>
          <th className="px-4 py-3 font-semibold">Slug</th>
          <th className="px-4 py-3 font-semibold">Category</th>
          <th className="px-4 py-3 font-semibold">Price</th>
          <th className="px-4 py-3 font-semibold">Stock</th>
          <th className="px-4 py-3 font-semibold">Active</th>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-black/55" colSpan={6}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          products.map((product) => (
            <tr key={`${product.slug || product.name}-${product.stock}`} className="border-b border-black/5">
              <td className="px-4 py-4 font-medium">{product.name}</td>
              <td className="px-4 py-4">{product.slug || '—'}</td>
              <td className="px-4 py-4">{product.category}</td>
              <td className="px-4 py-4">${product.price.toFixed(2)}</td>
              <td className="px-4 py-4">{product.stock}</td>
              <td className="px-4 py-4">{product.active ? 'Yes' : 'No'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
