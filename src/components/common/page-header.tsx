interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <h1 className="text-h1 max-w-heading">{title}</h1>
    </section>
  );
}
