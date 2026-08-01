import { FormEvent, useEffect, useState } from 'react';
import type { AuthenticatorAssuranceLevels, Session } from '@supabase/supabase-js';
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
const PRIVILEGED_ROLES = new Set(['admin', 'owner']);

// Legacy fast-path: the app_metadata.role JWT claim predates public.user_roles
// (see private.is_admin() in 20260730185111_baseline_remote_schema.sql) and is
// kept as an additive OR, matching the database-side authorization change in
// 20260801175838_add_granular_authorization_roles.sql. It never overrides a
// database-side denial — it only ever widens which sessions attempt the
// role/MFA flow below, all of which is still enforced server-side by RLS and
// the grant_role/revoke_role RPCs regardless of what the frontend decides.
const hasLegacyAdminClaim = (session: Session | null) =>
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

type EnrollMFAProps = {
  onEnrolled: () => void;
};

// Enrollment flow per https://supabase.com/docs/guides/auth/auth-mfa/totp:
// enroll() returns a QR code + secret, challenge() opens a verification
// attempt, verify() confirms the user has the secret loaded in their
// authenticator app. No TOTP secret is ever written to an application table
// or logged — Supabase Auth owns and stores it internally.
const EnrollAdminMFA = ({ onEnrolled }: EnrollMFAProps) => {
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
        if (enrollError) {
          throw enrollError;
        }
        if (!active) return;
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not start MFA enrollment.');
        }
      } finally {
        if (active) setIsPreparing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const supabase = getSupabaseClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;

      onEnrolled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12">
      <Card
        variant="dark"
        className="mx-auto max-w-md border-on-dark-subtle bg-surface-overlay-muted p-8 md:p-8"
      >
        <p className="text-caption uppercase tracking-wider text-brand-gold">DOTFUMES Admin</p>
        <h1 className="mt-6 font-sans text-title font-semibold leading-tight">
          Set Up Multi-Factor Authentication
        </h1>
        <p className="mt-4 text-body leading-7 text-on-dark-secondary">
          Admin and owner accounts require an authenticator app before the control room can be
          accessed. Scan this code with an app such as Google Authenticator or 1Password, then
          enter the 6-digit code it generates.
        </p>

        {isPreparing ? (
          <p className="mt-8 text-body text-on-dark-secondary">Preparing enrollment…</p>
        ) : (
          <>
            {qrCode ? (
              <img
                src={qrCode}
                alt="Scan with your authenticator app"
                className="mx-auto mt-8 h-48 w-48 bg-brand-white p-2"
              />
            ) : null}
            {secret ? (
              <p className="mt-4 break-all text-small text-on-dark-muted">
                Can&apos;t scan the code? Enter this key manually: <span className="font-mono">{secret}</span>
              </p>
            ) : null}

            <form onSubmit={handleVerify} className="mt-8 space-y-4" noValidate>
              <label className="block">
                <span className="text-small uppercase tracking-wide text-on-dark-muted">
                  Authenticator code
                </span>
                <Input
                  id="mfa-enroll-code"
                  name="code"
                  variant="dark"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="mt-2"
                  required
                />
              </label>

              {error ? (
                <p
                  className="border border-status-error bg-status-error-surface px-3 py-2 text-body text-red-200"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" variant="secondary" className="w-full" loading={isVerifying}>
                {isVerifying ? 'Verifying…' : 'Enable MFA'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </section>
  );
};

type MFAChallengeProps = {
  onVerified: () => void;
};

const AdminMFAChallenge = ({ onVerified }: MFAChallengeProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const supabase = getSupabaseClient();
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data.totp.find((factor) => factor.status === 'verified');
      if (!totpFactor) {
        throw new Error('No verified authenticator app found on this account.');
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;

      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12">
      <Card
        variant="dark"
        className="mx-auto max-w-md border-on-dark-subtle bg-surface-overlay-muted p-8 md:p-8"
      >
        <p className="text-caption uppercase tracking-wider text-brand-gold">DOTFUMES Admin</p>
        <h1 className="mt-6 font-sans text-title font-semibold leading-tight">Verify Your Identity</h1>
        <p className="mt-4 text-body leading-7 text-on-dark-secondary">
          Enter the 6-digit code from your authenticator app to continue to the control room. Lost
          access to your device? Contact another owner to have this factor unenrolled from your
          account — see the recovery guidance in
          docs/supabase-migration/20-admin-mfa-recovery-ux.md.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <label className="block">
            <span className="text-small uppercase tracking-wide text-on-dark-muted">
              Authenticator code
            </span>
            <Input
              id="mfa-challenge-code"
              name="code"
              variant="dark"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2"
              required
            />
          </label>

          {error ? (
            <p
              className="border border-status-error bg-status-error-surface px-3 py-2 text-body text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="secondary" className="w-full" loading={isVerifying}>
            {isVerifying ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
      </Card>
    </section>
  );
};

export const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(() => !isSupabaseBackendEnabled());
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  const [roles, setRoles] = useState<string[]>([]);
  const [authzChecked, setAuthzChecked] = useState(false);
  const [aalCurrentLevel, setAalCurrentLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [hasVerifiedTotp, setHasVerifiedTotp] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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

  // Re-derives role membership (public.get_my_roles(), the only role surface
  // exposed to the client — private.* helpers are not in the exposed API
  // schema on purpose) and the session's current MFA assurance level. Called
  // on initial load and after every auth state change, since either can
  // change independently of the other (e.g. verifying a TOTP challenge
  // changes aal without changing roles).
  const refreshAuthorization = async (activeSession: Session | null) => {
    if (!activeSession) {
      setRoles([]);
      setAalCurrentLevel(null);
      setHasVerifiedTotp(false);
      setAuthzChecked(true);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const [rolesResult, aalResult, factorsResult] = await Promise.all([
        supabase.rpc('get_my_roles'),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      const nextRoles = rolesResult.error ? [] : rolesResult.data ?? [];
      const nextAal = aalResult.error ? null : aalResult.data?.currentLevel ?? null;
      const nextHasVerifiedTotp =
        !factorsResult.error && factorsResult.data.totp.some((factor) => factor.status === 'verified');

      setRoles(nextRoles);
      setAalCurrentLevel(nextAal);
      setHasVerifiedTotp(nextHasVerifiedTotp);

      const nextIsPrivileged =
        hasLegacyAdminClaim(activeSession) || nextRoles.some((role) => PRIVILEGED_ROLES.has(role));
      if (nextIsPrivileged && nextAal === 'aal2') {
        void loadDashboard();
      }
    } finally {
      setAuthzChecked(true);
    }
  };

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) {
      return;
    }

    const supabase = getSupabaseClient();
    let active = true;
    let hadSession = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionChecked(true);
      hadSession = Boolean(data.session);
      void refreshAuthorization(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSessionExpiredNotice(hadSession);
        hadSession = false;
        setSession(null);
        setDashboard(null);
        setDashboardError('');
        void refreshAuthorization(null);
        return;
      }

      hadSession = Boolean(nextSession);
      setSession(nextSession);
      void refreshAuthorization(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // Mount-once subscription; refreshAuthorization is redefined every render
    // but reads only stable client/state setters, so it is intentionally
    // excluded rather than re-subscribing auth listeners on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPrivileged =
    hasLegacyAdminClaim(session) || roles.some((role) => PRIVILEGED_ROLES.has(role));
  const isVerified = isPrivileged && aalCurrentLevel === 'aal2';

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setSessionExpiredNotice(false);

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

      const signedInRoles = await supabase.rpc('get_my_roles');
      const signedInIsPrivileged =
        hasLegacyAdminClaim(data.session) ||
        (signedInRoles.data ?? []).some((role) => PRIVILEGED_ROLES.has(role));

      if (!signedInIsPrivileged) {
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

  const handleForgotPassword = async () => {
    setAuthError('');
    setResetEmailSent(false);

    if (!email.trim()) {
      setAuthError('Enter your email address above first, then click "Forgot password?" again.');
      return;
    }

    if (!isSupabaseBackendEnabled()) {
      setAuthError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }

    setIsSendingReset(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin`,
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not send the reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSetNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecoveryError('');

    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsPasswordRecovery(false);
      setNewPassword('');
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'Could not update the password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!sessionChecked || (session && !authzChecked)) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12" />
    );
  }

  if (isPasswordRecovery) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-20 pt-28 text-brand-white md:px-12">
        <Card
          variant="dark"
          className="mx-auto max-w-md border-on-dark-subtle bg-surface-overlay-muted p-8 md:p-8"
        >
          <p className="text-caption uppercase tracking-wider text-brand-gold">DOTFUMES Admin</p>
          <h1 className="mt-6 font-sans text-title font-semibold leading-tight">Set a New Password</h1>
          <form onSubmit={handleSetNewPassword} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="text-small uppercase tracking-wide text-on-dark-muted">
                New password
              </span>
              <Input
                id="recovery-password"
                name="password"
                variant="dark"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2"
                autoComplete="new-password"
                required
              />
            </label>
            {recoveryError ? (
              <p
                className="border border-status-error bg-status-error-surface px-3 py-2 text-body text-red-200"
                role="alert"
              >
                {recoveryError}
              </p>
            ) : null}
            <Button type="submit" variant="secondary" className="w-full" loading={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </Card>
      </section>
    );
  }

  if (!session || !isPrivileged) {
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

          {sessionExpiredNotice ? (
            <p className="mt-4 border border-on-dark-subtle bg-surface-overlay-muted px-3 py-2 text-body text-on-dark-secondary">
              Your session ended. Please sign in again.
            </p>
          ) : null}

          {resetEmailSent ? (
            <p className="mt-4 border border-on-dark-subtle bg-surface-overlay-muted px-3 py-2 text-body text-on-dark-secondary">
              If that email has an admin account, a password reset link is on its way.
            </p>
          ) : null}

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

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(true);
                void handleForgotPassword();
              }}
              disabled={isSendingReset}
              className="w-full text-center text-small text-on-dark-muted underline underline-offset-4"
            >
              {isForgotPassword && isSendingReset ? 'Sending…' : 'Forgot password?'}
            </button>
          </form>
        </Card>
      </section>
    );
  }

  if (!hasVerifiedTotp) {
    return (
      <EnrollAdminMFA
        onEnrolled={() => {
          void refreshAuthorization(session);
        }}
      />
    );
  }

  if (!isVerified) {
    return (
      <AdminMFAChallenge
        onVerified={() => {
          void refreshAuthorization(session);
        }}
      />
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
