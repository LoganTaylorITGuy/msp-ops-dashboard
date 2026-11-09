/** Pure functions that turn raw data + filters into every number the dashboard shows. */
import { addDays } from '../lib/dates'
import { CLIENTS, WEEK_COUNT, WEEK_STARTS } from './mock'
import type { Client, ClientId, Priority, TenantHealth, Ticket, WeeklyEffort } from './types'

export type RangeId = '4w' | '12w' | '26w'
export type ClientFilter = ClientId | 'all'

export const RANGES: readonly { id: RangeId; label: string; weeks: number }[] = [
  { id: '4w', label: 'Last 4 weeks', weeks: 4 },
  { id: '12w', label: 'Last 12 weeks', weeks: 12 },
  { id: '26w', label: 'Last 26 weeks', weeks: 26 },
]

export interface Filters {
  range: RangeId
  client: ClientFilter
}

const weeksFor = (range: RangeId): number => RANGES.find((r) => r.id === range)?.weeks ?? 12

export function windowWeeks(range: RangeId, all: readonly string[] = WEEK_STARTS): string[] {
  return all.slice(-weeksFor(range))
}

/** The equal-length window just before this one, or null when the data doesn't reach back that far. */
export function previousWeeks(range: RangeId, all: readonly string[] = WEEK_STARTS): string[] | null {
  const n = weeksFor(range)
  if (n * 2 > Math.min(all.length, WEEK_COUNT)) return null
  return all.slice(-2 * n, -n)
}

function inWeeks(date: string, weeks: readonly string[]): boolean {
  if (weeks.length === 0) return false
  return date >= weeks[0] && date <= addDays(weeks[weeks.length - 1], 6)
}

export function selectTickets(
  tickets: readonly Ticket[],
  weeks: readonly string[],
  client: ClientFilter,
): Ticket[] {
  return tickets.filter((t) => inWeeks(t.opened, weeks) && (client === 'all' || t.clientId === client))
}

export function slaMetPct(tickets: readonly Ticket[]): number | null {
  if (tickets.length === 0) return null
  const met = tickets.filter((t) => t.firstResponseMins <= t.slaTargetMins).length
  return (met / tickets.length) * 100
}

export function medianFirstResponse(tickets: readonly Ticket[]): number | null {
  if (tickets.length === 0) return null
  const sorted = tickets.map((t) => t.firstResponseMins).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Percent change; null when there's no baseline to compare against. */
export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export interface WeeklySeries {
  client: Client
  values: number[]
}

export function ticketsByWeek(
  tickets: readonly Ticket[],
  weeks: readonly string[],
  clients: readonly Client[],
): WeeklySeries[] {
  return clients.map((client) => ({
    client,
    values: weeks.map((w) => tickets.filter((t) => t.clientId === client.id && inWeeks(t.opened, [w])).length),
  }))
}

export interface EffortTotals {
  client: number
  billable: number
  internal: number
  profdev: number
  total: number
}

export function effortTotals(
  effort: readonly WeeklyEffort[],
  weeks: readonly string[],
  client: ClientFilter,
): EffortTotals {
  const rows = effort.filter((e) => weeks.includes(e.weekStart))
  const ids = client === 'all' ? CLIENTS.map((c) => c.id) : [client]
  const sum = (f: (e: WeeklyEffort) => number) => rows.reduce((acc, e) => acc + f(e), 0)
  const clientHours = sum((e) => ids.reduce((a, id) => a + e.clients[id].hours, 0))
  const billable = sum((e) => ids.reduce((a, id) => a + e.clients[id].billable, 0))
  // Internal and professional-development time belongs to the whole team, not one client.
  const internal = client === 'all' ? sum((e) => e.internal) : 0
  const profdev = client === 'all' ? sum((e) => e.profdev) : 0
  return { client: clientHours, billable, internal, profdev, total: clientHours + internal + profdev }
}

export interface ClientHours {
  client: Client
  hours: number
  billable: number
}

export function hoursByClient(
  effort: readonly WeeklyEffort[],
  weeks: readonly string[],
  clients: readonly Client[],
): ClientHours[] {
  const rows = effort.filter((e) => weeks.includes(e.weekStart))
  return clients
    .map((client) => ({
      client,
      hours: rows.reduce((a, e) => a + e.clients[client.id].hours, 0),
      billable: rows.reduce((a, e) => a + e.clients[client.id].billable, 0),
    }))
    .sort((a, b) => b.hours - a.hours || a.client.name.localeCompare(b.client.name))
}

const PRIORITY_ORDER: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

/** Everything not resolved, most urgent first, then oldest first. */
export function openTickets(tickets: readonly Ticket[], client: ClientFilter): Ticket[] {
  return tickets
    .filter((t) => t.status !== 'Resolved' && (client === 'all' || t.clientId === client))
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        a.opened.localeCompare(b.opened) ||
        a.id.localeCompare(b.id),
    )
}

export type HealthLevel = 'good' | 'warning' | 'critical'

/** Same thresholds a tenant review would use: any unprotected admin is critical. */
export function tenantHealthLevel(h: TenantHealth): HealthLevel {
  if (h.adminsWithoutMfa > 0 || h.mfaCoveragePct < 85) return 'critical'
  if (h.mfaCoveragePct < 95 || h.staleAccounts > 3) return 'warning'
  return 'good'
}
