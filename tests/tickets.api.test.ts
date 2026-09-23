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
