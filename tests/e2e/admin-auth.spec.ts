import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

// Local-only Supabase CLI defaults (printed by every `supabase start` run;
// signed with the CLI's well-known default local JWT secret — see
// supabase/config.toml, which does not override auth secrets). These are
// never valid against the remote project and grant access only to the
// Docker-local Postgres/Auth instance on 127.0.0.1. Used exclusively to
// provision deterministic Auth fixture users via the Admin API before each
// test, exactly as docs/supabase-migration/16-first-owner-and-mfa-runbook.md
// recommends for anything beyond disposable pgTAP fixtures.
const LOCAL_API_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const serviceClient = createClient(LOCAL_API_URL, LOCAL_SERVICE_ROLE_KEY);

const uniqueEmail = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.local`;

const createUser = async (email: string, password: string) => {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw error ?? new Error('createUser returned no user');
  }
  return data.user.id;
};

const createPrivilegedUser = async (email: string, password: string, role: 'admin' | 'owner') => {
  const userId = await createUser(email, password);
  const { error } = await serviceClient.rpc('grant_role', { target_user: userId, new_role: role });
  if (error) throw error;
  return userId;
};

// RFC 4226/6238 TOTP, implemented directly against Node's built-in `crypto`
// (no new dependency) so the enrollment/challenge tests below drive the real
// Supabase Auth MFA API with a genuinely valid code, rather than mocking or
// bypassing it.
const base32Decode = (input: string): Buffer => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const generateTotp = (secretBase32: string, timeStepSeconds = 30, digits = 6): string => {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binCode % 10 ** digits).padStart(digits, '0');
};

const PASSWORD = 'correct horse battery staple 9!';

test.describe('Admin authentication and MFA (Base Phase 3)', () => {
  test('unauthenticated visitor sees the sign-in card, never the dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Control Room' })).toHaveCount(0);
  });

  test('a signed-in customer (no privileged role) is denied admin access', async ({ page }) => {
    const email = uniqueEmail('customer');
    await createUser(email, PASSWORD);

    await page.goto('/admin');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('This account is not authorized as an admin.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Control Room' })).toHaveCount(0);
  });

  test('an admin without an enrolled factor sees the MFA enrollment screen, not the dashboard', async ({
    page,
  }) => {
    const email = uniqueEmail('admin-noenroll');
    await createPrivilegedUser(email, PASSWORD, 'admin');

    await page.goto('/admin');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'Set Up Multi-Factor Authentication' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Control Room' })).toHaveCount(0);
  });

  test('an admin can enroll a TOTP factor with a real code and reach the dashboard', async ({ page }) => {
    const email = uniqueEmail('admin-enroll');
    await createPrivilegedUser(email, PASSWORD, 'admin');

    await page.goto('/admin');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'Set Up Multi-Factor Authentication' })).toBeVisible();

    const secretText = await page.getByText(/Enter this key manually/).textContent();
    const secret = secretText?.split(':').pop()?.trim().replace(/\s+/g, '');
    expect(secret, 'manual-entry TOTP secret must be present in the enrollment screen').toBeTruthy();

    await page.getByLabel('Authenticator code').fill(generateTotp(secret as string));
    await page.getByRole('button', { name: 'Enable MFA' }).click();

    await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();
  });

  test('a previously-enrolled admin sees the MFA challenge (not enrollment) on a fresh sign-in, and a valid code unlocks the dashboard', async ({
    page,
  }) => {
    const email = uniqueEmail('admin-challenge');
    await createPrivilegedUser(email, PASSWORD, 'admin');

    // Enroll once via the real UI flow, then sign out to force a fresh aal1
    // session for the actual assertion below.
    await page.goto('/admin');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Set Up Multi-Factor Authentication' })).toBeVisible();
    const secretText = await page.getByText(/Enter this key manually/).textContent();
    const secret = secretText?.split(':').pop()?.trim().replace(/\s+/g, '') as string;
    await page.getByLabel('Authenticator code').fill(generateTotp(secret));
    await page.getByRole('button', { name: 'Enable MFA' }).click();
    await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Fresh sign-in: must go through the challenge screen, not enrollment
    // again, since a verified factor already exists.
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'Verify Your Identity' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Set Up Multi-Factor Authentication' })).toHaveCount(0);

    await page.getByLabel('Authenticator code').fill(generateTotp(secret));
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();
  });

  test('signing out returns to the sign-in card', async ({ page }) => {
    const email = uniqueEmail('admin-logout');
    await createPrivilegedUser(email, PASSWORD, 'admin');

    await page.goto('/admin');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Set Up Multi-Factor Authentication' })).toBeVisible();
    const secretText = await page.getByText(/Enter this key manually/).textContent();
    const secret = secretText?.split(':').pop()?.trim().replace(/\s+/g, '') as string;
    await page.getByLabel('Authenticator code').fill(generateTotp(secret));
    await page.getByRole('button', { name: 'Enable MFA' }).click();
    await expect(page.getByRole('heading', { name: 'Control Room' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign Out' }).click();

    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Control Room' })).toHaveCount(0);
  });

  test('forgot password triggers a reset request without erroring (locally testable up to email delivery)', async ({
    page,
  }) => {
    const email = uniqueEmail('admin-reset');
    await createPrivilegedUser(email, PASSWORD, 'admin');

    await page.goto('/admin');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(
      page.getByText('If that email has an admin account, a password reset link is on its way.'),
    ).toBeVisible();
  });
});
