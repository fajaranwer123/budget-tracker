import type { Category } from "../types/category.ts"

export const ALLOCATION_LIMIT_MESSAGE =
  "Category allocations cannot exceed the monthly budget."

export type AllocationDraft = {
  id: string | null
  amount: number
}

export function parseMoney(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null
  const amount = Number(trimmed)
  if (!Number.isFinite(amount)) return null
  return amount
}

export function moneyToInput(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

export function formatPkr(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const hasFraction = Math.round(Math.abs(rounded) * 100) % 100 !== 0
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(rounded))
  return `${rounded < 0 ? "-" : ""}PKR ${formatted}`
}

export function sumAllocated(
  categories: readonly Pick<Category, "id" | "allocated">[],
  ignoreId?: string,
): number {
  const cents = categories.reduce((sum, category) => {
    if (ignoreId !== undefined && category.id === ignoreId) return sum
    return sum + Math.round(category.allocated * 100)
  }, 0)
  return cents / 100
}

export function exceedsBudget(total: number, allocated: number): boolean {
  return Math.round(allocated * 100) > Math.round(total * 100)
}

export function previewRemaining(
  total: number,
  categories: readonly Pick<Category, "id" | "allocated">[],
  draft?: AllocationDraft | null,
): number {
  const allocated = sumAllocated(categories, draft?.id ?? undefined) + (draft?.amount ?? 0)
  return (Math.round(total * 100) - Math.round(allocated * 100)) / 100
}
