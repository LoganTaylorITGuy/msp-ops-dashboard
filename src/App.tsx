import { useMemo, useState } from 'react'
import { BarList } from './components/BarList'
import { FilterBar, ThemeToggle } from './components/Controls'
import { LineChart } from './components/LineChart'
import { SegmentedBar } from './components/SegmentedBar'
import { StatTile } from './components/StatTile'
import { Card, ChartCard, DataTable, StatusBadge } from './components/ui'
import { AS_OF, CLIENTS, EFFORT, TENANT_HEALTH, TICKETS } from './data/mock'
import {
  effortTotals,
  hoursByClient,
  medianFirstResponse,
  openTickets,
  percentChange,
  previousWeeks,
  RANGES,
  selectTickets,
  slaMetPct,
  tenantHealthLevel,
  ticketsByWeek,
  windowWeeks,
  type Filters,
  type HealthLevel,
} from './data/selectors'
import type { Priority } from './data/types'
import { useTheme } from './hooks/useTheme'
import { daysBetween, formatLongDate, formatShortDate } from './lib/dates'
import { formatCurrency, formatHours, formatMinutes, formatNumber, formatPct } from './lib/format'
import { BUCKET_COLORS, CLIENT_COLORS, type StatusKey } from './lib/palette'

const REPO_URL = 'https://github.com/LoganTaylorITGuy/msp-ops-dashboard'
const TOOLKIT_URL = 'https://github.com/LoganTaylorITGuy/m365-admin-toolkit'

const PRIORITY_STATUS: Record<Priority, { status: StatusKey; label: string }> = {
  P1: { status: 'critical', label: 'P1 Critical' },
  P2: { status: 'serious', label: 'P2 High' },
  P3: { status: 'warning', label: 'P3 Normal' },
  P4: { status: 'good', label: 'P4 Low' },
}

const HEALTH_LABEL: Record<HealthLevel, string> = { good: 'Healthy', warning: 'Needs attention', critical: 'At risk' }

export default function App() {
  const [filters, setFilters] = useState<Filters>({ range: '12w', client: 'all' })
  const { resolved } = useTheme()
  const clientColor = (slot: 1 | 2 | 3) => CLIENT_COLORS[resolved][slot]
  const bucketColor = BUCKET_COLORS[resolved]

  const view = useMemo(() => {
    const weeks = windowWeeks(filters.range)
    const prev = previousWeeks(filters.range)
    const clients = filters.client === 'all' ? CLIENTS : CLIENTS.filter((c) => c.id === filters.client)
    const current = selectTickets(TICKETS, weeks, filters.client)
    const before = prev ? selectTickets(TICKETS, prev, filters.client) : null
    const effort = effortTotals(EFFORT, weeks, filters.client)
    const effortBefore = prev ? effortTotals(EFFORT, prev, filters.client) : null
    return {
      weeks,
      clients,
      sla: slaMetPct(current),
      slaDelta: before ? percentChange(slaMetPct(current), slaMetPct(before)) : null,
      ticketCount: current.length,
      ticketDelta: before ? percentChange(current.length, before.length) : null,
      median: medianFirstResponse(current),
      medianDelta: before ? percentChange(medianFirstResponse(current), medianFirstResponse(before)) : null,
      effort,
      billableDelta: effortBefore ? percentChange(effort.billable, effortBefore.billable) : null,
      series: ticketsByWeek(current, weeks, clients),
      byClient: hoursByClient(EFFORT, weeks, clients),
      open: openTickets(TICKETS, filters.client),
      health: TENANT_HEALTH.filter((h) => filters.client === 'all' || h.clientId === filters.client),
    }
  }, [filters])

  const rangeLabel = RANGES.find((r) => r.id === filters.range)!.label.toLowerCase()
  const comparison = `vs previous ${rangeLabel.replace('last ', '')}`
  const clientName = (id: string) => CLIENTS.find((c) => c.id === id)!.name
  const lineSeries = view.series.map((s) => ({
    id: s.client.id,
    name: s.client.name,
    color: clientColor(s.client.slot),
    values: s.values,
  }))
  const xLabels = view.weeks.map(formatShortDate)
  const buckets = [
    { id: 'client', label: 'Client work', value: view.effort.client, color: bucketColor.client },
    { id: 'internal', label: 'Internal operations', value: view.effort.internal, color: bucketColor.internal },
    { id: 'profdev', label: 'Professional development', value: view.effort.profdev, color: bucketColor.profdev },
  ]

  return (
    <div className="min-h-screen bg-page">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to dashboard
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5">
          <div>
            <h1 className="text-xl font-semibold text-ink">MSP Operations Dashboard</h1>
            <p className="mt-1 text-sm text-ink-2">
              Demo with fictional data · Week ending {formatLongDate(AS_OF)}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <FilterBar filters={filters} onChange={setFilters} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            hero
            label="First-response SLA met"
            value={view.sla === null ? '—' : formatPct(view.sla, 1)}
            delta={view.slaDelta}
            upIsGood
            comparison={comparison}
          />
          <StatTile label="Tickets opened" value={formatNumber(view.ticketCount)} delta={view.ticketDelta} comparison={comparison} />
          <StatTile
            label="Median first response"
            value={view.median === null ? '—' : formatMinutes(view.median)}
            delta={view.medianDelta}
            upIsGood={false}
            comparison={comparison}
          />
          <StatTile
            label="Billable hours"
            value={formatHours(view.effort.billable)}
            delta={view.billableDelta}
            upIsGood
            comparison={comparison}
          />
        </div>

        <ChartCard
          title="Tickets opened per week"
          subtitle={`By client, ${rangeLabel}`}
          chart={
            <LineChart
              label={`Tickets opened per week by client, ${rangeLabel}`}
              series={lineSeries}
              xLabels={xLabels}
              describeX={(i) => `Week of ${formatLongDate(view.weeks[i])}`}
              formatValue={formatNumber}
            />
          }
          table={
            <DataTable
              caption="Tickets opened per week by client"
              columns={[{ key: 'week', label: 'Week of' }, ...lineSeries.map((s) => ({ key: s.id, label: s.name, numeric: true }))]}
              rows={view.weeks.map((w, i) => ({
                key: w,
                cells: Object.fromEntries([['week', formatLongDate(w)], ...lineSeries.map((s) => [s.id, s.values[i]])]),
              }))}
            />
          }
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title="Where the time went"
            subtitle={
              filters.client === 'all'
                ? `All staff, ${rangeLabel} · ${formatHours(view.effort.total)} logged`
                : 'Internal and professional-development time is team-wide, so this view needs "All clients".'
            }
            chart={
              filters.client === 'all' ? (
                <SegmentedBar label="Hours by effort bucket" segments={buckets} formatValue={formatHours} />
              ) : (
                <p className="text-sm text-ink-2">
                  {clientName(filters.client)}: {formatHours(view.effort.client)} of client work.
                </p>
              )
            }
            table={
              <DataTable
                caption="Hours by effort bucket"
                columns={[
                  { key: 'bucket', label: 'Bucket' },
                  { key: 'hours', label: 'Hours', numeric: true },
                  { key: 'share', label: 'Share', numeric: true },
                ]}
                rows={buckets.map((b) => ({
                  key: b.id,
                  cells: {
                    bucket: b.label,
                    hours: formatHours(b.value),
                    share: view.effort.total ? formatPct((b.value / view.effort.total) * 100) : '—',
                  },
                }))}
              />
            }
          />

          <ChartCard
            title="Client hours"
            subtitle={`Total logged per client, ${rangeLabel}`}
            chart={
              <BarList
                label="Hours per client"
                formatValue={formatHours}
                items={view.byClient.map((c) => ({
                  id: c.client.id,
                  label: c.client.name,
                  value: c.hours,
                  color: clientColor(c.client.slot),
                  detail: `${formatHours(c.billable)} billable`,
                }))}
              />
            }
            table={
              <DataTable
                caption="Hours per client"
                columns={[
                  { key: 'client', label: 'Client' },
                  { key: 'hours', label: 'Hours', numeric: true },
                  { key: 'billable', label: 'Billable', numeric: true },
                ]}
                rows={view.byClient.map((c) => ({
                  key: c.client.id,
                  cells: { client: c.client.name, hours: formatHours(c.hours), billable: formatHours(c.billable) },
                }))}
              />
            }
          />
        </div>

        <Card
          title="Microsoft 365 tenant health"
          subtitle={
            <>
              The same checks as{' '}
              <a href={TOOLKIT_URL} className="text-ink underline underline-offset-2">
                m365-admin-toolkit
              </a>
              : MFA coverage, stale accounts and unused licenses.
            </>
          }
        >
          <DataTable
            caption="Microsoft 365 tenant health by client"
            columns={[
              { key: 'client', label: 'Client' },
              { key: 'status', label: 'Status' },
              { key: 'mfa', label: 'MFA coverage', numeric: true },
              { key: 'admins', label: 'Admins without MFA', numeric: true },
              { key: 'stale', label: 'Stale accounts (90 days)', numeric: true },
              { key: 'waste', label: 'Unused licenses', numeric: true },
            ]}
            rows={view.health.map((h) => {
              const level = tenantHealthLevel(h)
              return {
                key: h.clientId,
                cells: {
                  client: clientName(h.clientId),
                  status: <StatusBadge status={level} label={HEALTH_LABEL[level]} />,
                  mfa: formatPct(h.mfaCoveragePct),
                  admins: h.adminsWithoutMfa,
                  stale: h.staleAccounts,
                  waste: h.unusedLicenses ? `${h.unusedLicenses} (${formatCurrency(h.monthlyWaste)}/mo)` : '0',
                },
              }
            })}
          />
        </Card>

        <Card title="Open tickets" subtitle={`${view.open.length} open · most urgent first, then oldest`}>
          <DataTable
            caption="Open tickets, most urgent first"
            columns={[
              { key: 'id', label: 'Ticket' },
              { key: 'priority', label: 'Priority' },
              { key: 'client', label: 'Client' },
              { key: 'title', label: 'Summary' },
              { key: 'status', label: 'Status' },
              { key: 'age', label: 'Age', numeric: true },
            ]}
            rows={view.open.map((t) => {
              const age = daysBetween(t.opened, AS_OF)
              return {
                key: t.id,
                cells: {
                  id: t.id,
                  priority: <StatusBadge {...PRIORITY_STATUS[t.priority]} />,
                  client: clientName(t.clientId),
                  title: t.title,
                  status: t.status,
                  age: age === 0 ? 'Today' : `${age} d`,
                },
              }
            })}
          />
        </Card>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-ink-2">
        Built by Logan D Taylor with React, TypeScript and Tailwind. Charts are hand-built SVG.{' '}
        <a href={REPO_URL} className="text-ink underline underline-offset-2">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}
