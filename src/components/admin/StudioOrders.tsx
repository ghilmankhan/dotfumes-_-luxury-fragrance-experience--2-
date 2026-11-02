import type { PaymentMethod } from '../../models/order';
import { formatCurrency, formatPaymentMethodLabel } from '../../lib/order';
import { ChevronDown } from 'lucide-react';

export type StudioOrder = {
  id: string;
  created_at: string;
  customer_name: string;
  email: string | null;
  phone: string;
  city: string;
  address: string;
  payment_method: PaymentMethod;
  payer_name: string;
  payment_reference: string;
  total: number;
  payment_status: string;
  order_status: string;
  slip_path: string;
  items: Array<{ name: string; quantity: number; lineTotal?: number }>;
};

type Props = {
  orders: StudioOrder[];
  busy: boolean;
  onStatus: (id: string, patch: Partial<Pick<StudioOrder, 'payment_status' | 'order_status'>>) => void;
  onProof: (path: string) => void;
};

const selectClass = 'mt-2 w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[#a78045]';

export const StudioOrders = ({ orders, busy, onStatus, onProof }: Props) => <div className="space-y-4">
  <div><h2 className="font-serif text-3xl text-stone-900">Orders to review</h2><p className="mt-2 text-sm text-stone-600">Check the receipt against your bank or wallet before marking payment verified.</p></div>
  {orders.length === 0 && <p className="rounded-xl bg-white p-8 text-sm text-stone-600">No orders yet. New requests will appear here.</p>}
  {orders.map((order) => <details key={order.id} className="group rounded-xl bg-white p-5 shadow-sm open:ring-1 open:ring-[#a78045]/30 sm:p-6">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 marker:hidden">
      <div><p className="text-sm font-semibold text-stone-900">{order.customer_name}</p><p className="mt-1 text-xs text-stone-500">{order.id} · {new Date(order.created_at).toLocaleString('en-PK')}</p></div>
      <div className="flex items-center gap-4"><span className="font-serif text-xl text-stone-900">{formatCurrency(Number(order.total))}</span><span className="rounded-full bg-[#f4eee3] px-3 py-1 text-xs text-[#775b31]">{order.payment_status}</span><ChevronDown size={16} aria-hidden="true" className="text-stone-500 transition-transform group-open:rotate-180" /></div>
    </summary>
    <div className="mt-6 grid gap-6 border-t border-stone-100 pt-6 lg:grid-cols-2">
      <div className="space-y-3 text-sm text-stone-700"><h3 className="font-semibold text-stone-900">Customer and delivery</h3><p>{order.phone}{order.email ? ` · ${order.email}` : ''}</p><p>{order.address}, {order.city}</p><h3 className="pt-2 font-semibold text-stone-900">Items</h3>{order.items.map((item, index) => <p key={`${item.name}-${index}`}>{item.name} × {item.quantity}{typeof item.lineTotal === 'number' ? ` · ${formatCurrency(item.lineTotal)}` : ''}</p>)}</div>
      <div className="space-y-4 text-sm text-stone-700"><h3 className="font-semibold text-stone-900">Payment evidence</h3><p>{formatPaymentMethodLabel(order.payment_method)}</p><p>Paid by: {order.payer_name || 'Not supplied'}</p><p>Reference: <span className="font-medium text-stone-900">{order.payment_reference || 'Not supplied'}</span></p><button className="rounded-md border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50" onClick={() => onProof(order.slip_path)}>View receipt securely</button></div>
      <div className="grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2 lg:col-span-2"><label className="text-sm font-medium text-stone-700">Payment status<select className={selectClass} disabled={busy} value={order.payment_status} onChange={(event) => onStatus(order.id, { payment_status: event.target.value })}><option>Pending Verification</option><option>Verified</option><option>Rejected</option></select></label><label className="text-sm font-medium text-stone-700">Order status<select className={selectClass} disabled={busy} value={order.order_status} onChange={(event) => onStatus(order.id, { order_status: event.target.value })}><option>New</option><option>Preparing</option><option>Delivered</option><option>Cancelled</option></select></label></div>
    </div>
  </details>)}
</div>;
