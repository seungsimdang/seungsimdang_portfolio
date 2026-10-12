export default function AdminLoading() {
  return (
    <div role="status" className="space-y-16">
      <span className="sr-only">불러오는 중...</span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden="true"
          className="h-64 rounded-lg bg-white/10 motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}
