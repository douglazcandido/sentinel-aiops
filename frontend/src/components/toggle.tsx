import { cn } from "@/lib/utils"

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label?: string
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-3)]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-[var(--color-background)] shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  )
}
