import { useEffect, useRef } from "react"
import type { Budget } from "../types/budget.ts"
import type { Category } from "../types/category.ts"
import type { Expense, PaymentMethod } from "../types/expense.ts"
import { createDefaultCategories } from "../utils/categories.ts"
import { ALLOCATION_LIMIT_MESSAGE, exceedsBudget, sumAllocated } from "../utils/money.ts"
import { useLocalStorage } from "./useLocalStorage.ts"

const STORAGE_KEYS = {
  budget: "expense-tracker.budget",
  categories: "expense-tracker.categories",
  categoriesSeeded: "expense-tracker.categories-seeded",
  expenses: "expense-tracker.expenses",
} as const

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type CategoryInput = Omit<Category, "id">
export type CategoryUpdate = Partial<CategoryInput>
export type ExpenseInput = Omit<Expense, "id">
export type ExpenseUpdate = Partial<ExpenseInput>
export type BudgetInput = Budget
export type BudgetUpdate = Partial<Budget>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash" || value === "card" || value === "wallet"
}

function isNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function isMonth(value: string): boolean {
  return MONTH_PATTERN.test(value)
}

function isDate(value: string): boolean {
  return DATE_PATTERN.test(value)
}

function currentMonth(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${now.getFullYear()}-${month}`
}

function createDefaultBudget(): Budget {
  return { total: 0, month: currentMonth() }
}

function isBudget(value: unknown): value is Budget {
  return (
    isRecord(value) &&
    isNonNegative(value.total) &&
    typeof value.month === "string" &&
    isMonth(value.month)
  )
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isNonNegative(value.allocated) &&
    typeof value.color === "string" &&
    value.color.trim().length > 0
  )
}

function isExpense(value: unknown): value is Expense {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isNonNegative(value.amount) &&
    typeof value.categoryId === "string" &&
    value.categoryId.length > 0 &&
    typeof value.date === "string" &&
    isDate(value.date) &&
    typeof value.note === "string" &&
    isPaymentMethod(value.paymentMethod)
  )
}

function parseBudget(value: unknown): Budget | undefined {
  return isBudget(value) ? value : undefined
}

const PREVIOUS_DEFAULT_SEED: readonly (readonly [string, string])[] = [
  ["cat-food", "Food"],
  ["cat-transport", "Transport"],
  ["cat-shopping", "Shopping"],
  ["cat-bills", "Bills"],
  ["cat-health", "Health"],
  ["cat-other", "Other"],
]

function isUntouchedPreviousSeed(categories: Category[]): boolean {
  if (categories.length !== PREVIOUS_DEFAULT_SEED.length) return false
  return PREVIOUS_DEFAULT_SEED.every(([id, name]) =>
    categories.some(
      (category) => category.id === id && category.name === name && category.allocated === 0,
    ),
  )
}

function storedHasExpenses(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.expenses)
    if (raw === null) return false
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

function categoriesWereSeeded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.categoriesSeeded) === "1"
  } catch {
    return false
  }
}

function markCategoriesSeeded(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.categoriesSeeded, "1")
  } catch {
    // Ignore quota errors and private-mode storage failures.
  }
}

function parseCategories(value: unknown): Category[] | undefined {
  if (!Array.isArray(value)) return undefined
  const categories = value.filter(isCategory)
  if (isUntouchedPreviousSeed(categories) && !storedHasExpenses()) return undefined
  // An empty list from before defaults existed should still receive the seed.
  if (categories.length === 0 && !categoriesWereSeeded()) return undefined
  return categories
}

function parseExpenses(value: unknown): Expense[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter(isExpense)
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required`)
  return trimmed
}

function requireMoney(value: number, label: string): void {
  if (!isNonNegative(value)) throw new Error(`${label} must be a non-negative number`)
}

function normalizeMoney(value: number, label: string): number {
  if (!isNonNegative(value)) throw new Error(`${label} must be a non-negative number`)
  return Math.round(value * 100) / 100
}

function assertWithinBudget(total: number, allocated: number): void {
  if (exceedsBudget(total, allocated)) throw new Error(ALLOCATION_LIMIT_MESSAGE)
}

function validateBudget(budget: Budget): void {
  requireMoney(budget.total, "Budget total")
  if (!isMonth(budget.month)) throw new Error("Budget month must be YYYY-MM")
}

function validateCategory(category: Category): void {
  requireText(category.name, "Category name")
  requireMoney(category.allocated, "Allocated amount")
  requireText(category.color, "Category color")
}

function validateExpense(expense: Expense): void {
  requireMoney(expense.amount, "Amount")
  requireText(expense.categoryId, "Category")
  if (!isDate(expense.date)) throw new Error("Date must be YYYY-MM-DD")
  if (!isPaymentMethod(expense.paymentMethod)) {
    throw new Error("Payment method must be cash, card, or wallet")
  }
}

export function useExpenseStore() {
  const [budget, setBudget] = useLocalStorage(STORAGE_KEYS.budget, createDefaultBudget, parseBudget)
  const [categories, setCategories] = useLocalStorage(
    STORAGE_KEYS.categories,
    createDefaultCategories,
    parseCategories,
  )
  const [expenses, setExpenses] = useLocalStorage(STORAGE_KEYS.expenses, [], parseExpenses)

  useEffect(() => {
    markCategoriesSeeded()
  }, [])

  const budgetRef = useRef(budget)
  const categoriesRef = useRef(categories)
  const expensesRef = useRef(expenses)

  function addBudget(input: BudgetInput): Budget {
    const next: Budget = { total: normalizeMoney(input.total, "Budget total"), month: input.month }
    validateBudget(next)
    assertWithinBudget(next.total, sumAllocated(categoriesRef.current))
    budgetRef.current = next
    setBudget(next)
    return next
  }

  function updateBudget(patch: BudgetUpdate): Budget {
    const next: Budget = {
      total:
        patch.total === undefined
          ? budgetRef.current.total
          : normalizeMoney(patch.total, "Budget total"),
      month: patch.month ?? budgetRef.current.month,
    }
    validateBudget(next)
    assertWithinBudget(next.total, sumAllocated(categoriesRef.current))
    budgetRef.current = next
    setBudget(next)
    return next
  }

  function deleteBudget(): Budget {
    const next = createDefaultBudget()
    assertWithinBudget(next.total, sumAllocated(categoriesRef.current))
    budgetRef.current = next
    setBudget(next)
    return next
  }

  function addCategory(input: CategoryInput): Category {
    const category: Category = {
      id: crypto.randomUUID(),
      name: requireText(input.name, "Category name"),
      allocated: normalizeMoney(input.allocated, "Allocated amount"),
      color: requireText(input.color, "Category color"),
    }
    validateCategory(category)
    assertWithinBudget(
      budgetRef.current.total,
      sumAllocated(categoriesRef.current) + category.allocated,
    )
    const next = [...categoriesRef.current, category]
    categoriesRef.current = next
    setCategories(next)
    return category
  }

  function updateCategory(id: string, patch: CategoryUpdate): void {
    const current = categoriesRef.current.find((category) => category.id === id)
    if (!current) return

    const nextCategory: Category = {
      id: current.id,
      name: patch.name === undefined ? current.name : requireText(patch.name, "Category name"),
      allocated:
        patch.allocated === undefined
          ? current.allocated
          : normalizeMoney(patch.allocated, "Allocated amount"),
      color: patch.color === undefined ? current.color : requireText(patch.color, "Category color"),
    }
    validateCategory(nextCategory)
    assertWithinBudget(
      budgetRef.current.total,
      sumAllocated(categoriesRef.current, id) + nextCategory.allocated,
    )

    const next = categoriesRef.current.map((category) =>
      category.id === id ? nextCategory : category,
    )
    categoriesRef.current = next
    setCategories(next)
  }

  function deleteCategory(id: string): void {
    const next = categoriesRef.current.filter((category) => category.id !== id)
    if (next.length === categoriesRef.current.length) return
    categoriesRef.current = next
    setCategories(next)
  }

  function addExpense(input: ExpenseInput): Expense {
    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: input.amount,
      categoryId: requireText(input.categoryId, "Category"),
      date: input.date,
      note: input.note.trim(),
      paymentMethod: input.paymentMethod,
    }
    validateExpense(expense)
    const next = [...expensesRef.current, expense]
    expensesRef.current = next
    setExpenses(next)
    return expense
  }

  function updateExpense(id: string, patch: ExpenseUpdate): void {
    const current = expensesRef.current.find((expense) => expense.id === id)
    if (!current) return

    const nextExpense: Expense = {
      id: current.id,
      amount: patch.amount ?? current.amount,
      categoryId:
        patch.categoryId === undefined
          ? current.categoryId
          : requireText(patch.categoryId, "Category"),
      date: patch.date ?? current.date,
      note: patch.note === undefined ? current.note : patch.note.trim(),
      paymentMethod: patch.paymentMethod ?? current.paymentMethod,
    }
    validateExpense(nextExpense)

    const next = expensesRef.current.map((expense) => (expense.id === id ? nextExpense : expense))
    expensesRef.current = next
    setExpenses(next)
  }

  function deleteExpense(id: string): void {
    const next = expensesRef.current.filter((expense) => expense.id !== id)
    if (next.length === expensesRef.current.length) return
    expensesRef.current = next
    setExpenses(next)
  }

  return {
    budget,
    categories,
    expenses,
    addBudget,
    updateBudget,
    deleteBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
