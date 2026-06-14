export default function PageHero({ eyebrow, title, children, actions }) {
  return (
    <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 py-16 text-white">
      <div className="container-shell">
        {eyebrow && <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-100">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg text-blue-50">{children}</div>}
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
