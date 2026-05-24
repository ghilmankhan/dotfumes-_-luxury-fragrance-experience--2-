import { expect, test } from '@playwright/test';

const appRoutes = [
  '/',
  '/collection',
  '/about',
  '/product/bold-decision',
  '/checkout',
  '/order-confirmation',
  '/shipping',
  '/returns',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/journal',
  '/sustainability',
  '/careers',
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('dotfumes-cart');
    sessionStorage.removeItem('dotfumes-latest-order');
  });
});

test.describe('route smoke', () => {
  for (const route of appRoutes) {
    test(`${route} opens`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await expect(page).not.toHaveTitle(/404/i);
    });
  }

  test('/admin opens with lock screen', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Secure Access' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlock Dashboard' })).toBeVisible();
  });

  test('/random-test-page shows not found page', async ({ page }) => {
    await page.goto('/random-test-page');
    await expect(page.getByRole('heading', { name: /This page/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return Home' })).toBeVisible();
  });

  test('/order-confirmation shows fallback state when no session order exists', async ({ page }) => {
    await page.goto('/order-confirmation');
    await expect(page.getByRole('heading', { name: /No recent order/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to Checkout' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Collection' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact Support' })).toBeVisible();
  });
});

test.describe('core interactions', () => {
  test('homepage hero slide selectors are visible and interactive', async ({ page }) => {
    await page.goto('/');

    const selectors = [
      'Show Bold Decision hero',
      'Show Soft Promise hero',
      'Show Wild Silence hero',
      'Show Bleu Heat hero',
      'Show First Meet hero',
    ];

    for (const selector of selectors) {
      const button = page.getByRole('tab', { name: selector });
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('homepage hero primary CTA changes and routes by selected perfume', async ({ page }) => {
    test.slow();
    await page.goto('/');

    const heroSlides = [
      {
        selector: 'Show Bold Decision hero',
        ctaLabel: 'Explore Bold Decision',
        route: '/product/bold-decision',
      },
      {
        selector: 'Show Soft Promise hero',
        ctaLabel: 'Explore Soft Promise',
        route: '/product/soft-promise',
      },
      {
        selector: 'Show Wild Silence hero',
        ctaLabel: 'Explore Wild Silence',
        route: '/product/wild-silence',
      },
      {
        selector: 'Show Bleu Heat hero',
        ctaLabel: 'Explore Bleu Heat',
        route: '/product/bleu-heat',
      },
      {
        selector: 'Show First Meet hero',
        ctaLabel: 'Explore First Meet',
        route: '/product/first-meet',
      },
    ];

    for (const slide of heroSlides) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: slide.selector }).click();
      await expect(page.getByRole('link', { name: slide.ctaLabel })).toBeVisible();
      await page.getByRole('link', { name: slide.ctaLabel }).click();
      await expect(page).toHaveURL(new RegExp(`${slide.route}$`));
    }
  });

  test('homepage hero secondary CTA navigates to collection', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Show Wild Silence hero' }).click();
    await page.getByRole('link', { name: 'Explore Collection' }).first().click();
    await expect(page).toHaveURL(/\/collection$/);
  });

  test('header Collection link navigates to collection', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Collections' }).click();
    await expect(page).toHaveURL(/\/collection$/);
  });

  test('cart button opens cart drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Open cart/i }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  });

  test('add to cart from product page opens cart with product', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add \/ \$220\.00/i }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bold Decision' })).toBeVisible();
  });

  test('checkout shows validation errors when required fields are missing', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add \/ \$220\.00/i }).click();
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByText('Please enter your first name.')).toBeVisible();
    await expect(page.getByText('Please select your payment method.')).toBeVisible();
    await expect(page.getByText('Please upload your payment slip.')).toBeVisible();
  });

  test('footer support and policy links navigate to real pages', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    const links: Array<{ label: string; path: string }> = [
      { label: 'The Collection', path: '/collection' },
      { label: 'Our Story', path: '/about' },
      { label: 'The Journal', path: '/journal' },
      { label: 'Sustainability', path: '/sustainability' },
      { label: 'Careers', path: '/careers' },
      { label: 'Shipping', path: '/shipping' },
      { label: 'Returns', path: '/returns' },
      { label: 'Contact', path: '/contact' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Privacy', path: '/privacy' },
      { label: 'Terms', path: '/terms' },
    ];

    for (const link of links) {
      await footer.getByRole('link', { name: link.label }).click();
      await expect(page).toHaveURL(new RegExp(`${link.path}$`));
      await page.goto('/');
    }
  });

  test('coming-soon footer items are labeled and non-navigating', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');

    await expect(footer.getByText('Limited Editions', { exact: true })).toBeVisible();
    await expect(footer.getByText('Discovery Set', { exact: true })).toBeVisible();
    await expect(footer.getByText('Gift Cards', { exact: true })).toBeVisible();

    await expect(footer.getByRole('link', { name: 'Limited Editions' })).toHaveCount(0);
    await expect(footer.getByRole('link', { name: 'Discovery Set' })).toHaveCount(0);
    await expect(footer.getByRole('link', { name: 'Gift Cards' })).toHaveCount(0);

    await expect(footer.getByText('Opening soon').first()).toBeVisible();
  });

  test('footer links do not route to checkout unless checkout CTA', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    const hrefs = await footer.locator('a').evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href')),
    );

    expect(hrefs.some((href) => href?.includes('/checkout'))).toBeFalsy();
  });

  test('mobile checkout shows heading before selection summary', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/checkout');

    const checkoutHeading = page.getByRole('heading', { name: /Complete/i });
    const selectionHeading = page.getByRole('heading', { name: 'Your Selection' });

    await expect(checkoutHeading).toBeVisible();
    await expect(selectionHeading).toBeVisible();

    const headingBox = await checkoutHeading.boundingBox();
    const selectionBox = await selectionHeading.boundingBox();

    expect(headingBox).not.toBeNull();
    expect(selectionBox).not.toBeNull();
    expect((headingBox?.y ?? 0) < (selectionBox?.y ?? 0)).toBeTruthy();
  });
});
