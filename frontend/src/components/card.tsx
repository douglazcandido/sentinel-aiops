import type { ReactNode, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  index?: number
  hover?: boolean
}

export function Card({ children, className, index, hover, style, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "group/card relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5",
        "animate-enter transition-all duration-300",
        "hover:border-[var(--color-border-strong)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]",
        hover && "hover:bg-[var(--color-surface-2)]",
        className,
      )}
      style={{
        animationDelay: index !== undefined ? `${index * 60}ms` : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
