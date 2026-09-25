import {
  Car,
  Droplet,
  Flame,
  Leaf,
  Trash2,
  Utensils,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Transport: Car,
  Electricity: Zap,
  Heating: Flame,
  Food: Utensils,
  Waste: Trash2,
  Water: Droplet,
}

export function CategoryIcon({
  category,
  ...props
}: { category: string } & LucideProps) {
  const Icon = CATEGORY_ICONS[category] ?? Leaf
  return <Icon {...props} />
}
