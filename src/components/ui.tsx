import { useId, useState, type ReactNode } from 'react'
import { STATUS_COLORS, type StatusKey } from '../lib/palette'

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

/** A chart card whose content can flip to an accessible data table. */
export function ChartCard({
  title,
  subtitle,
  chart,
  table,
  className,
}: {
  title: string
  subtitle?: ReactNode
  chart: ReactNode
  table: ReactNode
  className?: string
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card
      title={title}
      subtitle={subtitle}
      className={className}
      action={
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
          className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-2 hover:bg-wash"
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      }
    >
      {showTable ? table : chart}
    </Card>
  )
}

const STATUS_ICON: Record<StatusKey, ReactNode> = {
  good: <path d="M4 8.5 7 11.5 12.5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  warning: <path d="M8 2.5 14 13H2Z M8 6.5v3 M8 11.2v.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />,
  serious: <path d="M8 4v5 M8 11.5v.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  critical: <path d="M5 5l6 6M11 5l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
}

/** Status is never color alone: icon + text label, with the color on the icon only. */
export function StatusBadge({ status, label }: { status: StatusKey; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ color: STATUS_COLORS[status] }}>
        {STATUS_ICON[status]}
      </svg>
      {label}
    </span>
  )
}

export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: { key: string; label: string; numeric?: boolean }[]
  rows: { key: string; cells: Record<string, ReactNode> }[]
}) {
  return (
    // Focusable + labelled so keyboard users can scroll wide tables on small screens.
    <div className="overflow-x-auto rounded-md" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-axis">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`px-2 py-2 font-medium text-ink-2 ${c.numeric ? 'text-right' : 'text-left'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-grid last:border-0">
              {columns.map((c, i) => {
                const Cell = i === 0 ? 'th' : 'td'
                return (
                  <Cell
                    key={c.key}
                    {...(i === 0 ? { scope: 'row' } : {})}
                    className={`px-2 py-2 text-ink ${i === 0 ? 'font-normal text-left' : ''} ${c.numeric ? 'text-right tabular-nums' : 'text-left'}`}
                  >
                    {r.cells[c.key]}
                  </Cell>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
