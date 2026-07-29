import { AdminOrder } from './types';

export const OrdersTable = ({
  orders,
  emptyLabel,
}: {
  orders: AdminOrder[];
  emptyLabel: string;
}) => {
  return (
    <table className="min-w-full border-collapse text-left text-body">
      <thead>
        <tr className="border-b border-on-light-muted bg-ink-faint text-caption uppercase tracking-normal text-on-light-secondary">
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
            <td className="px-4 py-6 text-on-light-muted" colSpan={7}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr
              key={`${order.orderId}-${order.createdAt}`}
              className="border-b border-on-light-subtle"
            >
              <td className="px-4 py-4 font-semibold">{order.orderId}</td>
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
                    className="text-brand-black underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-gold"
                  >
                    View Slip
                  </a>
                ) : (
                  <span className="text-on-light-muted">Unavailable</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
