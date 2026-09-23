import { z } from "zod"
import { TICKET_CHANNELS, TICKET_PRIORITIES, TICKET_STATUSES } from "./ticket.types"

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(2000),
  status: z.enum(TICKET_STATUSES).default("open"),
  priority: z.enum(TICKET_PRIORITIES).default("medium"),
  channel: z.enum(TICKET_CHANNELS),
  customerName: z.string().trim().min(1),
  customerEmail: z.string().email(),
  assignee: z.string().trim().min(1).nullable().default(null),
  tags: z.array(z.string().trim().min(1)).default([]),
})

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES),
    priority: z.enum(TICKET_PRIORITIES),
    assignee: z.string().trim().min(1).nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one of: status, priority, assignee",
  })
