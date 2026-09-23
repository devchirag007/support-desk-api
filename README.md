# support-desk-api

Customer support desk REST API for managing support tickets.
TypeScript, Express 4, Zod, Pino, Jest. Targets Node 16.20.
Data lives in an in-memory repository behind an interface (swap for a real DB later).

## Getting started

```bash
nvm use            # Node 16.20 (see .nvmrc)
npm install
cp .env.example .env
npm run dev        # http://localhost:3000
```

## Scripts

| Script              | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | run with hot reload (nodemon + ts-node) |
| `npm test`          | run the Jest suite                      |
| `npm run typecheck` | `tsc --noEmit`                          |
| `npm run lint`      | ESLint (typescript-eslint)              |
| `npm run format`    | Prettier                                |
| `npm run build`     | compile to `dist/`                      |
| `npm start`         | run the compiled build                  |

## API (base `/api/v1`)

| Method | Path         | Description                                   |
| ------ | ------------ | --------------------------------------------- |
| GET    | /tickets     | list tickets                                  |
| GET    | /tickets/:id | get one                                       |
| POST   | /tickets     | create                                        |
| PATCH  | /tickets/:id | update `status`, `priority` and/or `assignee` |
| DELETE | /tickets/:id | delete                                        |
| GET    | /health      | health check                                  |

Success: `{ "success": true, "data": ... }`
Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`

## Ticket shape

```json
{
  "id": 1,
  "ticketNumber": "TKT-1001",
  "subject": "Payment failed at checkout",
  "description": "Card is declined at checkout although ...",
  "status": "open | in_progress | waiting_on_customer | resolved | closed",
  "priority": "low | medium | high | urgent",
  "channel": "email | chat | phone | web",
  "customerName": "Priya Patel",
  "customerEmail": "priya.patel@example.com",
  "assignee": "Riya",
  "tags": ["payment", "checkout"],
  "createdAt": "2026-06-06T03:21:00.000Z",
  "updatedAt": "2026-06-07T10:21:00.000Z"
}
```

`assignee` is `null` for unassigned tickets.

## Architecture

```
src/
  config/        env (zod-validated) and logger
  errors/        AppError hierarchy
  middlewares/   error handler, 404
  utils/         asyncHandler (Express 4)
  modules/tickets/
    ticket.routes.ts      URL -> controller
    ticket.controller.ts  HTTP in/out, request validation (zod)
    ticket.service.ts     business rules (404s, timestamps)
    ticket.repository.ts  persistence interface + in-memory impl
    ticket.schema.ts      zod schemas
    ticket.types.ts       domain types
    ticket.seed.ts        80 deterministic seed tickets
  app.ts         createApp(deps) factory
  server.ts      bootstrap + graceful shutdown
tests/           API (supertest) and service tests
```

Request flow: `routes -> controller -> service -> repository`.
