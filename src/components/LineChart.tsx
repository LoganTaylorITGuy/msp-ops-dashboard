import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementWidth } from '../hooks/useElementWidth'
import { niceTicks } from '../lib/format'

export interface LineSeries {
  id: string
  name: string
  color: string
  values: number[]
}

interface Props {
  series: LineSeries[]
  /** One label per x position (already formatted, e.g. "Nov 2"). */
  xLabels: string[]
  /** Spoken/tooltip heading for an x position, e.g. "Week of Nov 2". */
  describeX: (index: number) => string
  formatValue: (v: number) => string
  label: string
  height?: number
}

const MIN_LABEL_GAP = 14

export function LineChart({ series, xLabels, describeX, formatValue, label, height = 260 }: Props) {
  const [ref, measured] = useElementWidth<HTMLDivElement>(640)
  const [active, setActive] = useState<number | null>(null)
  const helpId = useId()

  const width = Math.max(measured, 280)
  const compact = width < 520
  const m = { top: 16, right: compact ? 16 : 150, bottom: 30, left: 36 }
  const innerW = width - m.left - m.right
  const innerH = height - m.top - m.bottom
  const n = xLabels.length

  const ticks = niceTicks(Math.max(1, ...series.flatMap((s) => s.values)), 4)
  const yMax = ticks[ticks.length - 1]
  const x = (i: number) => m.left + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1))
  const y = (v: number) => m.top + innerH - (v / yMax) * innerH

  // Show as many x labels as fit (~64px each), always including the last.
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))))
  const showX = (i: number) => i === n - 1 || (i % every === 0 && n - 1 - i >= every / 2)

  // Direct end labels only when they don't collide; otherwise legend + tooltip carry identity.
  const ends = series
    .map((s) => ({ s, y: y(s.values[n - 1] ?? 0) }))
    .sort((a, b) => a.y - b.y)
  const endLabelsFit = !compact && ends.every((e, i) => i === 0 || e.y - ends[i - 1].y >= MIN_LABEL_GAP)

  const indexAt = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * width
    const step = n <= 1 ? 1 : innerW / (n - 1)
    return Math.min(n - 1, Math.max(0, Math.round((px - m.left) / step)))
  }

  const onPointerMove = (e: PointerEvent<SVGRectElement>) =>
    setActive(indexAt(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect()))

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, (i: number) => number> = {
      ArrowRight: (i) => Math.min(n - 1, i + 1),
      ArrowLeft: (i) => Math.max(0, i - 1),
      Home: () => 0,
      End: () => n - 1,
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    setActive((i) => move(i ?? n - 1))
  }

  const readout =
    active === null
      ? ''
      : `${describeX(active)}: ${series.map((s) => `${s.name} ${formatValue(s.values[active])}`).join(', ')}`

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legend">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="15" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {s.name}
          </li>
        ))}
      </ul>

      <div
        ref={ref}
        role="group"
        aria-roledescription="chart"
        aria-label={label}
        aria-describedby={helpId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((i) => i ?? n - 1)}
        onBlur={() => setActive(null)}
        className="relative rounded-md"
      >
        <p id={helpId} className="sr-only">
          Use the left and right arrow keys to read each week. A table view is also available.
        </p>
        <svg width={width} height={height} className="block" aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={m.left}
                x2={width - m.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'}
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-2 text-xs tabular-nums">
                {t}
              </text>
            </g>
          ))}

          {xLabels.map((l, i) =>
            showX(i) ? (
              <text key={l} x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-2 text-xs">
                {l}
              </text>
            ) : null,
          )}

          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={m.top} y2={m.top + innerH} stroke="var(--axis)" strokeWidth="1" />
          )}

          {series.map((s) => (
            <path
              key={s.id}
              d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {series.map((s) => {
            const i = active ?? n - 1
            return (
              <circle key={s.id} cx={x(i)} cy={y(s.values[i])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
            )
          })}

          {endLabelsFit &&
            ends.map(({ s, y: ly }) => (
              <text key={s.id} x={x(n - 1) + 10} y={ly} dy="0.32em" className="fill-ink text-xs">
                <tspan className="font-semibold">{formatValue(s.values[n - 1])}</tspan>
                <tspan className="fill-ink-2"> {s.name}</tspan>
              </text>
            ))}

          <rect
            x={m.left}
            y={m.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-line bg-raised px-3 py-2 text-sm shadow-lg"
            style={
              x(active) > width * 0.6
                ? { right: width - x(active) + 12 }
                : { left: x(active) + 12 }
            }
          >
            <p className="mb-1 text-xs text-ink-2">{describeX(active)}</p>
            {series.map((s) => (
              <p key={s.id} className="flex items-center gap-2">
                <svg width="12" height="4" aria-hidden="true">
                  <line x1="1" y1="2" x2="11" y2="2" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="font-semibold text-ink tabular-nums">{formatValue(s.values[active])}</span>
                <span className="text-ink-2">{s.name}</span>
              </p>
            ))}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {readout}
        </p>
      </div>
    </div>
  )
}
