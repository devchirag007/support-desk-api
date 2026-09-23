import { NotFoundError } from "../../errors/app-error"
import type { TicketRepository } from "./ticket.repository"
import type { CreateTicketInput, ListTicketsQuery, Ticket, UpdateTicketInput } from "./ticket.types"

const matchesSearch = (ticket: Ticket, needle: string): boolean =>
  [
    ticket.ticketNumber,
    ticket.subject,
    ticket.description,
    ticket.customerName,
    ticket.customerEmail,
    ...ticket.tags,
  ].some((field) => field.toLowerCase().includes(needle))

export const createTicketService = (repository: TicketRepository) => ({
  async list({ q }: ListTicketsQuery = {}): Promise<Ticket[]> {
    const tickets = await repository.findAll()
    const needle = q?.trim().toLowerCase()
    if (!needle) return tickets
    return tickets.filter((ticket) => matchesSearch(ticket, needle))
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
