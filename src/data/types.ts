export type ClientId = 'contoso' | 'fabrikam' | 'northwind'

export interface Client {
  id: ClientId
  name: string
  seats: number
  /** Categorical palette slot (1-based). Color follows the client everywhere. */
  slot: 1 | 2 | 3
}

export type Priority = 'P1' | 'P2' | 'P3' | 'P4'
export type TicketStatus = 'New' | 'In progress' | 'Waiting on client' | 'Resolved'

export interface Ticket {
  id: string
  clientId: ClientId
  title: string
  priority: Priority
  status: TicketStatus
  /** ISO date (YYYY-MM-DD) the ticket was opened. */
  opened: string
  firstResponseMins: number
  slaTargetMins: number
}

export interface ClientEffort {
  hours: number
  billable: number
}

export interface WeeklyEffort {
  /** Monday of the ISO week, YYYY-MM-DD. */
  weekStart: string
  clients: Record<ClientId, ClientEffort>
  internal: number
  profdev: number
}

/** Snapshot shaped like the output of m365-admin-toolkit's audit commands. */
export interface TenantHealth {
  clientId: ClientId
  mfaCoveragePct: number
  adminsWithoutMfa: number
  staleAccounts: number
  unusedLicenses: number
  monthlyWaste: number
}
