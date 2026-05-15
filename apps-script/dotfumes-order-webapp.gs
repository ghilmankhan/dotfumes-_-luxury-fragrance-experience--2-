/**
 * DOTFUMES Lightweight Order Backend (Google Apps Script)
 *
 * Required Script Properties:
 * - SHEET_ID
 * - DRIVE_FOLDER_ID
 * - OWNER_EMAIL
 * - BUSINESS_WHATSAPP_NUMBER
 *
 * Optional Script Properties:
 * - PUBLIC_FORM_TOKEN
 * - SHEET_NAME
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

function doPost(e) {
  try {
    const properties = getProperties_();
    const payload = parseIncomingPayload_(e);

    validatePayload_(payload, properties);

    const order = payload.order;
    const slip = payload.slip;

    const now = new Date();
    const orderId = sanitizeText_(order.orderId, 64) || generateOrderId_(now);
    const createdAt = sanitizeText_(order.createdAt, 64) || now.toISOString();

    const uploadedSlip = uploadSlipFile_(slip, orderId, properties.DRIVE_FOLDER_ID);

    const paymentStatus = sanitizeText_(order.paymentStatus, 80) || 'Pending Verification';
    const orderStatus = sanitizeText_(order.orderStatus, 80) || 'New';

    const whatsappMessage =
      sanitizeText_(order.whatsappMessage, 4000) ||
      buildWhatsAppMessage_(
        {
          orderId,
          customerName: order.customerName,
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

    sendOwnerNotification_(
      {
        orderId,
        customerName: sanitizeText_(order.customerName, 120),
        phone: sanitizeText_(order.phone, 50),
        email: sanitizeText_(order.email, 120),
        city: sanitizeText_(order.city, 80),
        address: sanitizeText_(order.address, 250),
        total: toNumber_(order.total),
        paymentMethod: sanitizeText_(order.paymentMethod, 50),
        slipUrl: uploadedSlip.url,
      },
      properties.OWNER_EMAIL,
    );

    const whatsappUrl = buildWhatsAppUrl_(
      properties.BUSINESS_WHATSAPP_NUMBER,
      buildWhatsAppMessage_(
        {
          orderId,
          customerName: sanitizeText_(order.customerName, 120),
          total: toNumber_(order.total),
          paymentMethod: sanitizeText_(order.paymentMethod, 50),
        },
        uploadedSlip.url,
      ),
    );

    return jsonOutput_({
      success: true,
      message: 'Order stored successfully.',
      orderId,
      slipUrl: uploadedSlip.url,
      driveFileId: uploadedSlip.fileId,
      whatsappUrl,
    });
  } catch (error) {
    return jsonOutput_({
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected order processing error.',
    });
  }
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
    ['email', 'Email is required.'],
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
    orderRow.orderId,
    orderRow.createdAt,
    orderRow.customerName,
    orderRow.phone,
    orderRow.email,
    orderRow.city,
    orderRow.address,
    orderRow.products,
    orderRow.quantitySummary,
    orderRow.subtotal,
    orderRow.deliveryFee,
    orderRow.total,
    orderRow.paymentMethod,
    orderRow.slipFileName,
    orderRow.slipUrl,
    orderRow.paymentStatus,
    orderRow.orderStatus,
    orderRow.whatsappMessage,
    orderRow.adminNotes,
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

function buildWhatsAppMessage_(order, slipUrl) {
  return [
    `New DOTFUMES Order ${order.orderId}`,
    `Client: ${sanitizeText_(order.customerName, 120)}`,
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
      const quantity = toNumber_(product && product.quantity);
      const lineTotal = toNumber_(product && product.lineTotal);
      return `${index + 1}. ${name} x${quantity} ($${lineTotal.toFixed(2)})`;
    })
    .join(' | ')
    .slice(0, 5000);
}

function toNumber_(value) {
  const parsed = Number(value);
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

function generateOrderId_(date) {
  const time = date || new Date();
  const datePart = Utilities.formatDate(time, Session.getScriptTimeZone() || 'UTC', 'yyyyMMdd');
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DF-${datePart}-${randomPart}`;
}

function getProperties_() {
  const props = PropertiesService.getScriptProperties().getProperties();

  const required = ['SHEET_ID', 'DRIVE_FOLDER_ID', 'OWNER_EMAIL', 'BUSINESS_WHATSAPP_NUMBER'];

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
