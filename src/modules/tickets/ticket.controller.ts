import { asyncHandler } from "../../utils/async-handler"
import {
  createTicketSchema,
  idParamSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "./ticket.schema"
import type { TicketService } from "./ticket.service"

// asyncHandler forwards rejected promises to the error middleware (Express 4 needs this).
export const createTicketController = (service: TicketService) => {
  const list = asyncHandler(async (req, res) => {
    const query = listTicketsQuerySchema.parse(req.query)
    const tickets = await service.list(query)
    res.status(200).json({ success: true, data: tickets })
  })

  const getById = asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params)
    const ticket = await service.getById(id)
    res.status(200).json({ success: true, data: ticket })
  })

  const create = asyncHandler(async (req, res) => {
    const input = createTicketSchema.parse(req.body)
    const ticket = await service.create(input)
    res.status(201).json({ success: true, data: ticket })
  })

  const update = asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params)
    const changes = updateTicketSchema.parse(req.body)
    const ticket = await service.update(id, changes)
    res.status(200).json({ success: true, data: ticket })
  })

  const remove = asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params)
    await service.remove(id)
    res.status(204).send()
  })

  return { list, getById, create, update, remove }
}

export type TicketController = ReturnType<typeof createTicketController>
