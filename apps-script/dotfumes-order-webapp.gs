/**
 * DOTFUMES Lightweight Order Backend (Google Apps Script)
 *
 * Required Script Properties for order POST:
 * - SHEET_ID
 * - DRIVE_FOLDER_ID
 * - OWNER_EMAIL
 * - BUSINESS_WHATSAPP_NUMBER
 *
 * Additional required property for admin read endpoints:
 * - ADMIN_READ_TOKEN
 *
 * Optional Script Properties:
 * - PUBLIC_FORM_TOKEN
 * - SHEET_NAME
 * - ORDERS_SHEET_NAME (default: Orders)
 * - PRODUCTS_SHEET_NAME (default: Products)
 * - SETTINGS_SHEET_NAME (default: Settings)
 */

const ORDER_COLUMNS = [
  'Order ID',
  'Created At',
  'Customer Name',
  'Phone',
  'Email',
  'City',
  'Address',
  'Products',
  'Quantity Summary',
  'Subtotal',
  'Delivery Fee',
  'Total',
  'Payment Method',
  'Slip File Name',
  'Slip URL',
  'Payment Status',
  'Order Status',
  'WhatsApp Message',
  'Admin Notes',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = {
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true,
  'application/pdf': true,
};

const PRODUCTS_COLUMNS_REQUIRED = [
  'Product ID',
  'Slug',
  'Name',
  'Price',
  'Stock',
  'Active',
  'Category',
  'Short Description',
  'Top Notes',
  'Heart Notes',
  'Base Notes',
  'Tagline',
  'Gender/Positioning',
  'Updated At',
];

const SETTINGS_COLUMNS_REQUIRED = ['Key', 'Value', 'Description'];

function doGet(e) {
  try {
    const action = sanitizeText_(e && e.parameter && e.parameter.action, 80).toLowerCase();
    const props = getScriptProperties_();

    if (!action) {
      return responseErrorForGet_(e, 'Missing action query parameter.');
    }

    if (!sanitizeText_(props.SHEET_ID, 300)) {
      return responseErrorForGet_(e, 'Missing script property: SHEET_ID');
    }

    const spreadsheet = SpreadsheetApp.openById(props.SHEET_ID);

    if (action === 'dashboard') {
      assertAdminToken_(e, props);
      return responseSuccessForGet_(e, buildDashboardPayload_(spreadsheet, props));
    }

    if (action === 'orders') {
      assertAdminToken_(e, props);
      return responseSuccessForGet_(e, { orders: readOrders_(spreadsheet, props) });
    }

    if (action === 'products') {
      const settings = readSettings_(spreadsheet, props);
      const threshold = resolveLowStockThreshold_(settings);
      const products = readProducts_(spreadsheet, props, threshold);
      return responseSuccessForGet_(e, {
        products,
        settings: resolveSettingsForFrontend_(settings),
      });
    }

    if (action === 'settings') {
      const settings = readSettings_(spreadsheet, props);
      return responseSuccessForGet_(e, {
        raw: settings,
        resolved: resolveSettingsForFrontend_(settings),
      });
    }

    return responseErrorForGet_(e, `Unsupported action: ${action}`);
  } catch (error) {
    return responseErrorForGet_(
      e,
      error instanceof Error ? error.message : 'Unexpected dashboard error.',
    );
  }
}

function doPost(e) {
  let stockLock = null;
  try {
    const properties = getPropertiesForPost_();
    const payload = parseIncomingPayload_(e);

    validatePayload_(payload, properties);

    const order = payload.order;
    const slip = payload.slip;

    const now = new Date();
    const orderId = sanitizeText_(order.orderId, 64) || generateOrderId_(now);
    const createdAt = sanitizeText_(order.createdAt, 64) || now.toISOString();
    const spreadsheet = SpreadsheetApp.openById(properties.SHEET_ID);
    const settings = readSettings_(spreadsheet, properties);
    const frontendSettings = resolveSettingsForFrontend_(settings);
    const sheetProductDatabaseEnabled = frontendSettings.sheetProductDatabase;
    const allowOutOfStockCheckout = frontendSettings.allowOutOfStockCheckout;

    const stockValidatedProducts = normalizeOrderProductsForStock_(order.products);
    let stockDecrementPlan = [];

    if (sheetProductDatabaseEnabled) {
      stockLock = LockService.getScriptLock();
      stockLock.waitLock(30000);

      const threshold = resolveLowStockThreshold_(settings);
      const productSheetState = readProductSheetState_(spreadsheet, properties, threshold);
      const validationResult = validateOrderProductsAgainstSheet_(
        stockValidatedProducts,
        productSheetState.rows,
        allowOutOfStockCheckout,
      );

      if (!validationResult.ok) {
        throw new Error(validationResult.message);
      }

      stockDecrementPlan = validationResult.decrementPlan;
    }

    const uploadedSlip = uploadSlipFile_(slip, orderId, properties.DRIVE_FOLDER_ID);

    const paymentStatus = sanitizeText_(order.paymentStatus, 80) || 'Pending Verification';
    const orderStatus = sanitizeText_(order.orderStatus, 80) || 'New';

    const whatsappMessage =
      sanitizeText_(order.whatsappMessage, 4000) ||
      buildWhatsAppMessage_(
        {
          orderId,
          customerName: order.customerName,
          quantitySummary: order.quantitySummary,
          total: order.total,
          paymentMethod: order.paymentMethod,
        },
        uploadedSlip.url,
      );

    saveOrderRow_(
      {
        orderId,
        createdAt,
        customerName: sanitizeText_(order.customerName, 120),
        phone: sanitizeText_(order.phone, 50),
        email: sanitizeText_(order.email, 120),
        city: sanitizeText_(order.city, 80),
        address: sanitizeText_(order.address, 250),
        products: formatProductsForSheet_(order.products),
        quantitySummary: sanitizeText_(order.quantitySummary, 500),
        subtotal: toNumber_(order.subtotal),
        deliveryFee: toNumber_(order.deliveryFee),
        total: toNumber_(order.total),
        paymentMethod: sanitizeText_(order.paymentMethod, 50),
        slipFileName: sanitizeText_(uploadedSlip.fileName, 180),
        slipUrl: sanitizeText_(uploadedSlip.url, 1000),
        paymentStatus,
        orderStatus,
        whatsappMessage,
        adminNotes: sanitizeText_(order.adminNotes, 500),
      },
      properties,
    );

    if (sheetProductDatabaseEnabled && stockDecrementPlan.length > 0) {
      applyStockDecrementPlan_(spreadsheet, properties, stockDecrementPlan, allowOutOfStockCheckout);
    }

    const notificationOrder = {
      orderId,
      customerName: sanitizeText_(order.customerName, 120),
      phone: sanitizeText_(order.phone, 50),
      email: sanitizeText_(order.email, 120),
      city: sanitizeText_(order.city, 80),
      address: sanitizeText_(order.address, 250),
      quantitySummary: sanitizeText_(order.quantitySummary, 500),
      total: toNumber_(order.total),
      paymentMethod: sanitizeText_(order.paymentMethod, 50),
      slipUrl: uploadedSlip.url,
    };

    try {
      sendOwnerNotification_(notificationOrder, properties.OWNER_EMAIL);
    } catch (emailError) {
      Logger.log(`Owner email failed for ${orderId}: ${emailError}`);
    }

    if (notificationOrder.email) {
      try {
        sendCustomerConfirmation_(
          notificationOrder,
          notificationOrder.email,
          properties.BUSINESS_WHATSAPP_NUMBER,
          properties.OWNER_EMAIL,
        );
      } catch (emailError) {
        Logger.log(`Customer email failed for ${orderId}: ${emailError}`);
      }
    }

    const whatsappUrl = buildWhatsAppUrl_(
      properties.BUSINESS_WHATSAPP_NUMBER,
      buildWhatsAppMessage_(
        {
          orderId,
          customerName: sanitizeText_(order.customerName, 120),
          quantitySummary: sanitizeText_(order.quantitySummary, 500),
          total: toNumber_(order.total),
          paymentMethod: sanitizeText_(order.paymentMethod, 50),
        },
        uploadedSlip.url,
      ),
    );

    return responseSuccess_(
      {
        orderId,
        slipUrl: uploadedSlip.url,
        driveFileId: uploadedSlip.fileId,
        whatsappUrl,
      },
      'Order stored successfully.',
      {
        orderId,
        slipUrl: uploadedSlip.url,
        driveFileId: uploadedSlip.fileId,
        whatsappUrl,
      },
    );
  } catch (error) {
    return responseError_(error instanceof Error ? error.message : 'Unexpected order processing error.');
  } finally {
    if (stockLock) {
      try {
        stockLock.releaseLock();
      } catch (_lockError) {
        // ignore lock release failures
      }
    }
  }
}

function assertAdminToken_(e, props) {
  const expectedToken = sanitizeText_(props.ADMIN_READ_TOKEN, 500);
  if (!expectedToken) {
    throw new Error('Missing script property: ADMIN_READ_TOKEN');
  }

  const suppliedToken = sanitizeText_(
    (e && e.parameter && (e.parameter.adminToken || e.parameter.token)) || '',
    500,
  );

  if (!suppliedToken || suppliedToken !== expectedToken) {
    throw new Error('Unauthorized admin read token.');
  }
}

function buildDashboardPayload_(spreadsheet, props) {
  const settings = readSettings_(spreadsheet, props);
  const orders = readOrders_(spreadsheet, props);
  const threshold = resolveLowStockThreshold_(settings);
  const products = readProducts_(spreadsheet, props, threshold);

  const metrics = computeOrderMetrics_(orders);
  const bestSellingPerfume = computeBestSellingPerfume_(orders);

  const lowStockProducts = products
    .filter(function (product) {
      return product.stock <= threshold;
    })
    .sort(function (a, b) {
      return a.stock - b.stock;
    });

  const recentOrders = orders.slice(0, 12);
  const paymentVerificationQueue = orders.filter(function (order) {
    return normalizeStatus_(order.paymentStatus) === 'pendingverification';
  });

  return {
    currency: resolveCurrency_(settings),
    summary: {
      totalOrders: metrics.totalOrders,
      totalRevenue: metrics.totalRevenue,
      pendingPayments: metrics.pendingPayments,
      verifiedPayments: metrics.verifiedPayments,
      newOrders: metrics.newOrders,
      deliveredOrders: metrics.deliveredOrders,
    },
    bestSellingPerfume,
    lowStockProducts,
    recentOrders,
    paymentVerificationQueue,
    productStockTable: products,
    productStock: products,
    settings: resolveSettingsForFrontend_(settings),
  };
}

function readOrders_(spreadsheet, props) {
  const sheet = getSheetOrThrow_(spreadsheet, resolveOrdersSheetName_(props), 'Orders');
  const dataset = getSheetData_(sheet);

  if (dataset.rows.length === 0) {
    return [];
  }

  assertHeadersExist_(dataset.headerMap, requiredHeadersToKeys_(ORDER_COLUMNS));

  const orders = dataset.rows
    .map(function (row) {
      return {
        orderId: readCellByKeys_(row, dataset.headerMap, ['orderid']),
        createdAt: readCellByKeys_(row, dataset.headerMap, ['createdat']),
        customerName: readCellByKeys_(row, dataset.headerMap, ['customername']) || 'Unknown Client',
        total: toNumber_(readCellByKeys_(row, dataset.headerMap, ['total'])),
        paymentStatus: readCellByKeys_(row, dataset.headerMap, ['paymentstatus']) || 'Pending Verification',
        orderStatus: readCellByKeys_(row, dataset.headerMap, ['orderstatus']) || 'New',
        slipUrl: readCellByKeys_(row, dataset.headerMap, ['slipurl']),
        quantitySummary: readCellByKeys_(row, dataset.headerMap, ['quantitysummary']),
        products: readCellByKeys_(row, dataset.headerMap, ['products']),
      };
    })
    .filter(function (row) {
      return sanitizeText_(row.orderId, 200);
    });

  return orders.sort(function (a, b) {
    const aTime = parseDateMs_(a.createdAt);
    const bTime = parseDateMs_(b.createdAt);
    if (aTime === bTime) {
      return String(b.orderId).localeCompare(String(a.orderId));
    }
    return bTime - aTime;
  });
}

function readProducts_(spreadsheet, props, lowStockThreshold) {
  const sheet = getSheetOrThrow_(spreadsheet, resolveProductsSheetName_(props), 'Products');
  const dataset = getSheetData_(sheet);

  if (dataset.rows.length === 0) {
    return [];
  }

  assertHeadersExist_(dataset.headerMap, requiredHeadersToKeys_(PRODUCTS_COLUMNS_REQUIRED));

  return dataset.rows
    .map(function (row) {
      const name = readCellByKeys_(row, dataset.headerMap, ['name']);
      if (!sanitizeText_(name, 200)) {
        return null;
      }

      const stock = toNumber_(readCellByKeys_(row, dataset.headerMap, ['stock']));
      const price = toNumber_(readCellByKeys_(row, dataset.headerMap, ['price']));

      return {
        productId: readCellByKeys_(row, dataset.headerMap, ['productid']),
        sku: readCellByKeys_(row, dataset.headerMap, ['productid']),
        slug: readCellByKeys_(row, dataset.headerMap, ['slug']),
        name,
        price,
        stock,
        active: parseBoolean_(readCellByKeys_(row, dataset.headerMap, ['active']), true),
        category: readCellByKeys_(row, dataset.headerMap, ['category']) || 'Uncategorized',
        lowStock: stock <= lowStockThreshold,
      };
    })
    .filter(function (item) {
      return Boolean(item);
    });
}

function readSettings_(spreadsheet, props) {
  const sheet = getSheetOrThrow_(spreadsheet, resolveSettingsSheetName_(props), 'Settings');
  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    return {};
  }

  const trimmedRows = values.filter(function (row) {
    return row.some(function (cell) {
      return sanitizeText_(cell, 500);
    });
  });

  if (trimmedRows.length === 0) {
    return {};
  }

  const firstRow = trimmedRows[0];
  const firstKey = normalizeHeaderKey_(firstRow[0]);
  const secondKey = normalizeHeaderKey_(firstRow[1]);

  if (firstKey === 'key' || firstKey === 'setting') {
    validateSettingsHeaderRow_(trimmedRows[0]);
  }

  if ((firstKey === 'key' || firstKey === 'setting') && (secondKey === 'value' || secondKey === 'settingvalue')) {
    return rowsToSettingsObject_(trimmedRows.slice(1));
  }

  if (trimmedRows[0].length >= 2 && trimmedRows.length > 1 && !normalizeHeaderKey_(trimmedRows[1][0])) {
    return rowsToSettingsObject_(trimmedRows);
  }

  if (trimmedRows[0].length >= 2 && trimmedRows.length > 1 && normalizeHeaderKey_(trimmedRows[0][0]) && normalizeHeaderKey_(trimmedRows[1][0])) {
    const maybeVertical = rowsToSettingsObject_(trimmedRows);
    if (Object.keys(maybeVertical).length > 0) {
      return maybeVertical;
    }
  }

  if (trimmedRows.length >= 2) {
    const headerRow = trimmedRows[0];
    const valueRow = trimmedRows[1];
    const settings = {};

    for (let i = 0; i < headerRow.length; i += 1) {
      const key = normalizeHeaderKey_(headerRow[i]);
      if (!key) {
        continue;
      }

      settings[key] = sanitizeText_(valueRow[i], 500);
    }

    return settings;
  }

  return rowsToSettingsObject_(trimmedRows);
}

function normalizeOrderProductsForStock_(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .map(function (product) {
      if (!product || typeof product !== 'object') {
        return null;
      }

      const quantity = Math.floor(toNumber_(product.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      return {
        id: sanitizeText_(product.id, 120),
        sku: sanitizeText_(product.sku, 120),
        slug: sanitizeText_(product.slug, 160),
        name: sanitizeText_(product.name, 160),
        quantity: quantity,
      };
    })
    .filter(function (item) {
      return Boolean(item && item.name);
    });
}

function readProductSheetState_(spreadsheet, props, lowStockThreshold) {
  const sheet = getSheetOrThrow_(spreadsheet, resolveProductsSheetName_(props), 'Products');
  const dataset = getSheetData_(sheet);
  assertHeadersExist_(dataset.headerMap, requiredHeadersToKeys_(PRODUCTS_COLUMNS_REQUIRED));

  const rows = dataset.rows
    .map(function (row, index) {
      const rowNumber = index + 2;
      const name = readCellByKeys_(row, dataset.headerMap, ['name']);
      if (!sanitizeText_(name, 200)) {
        return null;
      }

      const stock = Math.max(0, Math.floor(toNumber_(readCellByKeys_(row, dataset.headerMap, ['stock']))));

      return {
        rowNumber: rowNumber,
        productId: sanitizeText_(readCellByKeys_(row, dataset.headerMap, ['productid']), 120),
        slug: sanitizeText_(readCellByKeys_(row, dataset.headerMap, ['slug']), 160),
        name: sanitizeText_(name, 160),
        stock: stock,
        active: parseBoolean_(readCellByKeys_(row, dataset.headerMap, ['active']), true),
        lowStock: stock <= lowStockThreshold,
      };
    })
    .filter(function (item) {
      return Boolean(item);
    });

  return {
    sheet: sheet,
    headerMap: dataset.headerMap,
    rows: rows,
  };
}

function buildProductRowLookup_(rows) {
  const byProductId = {};
  const bySlug = {};
  const byName = {};

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const productId = normalizeHeaderKey_(row.productId);
    const slug = normalizeHeaderKey_(row.slug);
    const name = normalizeHeaderKey_(row.name);

    if (productId && byProductId[productId] === undefined) {
      byProductId[productId] = i;
    }
    if (slug && bySlug[slug] === undefined) {
      bySlug[slug] = i;
    }
    if (name && byName[name] === undefined) {
      byName[name] = i;
    }
  }

  return {
    byProductId: byProductId,
    bySlug: bySlug,
    byName: byName,
  };
}

function findMatchingProductRowIndex_(orderLine, rows, lookup) {
  const productIdKey = normalizeHeaderKey_(orderLine.sku || orderLine.id);
  const slugKey = normalizeHeaderKey_(orderLine.slug);
  const nameKey = normalizeHeaderKey_(orderLine.name);

  if (productIdKey && lookup.byProductId[productIdKey] !== undefined) {
    return lookup.byProductId[productIdKey];
  }

  if (slugKey && lookup.bySlug[slugKey] !== undefined) {
    return lookup.bySlug[slugKey];
  }

  if (nameKey && lookup.byName[nameKey] !== undefined) {
    return lookup.byName[nameKey];
  }

  return -1;
}

function validateOrderProductsAgainstSheet_(orderProducts, rows, allowOutOfStockCheckout) {
  if (!orderProducts.length) {
    return {
      ok: false,
      message: 'Your cart is empty. Please add at least one fragrance.',
      decrementPlan: [],
    };
  }

  const lookup = buildProductRowLookup_(rows);
  const decrementedByRow = {};

  for (let i = 0; i < orderProducts.length; i += 1) {
    const line = orderProducts[i];
    const rowIndex = findMatchingProductRowIndex_(line, rows, lookup);

    if (rowIndex < 0 || !rows[rowIndex]) {
      return {
        ok: false,
        message: `${line.name} is no longer available. Please refresh your selection.`,
        decrementPlan: [],
      };
    }

    const product = rows[rowIndex];
    if (!product.active) {
      return {
        ok: false,
        message: `${line.name} is currently unavailable. Please update your cart before checkout.`,
        decrementPlan: [],
      };
    }

    const requested = Math.max(1, Math.floor(toNumber_(line.quantity)));
    const alreadyPlanned = decrementedByRow[rowIndex] || 0;
    const remaining = Math.max(0, product.stock - alreadyPlanned);

    if (!allowOutOfStockCheckout && requested > remaining) {
      return {
        ok: false,
        message: `Only ${remaining} pieces are currently available for ${line.name}. Please update your cart before checkout.`,
        decrementPlan: [],
      };
    }

    decrementedByRow[rowIndex] = alreadyPlanned + requested;
  }

  const decrementPlan = Object.keys(decrementedByRow).map(function (key) {
    const index = Number(key);
    const quantity = decrementedByRow[key];
    const product = rows[index];
    return {
      rowNumber: product.rowNumber,
      currentStock: product.stock,
      decrementBy: quantity,
      name: product.name,
    };
  });

  return {
    ok: true,
    message: '',
    decrementPlan: decrementPlan,
  };
}

function applyStockDecrementPlan_(spreadsheet, props, decrementPlan, allowOutOfStockCheckout) {
  if (!Array.isArray(decrementPlan) || decrementPlan.length === 0) {
    return;
  }

  const productsSheet = getSheetOrThrow_(spreadsheet, resolveProductsSheetName_(props), 'Products');
  const dataset = getSheetData_(productsSheet);
  const stockIndex = dataset.headerMap.stock;

  if (stockIndex === undefined) {
    throw new Error('Missing required sheet header: stock');
  }

  for (let i = 0; i < decrementPlan.length; i += 1) {
    const line = decrementPlan[i];
    const currentStock = Math.max(0, Math.floor(toNumber_(line.currentStock)));
    const decrementBy = Math.max(0, Math.floor(toNumber_(line.decrementBy)));
    let nextStock = currentStock - decrementBy;

    if (!allowOutOfStockCheckout && nextStock < 0) {
      nextStock = 0;
    }

    productsSheet.getRange(line.rowNumber, stockIndex + 1).setValue(nextStock);
  }
}

function rowsToSettingsObject_(rows) {
  const settings = {};
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const key = normalizeHeaderKey_(row[0]);
    const value = sanitizeText_(row[1], 500);
    if (!key) {
      continue;
    }
    settings[key] = value;
  }
  return settings;
}

function computeOrderMetrics_(orders) {
  const metrics = {
    totalOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    verifiedPayments: 0,
    newOrders: 0,
    deliveredOrders: 0,
  };

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];
    metrics.totalOrders += 1;
    metrics.totalRevenue += toNumber_(order.total);

    const paymentStatus = normalizeStatus_(order.paymentStatus);
    const orderStatus = normalizeStatus_(order.orderStatus);

    if (paymentStatus === 'pendingverification') {
      metrics.pendingPayments += 1;
    }

    if (paymentStatus === 'verified') {
      metrics.verifiedPayments += 1;
    }

    if (orderStatus === 'new') {
      metrics.newOrders += 1;
    }

    if (orderStatus === 'delivered') {
      metrics.deliveredOrders += 1;
    }
  }

  metrics.totalRevenue = Number(metrics.totalRevenue.toFixed(2));
  return metrics;
}

function computeBestSellingPerfume_(orders) {
  const tally = {};

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];
    const lines = extractProductQuantities_(order.quantitySummary, order.products);

    for (let j = 0; j < lines.length; j += 1) {
      const line = lines[j];
      const key = sanitizeText_(line.name, 160);
      if (!key) {
        continue;
      }
      tally[key] = (tally[key] || 0) + toNumber_(line.quantity);
    }
  }

  const names = Object.keys(tally);
  if (names.length === 0) {
    return null;
  }

  let bestName = names[0];
  for (let i = 1; i < names.length; i += 1) {
    const candidate = names[i];
    if (tally[candidate] > tally[bestName]) {
      bestName = candidate;
    }
  }

  return {
    name: bestName,
    unitsSold: tally[bestName],
  };
}

function extractProductQuantities_(quantitySummary, productsRaw) {
  const fromSummary = parseQuantityText_(sanitizeText_(quantitySummary, 5000));
  if (fromSummary.length > 0) {
    return fromSummary;
  }

  return parseQuantityText_(sanitizeText_(productsRaw, 5000));
}

function parseQuantityText_(text) {
  if (!text) {
    return [];
  }

  const normalized = text.replace(/\|/g, ',');
  const parts = normalized.split(',');
  const rows = [];

  for (let i = 0; i < parts.length; i += 1) {
    const part = sanitizeText_(parts[i], 500);
    if (!part) {
      continue;
    }

    const match = part.match(/(?:\d+\.\s*)?(.+?)\s*x\s*(\d+)/i);
    if (!match) {
      continue;
    }

    rows.push({
      name: sanitizeText_(match[1], 160),
      quantity: toNumber_(match[2]),
    });
  }

  return rows;
}

function resolveSettingsForFrontend_(settings) {
  return {
    sheetProductDatabase: readBooleanSetting_(
      settings,
      ['sheetproductdatabase', 'sheet_product_database'],
      false,
    ),
    currency: resolveCurrency_(settings),
    lowStockThreshold: resolveLowStockThreshold_(settings),
    hideInactiveProducts: readBooleanSetting_(settings, ['hideinactiveproducts', 'hide_inactive_products'], false),
    showOutOfStockProducts: readBooleanSetting_(
      settings,
      ['showoutofstockproducts', 'show_out_of_stock_products'],
      true,
    ),
    allowOutOfStockCheckout: readBooleanSetting_(
      settings,
      ['allowoutofstockcheckout', 'allow_out_of_stock_checkout'],
      false,
    ),
  };
}

function resolveCurrency_(settings) {
  return sanitizeText_(settings.currency || settings.currencycode || settings.storecurrency, 20) || 'USD';
}

function resolveLowStockThreshold_(settings) {
  const raw =
    settings.lowstockthreshold ||
    settings.low_stock_threshold ||
    settings.lowstock ||
    settings.low_stock;
  const parsed = toNumber_(raw);
  return parsed > 0 ? parsed : 3;
}

function readBooleanSetting_(settings, keys, fallback) {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (settings[key] === undefined || settings[key] === null || settings[key] === '') {
      continue;
    }
    return parseBoolean_(settings[key], fallback);
  }
  return fallback;
}

function resolveOrdersSheetName_(props) {
  return sanitizeText_(props.ORDERS_SHEET_NAME, 120) || 'Orders';
}

function resolveProductsSheetName_(props) {
  return sanitizeText_(props.PRODUCTS_SHEET_NAME, 120) || 'Products';
}

function resolveSettingsSheetName_(props) {
  return sanitizeText_(props.SETTINGS_SHEET_NAME, 120) || 'Settings';
}

function getSheetOrThrow_(spreadsheet, sheetName, label) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`${label} tab not found. Expected tab name: ${sheetName}`);
  }
  return sheet;
}

function getSheetData_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return {
      headerMap: {},
      rows: [],
    };
  }

  const headers = values[0].map(function (header) {
    return normalizeHeaderKey_(header);
  });

  const headerMap = {};
  for (let i = 0; i < headers.length; i += 1) {
    if (headers[i]) {
      headerMap[headers[i]] = i;
    }
  }

  const rows = values.slice(1).filter(function (row) {
    return row.some(function (cell) {
      return sanitizeText_(cell, 500);
    });
  });

  return {
    headerMap,
    rows,
  };
}

function assertHeadersExist_(headerMap, requiredKeys) {
  for (let i = 0; i < requiredKeys.length; i += 1) {
    const key = requiredKeys[i];
    if (headerMap[key] === undefined) {
      throw new Error(`Missing required sheet header: ${key}`);
    }
  }
}

function requiredHeadersToKeys_(headers) {
  return headers.map(function (header) {
    return normalizeHeaderKey_(header);
  });
}

function validateSettingsHeaderRow_(headerRow) {
  const headerMap = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const key = normalizeHeaderKey_(headerRow[i]);
    if (key) {
      headerMap[key] = i;
    }
  }

  assertHeadersExist_(headerMap, requiredHeadersToKeys_(SETTINGS_COLUMNS_REQUIRED));
}

function readCellByKeys_(row, headerMap, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const index = headerMap[keys[i]];
    if (index !== undefined) {
      return sanitizeText_(row[index], 5000);
    }
  }
  return '';
}

function normalizeStatus_(value) {
  return sanitizeText_(value, 80).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeHeaderKey_(value) {
  return sanitizeText_(value, 120).toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function parseDateMs_(value) {
  const text = sanitizeText_(value, 120);
  if (!text) {
    return 0;
  }

  const date = new Date(text);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function parseBoolean_(value, fallback) {
  const text = sanitizeText_(value, 20).toLowerCase();
  if (!text) {
    return fallback;
  }

  if (text === 'true' || text === 'yes' || text === '1') {
    return true;
  }

  if (text === 'false' || text === 'no' || text === '0') {
    return false;
  }

  return fallback;
}

function parseIncomingPayload_(e) {
  if (!e) {
    throw new Error('Missing request body.');
  }

  let rawPayload = '';

  if (e.parameter && e.parameter.payload) {
    rawPayload = e.parameter.payload;
  } else if (e.postData && typeof e.postData.contents === 'string' && e.postData.contents.trim()) {
    rawPayload = e.postData.contents;
  }

  if (!rawPayload) {
    throw new Error('No payload found in request.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawPayload);
  } catch (_error) {
    throw new Error('Invalid JSON payload.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Payload must be a JSON object.');
  }

  return parsed;
}

function validatePayload_(payload, properties) {
  if (sanitizeText_(payload.honeypot, 50)) {
    throw new Error('Spam protection triggered.');
  }

  const publicToken = sanitizeText_(properties.PUBLIC_FORM_TOKEN, 200);
  if (publicToken) {
    const requestToken = sanitizeText_(payload.token, 200);
    if (!requestToken || requestToken !== publicToken) {
      throw new Error('Unauthorized order submission token.');
    }
  }

  if (!payload.order || typeof payload.order !== 'object') {
    throw new Error('Missing order details.');
  }

  if (!payload.slip || typeof payload.slip !== 'object') {
    throw new Error('Missing payment slip data.');
  }

  const requiredOrderFields = [
    ['customerName', 'Customer name is required.'],
    ['phone', 'Phone is required.'],
    ['city', 'City is required.'],
    ['address', 'Address is required.'],
    ['paymentMethod', 'Payment method is required.'],
  ];

  for (let i = 0; i < requiredOrderFields.length; i += 1) {
    const key = requiredOrderFields[i][0];
    const errorMessage = requiredOrderFields[i][1];
    if (!sanitizeText_(payload.order[key], 300)) {
      throw new Error(errorMessage);
    }
  }

  if (!Array.isArray(payload.order.products) || payload.order.products.length === 0) {
    throw new Error('At least one product is required.');
  }

  for (let i = 0; i < payload.order.products.length; i += 1) {
    const item = payload.order.products[i] || {};
    const name = sanitizeText_(item.name, 120);
    const quantity = toNumber_(item.quantity);
    if (!name) {
      throw new Error('Every product line must include a product name.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product: ${name || 'unknown item'}.`);
    }
  }

  const fileName = sanitizeText_(payload.slip.fileName, 180);
  const mimeType = sanitizeText_(payload.slip.mimeType, 80);
  const fileSize = toNumber_(payload.slip.fileSize);
  const base64 = sanitizeText_(payload.slip.base64, 12000000);

  if (!fileName || !mimeType || !base64) {
    throw new Error('Slip file name, type, and base64 content are required.');
  }

  if (!ALLOWED_MIME_TYPES[mimeType]) {
    throw new Error('Unsupported slip file type. Allowed: jpg, jpeg, png, webp, pdf.');
  }

  if (!fileSize || fileSize <= 0) {
    throw new Error('Slip file size is invalid.');
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error('Slip file exceeds 5MB limit.');
  }
}

function uploadSlipFile_(slip, orderId, folderId) {
  const mimeType = sanitizeText_(slip.mimeType, 80);
  const fileName = sanitizeText_(slip.fileName, 180) || `payment-slip-${orderId}`;
  const cleanedBase64 = sanitizeText_(slip.base64, 12000000).replace(/\s/g, '');

  let bytes;
  try {
    bytes = Utilities.base64Decode(cleanedBase64);
  } catch (_error) {
    throw new Error('Slip base64 data could not be decoded.');
  }

  const blob = Utilities.newBlob(bytes, mimeType, `${orderId}-${fileName}`);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    url: file.getUrl(),
  };
}

function saveOrderRow_(orderRow, properties) {
  const spreadsheet = SpreadsheetApp.openById(properties.SHEET_ID);
  const sheetName = sanitizeText_(properties.SHEET_NAME, 100);
  const sheet = sheetName ? spreadsheet.getSheetByName(sheetName) : spreadsheet.getSheets()[0];

  if (!sheet) {
    throw new Error('Target sheet was not found.');
  }

  ensureHeaderRow_(sheet);

  sheet.appendRow([
    sanitizeForSheet_(orderRow.orderId),
    sanitizeForSheet_(orderRow.createdAt),
    sanitizeForSheet_(orderRow.customerName),
    sanitizeForSheet_(orderRow.phone),
    sanitizeForSheet_(orderRow.email),
    sanitizeForSheet_(orderRow.city),
    sanitizeForSheet_(orderRow.address),
    sanitizeForSheet_(orderRow.products),
    sanitizeForSheet_(orderRow.quantitySummary),
    toNumber_(orderRow.subtotal),
    toNumber_(orderRow.deliveryFee),
    toNumber_(orderRow.total),
    sanitizeForSheet_(orderRow.paymentMethod),
    sanitizeForSheet_(orderRow.slipFileName),
    sanitizeForSheet_(orderRow.slipUrl),
    sanitizeForSheet_(orderRow.paymentStatus),
    sanitizeForSheet_(orderRow.orderStatus),
    sanitizeForSheet_(orderRow.whatsappMessage),
    sanitizeForSheet_(orderRow.adminNotes),
  ]);
}

function ensureHeaderRow_(sheet) {
  const currentLastColumn = Math.max(sheet.getLastColumn(), ORDER_COLUMNS.length);
  const currentHeaderRow = sheet.getRange(1, 1, 1, currentLastColumn).getValues()[0];

  let needsUpdate = false;
  for (let i = 0; i < ORDER_COLUMNS.length; i += 1) {
    if (String(currentHeaderRow[i] || '').trim() !== ORDER_COLUMNS[i]) {
      needsUpdate = true;
      break;
    }
  }

  if (needsUpdate) {
    sheet.getRange(1, 1, 1, ORDER_COLUMNS.length).setValues([ORDER_COLUMNS]);
  }
}

function sendOwnerNotification_(order, ownerEmail) {
  const subject = `New DOTFUMES Order ${order.orderId}`;
  const bodyLines = [
    `Order ID: ${order.orderId}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Email: ${order.email}`,
    `City: ${order.city}`,
    `Address: ${order.address}`,
    `Products: ${sanitizeText_(order.quantitySummary, 500) || 'See sheet row'}`,
    `Payment Method: ${order.paymentMethod}`,
    `Total: ${order.total}`,
    `Slip URL: ${order.slipUrl}`,
  ];

  MailApp.sendEmail({
    to: ownerEmail,
    subject,
    body: bodyLines.join('\n'),
  });
}

function sendCustomerConfirmation_(order, customerEmail, businessWhatsAppNumber, supportEmail) {
  const sanitizedCustomerEmail = sanitizeText_(customerEmail, 200);
  if (!sanitizedCustomerEmail) {
    return;
  }

  const normalizedWhatsapp = sanitizeText_(businessWhatsAppNumber, 60).replace(/[^\d]/g, '');
  const contactLines = [];

  if (normalizedWhatsapp) {
    contactLines.push(`WhatsApp: https://wa.me/${normalizedWhatsapp}`);
  }
  if (sanitizeText_(supportEmail, 200)) {
    contactLines.push(`Email: ${sanitizeText_(supportEmail, 200)}`);
  }

  const subject = `Dotfumes Order Received — ${order.orderId}`;
  const bodyLines = [
    `Hello ${order.customerName || 'there'},`,
    '',
    'Thank you for your Dotfumes order request. We have received it successfully.',
    '',
    `Order ID: ${order.orderId}`,
    `Products: ${sanitizeText_(order.quantitySummary, 500) || 'Shared with support'}`,
    `Total: $${toNumber_(order.total).toFixed(2)}`,
    `Payment Method: ${sanitizeText_(order.paymentMethod, 50)}`,
    '',
    'What happens next:',
    '1) Dotfumes reviews your payment proof manually.',
    '2) We contact you as early as possible for confirmation.',
    '3) Delivery coordination starts after confirmation.',
    '',
    contactLines.length > 0
      ? `Need help sooner? Contact support:\n${contactLines.join('\n')}`
      : 'Need help sooner? Reply to this email and the team will assist.',
    '',
    'Thank you,',
    'Dotfumes',
  ];

  MailApp.sendEmail({
    to: sanitizedCustomerEmail,
    subject,
    body: bodyLines.join('\n'),
  });
}

function buildWhatsAppMessage_(order, slipUrl) {
  return [
    `New DOTFUMES Order ${order.orderId}`,
    `Client: ${sanitizeText_(order.customerName, 120)}`,
    `Products: ${sanitizeText_(order.quantitySummary, 500) || 'See order sheet'}`,
    `Total: $${toNumber_(order.total).toFixed(2)}`,
    `Payment Method: ${sanitizeText_(order.paymentMethod, 50)}`,
    `Slip URL: ${sanitizeText_(slipUrl, 1000)}`,
  ].join('\n');
}

function buildWhatsAppUrl_(phone, message) {
  const normalizedPhone = sanitizeText_(phone, 40).replace(/[^\d]/g, '');
  if (!normalizedPhone) {
    return '';
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function formatProductsForSheet_(products) {
  if (!Array.isArray(products)) {
    return '';
  }

  return products
    .map(function (product, index) {
      const name = sanitizeText_(product && product.name, 120);
      const sku = sanitizeText_(product && product.sku, 80);
      const quantity = toNumber_(product && product.quantity);
      const lineTotal = toNumber_(product && product.lineTotal);
      const skuText = sku ? ` [${sku}]` : '';
      return `${index + 1}. ${name}${skuText} x${quantity} ($${lineTotal.toFixed(2)})`;
    })
    .join(' | ')
    .slice(0, 5000);
}

function toNumber_(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return value;
  }

  const cleaned = sanitizeText_(value, 80).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function sanitizeText_(value, maxLength) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!maxLength || maxLength <= 0) {
    return text;
  }

  return text.slice(0, maxLength);
}

function sanitizeForSheet_(value) {
  const text = sanitizeText_(value, 5000);
  if (!text) {
    return '';
  }

  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }

  return text;
}

function generateOrderId_(date) {
  const time = date || new Date();
  const datePart = Utilities.formatDate(time, Session.getScriptTimeZone() || 'UTC', 'yyyyMMdd');
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DF-${datePart}-${randomPart}`;
}

function getScriptProperties_() {
  return PropertiesService.getScriptProperties().getProperties();
}

function getPropertiesForPost_() {
  const props = getScriptProperties_();
  const required = [
    'SHEET_ID',
    'DRIVE_FOLDER_ID',
    'OWNER_EMAIL',
    'BUSINESS_WHATSAPP_NUMBER',
    'PUBLIC_FORM_TOKEN',
  ];

  for (let i = 0; i < required.length; i += 1) {
    const key = required[i];
    if (!sanitizeText_(props[key], 200)) {
      throw new Error(`Missing script property: ${key}`);
    }
  }

  return props;
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function javascriptOutput_(content) {
  return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function readJsonpCallbackName_(e) {
  const callback = sanitizeText_((e && e.parameter && e.parameter.callback) || '', 120);
  if (!callback) {
    return '';
  }

  const isSafeCallback = /^[$A-Z_][0-9A-Z_$]*(?:\.[0-9A-Z_$]+)*$/i.test(callback);
  if (!isSafeCallback) {
    throw new Error('Invalid callback function name.');
  }

  return callback;
}

function outputForGet_(payload, e) {
  const callback = readJsonpCallbackName_(e);
  if (!callback) {
    return jsonOutput_(payload);
  }

  return javascriptOutput_(`${callback}(${JSON.stringify(payload)});`);
}

function baseEnvelope_(success, data, message, warnings, extras) {
  const envelope = {
    success: Boolean(success),
    data: data === undefined ? null : data,
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'google-apps-script',
    },
    warnings: Array.isArray(warnings) ? warnings : [],
    message: sanitizeText_(message, 500),
  };

  if (extras && typeof extras === 'object') {
    Object.keys(extras).forEach(function (key) {
      envelope[key] = extras[key];
    });
  }

  return envelope;
}

function responseSuccess_(data, message, extras) {
  return jsonOutput_(baseEnvelope_(true, data, message || '', [], extras));
}

function responseError_(message, warnings, extras) {
  return jsonOutput_(
    baseEnvelope_(false, null, message || 'Request failed.', warnings || [], extras),
  );
}

function responseSuccessForGet_(e, data, message, extras) {
  return outputForGet_(baseEnvelope_(true, data, message || '', [], extras), e);
}

function responseErrorForGet_(e, message, warnings, extras) {
  return outputForGet_(
    baseEnvelope_(false, null, message || 'Request failed.', warnings || [], extras),
    e,
  );
}
