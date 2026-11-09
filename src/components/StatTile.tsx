import { formatSignedPct } from '../lib/format'
import { STATUS_COLORS } from '../lib/palette'

interface Props {
  label: string
  value: string
  /** Percent change vs the previous period, or null when there's no comparison. */
  delta?: number | null
  /** Whether an increase is good news (true), bad news (false), or neither (undefined). */
  upIsGood?: boolean
  comparison?: string
  hero?: boolean
}

export function StatTile({ label, value, delta, upIsGood, comparison, hero = false }: Props) {
  const hasDelta = delta !== null && delta !== undefined && Math.round(delta) !== 0
  const up = (delta ?? 0) > 0
  const tone = !hasDelta || upIsGood === undefined ? null : up === upIsGood ? 'good' : 'critical'
  const direction = up ? 'up' : 'down'

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${hero ? 'sm:col-span-2' : ''}`}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className={`mt-1 font-semibold text-ink ${hero ? 'text-5xl sm:text-6xl' : 'text-3xl'}`}>{value}</p>
      {delta !== undefined && (
        <p className="mt-2 flex items-center gap-1 text-sm text-ink-2">
          {hasDelta ? (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
                style={{ color: tone ? STATUS_COLORS[tone] : 'var(--ink-2)', transform: up ? undefined : 'rotate(180deg)' }}
              >
                <path d="M6 2 10.5 8.5h-9Z" fill="currentColor" />
              </svg>
              <span>
                <span className="sr-only">{direction} </span>
                {formatSignedPct(delta)} {comparison}
                {tone && <span className="sr-only">{tone === 'good' ? ', an improvement' : ', worse'}</span>}
              </span>
            </>
          ) : (
            <span>{delta === null ? 'No earlier period to compare' : `No change ${comparison ?? ''}`}</span>
          )}
        </p>
      )}
    </div>
  )
}
