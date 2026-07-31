import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseBackendEnabled } from '../lib/supabaseClient';
import { usePageMeta } from '../hooks/usePageMeta';
import { Button } from '../components/ui/primitives/Button';
import { Card } from '../components/ui/primitives/Card';
import { Input } from '../components/ui/primitives/Input';
import { Grid } from '../components/ui/layout/Grid';
import { isRecord, parseNumber, parseText } from '../lib/normalize';
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

const DEFAULT_ADMIN_ERROR = 'The dashboard is unavailable right now. Please refresh and try again.';
const LOW_STOCK_THRESHOLD = 3;
const SIGNED_SLIP_URL_TTL_SECONDS = 60 * 10;

const isAdminSession = (session: Session | null) =>
  Boolean(session && session.user.app_metadata?.role === 'admin');

const readCustomerName = (raw: Record<string, unknown>): string => {
  const direct = parseText(raw.customer_name ?? raw.customerName);
  if (direct) {
    return direct;
  }

  const customer = raw.customer;
  if (isRecord(customer)) {
    const fullName = parseText(customer.fullName);
    if (fullName) {
      return fullName;
    }
    const first = parseText(customer.firstName);
    const last = parseText(customer.lastName);
    const combined = `${first} ${last}`.trim();
    if (combined) {
      return combined;
    }
  }

  return 'Unknown Client';
};

const readSlipPath = (raw: Record<string, unknown>): string =>
  parseText(raw.slip_path ?? raw.slipPath ?? raw.slip);

const normalizeOrderRow = (raw: unknown): (AdminOrder & { slipPath: string }) | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const orderId = parseText(raw.order_code ?? raw.orderCode ?? raw.id ?? raw.order_id);
  if (!orderId) {
    return null;
  }

  return {
    orderId,
    createdAt: parseText(raw.created_at ?? raw.createdAt),
    customerName: readCustomerName(raw),
    total: parseNumber(raw.total),
    paymentStatus: parseText(raw.payment_status ?? raw.paymentStatus, 'Pending Verification'),
    orderStatus: parseText(raw.order_status ?? raw.orderStatus, 'New'),
    slipUrl: '',
    slipPath: readSlipPath(raw),
  };
};

const normalizeProductRow = (raw: unknown): AdminProductStock | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const name = parseText(raw.name);
  if (!name) {
    return null;
  }

  return {
    slug: parseText(raw.slug),
    name,
    price: parseNumber(raw.price),
    stock: parseNumber(raw.stock),
    active: Boolean(raw.active ?? true),
    category: parseText(raw.category, 'Uncategorized'),
  };
};

export const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(() => !isSupabaseBackendEnabled());
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);

  usePageMeta({
    title: 'Admin | DOTFUMES',
    description: 'Internal DOTFUMES operational dashboard.',
    path: '/admin',
    robots: 'noindex,nofollow',
  });

  const loadDashboard = async () => {
    if (!isSupabaseBackendEnabled()) {
      setDashboardError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }

    setIsLoading(true);
    setDashboardError('');

    try {
      const supabase = getSupabaseClient();

      const [ordersResult, productsResult] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
      ]);

      if (ordersResult.error) {
        throw new Error(ordersResult.error.message, { cause: ordersResult.error });
      }
      if (productsResult.error) {
        throw new Error(productsResult.error.message, { cause: productsResult.error });
      }

      const orderRows = (ordersResult.data ?? [])
        .map(normalizeOrderRow)
        .filter((row): row is AdminOrder & { slipPath: string } => Boolean(row));

      const slipPaths = orderRows.map((row) => row.slipPath).filter(Boolean);
      const signedUrlBySlipPath = new Map<string, string>();

      if (slipPaths.length > 0) {
        const signed = await Promise.all(
          slipPaths.map((path) =>
            supabase.storage
              .from('payment-slips')
              .createSignedUrl(path, SIGNED_SLIP_URL_TTL_SECONDS)
              .then((result) => ({ path, url: result.data?.signedUrl ?? '' }))
              .catch(() => ({ path, url: '' })),
          ),
        );
        signed.forEach(({ path, url }) => {
          if (url) {
            signedUrlBySlipPath.set(path, url);
          }
        });
      }

      const orders: AdminOrder[] = orderRows.map(({ slipPath, ...order }) => ({
        ...order,
        slipUrl: slipPath ? signedUrlBySlipPath.get(slipPath) ?? '' : '',
      }));

      const productStock = (productsResult.data ?? [])
        .map(normalizeProductRow)
        .filter((row): row is AdminProductStock => Boolean(row));

      const currency = 'USD';
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const pendingPayments = orders.filter(
        (order) => order.paymentStatus === 'Pending Verification',
      ).length;
      const verifiedPayments = orders.filter((order) => order.paymentStatus === 'Verified').length;
      const newOrders = orders.filter((order) => order.orderStatus === 'New').length;
      const deliveredOrders = orders.filter((order) => order.orderStatus === 'Delivered').length;

      const unitsSoldBySlug = new Map<string, { name: string; units: number }>();
      for (const order of ordersResult.data ?? []) {
        if (!isRecord(order)) continue;
        const items = Array.isArray(order.items) ? order.items : [];
        for (const item of items) {
          if (!isRecord(item)) continue;
          const slug = parseText(item.slug, parseText(item.name));
          if (!slug) continue;
          const name = parseText(item.name, slug);
          const quantity = parseNumber(item.quantity);
          const existing = unitsSoldBySlug.get(slug);
          unitsSoldBySlug.set(slug, { name, units: (existing?.units ?? 0) + quantity });
        }
      }
      const bestSellingEntry = [...unitsSoldBySlug.values()].sort((a, b) => b.units - a.units)[0];
      const bestSellingPerfume = bestSellingEntry
        ? { name: bestSellingEntry.name, unitsSold: bestSellingEntry.units }
        : null;

      const lowStockProducts = productStock.filter(
        (product) => product.active && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD,
      );

      setDashboard({
        currency,
        summary: {
          totalOrders: orders.length,
          totalRevenue,
          pendingPayments,
          verifiedPayments,
          newOrders,
          deliveredOrders,
        },
        bestSellingPerfume,
        lowStockProducts,
        recentOrders: orders.slice(0, 25),
        paymentVerificationQueue: orders.filter(
          (order) => order.paymentStatus === 'Pending Verification',
        ),
        productStock,
      });
    } catch (error) {
      setDashboard(null);
      setDashboardError(error instanceof Error ? error.message : DEFAULT_ADMIN_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) {
      return;
    }

    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionChecked(true);
      if (isAdminSession(data.session)) {
        void loadDashboard();
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (isAdminSession(nextSession)) {
        void loadDashboard();
      } else {
        setDashboard(null);
        setDashboardError('');
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');

    if (!isSupabaseBackendEnabled()) {
      setAuthError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }

    setIsSigningIn(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!isAdminSession(data.session)) {
        await supabase.auth.signOut();
        setAuthError('This account is not authorized as an admin.');
        return;
      }

      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseBackendEnabled()) {
      return;
    }
    await getSupabaseClient().auth.signOut();
    setDashboard(null);
    setDashboardError('');
  };

  if (!sessionChecked) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12" />
    );
  }

  if (!isAdminSession(session)) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12">
        <Card
          variant="dark"
          className="mx-auto max-w-md border-on-dark-subtle bg-surface-overlay-muted p-8 md:p-8"
        >
          <p className="text-caption uppercase tracking-wider text-brand-gold">DOTFUMES Admin</p>
          <h1 className="mt-6 font-sans text-title font-semibold leading-tight">Secure Access</h1>
          <p className="mt-4 text-body leading-7 text-on-dark-secondary">
            Sign in with your Supabase admin account to access the operational control room.
          </p>

          <form onSubmit={handleSignIn} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="text-small uppercase tracking-wide text-on-dark-muted">Email</span>
              <Input
                id="admin-email"
                name="email"
                variant="dark"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2"
                autoComplete="username"
                required
              />
            </label>

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
                onChange={(event) => setPassword(event.target.value)}
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

            <Button type="submit" variant="secondary" className="w-full" loading={isSigningIn}>
              {isSigningIn ? 'Signing in…' : 'Sign In'}
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
          <h1 className="mt-4 font-sans text-title font-semibold leading-tight">Control Room</h1>
          <p className="mt-3 text-body text-on-light-secondary">
            Live operational dashboard for orders, payments, and stock — backed directly by Supabase.
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
          <Button variant="outline" onClick={() => void handleSignOut()} disabled={isLoading}>
            Sign Out
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
            <OrdersTable orders={dashboard?.recentOrders ?? []} emptyLabel="No recent orders found." />
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
            <ProductTable products={dashboard?.productStock ?? []} emptyLabel="No product rows found." />
          )}
        </DataSection>
      </div>
    </section>
  );
};
