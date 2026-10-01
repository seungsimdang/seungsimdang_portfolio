interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="flex items-end justify-between">
        <h1 className="text-h1 max-w-heading">{title}</h1>
        <div className="w-36 h-36 opacity-50">
          <svg
            aria-hidden="true"
            viewBox="0 0 36 36"
            fill="none"
            className="w-full h-full"
          >
            <circle cx="18" cy="18" r="18" fill="currentColor" />
          </svg>
        </div>
      </div>
    </section>
  );
}
