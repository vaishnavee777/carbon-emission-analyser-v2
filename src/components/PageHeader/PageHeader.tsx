interface PageHeaderProps {
  eyebrow: string
  title: string
}

function PageHeader({ eyebrow, title }: PageHeaderProps) {
  return (
    <header className="relative pt-8">
      {/* Decorative stars */}
      <span className="absolute right-6 top-5 text-xs text-[var(--lavender)] opacity-60">
        ✦
      </span>

      <span className="absolute right-14 top-10 text-[8px] text-white opacity-40">
        ✦
      </span>

      <p className="text-sm font-medium tracking-wide text-[var(--text-muted)]">
        {eyebrow}
      </p>

      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h1>
    </header>
  )
}

export default PageHeader