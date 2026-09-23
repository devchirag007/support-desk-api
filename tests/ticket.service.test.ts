import { NotFoundError } from "../src/errors/app-error"
import { createInMemoryTicketRepository } from "../src/modules/tickets/ticket.repository"
import { createTicketService } from "../src/modules/tickets/ticket.service"
import type { Ticket } from "../src/modules/tickets/ticket.types"

describe("ticket service", () => {
  const setup = () => createTicketService(createInMemoryTicketRepository())

  it("list returns every seeded ticket", async () => {
    expect(await setup().list()).toHaveLength(80)
  })

  it("getById throws NotFoundError for a missing ticket", async () => {
    await expect(setup().getById(12345)).rejects.toBeInstanceOf(NotFoundError)
  })

  it("list does not expose the repository's internal array", async () => {
    const service = createTicketService(createInMemoryTicketRepository())
    const first = await service.list()
    first.length = 0
    expect(await service.list()).toHaveLength(80)
  })

  it("update bumps updatedAt", async () => {
    const service = setup()
    const updatedBefore = (await service.getById(1)).updatedAt // capture the string, not the object
    const after = await service.update(1, { status: "closed" })
    expect(after.status).toBe("closed")
    expect(after.updatedAt).not.toBe(updatedBefore)
  })
})

describe("ticket service relevance ranking", () => {
  const make = (id: number, over: Partial<Ticket> = {}): Ticket => ({
    id,
    ticketNumber: `TKT-${1000 + id}`,
    subject: "s",
    description: "d",
    status: "open",
    priority: "low",
    channel: "web",
    customerName: "n",
    customerEmail: "e@x.io",
    assignee: null,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  })
  const ranked = async (tickets: Ticket[], q?: string) =>
    (await createTicketService(createInMemoryTicketRepository(tickets)).list({ q })).map(
      (t) => t.id,
    )

  it("ranks ticketNumber > subject > tags > customerName/email > description", async () => {
    const tickets = [
      make(1, { description: "has zed" }),
      make(2, { customerEmail: "zed@x.io" }),
      make(3, { tags: ["zed"] }),
      make(4, { subject: "zed" }),
      make(5, { ticketNumber: "ZED-1" }),
      make(6, { customerName: "Zed" }),
    ]
    expect(await ranked(tickets, "zed")).toEqual([5, 4, 3, 2, 6, 1])
  })

  it("breaks ties by createdAt descending, then id ascending", async () => {
    const tickets = [
      make(1, { subject: "zed", createdAt: "2026-01-01T00:00:00.000Z" }),
      make(2, { subject: "zed", createdAt: "2026-03-01T00:00:00.000Z" }),
      make(3, { subject: "zed", createdAt: "2026-03-01T00:00:00.000Z" }),
      make(4, { subject: "zed", createdAt: "2026-02-01T00:00:00.000Z" }),
    ]
    expect(await ranked(tickets, "zed")).toEqual([2, 3, 4, 1])
  })

  it("ranks a multi-word match by its strongest word first", async () => {
    const tickets = [
      make(1, { subject: "aa bb" }), // [subject, subject]
      make(2, { ticketNumber: "AA-1", description: "bb" }), // [ticketNumber, description]
      make(3, { subject: "aa", description: "bb" }), // [subject, description]
    ]
    expect(await ranked(tickets, "aa bb")).toEqual([2, 1, 3])
  })

  it("keeps repository order without q and never reorders the repository", async () => {
    const tickets = [make(1, { subject: "zed" }), make(2, { ticketNumber: "ZED-2" })]
    const service = createTicketService(createInMemoryTicketRepository(tickets))
    expect((await service.list({ q: "zed" })).map((t) => t.id)).toEqual([2, 1])
    expect((await service.list({ q: "  " })).map((t) => t.id)).toEqual([1, 2])
    expect((await service.list()).map((t) => t.id)).toEqual([1, 2])
  })
})
