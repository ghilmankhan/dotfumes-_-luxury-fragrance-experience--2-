import { expect, test, type Page } from '@playwright/test';

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
    sessionStorage.removeItem('dotfumes-last-order');
    sessionStorage.removeItem('dotfumes-latest-order');
  });
});

const markFirstCartItemOverLimit = async (page: Page) => {
  await page.evaluate(() => {
    const raw = localStorage.getItem('dotfumes-cart');
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state || !Array.isArray(state.items) || state.items.length === 0) {
      return;
    }

    state.items = state.items.map((item: Record<string, unknown>, index: number) => {
      if (index !== 0) {
        return item;
      }

      const currentStock = Number(item.stock);
      const availableStock = Number.isFinite(currentStock) ? Math.max(1, Math.floor(currentStock)) : 1;

      return {
        ...item,
        quantity: availableStock + 5,
      };
    });

    localStorage.setItem('dotfumes-cart', JSON.stringify(parsed));
  });
};

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

  test('/order-confirmation success state shows order details and support actions', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'dotfumes-last-order',
        JSON.stringify({
          orderId: 'DF-20260524-ABCDE',
          createdAt: new Date().toISOString(),
          currency: 'USD',
          paymentMethod: 'bank-transfer',
          subtotal: 220,
          deliveryFee: 0,
          total: 220,
          paymentStatus: 'Pending Verification',
          orderStatus: 'New',
          submissionMode: 'google-sheets',
          whatsappMessage:
            'Hello Dotfumes Team, I just placed order request DF-20260524-ABCDE. Order Items: Bold Decision x1. Total: $220.00. Please confirm my Dotfumes order.',
          customer: {
            firstName: 'Amina',
            lastName: 'Khan',
            fullName: 'Amina Khan',
            email: 'amina@example.com',
            phone: '+923001112233',
            city: 'Karachi',
            address: 'Sunset Boulevard, Clifton',
          },
          items: [
            {
              id: 1,
              name: 'Bold Decision',
              slug: 'bold-decision',
              quantity: 1,
              unitPrice: 220,
              lineTotal: 220,
            },
          ],
          slip: {
            fileName: 'slip.png',
            fileSize: 1000,
            mimeType: 'image/png',
            referenceUrl: 'https://example.com/slip.png',
          },
        }),
      );
    });

    await page.goto('/order-confirmation');
    await expect(page.getByRole('heading', { name: /order request/i })).toBeVisible();
    await expect(page.getByText('DF-20260524-ABCDE')).toBeVisible();
    await expect(page.getByText(/copy order summary/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();

    const whatsappButton = page.getByRole('link', { name: /Send Order on WhatsApp/i });
    if ((await whatsappButton.count()) > 0) {
      await expect(whatsappButton).toHaveAttribute('href', /wa\.me/);
      await expect(whatsappButton).toHaveAttribute('href', /DF-20260524-ABCDE/);
      await expect(whatsappButton).toHaveAttribute('href', /Bold%20Decision/);
      await expect(whatsappButton).toHaveAttribute('href', /Total%3A%20%24220\.00/);
    } else {
      await expect(page.getByText(/WhatsApp support link unavailable/i)).toBeVisible();
    }
  });
});

test.describe('core interactions', () => {
  test('homepage has a clear shop CTA and it navigates to collection', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Shop Perfumes' }).first()).toBeVisible();
    await page.getByRole('link', { name: 'Shop Perfumes' }).first().click();
    await expect(page).toHaveURL(/\/collection$/);
  });

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
    await page.getByRole('link', { name: 'Shop Perfumes' }).first().click();
    await expect(page).toHaveURL(/\/collection$/);
  });

  test('header Shop link navigates to collection', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'Shop', exact: true }).click();
    await expect(page).toHaveURL(/\/collection$/);
  });

  test('collection product card opens product page', async ({ page }) => {
    await page.goto('/collection');
    await page.getByRole('heading', { name: 'Bold Decision' }).click();
    await expect(page).toHaveURL(/\/product\/bold-decision$/);
  });

  test('cart button opens cart drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Open cart/i }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  });

  test('mobile cart drawer keeps product details readable and checkout tappable while toast is visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();

    const drawer = page.getByRole('dialog', { name: 'Shopping cart' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Bold Decision' })).toBeVisible();
    await expect(drawer.getByLabel(/Decrease Bold Decision quantity/i)).toBeVisible();
    await expect(drawer.getByLabel(/Increase Bold Decision quantity/i)).toBeVisible();
    await expect(drawer.getByText('Subtotal', { exact: true })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Checkout' })).toBeVisible();
    await expect(page.getByText(/added to your selection/i)).toBeVisible();

    await drawer.getByRole('button', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test('add to cart from product page opens cart with product', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bold Decision' })).toBeVisible();
  });

  test('product page buy now sends customer to checkout with selected item', async ({ page }) => {
    await page.goto('/product/soft-promise');
    await page.getByRole('button', { name: /^Buy Now$/i }).first().click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { name: 'Your Selection' })).toBeVisible();
    await expect(page.locator('aside').getByText('Soft Promise', { exact: true })).toBeVisible();
  });

  test('cart checkout button navigates to checkout', async ({ page }) => {
    await page.goto('/product/first-meet');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test('checkout shows validation errors when required fields are missing', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByRole('button', { name: 'Place Order Request' }).click();

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

  test('checkout shows customer reassurance copy', async ({ page }) => {
    await page.goto('/checkout');
    const steps = page.getByLabel('Checkout steps');
    await expect(steps.getByText('1. Your Details')).toBeVisible();
    await expect(steps.getByText('2. Payment Proof')).toBeVisible();
    await expect(steps.getByText('3. Review & Submit')).toBeVisible();
    await expect(page.getByText(/What Happens Next/i)).toBeVisible();
    await expect(page.getByText(/Dotfumes reviews your payment proof manually/i)).toBeVisible();
    await expect(page.getByText(/contact you as early as possible/i).first()).toBeVisible();
  });

  test('cart blocks checkout when cart quantity exceeds available stock', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await markFirstCartItemOverLimit(page);

    await page.reload();
    await page.getByRole('button', { name: /Open cart/i }).click();

    await expect(page.getByText(/Some items are no longer available/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  test('checkout submit is blocked when cart quantity exceeds available stock', async ({ page }) => {
    await page.goto('/product/soft-promise');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await markFirstCartItemOverLimit(page);

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('button', { name: 'Place Order Request' })).toBeDisabled();
    await expect(page.getByText('Currently unavailable').first()).toBeVisible();
  });
});
