import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { logger } from "./config/logger"
import { errorHandler } from "./middlewares/error-handler"
import { notFound } from "./middlewares/not-found"
import { createTicketController } from "./modules/tickets/ticket.controller"
import {
  createInMemoryTicketRepository,
  type TicketRepository,
} from "./modules/tickets/ticket.repository"
import { createTicketRouter } from "./modules/tickets/ticket.routes"
import { createTicketService } from "./modules/tickets/ticket.service"

export interface AppDependencies {
  ticketRepository?: TicketRepository
}

// Factory (instead of a module-level singleton) so tests can inject an isolated repository.
export const createApp = ({
  ticketRepository = createInMemoryTicketRepository(),
}: AppDependencies = {}) => {
  const app = express()

  app.disable("x-powered-by")
  app.use(helmet())
  app.use(cors())
  app.use(pinoHttp({ logger }))
  app.use(express.json({ limit: "100kb" }))

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() })
  })

  const ticketService = createTicketService(ticketRepository)
  const ticketController = createTicketController(ticketService)
  app.use("/api/v1/tickets", createTicketRouter(ticketController))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
