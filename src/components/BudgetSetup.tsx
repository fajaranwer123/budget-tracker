import { useState } from "react"
import type { BudgetUpdate, CategoryInput, CategoryUpdate } from "../hooks/useExpenseStore.ts"
import type { Budget } from "../types/budget.ts"
import type { Category } from "../types/category.ts"
import type { AllocationDraft } from "../utils/money.ts"
import {
  ALLOCATION_LIMIT_MESSAGE,
  exceedsBudget,
  formatPkr,
  moneyToInput,
  parseMoney,
  previewRemaining,
  sumAllocated,
} from "../utils/money.ts"
import { CategoryManager } from "./CategoryManager.tsx"

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-")
  const date = new Date(Number(year), Number(monthNumber) - 1, 1)
  return new Intl.DateTimeFormat("en-PK", { month: "long", year: "numeric" }).format(date)
}

type BudgetSetupProps = {
  budget: Budget
  categories: Category[]
  updateBudget: (patch: BudgetUpdate) => Budget
  addCategory: (input: CategoryInput) => Category
  updateCategory: (id: string, patch: CategoryUpdate) => void
  deleteCategory: (id: string) => void
}

export function BudgetSetup({
  budget,
  categories,
  updateBudget,
  addCategory,
  updateCategory,
  deleteCategory,
}: BudgetSetupProps) {
  const [budgetText, setBudgetText] = useState(() => moneyToInput(budget.total))
  const [allocationDraft, setAllocationDraft] = useState<AllocationDraft | null>(null)

  const typedBudget = parseMoney(budgetText)
  const budgetInvalid = typedBudget === null
  const remaining = budgetInvalid ? null : previewRemaining(typedBudget, categories, allocationDraft)
  const overAllocated = remaining !== null && remaining < 0
  const statusMessage = budgetInvalid
    ? "Enter a monthly budget of 0 or more."
    : overAllocated
      ? ALLOCATION_LIMIT_MESSAGE
      : null
  const allocatedPreview =
    remaining === null || typedBudget === null ? 0 : Math.round((typedBudget - remaining) * 100) / 100
  const ratio =
    typedBudget === null || typedBudget <= 0
      ? allocatedPreview > 0
        ? 1
        : 0
      : Math.min(Math.max(allocatedPreview / typedBudget, 0), 1)

  function commitBudget() {
    if (typedBudget === null || exceedsBudget(typedBudget, sumAllocated(categories))) return
    if (typedBudget !== budget.total) updateBudget({ total: typedBudget })
    setBudgetText(moneyToInput(typedBudget))
  }

  function handleAdd(input: CategoryInput) {
    if (typedBudget === null) throw new Error("Enter a monthly budget of 0 or more.")
    const currentAllocated = sumAllocated(categories)
    if (exceedsBudget(typedBudget, currentAllocated + input.allocated)) {
      throw new Error(ALLOCATION_LIMIT_MESSAGE)
    }
    if (typedBudget !== budget.total) updateBudget({ total: typedBudget })
    addCategory(input)
  }

  function handleUpdate(id: string, patch: CategoryUpdate) {
    if (typedBudget === null) throw new Error("Enter a monthly budget of 0 or more.")
    const currentAllocated = sumAllocated(categories)
    const nextAllocated =
      patch.allocated === undefined ? currentAllocated : sumAllocated(categories, id) + patch.allocated
    if (exceedsBudget(typedBudget, nextAllocated)) throw new Error(ALLOCATION_LIMIT_MESSAGE)

    if (typedBudget >= budget.total) {
      if (typedBudget !== budget.total) updateBudget({ total: typedBudget })
      updateCategory(id, patch)
      return
    }

    updateCategory(id, patch)
    updateBudget({ total: typedBudget })
  }

  function handleDelete(id: string) {
    const nextAllocated = sumAllocated(categories, id)
    deleteCategory(id)
    if (typedBudget === null || exceedsBudget(typedBudget, nextAllocated)) return
    if (typedBudget !== budget.total) updateBudget({ total: typedBudget })
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Budget</h1>
        <p className="mt-1 text-sm text-slate-500">{formatMonth(budget.month)}</p>
      </header>

      <form
        className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          commitBudget()
        }}
      >
        <label htmlFor="monthly-budget" className="block text-sm font-medium text-slate-700">
          Monthly total
        </label>
        <div className="relative mt-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-slate-400"
          >
            PKR
          </span>
          <input
            id="monthly-budget"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={budgetText}
            onChange={(event) => setBudgetText(event.target.value)}
            onBlur={commitBudget}
            onWheel={(event) => event.currentTarget.blur()}
            aria-invalid={budgetInvalid || overAllocated}
            aria-describedby="budget-status"
            autoComplete="off"
            className={`min-h-16 w-full min-w-0 rounded-xl border bg-white pr-3 pl-14 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums outline-none focus:ring-2 ${
              budgetInvalid || overAllocated
                ? "border-red-600 focus:border-red-600 focus:ring-red-600/20"
                : "border-slate-300 focus:border-orange-600 focus:ring-orange-600/20"
            }`}
          />
        </div>

        <div id="budget-status" aria-live="polite" className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              {overAllocated ? "Over budget" : "Unallocated"}
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                overAllocated ? "text-red-700" : "text-slate-900"
              }`}
            >
              {remaining === null ? "—" : formatPkr(Math.abs(remaining))}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div
              className={`h-full ${overAllocated ? "bg-red-600" : "bg-orange-600"}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          {statusMessage ? <p className="mt-3 text-sm font-medium text-red-700">{statusMessage}</p> : null}
        </div>
      </form>

      <CategoryManager
        categories={categories}
        budgetTotal={typedBudget}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDraftChange={setAllocationDraft}
      />
    </main>
  )
}
