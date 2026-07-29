import { AdminProductStock } from './types';

export const ProductTable = ({
  products,
  emptyLabel,
}: {
  products: AdminProductStock[];
  emptyLabel: string;
}) => {
  return (
    <table className="min-w-full border-collapse text-left text-body">
      <thead>
        <tr className="border-b border-on-light-muted bg-ink-faint text-caption uppercase tracking-normal text-on-light-secondary">
          <th className="px-4 py-3 font-semibold">Name</th>
          <th className="px-4 py-3 font-semibold">Slug</th>
          <th className="px-4 py-3 font-semibold">Category</th>
          <th className="px-4 py-3 font-semibold">Price</th>
          <th className="px-4 py-3 font-semibold">Stock</th>
          <th className="px-4 py-3 font-semibold">Active</th>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-on-light-muted" colSpan={6}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          products.map((product) => (
            <tr
              key={`${product.slug || product.name}-${product.stock}`}
              className="border-b border-on-light-subtle"
            >
              <td className="px-4 py-4 font-semibold">{product.name}</td>
              <td className="px-4 py-4">{product.slug || '—'}</td>
              <td className="px-4 py-4">{product.category}</td>
              <td className="px-4 py-4">${product.price.toFixed(2)}</td>
              <td className="px-4 py-4">{product.stock}</td>
              <td className="px-4 py-4">{product.active ? 'Yes' : 'No'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
