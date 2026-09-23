import { NotFoundError } from "../../errors/app-error"
import type { TicketRepository } from "./ticket.repository"
import type { CreateTicketInput, Ticket, UpdateTicketInput } from "./ticket.types"

export const createTicketService = (repository: TicketRepository) => ({
  async list(): Promise<Ticket[]> {
    return repository.findAll()
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
