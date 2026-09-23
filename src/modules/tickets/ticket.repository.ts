import { buildSeedTickets } from "./ticket.seed"
import type { NewTicket, Ticket, UpdateTicketInput } from "./ticket.types"

/**
 * Persistence boundary. The service only knows this interface, so the in-memory
 * implementation below can be replaced by a real database without touching business logic.
 */
export interface TicketRepository {
  findAll(): Promise<Ticket[]>
  findById(id: number): Promise<Ticket | undefined>
  insert(input: NewTicket): Promise<Ticket>
  update(id: number, changes: UpdateTicketInput, updatedAt: string): Promise<Ticket | undefined>
  remove(id: number): Promise<boolean>
}

export const createInMemoryTicketRepository = (
  initial: Ticket[] = buildSeedTickets(),
): TicketRepository => {
  const tickets = [...initial]
  let nextId = tickets.reduce((max, t) => Math.max(max, t.id), 0) + 1

  return {
    async findAll() {
      return [...tickets]
    },

    async findById(id) {
      return tickets.find((t) => t.id === id)
    },

    async insert(input) {
      const id = nextId++
      const ticket: Ticket = { id, ticketNumber: `TKT-${1000 + id}`, ...input }
      tickets.push(ticket)
      return ticket
    },

    async update(id, changes, updatedAt) {
      const ticket = tickets.find((t) => t.id === id)
      if (!ticket) return undefined
      Object.assign(ticket, changes, { updatedAt })
      return ticket
    },

    async remove(id) {
      const index = tickets.findIndex((t) => t.id === id)
      if (index === -1) return false
      tickets.splice(index, 1)
      return true
    },
  }
}
