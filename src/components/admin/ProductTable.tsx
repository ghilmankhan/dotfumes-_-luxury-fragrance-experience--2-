import { AdminProductStock } from './types';

export const ProductTable = ({
  products,
  emptyLabel,
}: {
  products: AdminProductStock[];
  emptyLabel: string;
}) => {
  return (
    <table className="min-w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-black/10 bg-black/[0.02] text-[10px] uppercase tracking-[0.16em] text-black/60">
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
            <td className="px-4 py-6 text-black/55" colSpan={6}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          products.map((product) => (
            <tr key={`${product.slug || product.name}-${product.stock}`} className="border-b border-black/5">
              <td className="px-4 py-4 font-medium">{product.name}</td>
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
