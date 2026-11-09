const compact = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const formatNumber = (n: number): string => compact.format(n)
export const formatHours = (n: number): string => `${compact.format(n)}h`
export const formatCurrency = (n: number): string => currency.format(n)
export const formatPct = (n: number, digits = 0): string => `${n.toFixed(digits)}%`

export function formatMinutes(mins: number): string {
  if (mins < 90) return `${Math.round(mins)} min`
  return `${compact.format(mins / 60)} h`
}

export function formatSignedPct(n: number): string {
  const rounded = Math.round(n)
  if (rounded === 0) return '0%'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}%`
}

/** "Clean" axis ticks: 0 to a round max in steps of 1, 2, 2.5 or 5 x 10^k. */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1]
  const raw = max / target
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}
