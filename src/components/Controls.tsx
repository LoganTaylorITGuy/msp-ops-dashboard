import { useId } from 'react'
import { CLIENTS } from '../data/mock'
import { RANGES, type ClientFilter, type Filters, type RangeId } from '../data/selectors'
import { useTheme, type ThemePreference } from '../hooks/useTheme'

function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  name: string
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium text-ink-2">{legend}</legend>
      <div className="inline-flex flex-wrap rounded-lg border border-line bg-surface p-0.5">
        {options.map((o) => (
          <label
            key={o.id}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
              value === o.id ? 'bg-ink font-medium text-surface' : 'text-ink-2 hover:bg-wash'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const clientId = useId()
  return (
    <div className="flex flex-wrap items-end gap-4" role="search" aria-label="Dashboard filters">
      <Segmented
        legend="Date range"
        name="range"
        options={RANGES}
        value={filters.range}
        onChange={(range: RangeId) => onChange({ ...filters, range })}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={clientId} className="mb-1 text-xs font-medium text-ink-2">
          Client
        </label>
        <select
          id={clientId}
          value={filters.client}
          onChange={(e) => onChange({ ...filters, client: e.target.value as ClientFilter })}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="all">All clients</option>
          {CLIENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

const THEME_OPTIONS: readonly { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  return <Segmented legend="Theme" name="theme" options={THEME_OPTIONS} value={preference} onChange={setPreference} />
}
