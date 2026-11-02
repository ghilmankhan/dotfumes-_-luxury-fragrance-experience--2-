import { useState } from 'react';
import { ChevronDown, ExternalLink, PackageCheck, ReceiptText } from 'lucide-react';
import type { PaymentMethod } from '../../models/order';
import { formatCurrency, formatPaymentMethodLabel } from '../../lib/order';

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
  slip_path: string | null;
  items: Array<{ name: string; quantity: number; lineTotal?: number }>;
};

type Props = {
  orders: StudioOrder[];
  busy: boolean;
  onStatus: (id: string, patch: Partial<Pick<StudioOrder, 'payment_status' | 'order_status'>>) => void;
  onProof: (path: string) => void;
};

const selectClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition-colors focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15';

const OrderCard = ({ order, busy, onStatus, onProof }: { order: StudioOrder } & Omit<Props, 'orders'>) => {
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [orderStatus, setOrderStatus] = useState(order.order_status);
  const changed = paymentStatus !== order.payment_status || orderStatus !== order.order_status;
  const isCod = order.payment_method === 'cash-on-delivery';
  const isPending = order.payment_status === 'Pending Verification' || order.payment_status === 'Payment Pending';

  return <details className="group overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80 open:shadow-[0_18px_55px_-38px_rgba(28,25,23,0.3)]">
    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-5 marker:hidden transition-colors hover:bg-[#faf8f3] sm:px-6">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isPending ? 'bg-[#f6eddd] text-[#926936]' : 'bg-emerald-50 text-emerald-800'}`}><ReceiptText size={20} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-stone-950 sm:text-base">{order.customer_name}</span><span className="mt-1 block text-xs text-stone-500">{order.id} · {new Date(order.created_at).toLocaleString('en-PK')}</span></span>
      <span className="flex flex-wrap items-center gap-3 sm:gap-5"><span className="text-sm font-semibold tabular-nums text-stone-950">{formatCurrency(Number(order.total))}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isPending ? 'bg-[#f6eddd] text-[#815d2e]' : order.payment_status === 'Rejected' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{order.payment_status}</span><ChevronDown size={17} aria-hidden="true" className="text-stone-500 transition-transform duration-200 group-open:rotate-180" /></span>
    </summary>
    <div className="border-t border-stone-100 px-5 pb-6 pt-6 sm:px-6">
      <div className="grid gap-7 lg:grid-cols-2">
        <section><h3 className="text-sm font-semibold text-stone-950">Delivery details</h3><p className="mt-3 text-sm text-stone-700">{order.address}, {order.city}</p><p className="mt-2 text-sm text-stone-700">{order.phone}{order.email ? ` · ${order.email}` : ''}</p><h3 className="mt-6 text-sm font-semibold text-stone-950">Items</h3><div className="mt-3 space-y-2">{order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-4 text-sm text-stone-700"><span>{item.name} × {item.quantity}</span>{typeof item.lineTotal === 'number' && <span className="shrink-0 tabular-nums">{formatCurrency(item.lineTotal)}</span>}</div>)}</div></section>
        <section><h3 className="text-sm font-semibold text-stone-950">Payment details</h3><p className="mt-3 text-sm text-stone-700">{formatPaymentMethodLabel(order.payment_method)}</p>{isCod ? <p className="mt-2 text-sm leading-6 text-stone-600">Collect cash at delivery. No receipt is needed.</p> : <><p className="mt-2 text-sm text-stone-700">Paid by {order.payer_name || 'Not supplied'}</p><p className="mt-2 text-sm text-stone-700">Reference: <span className="font-medium text-stone-950">{order.payment_reference || 'Not supplied'}</span></p>{order.slip_path && <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-[#a78045]" onClick={() => onProof(order.slip_path!)}>View receipt <ExternalLink size={15} aria-hidden="true" /></button>}<p className="mt-3 text-xs text-stone-500">Check the transfer in your account before marking it verified.</p></>}</section>
      </div>
      <div className="mt-7 grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-sm font-medium text-stone-700">Payment status<select className={selectClass} disabled={busy} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>{isCod && <option>Payment Pending</option>}<option>Pending Verification</option><option>Verified</option><option>Rejected</option></select></label><label className="text-sm font-medium text-stone-700">Order status<select className={selectClass} disabled={busy} value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}><option>New</option><option>Preparing</option><option>Delivered</option><option>Cancelled</option></select></label><button type="button" disabled={busy || !changed} className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78045] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onStatus(order.id, { payment_status: paymentStatus, order_status: orderStatus })}>{busy ? 'Saving…' : 'Save status'}</button></div>
    </div>
  </details>;
};

export const StudioOrders = ({ orders, busy, onStatus, onProof }: Props) => <div className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-stone-600"><span className="font-semibold tabular-nums text-stone-950">{orders.length}</span> total orders</p><p className="text-xs text-stone-500">Newest first</p></div>
  {orders.length === 0 ? <div className="rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-stone-200/80"><PackageCheck size={28} strokeWidth={1.5} className="mx-auto text-[#a78045]" aria-hidden="true" /><h2 className="mt-4 font-serif text-xl">All clear for now</h2><p className="mt-2 text-sm text-stone-600">New customer orders will appear here.</p></div> : <div className="space-y-3">{orders.map((order) => <OrderCard key={`${order.id}-${order.payment_status}-${order.order_status}`} order={order} busy={busy} onStatus={onStatus} onProof={onProof} />)}</div>}
</div>;
