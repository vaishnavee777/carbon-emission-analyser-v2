import { CategoryIcon } from "../../lib/categories"

interface CategoryCardProps {
  category: string
  value: number
}

function CategoryCard({
  category,
  value,
}: CategoryCardProps) {

  return (
    <div className="group min-w-0 flex-1 rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-4 shadow-lg shadow-black/10 transition-transform duration-200 hover:-translate-y-1">

      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lavender)]/10 transition-colors group-hover:bg-[var(--lavender)]/20">
        <CategoryIcon
          category={category}
          size={19}
          strokeWidth={1.8}
          className="text-[var(--lavender)]"
        />
      </div>

      {/* Category name */}
      <p className="mt-4 truncate text-sm text-[var(--text-secondary)]">
        {category}
      </p>

      {/* Emissions */}
      <p className="mt-1 text-xl font-semibold">
        {value.toFixed(1)}

        <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
          kg
        </span>
      </p>

    </div>
  )
}

export default CategoryCard