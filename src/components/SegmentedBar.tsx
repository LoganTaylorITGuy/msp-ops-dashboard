import { useState } from 'react'
import { useElementWidth } from '../hooks/useElementWidth'
import { inkOn } from '../lib/palette'

export interface Segment {
  id: string
  label: string
  value: number
  color: string
}

const GAP = 2
/** Rough width of a short share label like "56%" at 13px semibold, plus padding. */
const LABEL_SPACE = 44

/** One whole split into parts (tall variant): shares printed inside when they fit. */
export function SegmentedBar({ segments, formatValue, label }: { segments: Segment[]; formatValue: (v: number) => string; label: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(600)
  const [active, setActive] = useState<string | null>(null)
  const total = segments.reduce((a, s) => a + s.value, 0)
  const visible = segments.filter((s) => s.value > 0)
  const usable = width - GAP * Math.max(0, visible.length - 1)
  const share = (s: Segment) => (total ? (s.value / total) * 100 : 0)

  return (
    <div>
      <div ref={ref} role="list" aria-label={label} className="relative flex h-7" style={{ gap: GAP }}>
        {visible.map((s) => {
          const pct = share(s)
          const fits = (usable * pct) / 100 >= LABEL_SPACE
          return (
            <div
              key={s.id}
              role="listitem"
              tabIndex={0}
              aria-label={`${s.label}: ${formatValue(s.value)}, ${Math.round(pct)}%`}
              onPointerEnter={() => setActive(s.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(s.id)}
              onBlur={() => setActive(null)}
              className="flex items-center rounded px-2 text-[13px] font-semibold"
              style={{
                flexGrow: s.value,
                flexBasis: 0,
                background: s.color,
                color: inkOn(s.color),
                filter: active === s.id ? 'brightness(1.1)' : undefined,
              }}
            >
              {fits && <span aria-hidden="true">{Math.round(pct)}%</span>}
            </div>
          )
        })}
        {active &&
          (() => {
            const s = visible.find((v) => v.id === active)!
            return (
              <div className="pointer-events-none absolute -top-10 left-0 z-10 whitespace-nowrap rounded-lg border border-line bg-raised px-3 py-1.5 text-sm shadow-lg">
                <span className="font-semibold text-ink tabular-nums">{formatValue(s.value)}</span>{' '}
                <span className="text-ink-2">
                  {s.label} · {Math.round(share(s))}%
                </span>
              </div>
            )
          })()}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-hidden="true">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
