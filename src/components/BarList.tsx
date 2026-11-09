import { useState } from 'react'

export interface BarItem {
  id: string
  label: string
  value: number
  color: string
  /** Extra line shown on hover/focus, e.g. the billable split. */
  detail?: string
}

/** Ranked horizontal bars: label, bar from a shared baseline, value at the tip. */
export function BarList({ items, formatValue, label }: { items: BarItem[]; formatValue: (v: number) => string; label: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <ul aria-label={label} className="space-y-3">
      {items.map((item) => {
        const pct = (item.value / max) * 100
        const isActive = active === item.id
        return (
          <li
            key={item.id}
            tabIndex={0}
            aria-label={`${item.label}: ${formatValue(item.value)}${item.detail ? `, ${item.detail}` : ''}`}
            onPointerEnter={() => setActive(item.id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(item.id)}
            onBlur={() => setActive(null)}
            className="relative grid grid-cols-[minmax(7rem,9rem)_1fr] items-center gap-3 rounded-md py-1"
          >
            <span className="truncate text-sm text-ink" aria-hidden="true">
              {item.label}
            </span>
            <span className="flex items-center gap-2" aria-hidden="true">
              <span
                className="h-5 rounded-r transition-[filter]"
                style={{
                  width: `calc(${pct}% - 4rem)`,
                  minWidth: '2px',
                  background: item.color,
                  filter: isActive ? 'brightness(1.12)' : undefined,
                }}
              />
              <span className="text-sm font-semibold text-ink tabular-nums">{formatValue(item.value)}</span>
            </span>
            {isActive && item.detail && (
              <span
                role="presentation"
                className="pointer-events-none absolute -top-8 left-36 z-10 whitespace-nowrap rounded-lg border border-line bg-raised px-3 py-1 text-xs text-ink-2 shadow-lg"
              >
                {item.detail}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
