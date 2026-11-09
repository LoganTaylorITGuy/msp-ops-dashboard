/**
 * Deterministic, fictional MSP data. A fixed seed and a fixed "as of" date keep the demo
 * stable across reloads and make the numbers testable. No real clients or people.
 */
import { addDays, daysBetween } from '../lib/dates'
import type {
  Client,
  ClientId,
  Priority,
  TenantHealth,
  Ticket,
  TicketStatus,
  WeeklyEffort,
} from './types'

/** Sunday that ends the last full week shown. */
export const AS_OF = '2026-11-08'
export const WEEK_COUNT = 26
const LAST_WEEK_START = addDays(AS_OF, -6)

export const CLIENTS: readonly Client[] = [
  { id: 'contoso', name: 'Contoso Dental', seats: 24, slot: 1 },
  { id: 'fabrikam', name: 'Fabrikam Logistics', seats: 58, slot: 2 },
  { id: 'northwind', name: 'Northwind Traders', seats: 35, slot: 3 },
]

export const SLA_TARGET_MINS: Record<Priority, number> = { P1: 30, P2: 60, P3: 240, P4: 480 }

export const WEEK_STARTS: readonly string[] = Array.from({ length: WEEK_COUNT }, (_, i) =>
  addDays(LAST_WEEK_START, -(WEEK_COUNT - 1 - i) * 7),
)

/** mulberry32: tiny, fast, seedable PRNG. */
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function weighted<T>(rand: () => number, options: readonly (readonly [T, number])[]): T {
  const total = options.reduce((sum, [, w]) => sum + w, 0)
  let roll = rand() * total
  for (const [value, w] of options) {
    roll -= w
    if (roll < 0) return value
  }
  return options[options.length - 1][0]
}

const quarter = (n: number): number => Math.round(n * 4) / 4

const TITLES: Record<Priority, readonly string[]> = {
  P1: ['Internet down at main office', 'Ransomware alert on workstation', 'Email not flowing for all users'],
  P2: ['VPN failing for remote staff', 'Line-of-business app will not launch', 'Shared drive unavailable', 'Suspicious sign-in alert'],
  P3: ['New hire setup', 'Printer offline', 'Mailbox permission request', 'Teams audio issues', 'Laptop running slow', 'MFA re-registration'],
  P4: ['Software install request', 'Distribution list change', 'Offboarding: remove access', 'License assignment', 'Password manager setup'],
}

const PRIORITY_WEIGHTS = [
  ['P1', 4],
  ['P2', 18],
  ['P3', 52],
  ['P4', 26],
] as const

const BASE_TICKETS: Record<ClientId, number> = { contoso: 5, fabrikam: 9, northwind: 6 }

/** Northwind's firewall refresh: extra tickets and slower responses for three weeks. */
const isNorthwindProject = (client: ClientId, week: number) =>
  client === 'northwind' && week >= 17 && week <= 19

function generate() {
  const rand = seeded(20261108)
  const tickets: Ticket[] = []
  const effort: WeeklyEffort[] = []
  let nextId = 1001

  WEEK_STARTS.forEach((weekStart, week) => {
    const clients = {} as WeeklyEffort['clients']

    CLIENTS.forEach((client, idx) => {
      let mean = BASE_TICKETS[client.id] * (1 + 0.2 * Math.sin(week / 3 + idx * 2))
      if (isNorthwindProject(client.id, week)) mean += 6
      if (client.id === 'fabrikam' && week >= 21) mean += 3 // they hired a new dispatch team
      const count = Math.max(0, Math.round(mean + (rand() - 0.5) * 4))

      for (let k = 0; k < count; k++) {
        const priority = weighted(rand, PRIORITY_WEIGHTS)
        const opened = addDays(weekStart, Math.floor(rand() * 5))
        const target = SLA_TARGET_MINS[priority]
        const metRate = isNorthwindProject(client.id, week) ? 0.74 : 0.93
        const ratio = rand() < metRate ? 0.12 + rand() * 0.85 : 1.05 + rand() * 1.6
        const age = daysBetween(opened, AS_OF)

        let status: TicketStatus
        if (age > 10) status = rand() < 0.995 ? 'Resolved' : 'Waiting on client'
        else if (age > 4) status = rand() < 0.75 ? 'Resolved' : weighted(rand, [['In progress', 2], ['Waiting on client', 1]] as const)
        else status = rand() < 0.35 ? 'Resolved' : weighted(rand, [['New', 2], ['In progress', 3], ['Waiting on client', 1]] as const)

        const titles = TITLES[priority]
        tickets.push({
          id: `T-${nextId++}`,
          clientId: client.id,
          title: titles[Math.floor(rand() * titles.length)],
          priority,
          status,
          opened,
          firstResponseMins: Math.max(2, Math.round(target * ratio)),
          slaTargetMins: target,
        })
      }

      const project = isNorthwindProject(client.id, week) ? 7 + rand() * 3 : rand() * 2
      const hours = quarter(count * 0.8 + project + 0.5)
      clients[client.id] = { hours, billable: quarter(hours * (0.78 + rand() * 0.12)) }
    })

    effort.push({
      weekStart,
      clients,
      internal: quarter(6 + rand() * 4),
      profdev: quarter(2 + rand() * 3),
    })
  })

  tickets.sort((a, b) => a.opened.localeCompare(b.opened) || a.id.localeCompare(b.id))
  return { tickets, effort }
}

const generated = generate()
export const TICKETS: readonly Ticket[] = generated.tickets
export const EFFORT: readonly WeeklyEffort[] = generated.effort

export const TENANT_HEALTH: readonly TenantHealth[] = [
  { clientId: 'contoso', mfaCoveragePct: 100, adminsWithoutMfa: 0, staleAccounts: 1, unusedLicenses: 2, monthlyWaste: 44 },
  { clientId: 'fabrikam', mfaCoveragePct: 91, adminsWithoutMfa: 0, staleAccounts: 4, unusedLicenses: 5, monthlyWaste: 110 },
  { clientId: 'northwind', mfaCoveragePct: 80, adminsWithoutMfa: 1, staleAccounts: 2, unusedLicenses: 0, monthlyWaste: 0 },
]
