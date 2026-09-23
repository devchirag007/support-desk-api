import request from "supertest"
import { createApp } from "../src/app"
import { createInMemoryTicketRepository } from "../src/modules/tickets/ticket.repository"

const buildApp = () => createApp({ ticketRepository: createInMemoryTicketRepository() })

let app: ReturnType<typeof buildApp>

beforeEach(() => {
  app = buildApp() // fresh seed data for every test
})

const validPayload = {
  subject: "Cannot download invoice",
  description: "The download button does nothing on the billing page.",
  channel: "web",
  customerName: "Test User",
  customerEmail: "test.user@example.com",
}

describe("GET /api/v1/tickets", () => {
  it("returns the list of tickets", async () => {
    const res = await request(app).get("/api/v1/tickets")
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })
})

describe("GET /api/v1/tickets/:id", () => {
  it("returns a single ticket", async () => {
    const res = await request(app).get("/api/v1/tickets/1")
    expect(res.status).toBe(200)
    expect(res.body.data.ticketNumber).toBe("TKT-1001")
  })

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).get("/api/v1/tickets/9999")
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe("NOT_FOUND")
  })

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(app).get("/api/v1/tickets/abc")
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("VALIDATION_ERROR")
  })
})

describe("POST /api/v1/tickets", () => {
  it("creates a ticket with defaults applied", async () => {
    const res = await request(app).post("/api/v1/tickets").send(validPayload)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      status: "open",
      priority: "medium",
      assignee: null,
      tags: [],
    })
    expect(res.body.data.ticketNumber).toMatch(/^TKT-\d+$/)
    expect(res.body.data.createdAt).toBe(res.body.data.updatedAt)
  })

  it("rejects an invalid body", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .send({ subject: "x", customerEmail: "not-an-email" })
    expect(res.status).toBe(400)
    expect(res.body.error.details.length).toBeGreaterThan(0)
  })

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("Content-Type", "application/json")
      .send("{ not json")
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/v1/tickets/:id", () => {
  it("updates status, priority and assignee", async () => {
    const res = await request(app)
      .patch("/api/v1/tickets/1")
      .send({ status: "resolved", priority: "urgent", assignee: "Riya" })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      status: "resolved",
      priority: "urgent",
      assignee: "Riya",
    })
  })

  it("allows unassigning with null", async () => {
    const res = await request(app).patch("/api/v1/tickets/1").send({ assignee: null })
    expect(res.status).toBe(200)
    expect(res.body.data.assignee).toBeNull()
  })

  it("rejects an empty body", async () => {
    const res = await request(app).patch("/api/v1/tickets/1").send({})
    expect(res.status).toBe(400)
  })

  it("returns 404 for an unknown ticket", async () => {
    const res = await request(app).patch("/api/v1/tickets/9999").send({ status: "closed" })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/v1/tickets/:id", () => {
  it("deletes a ticket and then 404s", async () => {
    expect((await request(app).delete("/api/v1/tickets/1")).status).toBe(204)
    expect((await request(app).get("/api/v1/tickets/1")).status).toBe(404)
  })
})

describe("misc", () => {
  it("serves /health", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("ok")
  })

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/nope")
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

describe("GET /api/v1/tickets?q=", () => {
  const search = (qs: string) => request(app).get(`/api/v1/tickets${qs}`)

  it("matches case-insensitively on partial ticketNumber", async () => {
    const res = await search("?q=tkt-1001")
    expect(res.status).toBe(200)
    expect(res.body.data.map((t: { ticketNumber: string }) => t.ticketNumber)).toContain("TKT-1001")
  })

  it("matches on tags and on customer email", async () => {
    const byTag = await search("?q=BILLING")
    expect(byTag.body.data.length).toBeGreaterThan(0)
    const email = byTag.body.data[0].customerEmail
    const byEmail = await search(`?q=${encodeURIComponent(email.toUpperCase())}`)
    expect(byEmail.body.data.length).toBeGreaterThan(0)
  })

  it("ignores surrounding whitespace and treats blank q as no filter", async () => {
    const all = await search("")
    const trimmed = await search("?q=%20%20login%20%20")
    const exact = await search("?q=login")
    expect(trimmed.body.data).toEqual(exact.body.data)
    expect((await search("?q=%20%20")).body.data).toEqual(all.body.data)
  })

  it("returns 200 with an empty array when nothing matches", async () => {
    const res = await search("?q=zzz-no-such-ticket")
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it("returns 400 for q over 100 chars or a repeated q", async () => {
    expect((await search(`?q=${"a".repeat(101)}`)).status).toBe(400)
    expect((await search(`?q=${"a".repeat(100)}`)).status).toBe(200)
    expect((await search("?q=a&q=b")).status).toBe(400)
  })
})

describe("GET /api/v1/tickets?q= (multi-word and literal matching)", () => {
  const search = (q: string) => request(app).get("/api/v1/tickets").query({ q, limit: 50 })
  const numbers = (res: { body: { data: Array<{ ticketNumber: string }> } }) =>
    res.body.data.map((t) => t.ticketNumber)

  it("requires every word to match, in any field, in any order", async () => {
    const payment = numbers(await search("payment"))
    const refund = numbers(await search("refund"))
    const both = numbers(await search("payment refund"))
    expect(both.length).toBeGreaterThan(0)
    expect(both).toEqual(payment.filter((n) => refund.includes(n)))
    expect(numbers(await search("refund   payment"))).toEqual(both)
  })

  it("matches words that live in different fields", async () => {
    const first = (await request(app).get("/api/v1/tickets/1")).body.data
    const res = await search(`${first.ticketNumber} ${first.customerEmail}`)
    expect(numbers(res)).toContain(first.ticketNumber)
  })

  it("returns nothing when one of the words matches nowhere", async () => {
    const res = await search("payment zzz-no-such-word")
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it.each(["(", "*", "a.b", "%", "[", "\\", "$^"])("treats %j literally", async (q) => {
    const res = await search(q)
    expect(res.status).toBe(200)
    // '.', '*' or '%' acting as wildcards would match (nearly) everything
    expect(res.body.meta.total).toBeLessThan(80)
  })

  it("matches a literal special character that exists in the data", async () => {
    const res = await search("@")
    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(80) // every customerEmail contains '@'
  })
})

describe("GET /api/v1/tickets pagination and status filter", () => {
  const get = (query: Record<string, string>) => request(app).get("/api/v1/tickets").query(query)
  const ids = (res: { body: { data: Array<{ id: number }> } }) => res.body.data.map((t) => t.id)

  it("returns { success, data, meta } with defaults page=1 limit=10", async () => {
    const res = await get({})
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(10)
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 80, totalPages: 8 })
  })

  it("pages through results and returns an empty page past the end", async () => {
    const [p1, p2, last, past] = await Promise.all([
      get({ page: "1", limit: "30" }),
      get({ page: "2", limit: "30" }),
      get({ page: "3", limit: "30" }),
      get({ page: "4", limit: "30" }),
    ])
    expect(new Set([...ids(p1), ...ids(p2), ...ids(last)]).size).toBe(80)
    expect(last.body.data).toHaveLength(20)
    expect(past.status).toBe(200)
    expect(past.body.data).toEqual([])
    expect(past.body.meta).toMatchObject({ page: 4, total: 80, totalPages: 3 })
  })

  it("returns 400 for bad page/limit, a repeated key or an unknown status", async () => {
    for (const query of [
      "limit=51",
      "limit=0",
      "page=0",
      "page=abc",
      "page=1.5",
      "page=1&page=2",
      "status=bogus",
      "status=open&status=closed",
      "status=open,bogus",
    ]) {
      expect((await request(app).get(`/api/v1/tickets?${query}`)).status).toBe(400)
    }
    expect((await get({ limit: "50" })).status).toBe(200)
  })

  it("combines q with a comma-separated status; total counts all matches, not the page", async () => {
    const all = await get({ q: "login", limit: "50" })
    const expected = all.body.data.filter((t: { status: string }) =>
      ["open", "in_progress"].includes(t.status),
    )
    const res = await get({ q: "login", status: "open,in_progress", limit: "1" })
    expect(res.body.data).toHaveLength(Math.min(1, expected.length))
    expect(res.body.meta.total).toBe(expected.length)
    expect(res.body.meta.totalPages).toBe(expected.length)

    const open = await get({ status: "open" })
    const inProgress = await get({ status: "in_progress" })
    const both = await get({ status: "open,in_progress" })
    expect(both.body.meta.total).toBe(open.body.meta.total + inProgress.body.meta.total)
  })

  it("returns total 0 and totalPages 0 when nothing matches", async () => {
    const res = await get({ q: "zzz-no-such-ticket", status: "open" })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 })
  })
})

describe("GET /api/v1/tickets?q= relevance across pages", () => {
  const ids = (res: { body: { data: Array<{ id: number }> } }) => res.body.data.map((t) => t.id)

  it("sorts by relevance before paginating", async () => {
    const all = await request(app).get("/api/v1/tickets").query({ q: "payment", limit: 50 })
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        request(app).get("/api/v1/tickets").query({ q: "payment", limit: 4, page }),
      ),
    )
    expect(all.body.meta.total).toBeGreaterThan(8)
    expect(pages.flatMap(ids)).toEqual(ids(all).slice(0, 12))
  })
})
