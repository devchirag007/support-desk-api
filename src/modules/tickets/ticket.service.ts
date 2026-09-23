import { NotFoundError } from "../../errors/app-error"
import type { TicketRepository } from "./ticket.repository"
import type { CreateTicketInput, ListTicketsQuery, Ticket, UpdateTicketInput } from "./ticket.types"

// Plain substring matching (String#includes), never a RegExp, so special characters are literal.
const matchesAllTerms = (ticket: Ticket, terms: string[]): boolean => {
  const fields = [
    ticket.ticketNumber,
    ticket.subject,
    ticket.description,
    ticket.customerName,
    ticket.customerEmail,
    ...ticket.tags,
  ].map((field) => field.toLowerCase())
  return terms.every((term) => fields.some((field) => field.includes(term)))
}

export const createTicketService = (repository: TicketRepository) => ({
  async list({ q }: ListTicketsQuery = {}): Promise<Ticket[]> {
    const tickets = await repository.findAll()
    const terms = q?.toLowerCase().split(/\s+/).filter(Boolean) ?? []
    if (terms.length === 0) return tickets
    return tickets.filter((ticket) => matchesAllTerms(ticket, terms))
  },

  async getById(id: number): Promise<Ticket> {
    const ticket = await repository.findById(id)
    if (!ticket) throw new NotFoundError(`Ticket ${id} not found`)
    return ticket
  },

  async create(input: CreateTicketInput): Promise<Ticket> {
    const now = new Date().toISOString()
    return repository.insert({ ...input, createdAt: now, updatedAt: now })
  },

  async update(id: number, changes: UpdateTicketInput): Promise<Ticket> {
    const ticket = await repository.update(id, changes, new Date().toISOString())
    if (!ticket) throw new NotFoundError(`Ticket ${id} not found`)
    return ticket
  },

  async remove(id: number): Promise<void> {
    const removed = await repository.remove(id)
    if (!removed) throw new NotFoundError(`Ticket ${id} not found`)
  },
})

export type TicketService = ReturnType<typeof createTicketService>
