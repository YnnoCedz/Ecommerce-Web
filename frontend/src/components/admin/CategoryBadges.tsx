type CategoryBadgesProps = {
  categories?: Array<string | null | undefined>
  className?: string
}

export default function CategoryBadges({
  categories = [],
  className = "",
}: CategoryBadgesProps) {
  const values = categories.filter((category): category is string => Boolean(category?.trim()))

  if (!values.length) {
    return <span className="text-[var(--color-ink-muted)]">None</span>
  }

  const chip = (category: string, index: number) => (
    <span
      key={`${category}-${index}`}
      className={`inline-flex max-w-[12rem] items-center truncate rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-ink-muted)] ${
        index === 0 ? "" : index === 1 ? "hidden sm:inline-flex" : "hidden lg:inline-flex"
      }`}
      title={category}
    >
      {category}
    </span>
  )

  const overflow = (visible: number, visibility: string) => {
    const remaining = values.slice(visible)
    if (!remaining.length) return null

    return (
      <details className={`relative ${visibility}`}>
        <summary
          className="inline-flex cursor-pointer list-none items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-[600] text-[var(--color-ink-muted)] outline-none hover:border-[var(--color-navy)] focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/30"
          aria-label={`Show ${remaining.length} more categories`}
          title={remaining.join(", ")}
        >
          +{remaining.length}
        </summary>
        <div className="absolute left-0 top-full z-20 mt-1 min-w-44 max-w-64 rounded-sm border border-[var(--color-border)] bg-white p-2 text-xs text-[var(--color-ink)] shadow-lg">
          {remaining.map((category) => (
            <div key={category} className="truncate px-1.5 py-1" title={category}>
              {category}
            </div>
          ))}
        </div>
      </details>
    )
  }

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`} aria-label="Categories">
      {values.map(chip)}
      {overflow(1, "sm:hidden")}
      {overflow(2, "hidden sm:inline-flex lg:hidden")}
      {overflow(3, "hidden lg:inline-flex")}
    </div>
  )
}
