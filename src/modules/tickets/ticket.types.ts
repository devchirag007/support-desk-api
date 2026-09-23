export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
] as const
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export const TICKET_CHANNELS = ["email", "chat", "phone", "web"] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]
export type TicketChannel = (typeof TICKET_CHANNELS)[number]

export interface Ticket {
  id: number
  ticketNumber: string // e.g. TKT-1001
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  channel: TicketChannel
  customerName: string
  customerEmail: string
  assignee: string | null // null = unassigned
  tags: string[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export type NewTicket = Omit<Ticket, "id" | "ticketNumber">

export type CreateTicketInput = Omit<NewTicket, "createdAt" | "updatedAt">

export type UpdateTicketInput = Partial<Pick<Ticket, "status" | "priority" | "assignee">>
