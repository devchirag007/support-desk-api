import { NotFoundError } from "../../errors/app-error"
import type { TicketRepository } from "./ticket.repository"
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type CreateTicketInput,
  type ListTicketsPageQuery,
  type ListTicketsQuery,
  type Ticket,
  type TicketPage,
  type UpdateTicketInput,
} from "./ticket.types"

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
  // Search first, then the status filter. Always returns a new array.
  async list({ q, status }: ListTicketsQuery = {}): Promise<Ticket[]> {
    let tickets = await repository.findAll()

    const terms = q?.toLowerCase().split(/\s+/).filter(Boolean) ?? []
    if (terms.length > 0) tickets = tickets.filter((ticket) => matchesAllTerms(ticket, terms))

    if (status && status.length > 0) {
      tickets = tickets.filter((ticket) => status.includes(ticket.status))
    }
    return tickets
  },

  // Search, then filter, then paginate. total counts every match, not just the current page.
  async listPage({
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    ...query
  }: ListTicketsPageQuery = {}): Promise<TicketPage> {
    const matches = await this.list(query)
    const start = (page - 1) * limit
    return {
      data: matches.slice(start, start + limit),
      meta: { page, limit, total: matches.length, totalPages: Math.ceil(matches.length / limit) },
    }
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
