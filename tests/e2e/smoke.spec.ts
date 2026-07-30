import { expect, test, type Page } from '@playwright/test';
import { checkoutContract } from '../../src/contracts/checkout.contract';

const checkoutFields = checkoutContract.fields;

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
  await page.route(
    (url) => url.hostname !== '127.0.0.1' && url.hostname !== 'localhost',
    async (route) => {
      if (route.request().resourceType() !== 'fetch') {
        await route.continue();
        return;
      }

      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            products: [],
            settings: { sheetProductDatabase: false },
          }),
        });
        return;
      }

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orderId: 'DF-E2E-CHECKOUT',
          message: 'Order request received.',
        }),
      });
    },
  );

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
      const availableStock = Number.isFinite(currentStock)
        ? Math.max(1, Math.floor(currentStock))
        : 1;

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

  test('/order-confirmation shows fallback state when no session order exists', async ({
    page,
  }) => {
    await page.goto('/order-confirmation');
    await expect(page.getByRole('heading', { name: /No recent order/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to Checkout' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Collection' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact Support' })).toBeVisible();
  });

  test('/order-confirmation success state shows order details and support actions', async ({
    page,
  }) => {
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
  test('page exposes one main landmark and a working skip link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('main')).toHaveCount(1);
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await skipLink.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('keyboard focus uses the shared gold ring', async ({ page }) => {
    await page.goto('/');

    const shopLink = page.getByRole('navigation').getByRole('link', { name: 'Shop', exact: true });
    await shopLink.focus();
    await expect(shopLink).toBeFocused();
    await expect(shopLink).toHaveCSS('outline-style', 'solid');
    await expect(shopLink).toHaveCSS('outline-width', '2px');
  });

  test('product artwork uses a native link', async ({ page }) => {
    await page.goto('/collection');

    const productLink = page.getByRole('link', { name: 'View Bold Decision' }).first();
    await expect(productLink).toHaveAttribute('href', '/product/bold-decision');
  });

  test('reduced motion disables smooth scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('html')).not.toHaveClass(/lenis/);
  });

  test('reduced motion disables smooth hash navigation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const scrollBehaviors: Array<ScrollBehavior | undefined> = [];
      Object.defineProperty(window, '__dotfumesScrollBehaviors', {
        configurable: true,
        value: scrollBehaviors,
      });
      Element.prototype.scrollIntoView = function scrollIntoView(
        options?: boolean | ScrollIntoViewOptions,
      ) {
        scrollBehaviors.push(typeof options === 'object' ? options.behavior : undefined);
      };
    });

    await page.goto('/about#ethics');
    await expect(page.locator('#ethics')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __dotfumesScrollBehaviors?: Array<ScrollBehavior | undefined> })
              .__dotfumesScrollBehaviors?.[0],
        ),
      )
      .toBe('auto');
  });

  test('reduced motion disables smooth checkout error recovery', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/product/bold-decision');
    await page
      .getByRole('button', { name: /Add to Cart/i })
      .first()
      .click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.evaluate(() => {
      const scrollBehaviors: Array<ScrollBehavior | undefined> = [];
      Object.defineProperty(window, '__dotfumesScrollBehaviors', {
        configurable: true,
        value: scrollBehaviors,
      });
      Element.prototype.scrollIntoView = function scrollIntoView(
        options?: boolean | ScrollIntoViewOptions,
      ) {
        scrollBehaviors.push(typeof options === 'object' ? options.behavior : undefined);
      };
    });

    await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __dotfumesScrollBehaviors?: Array<ScrollBehavior | undefined> })
              .__dotfumesScrollBehaviors?.[0],
        ),
      )
      .toBe('auto');
  });

  test('reduced motion fully disables animations, transitions, and CTA transforms', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const heroCta = page.getByRole('link', { name: 'Explore Bold Decision' });
    await heroCta.hover();
    await page.mouse.down();

    const motionState = await page.evaluate(() => {
      const parseTimeList = (value: string) =>
        value.split(',').map((time) => {
          const normalized = time.trim();
          return normalized.endsWith('ms')
            ? Number.parseFloat(normalized)
            : Number.parseFloat(normalized) * 1000;
        });

      const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
      const violations = elements.flatMap((element) => {
        const styles = getComputedStyle(element);
        const transitionMs = parseTimeList(styles.transitionDuration);

        return styles.animationName !== 'none' || transitionMs.some((duration) => duration > 0)
          ? [
              {
                tag: element.tagName,
                animationName: styles.animationName,
                transitionDuration: styles.transitionDuration,
              },
            ]
          : [];
      });

      return {
        runningAnimations: document
          .getAnimations()
          .filter((animation) => animation.playState === 'running').length,
        violations,
      };
    });

    await expect(heroCta).toHaveCSS('transform', 'none');
    expect(motionState.runningAnimations).toBe(0);
    expect(motionState.violations).toEqual([]);
    await page.mouse.up();
  });

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

  test('mobile navigation releases its modal state at the desktop breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

    const desktopShopLink = page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Shop', exact: true });
    await desktopShopLink.focus();
    await expect(desktopShopLink).toBeFocused();
  });

  test('mobile cart drawer keeps product details readable and checkout tappable while toast is visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/product/bold-decision');
    await page
      .getByRole('button', { name: /Add to Cart/i })
      .first()
      .click();

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

  test('toast dismiss control keeps a full touch target', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/product/bold-decision');
    await page
      .getByRole('button', { name: /Add to Cart/i })
      .first()
      .click();

    const dismissButton = page.getByRole('button', { name: 'Dismiss notification' });
    await expect(dismissButton).toBeVisible();
    const buttonBox = await dismissButton.boundingBox();

    expect(buttonBox).not.toBeNull();
    expect(buttonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('product page buy now sends customer to checkout with selected item', async ({ page }) => {
    await page.goto('/product/soft-promise');
    await page
      .getByRole('button', { name: /^Buy Now$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { name: 'Reserved for You' })).toBeVisible();
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

    const guidanceButton = page.getByRole('button', { name: 'Reserve Your Selection' });
    await expect(guidanceButton).toBeEnabled();
    await guidanceButton.click();
    await expect(page.getByText(checkoutFields.firstName.messages.required)).toBeVisible();
    await expect(page.getByLabel(checkoutFields.firstName.label)).toBeFocused();

    await page.getByLabel(checkoutFields.firstName.label).blur();
    await page.locator(`input[name="${checkoutFields.paymentMethod.name}"]`).first().focus();
    await page.locator(`input[name="${checkoutFields.paymentMethod.name}"]`).first().blur();
    await page.locator(`input[name="${checkoutContract.slip.name}"]`).focus();
    await page.locator(`input[name="${checkoutContract.slip.name}"]`).blur();

    await expect(page.getByText(checkoutFields.firstName.messages.required)).toBeVisible();
    await expect(page.getByText(checkoutFields.paymentMethod.messages.required)).toBeVisible();
    await expect(page.getByText(checkoutContract.slip.messages.required)).toBeVisible();
  });

  test('checkout guidance remains actionable and names the next useful step', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();

    const firstName = page.getByLabel(checkoutFields.firstName.label);
    await expect(page.getByRole('button', { name: 'Reserve Your Selection' })).toBeEnabled();

    await firstName.fill('Amina');
    await expect(page.getByRole('button', { name: 'Continue Your Private Order' })).toBeEnabled();

    for (const fieldName of checkoutContract.steps[0].fields) {
      const field = checkoutFields[fieldName];
      await page.getByLabel(field.label).fill(checkoutContract.testFixtures.validValues[fieldName]);
    }

    await expect(page.getByRole('button', { name: 'Choose Payment Method' })).toBeEnabled();

    const paymentMethod = checkoutContract.paymentMethods[0];
    await page.getByText(paymentMethod.label, { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Private Confirmation' })).toBeEnabled();

    await page.locator(`input[name="${checkoutContract.slip.name}"]`).setInputFiles({
      name: checkoutContract.testFixtures.validSlip.name,
      mimeType: checkoutContract.testFixtures.validSlip.type,
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });

    await expect(page.getByRole('button', { name: /^Send for Private Review - / })).toBeEnabled();
  });

  test('checkout hidden controls expose visible focus on their labels', async ({ page }) => {
    await page.goto('/checkout');

    const paymentInput = page.locator(`input[name="${checkoutFields.paymentMethod.name}"]`).first();
    const paymentLabel = paymentInput.locator('xpath=..');
    await paymentInput.focus();
    await expect(paymentInput).toBeFocused();
    expect(await paymentLabel.evaluate((label) => getComputedStyle(label).boxShadow)).not.toBe(
      'none',
    );

    const slipInput = page.locator(`input[name="${checkoutContract.slip.name}"]`);
    const slipLabel = slipInput.locator('xpath=..');
    await slipInput.focus();
    await expect(slipInput).toBeFocused();
    expect(await slipLabel.evaluate((label) => getComputedStyle(label).boxShadow)).not.toBe('none');
  });

  test('checkout enables submission as soon as all required values are valid', async ({ page }) => {
    await page.goto('/product/bold-decision');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();

    for (const fieldName of checkoutContract.steps[0].fields) {
      const field = checkoutFields[fieldName];
      await page.getByLabel(field.label).fill(checkoutContract.testFixtures.validValues[fieldName]);
    }
    const paymentMethod = checkoutContract.paymentMethods[0];
    await page.getByText(paymentMethod.label, { exact: true }).click();
    await expect(
      page.locator(
        `input[name="${checkoutFields.paymentMethod.name}"][value="${paymentMethod.value}"]`,
      ),
    ).toBeChecked();
    await page.locator(`input[name="${checkoutContract.slip.name}"]`).setInputFiles({
      name: checkoutContract.testFixtures.validSlip.name,
      mimeType: checkoutContract.testFixtures.validSlip.type,
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await expect(page.locator(`input[name="${checkoutContract.slip.name}"]`)).toHaveJSProperty(
      'files.length',
      1,
    );
    const confirmationPreview = page.getByRole('img', {
      name: `Slip preview ${checkoutContract.testFixtures.validSlip.name}`,
    });
    const confirmationPreviewBox = await confirmationPreview.locator('..').boundingBox();
    expect(confirmationPreviewBox).not.toBeNull();
    expect(confirmationPreviewBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(384);

    const submitButton = page.getByRole('button', { name: /^Send for Private Review - / });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await expect(page).toHaveURL(/\/order-confirmation$/);
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
    const hrefs = await footer
      .locator('a')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')));

    expect(hrefs.some((href) => href?.includes('/checkout'))).toBeFalsy();
  });

  test('mobile footer status labels stay inside their navigation column', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/');

    const statusLabel = page.getByLabel('Limited Editions opening soon');
    const navigationColumn = statusLabel.locator('xpath=../../..');
    const statusBox = await statusLabel.boundingBox();
    const columnBox = await navigationColumn.boundingBox();

    expect(statusBox).not.toBeNull();
    expect(columnBox).not.toBeNull();
    expect((statusBox?.x ?? 0) + (statusBox?.width ?? 0)).toBeLessThanOrEqual(
      (columnBox?.x ?? 0) + (columnBox?.width ?? 0),
    );
  });

  test('mobile checkout keeps the reserved fragrance one interaction from the opening', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/product/soft-promise');
    await page
      .getByRole('button', { name: /^Buy Now$/i })
      .first()
      .click();

    const checkoutHeading = page.getByRole('heading', { name: 'Your selection, reserved.' });
    const summaryToggle = page.getByRole('button', { name: /Reserved for You/i });
    const deliveryHeading = page.getByRole('heading', {
      name: 'Where should we send your fragrance?',
    });

    await expect(checkoutHeading).toBeVisible();
    await expect(summaryToggle).toBeVisible();
    await expect(deliveryHeading).toBeVisible();

    const headingBox = await checkoutHeading.boundingBox();
    const summaryBox = await summaryToggle.boundingBox();
    const deliveryBox = await deliveryHeading.boundingBox();

    expect(headingBox).not.toBeNull();
    expect(summaryBox).not.toBeNull();
    expect(deliveryBox).not.toBeNull();
    expect((headingBox?.y ?? 0) < (summaryBox?.y ?? 0)).toBeTruthy();
    expect((summaryBox?.y ?? 0) < (deliveryBox?.y ?? 0)).toBeTruthy();

    await expect(summaryToggle).toHaveAttribute('aria-expanded', 'false');
    await summaryToggle.click();
    await expect(summaryToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Held for your private order', { exact: true })).toBeVisible();
  });

  test('checkout does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/checkout');

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));

    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  });

  test('checkout progress labels remain readable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/checkout');

    const progress = page.getByLabel(checkoutContract.progressLabel);
    for (const label of ['Delivery', 'Payment', 'Private Review']) {
      const dimensions = await progress.getByText(label, { exact: true }).evaluate((element) => ({
        visibleWidth: element.clientWidth,
        contentWidth: element.scrollWidth,
        textOverflow: getComputedStyle(element).textOverflow,
      }));

      expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.visibleWidth);
      expect(dimensions.textOverflow).not.toBe('ellipsis');
    }
  });

  test('checkout frames the order as a reservation with honest trust language', async ({
    page,
  }) => {
    await page.goto('/checkout');

    await expect(page.getByText('Private Order', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your selection, reserved.' })).toBeVisible();

    const progress = page.getByLabel(checkoutContract.progressLabel);
    for (const label of ['Delivery', 'Payment', 'Private Review']) {
      await expect(progress.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByText('Manual House Review', { exact: true })).toBeVisible();
    await expect(page.getByText('Order Reference', { exact: true })).toBeVisible();
    await expect(page.getByText(/not shown publicly/i)).toHaveCount(0);
    await expect(page.getByText(/secure payment/i)).toHaveCount(0);
  });

  test('checkout preserves all three payment choices and their selected state', async ({
    page,
  }) => {
    await page.goto('/checkout');

    for (const paymentMethod of checkoutContract.paymentMethods) {
      await expect(page.getByText(paymentMethod.label, { exact: true })).toBeVisible();
    }

    const easypaisa = checkoutContract.paymentMethods.find(
      (method) => method.value === 'easypaisa',
    );
    expect(easypaisa).toBeDefined();

    await page.getByText(easypaisa!.label, { exact: true }).click();
    await expect(
      page.locator(`input[name="${checkoutFields.paymentMethod.name}"][value="easypaisa"]`),
    ).toBeChecked();
    await expect(page.getByText(easypaisa!.note, { exact: true })).toBeVisible();
    await expect(page.getByText(/Easypaisa selected/i)).toBeVisible();
    await expect(page.getByText(/account number|wallet number/i)).toHaveCount(0);
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

  test('checkout submit is blocked when cart quantity exceeds available stock', async ({
    page,
  }) => {
    await page.goto('/product/soft-promise');
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await markFirstCartItemOverLimit(page);

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout$/);
    const reviewButton = page.getByRole('button', { name: 'Review Your Reserved Selection' });
    await expect(reviewButton).toBeEnabled();
    await reviewButton.click();
    await expect(page.getByText(/no longer available|out of stock/i).first()).toBeVisible();
    await expect(page.getByText('Out of stock — remove to continue').first()).toBeVisible();
  });
});
