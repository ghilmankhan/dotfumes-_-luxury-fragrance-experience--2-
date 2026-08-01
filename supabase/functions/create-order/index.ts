// create-order: public checkout endpoint for Dotfumes.
// Anonymous customers submit orders here; all writes use the service role,
// so the orders table and payment-slips bucket stay closed to the public.
// verify_jwt is disabled because customers are anonymous (publishable keys are
// not JWTs); protection comes from honeypot + strict validation + atomic
// server-side pricing/stock via the public.create_order Postgres function
// (execute granted to service_role only).
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (status: number, message: string) =>
  json(status, { success: false, message });

const PAYMENT_METHODS = ["bank-transfer", "easypaisa", "jazzcash"];
const SLIP_MIME_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 20;

const asTrimmedString = (value: unknown, maxLength = 500): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const fakeOrderCode = () => {
  const date = new Date();
  const datePart = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase();
  return `DF-${datePart}-${randomPart}`;
};

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// Maps typed exceptions raised by public.create_order to customer-facing errors.
const mapOrderError = (message: string): { status: number; message: string } | null => {
  if (message.includes("UNAVAILABLE:")) {
    const slug = message.split("UNAVAILABLE:")[1]?.trim() ?? "An item";
    return { status: 400, message: `"${slug}" is no longer available.` };
  }
  if (message.includes("OUT_OF_STOCK:")) {
    const parts = message.split("OUT_OF_STOCK:")[1]?.split(":") ?? [];
    const stock = parts[0]?.trim() ?? "0";
    const name = parts.slice(1).join(":").trim() || "An item";
    return { status: 400, message: `"${name}" only has ${stock} unit(s) in stock.` };
  }
  if (message.includes("INVALID_ITEMS")) {
    return { status: 400, message: "One of the cart items is invalid." };
  }
  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "Method not allowed.");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid JSON payload.");
  }

  // Honeypot: silently accept but do nothing, so bots can't tell they failed.
  if (asTrimmedString(body.honeypot)) {
    return json(200, { success: true, orderId: fakeOrderCode() });
  }

  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const firstName = asTrimmedString(customer.firstName, 100);
  const lastName = asTrimmedString(customer.lastName, 100);
  const phone = asTrimmedString(customer.phone, 40);
  const email = asTrimmedString(customer.email, 200);
  const city = asTrimmedString(customer.city, 120);
  const address = asTrimmedString(customer.address, 600);
  const paymentMethod = asTrimmedString(body.paymentMethod, 40);
  const whatsappMessage = asTrimmedString(body.whatsappMessage, 4000);

  if (!firstName || !phone || !address) {
    return fail(400, "Name, phone, and address are required.");
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return fail(400, "Invalid payment method.");
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
    return fail(400, "Your cart is empty or invalid.");
  }

  // Collapse duplicate slugs so quantities can't be split to dodge limits.
  const quantities = new Map<string, number>();
  for (const item of rawItems) {
    const row = (item ?? {}) as Record<string, unknown>;
    const slug = asTrimmedString(row.slug, 200).toLowerCase();
    const quantity = Math.floor(Number(row.quantity));
    if (!slug || !Number.isFinite(quantity) || quantity < 1) {
      return fail(400, "One of the cart items is invalid.");
    }
    quantities.set(slug, (quantities.get(slug) ?? 0) + quantity);
  }
  const requested = [...quantities.entries()].map(([slug, quantity]) => ({ slug, quantity }));
  for (const item of requested) {
    if (item.quantity > MAX_QTY_PER_ITEM) {
      return fail(400, "One of the cart items is invalid.");
    }
  }

  const slip = (body.slip ?? {}) as Record<string, unknown>;
  const slipBase64 = typeof slip.base64 === "string" ? slip.base64 : "";
  const slipMime = asTrimmedString(slip.mimeType, 100);
  if (!slipBase64) {
    return fail(400, "Payment slip file is required.");
  }
  const slipExt = SLIP_MIME_TYPES[slipMime];
  if (!slipExt) {
    return fail(400, "Payment slip must be a PNG, JPG, WEBP, or PDF file.");
  }

  let slipBytes: Uint8Array;
  try {
    slipBytes = decodeBase64(slipBase64);
  } catch {
    return fail(400, "Payment slip file is corrupted.");
  }
  if (slipBytes.length === 0 || slipBytes.length > MAX_SLIP_BYTES) {
    return fail(400, "Payment slip must be between 1 byte and 5 MB.");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Cheap pre-check for friendly errors before uploading the slip. The
  // authoritative stock/pricing check happens atomically in create_order.
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("slug, name, stock, active")
    .in("slug", requested.map((item) => item.slug));

  if (productsError) {
    console.error("products lookup failed", productsError);
    return fail(500, "Unable to validate your cart right now.");
  }

  const bySlug = new Map((products ?? []).map((p) => [p.slug, p]));
  for (const item of requested) {
    const product = bySlug.get(item.slug);
    if (!product || product.active === false) {
      return fail(400, `"${item.slug}" is no longer available.`);
    }
  }

  const orderId = crypto.randomUUID();
  const slipPath = `${orderId}/slip.${slipExt}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(slipPath, slipBytes, { contentType: slipMime, upsert: false });

  if (uploadError) {
    console.error("slip upload failed", uploadError);
    return fail(500, "Unable to store your payment slip right now.");
  }

  // Atomic: price, stock validation + decrement, and insert in one transaction.
  const { data: created, error: orderError } = await supabase.rpc("create_order", {
    p_order_id: orderId,
    p_customer: { firstName, lastName, email, phone, address, city },
    p_items: requested,
    p_payment_method: paymentMethod,
    p_slip_path: slipPath,
    p_whatsapp_message: whatsappMessage,
  });

  if (orderError || !created) {
    await supabase.storage.from("payment-slips").remove([slipPath]);
    const mapped = orderError ? mapOrderError(orderError.message ?? "") : null;
    if (mapped) {
      return fail(mapped.status, mapped.message);
    }
    console.error("order creation failed", orderError);
    return fail(500, "Unable to submit your order right now. Please try again.");
  }

  const result = created as {
    orderUuid: string;
    orderCode: string;
    createdAt: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    currency: string;
    items: unknown[];
  };

  return json(200, {
    success: true,
    orderId: result.orderCode,
    orderUuid: result.orderUuid,
    createdAt: result.createdAt,
    subtotal: result.subtotal,
    deliveryFee: result.deliveryFee,
    total: result.total,
    currency: result.currency,
    items: result.items,
  });
});
