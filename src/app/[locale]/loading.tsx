export default function Loading() {
  return (
    <div className="container-x pt-[calc(var(--header-h)+3rem)] pb-20" aria-busy>
      <div className="skeleton h-4 w-24" />
      <div className="skeleton mt-4 h-12 w-2/3 max-w-xl" />
      <div className="skeleton mt-3 h-5 w-1/2 max-w-md" />
      <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3"><div className="skeleton aspect-[4/5] rounded-lg" /><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /></div>
        ))}
      </div>
    </div>
  );
}
