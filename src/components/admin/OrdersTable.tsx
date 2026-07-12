import { AdminOrder } from './types';

export const OrdersTable = ({ orders, emptyLabel }: { orders: AdminOrder[]; emptyLabel: string }) => {
  return (
    <table className="min-w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-black/10 bg-black/[0.02] text-[10px] uppercase tracking-[0.16em] text-black/60">
          <th className="px-4 py-3 font-semibold">Order ID</th>
          <th className="px-4 py-3 font-semibold">Created</th>
          <th className="px-4 py-3 font-semibold">Customer</th>
          <th className="px-4 py-3 font-semibold">Total</th>
          <th className="px-4 py-3 font-semibold">Payment</th>
          <th className="px-4 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold">Slip</th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-black/55" colSpan={7}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr key={`${order.orderId}-${order.createdAt}`} className="border-b border-black/5">
              <td className="px-4 py-4 font-medium">{order.orderId}</td>
              <td className="px-4 py-4">{order.createdAt || '—'}</td>
              <td className="px-4 py-4">{order.customerName}</td>
              <td className="px-4 py-4">${order.total.toFixed(2)}</td>
              <td className="px-4 py-4">{order.paymentStatus}</td>
              <td className="px-4 py-4">{order.orderStatus}</td>
              <td className="px-4 py-4">
                {order.slipUrl ? (
                  <a
                    href={order.slipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-black underline underline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                  >
                    View Slip
                  </a>
                ) : (
                  <span className="text-black/45">Unavailable</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
