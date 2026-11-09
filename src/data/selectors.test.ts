import { describe, expect, it } from 'vitest'
import { AS_OF, CLIENTS, EFFORT, TENANT_HEALTH, TICKETS, WEEK_COUNT, WEEK_STARTS } from './mock'
import {
  effortTotals,
  hoursByClient,
  medianFirstResponse,
  openTickets,
  percentChange,
  previousWeeks,
  selectTickets,
  slaMetPct,
  tenantHealthLevel,
  ticketsByWeek,
  windowWeeks,
} from './selectors'
import type { Ticket } from './types'

const ticket = (over: Partial<Ticket>): Ticket => ({
  id: 'T-1',
  clientId: 'contoso',
  title: 'x',
  priority: 'P3',
  status: 'Resolved',
  opened: '2026-11-02',
  firstResponseMins: 10,
  slaTargetMins: 240,
  ...over,
})

describe('mock data', () => {
  it('is deterministic and covers 26 Monday-start weeks ending on the as-of Sunday', () => {
    expect(WEEK_STARTS).toHaveLength(WEEK_COUNT)
    expect(WEEK_STARTS.at(-1)).toBe('2026-11-02')
    expect(new Date(`${WEEK_STARTS[0]}T00:00:00Z`).getUTCDay()).toBe(1)
    expect(AS_OF).toBe('2026-11-08')
    expect(TICKETS.length).toBeGreaterThan(300)
    expect(new Set(TICKETS.map((t) => t.id)).size).toBe(TICKETS.length)
    expect(EFFORT).toHaveLength(WEEK_COUNT)
  })

  it('never opens a ticket after the as-of date', () => {
    expect(TICKETS.every((t) => t.opened <= AS_OF)).toBe(true)
  })
})

describe('time windows', () => {
  it('takes the most recent N weeks', () => {
    expect(windowWeeks('4w')).toEqual(WEEK_STARTS.slice(-4))
    expect(windowWeeks('26w')).toHaveLength(26)
  })

  it('has a previous period only when the data reaches back far enough', () => {
    expect(previousWeeks('4w')).toEqual(WEEK_STARTS.slice(-8, -4))
    expect(previousWeeks('12w')).toHaveLength(12)
    expect(previousWeeks('26w')).toBeNull()
  })

  it('includes the whole Monday-Sunday week and nothing outside it', () => {
    const weeks = ['2026-11-02']
    const picked = selectTickets(
      [
        ticket({ id: 'sun-before', opened: '2026-11-01' }),
        ticket({ id: 'mon', opened: '2026-11-02' }),
        ticket({ id: 'sun', opened: '2026-11-08' }),
        ticket({ id: 'next-mon', opened: '2026-11-09' }),
        ticket({ id: 'other-client', opened: '2026-11-03', clientId: 'fabrikam' }),
      ],
      weeks,
      'contoso',
    )
    expect(picked.map((t) => t.id)).toEqual(['mon', 'sun'])
  })
})

describe('metrics', () => {
  it('computes SLA met %, counting a response exactly on target as met', () => {
    const tickets = [
      ticket({ firstResponseMins: 240 }),
      ticket({ firstResponseMins: 241 }),
      ticket({ firstResponseMins: 5 }),
      ticket({ firstResponseMins: 500 }),
    ]
    expect(slaMetPct(tickets)).toBe(50)
    expect(slaMetPct([])).toBeNull()
  })

  it('computes the median for odd and even counts', () => {
    expect(medianFirstResponse([ticket({ firstResponseMins: 9 }), ticket({ firstResponseMins: 1 }), ticket({ firstResponseMins: 4 })])).toBe(4)
    expect(medianFirstResponse([ticket({ firstResponseMins: 10 }), ticket({ firstResponseMins: 20 })])).toBe(15)
    expect(medianFirstResponse([])).toBeNull()
  })

  it('returns null percent change without a baseline', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10)
    expect(percentChange(5, 0)).toBeNull()
    expect(percentChange(null, 5)).toBeNull()
  })

  it('weekly series add up to the tickets in the window', () => {
    const weeks = windowWeeks('12w')
    const tickets = selectTickets(TICKETS, weeks, 'all')
    const series = ticketsByWeek(tickets, weeks, CLIENTS)
    const total = series.flatMap((s) => s.values).reduce((a, b) => a + b, 0)
    expect(total).toBe(tickets.length)
    expect(series.every((s) => s.values.length === 12)).toBe(true)
  })

  it('splits effort into buckets, and only counts team-wide time for "all clients"', () => {
    const weeks = windowWeeks('4w')
    const all = effortTotals(EFFORT, weeks, 'all')
    expect(all.total).toBeCloseTo(all.client + all.internal + all.profdev)
    expect(all.billable).toBeLessThanOrEqual(all.client)
    expect(all.internal).toBeGreaterThan(0)

    const one = effortTotals(EFFORT, weeks, 'northwind')
    expect(one.internal).toBe(0)
    expect(one.profdev).toBe(0)
    expect(one.client).toBeLessThan(all.client)
  })

  it('ranks clients by hours, largest first', () => {
    const rows = hoursByClient(EFFORT, windowWeeks('26w'), CLIENTS)
    expect(rows).toHaveLength(3)
    expect(rows[0].hours).toBeGreaterThanOrEqual(rows[1].hours)
    expect(rows[1].hours).toBeGreaterThanOrEqual(rows[2].hours)
  })

  it('orders open tickets by priority, then oldest first', () => {
    const open = openTickets(
      [
        ticket({ id: 'a', priority: 'P3', status: 'New', opened: '2026-11-01' }),
        ticket({ id: 'b', priority: 'P1', status: 'In progress', opened: '2026-11-05' }),
        ticket({ id: 'c', priority: 'P3', status: 'Waiting on client', opened: '2026-10-20' }),
        ticket({ id: 'd', priority: 'P1', status: 'Resolved' }),
      ],
      'all',
    )
    expect(open.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('tenant health', () => {
  it('treats any admin without MFA as critical', () => {
    const base = TENANT_HEALTH[0]
    expect(tenantHealthLevel({ ...base, mfaCoveragePct: 100, adminsWithoutMfa: 1 })).toBe('critical')
    expect(tenantHealthLevel({ ...base, mfaCoveragePct: 84, adminsWithoutMfa: 0 })).toBe('critical')
    expect(tenantHealthLevel({ ...base, mfaCoveragePct: 90, adminsWithoutMfa: 0, staleAccounts: 0 })).toBe('warning')
    expect(tenantHealthLevel({ ...base, mfaCoveragePct: 100, adminsWithoutMfa: 0, staleAccounts: 4 })).toBe('warning')
    expect(tenantHealthLevel({ ...base, mfaCoveragePct: 98, adminsWithoutMfa: 0, staleAccounts: 1 })).toBe('good')
  })
})
