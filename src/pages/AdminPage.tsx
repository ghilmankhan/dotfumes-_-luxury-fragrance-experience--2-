import { FormEvent, useState } from 'react';
import { appConfig } from '../lib/config';
import { usePageMeta } from '../hooks/usePageMeta';
import { Button } from '../components/ui/primitives/Button';
import { Card } from '../components/ui/primitives/Card';
import { Input } from '../components/ui/primitives/Input';
import { Grid } from '../components/ui/layout/Grid';
import { ensureArray, isRecord, parseNumber, parseText } from '../lib/normalize';
import {
  MetricCard,
  TableSkeleton,
  DataSection,
  OrdersTable,
  ProductTable,
} from '../components/admin';
import type { AdminOrder, AdminProductStock } from '../components/admin';

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

const adminUrlValidation = validateBackendUrl(appConfig.googleAppsScriptWebAppUrl);

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

  usePageMeta({
    title: 'Admin | DOTFUMES',
    description: 'Internal DOTFUMES operational dashboard.',
    path: '/admin',
    robots: 'noindex,nofollow',
  });

  const loadDashboard = async () => {
    if (!adminUrlValidation.exists || !appConfig.googleAppsScriptWebAppUrl) {
      setDashboardError(
        'Admin backend is not configured. Add VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL and restart the app.',
      );
      setDashboard(null);
      return;
    }

    if (!adminUrlValidation.valid || !adminUrlValidation.url) {
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

    const endpoint = new URL(adminUrlValidation.url.toString());
    endpoint.searchParams.set('action', 'dashboard');
    endpoint.searchParams.set('adminToken', appConfig.adminReadToken);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ADMIN_READ_TIMEOUT_MS);

    try {
      let raw = '';

      try {
        const response = await fetch(endpoint.toString(), {
          method: 'GET',
          signal: controller.signal,
        });

        raw = await response.text();
      } catch (fetchError) {
        if (!(fetchError instanceof TypeError)) {
          throw fetchError;
        }

        const jsonpPayload = await loadViaJsonp(endpoint);

        if (jsonpPayload.success === false) {
          throw new Error(parseText(jsonpPayload.message, DEFAULT_ADMIN_ERROR), {
            cause: fetchError,
          });
        }

        raw = JSON.stringify(jsonpPayload);
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

      setDashboardError(message);
      setDashboard(null);
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasAdminPassword) {
      setAuthError(
        'Admin password is not configured. Add VITE_ADMIN_PASSWORD and restart the app.',
      );
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
      <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12">
        <Card
          variant="dark"
          className="mx-auto max-w-md border-on-dark-subtle bg-surface-overlay-muted p-8 md:p-8"
        >
          <p className="text-caption uppercase tracking-wider text-brand-gold">DOTFUMES Admin</p>
          <p className="mt-3 inline-block border border-status-warning bg-status-warning-surface px-3 py-1.5 text-micro uppercase tracking-wide text-amber-200">
            Client-side preview dashboard — not production-auth secured
          </p>
          <h1 className="mt-6 font-serif text-4xl italic leading-tight">Secure Access</h1>
          <p className="mt-4 text-body leading-7 text-on-dark-secondary">
            Enter the admin password to access the operational control room.
          </p>

          <form onSubmit={handleUnlock} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="text-small uppercase tracking-wide text-on-dark-muted">
                Password
              </span>
              <Input
                id="admin-password"
                name="password"
                variant="dark"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (authError) {
                    setAuthError('');
                  }
                }}
                className="mt-2"
                autoComplete="current-password"
                aria-describedby={authError ? 'admin-password-error' : undefined}
                aria-invalid={Boolean(authError)}
                required
              />
            </label>

            {authError ? (
              <p
                id="admin-password-error"
                className="border border-status-error bg-status-error-surface px-3 py-2 text-body text-red-200"
                role="alert"
              >
                {authError}
              </p>
            ) : null}

            <Button type="submit" variant="secondary" className="w-full">
              Unlock Dashboard
            </Button>
          </form>
        </Card>
      </section>
    );
  }

  const summary = dashboard?.summary;
  const currency = dashboard?.currency || 'USD';

  return (
    <section className="min-h-screen bg-brand-white px-6 pb-20 pt-20 text-brand-black md:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card as="header" padding="responsive">
          <p className="text-caption uppercase tracking-wider text-brand-gold">DOTFUMES Admin</p>
          <p className="mt-3 inline-block border border-status-warning bg-status-warning-surface px-3 py-1.5 text-micro uppercase tracking-wide text-amber-700">
            Client-side preview dashboard — not production-auth secured
          </p>
          <h1 className="mt-4 font-serif text-4xl italic leading-tight md:text-5xl">
            Control Room
          </h1>
          <p className="mt-3 text-body text-on-light-secondary">
            Read-only operational dashboard for orders, payments, and stock visibility.
          </p>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              void loadDashboard();
            }}
            loading={isLoading}
          >
            {isLoading ? 'Refreshing…' : 'Refresh Dashboard'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsAuthenticated(false);
              setPassword('');
              setDashboard(null);
              setDashboardError('');
            }}
            disabled={isLoading}
          >
            Lock Admin
          </Button>
        </div>

        {dashboardError ? (
          <div className="border border-red-300 bg-red-50 p-4 text-body text-red-700" role="alert">
            {dashboardError}
          </div>
        ) : null}

        {isLoading && !dashboard ? (
          <Grid
            cols={{ md: 2, xl: 4 }}
            aria-label="Loading dashboard metrics"
            aria-live="polite"
            aria-busy="true"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-18 motion-safe:animate-pulse border border-on-light-muted bg-ink-subtle p-4"
              />
            ))}
          </Grid>
        ) : (
          <Grid cols={{ md: 2, xl: 4 }}>
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
              value={
                dashboard?.bestSellingPerfume ? String(dashboard.bestSellingPerfume.unitsSold) : '0'
              }
            />
          </Grid>
        )}

        <DataSection title="Payment Verification Queue">
          {isLoading && !dashboard ? (
            <TableSkeleton />
          ) : (
            <OrdersTable
              orders={dashboard?.paymentVerificationQueue ?? []}
              emptyLabel="No pending verification orders."
            />
          )}
        </DataSection>

        <DataSection title="Recent Orders">
          {isLoading && !dashboard ? (
            <TableSkeleton />
          ) : (
            <OrdersTable
              orders={dashboard?.recentOrders ?? []}
              emptyLabel="No recent orders found."
            />
          )}
        </DataSection>

        <DataSection title="Low Stock Products">
          {isLoading && !dashboard ? (
            <TableSkeleton />
          ) : (
            <ProductTable
              products={dashboard?.lowStockProducts ?? []}
              emptyLabel="No products are currently below the low-stock threshold."
            />
          )}
        </DataSection>

        <DataSection title="Product Stock Table">
          {isLoading && !dashboard ? (
            <TableSkeleton />
          ) : (
            <ProductTable
              products={dashboard?.productStock ?? []}
              emptyLabel="No product rows found."
            />
          )}
        </DataSection>
      </div>
    </section>
  );
};
