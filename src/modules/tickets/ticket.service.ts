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

// Higher tier = more relevant: ticketNumber > subject > tags > customerName/customerEmail > description.
const searchableFields = (ticket: Ticket): Array<{ tier: number; text: string }> =>
  [
    { tier: 5, text: ticket.ticketNumber },
    { tier: 4, text: ticket.subject },
    ...ticket.tags.map((tag) => ({ tier: 3, text: tag })),
    { tier: 2, text: ticket.customerName },
    { tier: 2, text: ticket.customerEmail },
    { tier: 1, text: ticket.description },
  ].map(({ tier, text }) => ({ tier, text: text.toLowerCase() }))

// One tier per term (the best field it matches), strongest first; null if any term matches nowhere.
// Plain substring matching (String#includes), never a RegExp, so special characters are literal.
const scoreTicket = (ticket: Ticket, terms: string[]): number[] | null => {
  const fields = searchableFields(ticket)
  const tiers: number[] = []
  for (const term of terms) {
    const tier = Math.max(0, ...fields.filter((f) => f.text.includes(term)).map((f) => f.tier))
    if (tier === 0) return null
    tiers.push(tier)
  }
  return tiers.sort((a, b) => b - a)
}

interface Scored {
  ticket: Ticket
  score: number[]
}

// Every scored ticket has one tier per term, so the arrays always have equal length.
const compareByRelevance = (a: Scored, b: Scored): number => {
  for (let i = 0; i < a.score.length; i++) {
    if (a.score[i] !== b.score[i]) return b.score[i]! - a.score[i]!
  }
  const byCreatedAt = Date.parse(b.ticket.createdAt) - Date.parse(a.ticket.createdAt)
  return byCreatedAt !== 0 ? byCreatedAt : a.ticket.id - b.ticket.id
}

// Keeps tickets matching every term, most relevant first. Returns a new array.
const searchByRelevance = (tickets: Ticket[], terms: string[]): Ticket[] =>
  tickets
    .flatMap((ticket) => {
      const score = scoreTicket(ticket, terms)
      return score ? [{ ticket, score }] : []
    })
    .sort(compareByRelevance)
    .map(({ ticket }) => ticket)

export const createTicketService = (repository: TicketRepository) => ({
  // Search (relevance-ordered when q is present), then the status filter. Always returns a new array.
  async list({ q, status }: ListTicketsQuery = {}): Promise<Ticket[]> {
    let tickets = await repository.findAll()

    const terms = q?.toLowerCase().split(/\s+/).filter(Boolean) ?? []
    if (terms.length > 0) tickets = searchByRelevance(tickets, terms)

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
