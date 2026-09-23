import { z } from "zod"
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "./ticket.types"

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// A repeated key (?q=a&q=b) arrives as an array, which z.string() / z.coerce.number() reject.
// status is a comma-separated list; blank entries are dropped, so a blank status means "no filter".
export const listTicketsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(TICKET_STATUSES)))
    .optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
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
