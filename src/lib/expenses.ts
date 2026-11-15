import type { Expense, PaymentMethod } from "../types/expense.ts"

export type ExpenseFilter = {
  categoryId: string
  from: string
  to: string
  note: string
}

export const emptyExpenseFilter: ExpenseFilter = {
  categoryId: "",
  from: "",
  to: "",
  note: "",
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
]

export function todayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function shiftISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0")
  const nextDay = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`
}

export function formatExpenseDate(iso: string): string {
  if (iso === todayISO()) return "Today"
  if (iso === shiftISO(todayISO(), -1)) return "Yesterday"
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method
}

function normalizeAmount(raw: string): string {
  let trimmed = raw.trim().replace(/pkr/gi, "").replace(/[$\s]/g, "")
  if (trimmed.includes(",") && trimmed.includes(".")) trimmed = trimmed.replace(/,/g, "")
  else if (/^\d{1,3}(,\d{3})+$/.test(trimmed)) trimmed = trimmed.replace(/,/g, "")
  else if (trimmed.includes(",")) trimmed = trimmed.replace(",", ".")
  if (trimmed.endsWith(".")) trimmed = trimmed.slice(0, -1)
  return trimmed
}

export function parseAmount(raw: string): number | null {
  const normalized = normalizeAmount(raw)
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(normalized)) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

export function isDateRangeInvalid(filter: ExpenseFilter): boolean {
  return filter.from !== "" && filter.to !== "" && filter.from > filter.to
}

export function expenseMatches(expense: Expense, filter: ExpenseFilter): boolean {
  if (filter.categoryId && expense.categoryId !== filter.categoryId) return false
  if (!isDateRangeInvalid(filter)) {
    if (filter.from && expense.date < filter.from) return false
    if (filter.to && expense.date > filter.to) return false
  }
  const query = filter.note.trim().toLowerCase()
  if (query && !expense.note.toLowerCase().includes(query)) return false
  return true
}

export function sortNewestFirst(expenses: Expense[]): Expense[] {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) => b.expense.date.localeCompare(a.expense.date) || b.index - a.index)
    .map(({ expense }) => expense)
}

export function filtersAreActive(filter: ExpenseFilter): boolean {
  return (
    filter.categoryId !== "" ||
    filter.from !== "" ||
    filter.to !== "" ||
    filter.note.trim() !== ""
  )
}
