import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  isActive?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="flex gap-[6px] items-center h-[18px]">
      {items.map((item, index) => (
        <div key={index} className="flex gap-[6px] items-center">
          {index > 0 && <ChevronRight className="size-3 text-[rgba(16,19,58,0.5)]" />}
          <span
            className={`font-sans text-[12px] leading-[18px] ${
              item.isActive
                ? 'font-bold text-[#707dff]'
                : 'font-medium text-[rgba(16,19,58,0.5)]'
            }`}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
