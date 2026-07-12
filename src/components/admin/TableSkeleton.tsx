export const TableSkeleton = () => (
  <div className="space-y-2 p-4" aria-label="Loading table data">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-8 animate-pulse bg-black/[0.04]" />
    ))}
  </div>
);
