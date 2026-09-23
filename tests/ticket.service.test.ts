import { NotFoundError } from "../src/errors/app-error"
import { createInMemoryTicketRepository } from "../src/modules/tickets/ticket.repository"
import { createTicketService } from "../src/modules/tickets/ticket.service"

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
