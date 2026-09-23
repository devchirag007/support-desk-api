import type { Ticket } from "./ticket.types"
import { TICKET_CHANNELS, TICKET_PRIORITIES, TICKET_STATUSES } from "./ticket.types"

const ISSUES: Array<{ subject: string; description: string; tags: string[] }> = [
  {
    subject: "Cannot log in to account",
    description: "Customer gets an 'invalid credentials' error even after resetting the password.",
    tags: ["login", "account"],
  },
  {
    subject: "Payment failed at checkout",
    description: "Card is declined at checkout although the bank confirms funds are available.",
    tags: ["payment", "checkout"],
  },
  {
    subject: "Refund not received",
    description:
      "Refund was approved two weeks ago but has not reached the original payment method.",
    tags: ["refund", "payment"],
  },
  {
    subject: "App crashes on startup",
    description: "The mobile app closes immediately after the splash screen on the latest update.",
    tags: ["bug", "mobile"],
  },
  {
    subject: "Password reset email not arriving",
    description: "No reset email received; spam folder checked and the address is correct.",
    tags: ["login", "email"],
  },
  {
    subject: "Invoice shows wrong amount",
    description: "The March invoice includes a duplicate subscription line item.",
    tags: ["billing", "invoice"],
  },
  {
    subject: "Unable to update billing address",
    description: "Saving the new billing address returns a generic error on the settings page.",
    tags: ["billing", "account"],
  },
  {
    subject: "Slow response from support chat",
    description: "Chat agent took over 30 minutes to reply during business hours.",
    tags: ["support", "chat"],
  },
  {
    subject: "Feature request: dark mode",
    description: "Customer would like a dark theme option for the dashboard and mobile app.",
    tags: ["feature-request", "ui"],
  },
  {
    subject: "Two-factor code not working",
    description:
      "Authenticator codes are rejected as expired even though the phone time is correct.",
    tags: ["login", "security"],
  },
  {
    subject: "Order delayed in shipping",
    description: "Tracking has shown 'in transit' for nine days with no movement.",
    tags: ["shipping", "order"],
  },
  {
    subject: "Duplicate charge on credit card",
    description: "Customer was charged twice for the same order within a minute.",
    tags: ["payment", "billing"],
  },
  {
    subject: "Cannot export report to CSV",
    description: "The export button spins forever for reports with more than 5,000 rows.",
    tags: ["bug", "reports"],
  },
  {
    subject: "Notification settings not saving",
    description: "Toggling email notifications off reverts after refreshing the page.",
    tags: ["bug", "settings"],
  },
  {
    subject: "Account locked after failed attempts",
    description: "Account was locked after three wrong passwords and the unlock link has expired.",
    tags: ["login", "security"],
  },
]

const CUSTOMERS = [
  "Aarav Sharma",
  "Priya Patel",
  "Rohan Mehta",
  "Ananya Iyer",
  "Vikram Singh",
  "Neha Gupta",
  "Karan Malhotra",
  "Sneha Reddy",
  "Arjun Nair",
  "Isha Kapoor",
]

// null = unassigned
const ASSIGNEES: Array<string | null> = ["Riya", "Manish", "Deepak", "Kavya", null]

// Deterministic seed data (80 records) so results are reproducible between runs.
export const buildSeedTickets = (): Ticket[] =>
  Array.from({ length: 80 }, (_, i) => {
    const n = i + 1
    const issue = ISSUES[(n * 4) % ISSUES.length]!
    const customerName = CUSTOMERS[(n * 3) % CUSTOMERS.length]!
    const createdAt = new Date(Date.UTC(2026, 5, 1 + ((n * 5) % 90), (n * 3) % 24, (n * 7) % 60))
    const updatedAt = new Date(createdAt.getTime() + ((n * 37) % 72) * 60 * 60 * 1000)
    return {
      id: n,
      ticketNumber: `TKT-${1000 + n}`,
      subject: issue.subject,
      description: issue.description,
      status: TICKET_STATUSES[(n * 2) % TICKET_STATUSES.length]!,
      priority: TICKET_PRIORITIES[(n * 3) % TICKET_PRIORITIES.length]!,
      channel: TICKET_CHANNELS[(n * 5) % TICKET_CHANNELS.length]!,
      customerName,
      customerEmail: `${customerName.toLowerCase().replace(" ", ".")}@example.com`,
      assignee: ASSIGNEES[(n * 3) % ASSIGNEES.length]!,
      tags: [...issue.tags],
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    }
  })
