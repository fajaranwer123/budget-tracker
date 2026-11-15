import { useState } from "react"
import {
  emptyExpenseFilter,
  expenseMatches,
  filtersAreActive,
  formatExpenseDate,
  isDateRangeInvalid,
  paymentLabel,
  sortNewestFirst,
  type ExpenseFilter,
} from "../lib/expenses.ts"
import { formatPkr } from "../utils/money.ts"
import type { Category } from "../types/category.ts"
import type { Expense } from "../types/expense.ts"

type ExpenseHistoryProps = {
  expenses: Expense[]
  categories: Category[]
  editingId: string | null
  lastSavedId: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const fieldClass =
  "mt-1 w-full min-h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"

export function ExpenseHistory({
  expenses,
  categories,
  editingId,
  lastSavedId,
  onEdit,
  onDelete,
}: ExpenseHistoryProps) {
  const [filter, setFilter] = useState<ExpenseFilter>(emptyExpenseFilter)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const rangeInvalid = isDateRangeInvalid(filter)
  const visible = sortNewestFirst(expenses).filter((expense) => expenseMatches(expense, filter))
  const total = visible.reduce((sum, expense) => sum + expense.amount, 0)
  const saved = expenses.find((expense) => expense.id === lastSavedId)
  const savedIsHidden = saved !== undefined && !expenseMatches(saved, filter)
  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? "Unknown"
  const categoryColor = (id: string) =>
    categories.find((category) => category.id === id)?.color ?? "#94a3b8"

  function updateFilter(patch: Partial<ExpenseFilter>) {
    setFilter((current) => ({ ...current, ...patch }))
    setPendingDeleteId(null)
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-label="Expense history">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">History</h2>
        {filtersAreActive(filter) && (
          <button
            type="button"
            onClick={() => {
              setFilter(emptyExpenseFilter)
              setPendingDeleteId(null)
            }}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-orange-700"
          >
            Clear filters
          </button>
        )}
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Search notes
        <input
          type="search"
          enterKeyHint="search"
          value={filter.note}
          placeholder="Search notes"
          onChange={(event) => updateFilter({ note: event.target.value })}
          className={fieldClass}
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-slate-700">
        Category
        <select
          value={filter.categoryId}
          onChange={(event) => updateFilter({ categoryId: event.target.value })}
          className={fieldClass}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block min-w-0 text-sm font-medium text-slate-700">
          From
          <input
            type="date"
            value={filter.from}
            onChange={(event) => updateFilter({ from: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700">
          To
          <input
            type="date"
            value={filter.to}
            onChange={(event) => updateFilter({ to: event.target.value })}
            className={fieldClass}
          />
        </label>
      </div>

      {rangeInvalid && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          The start date is after the end date. The date range is not applied.
        </p>
      )}

      <p className="mt-3 text-sm text-slate-500" aria-live="polite">
        {visible.length === expenses.length
          ? `${visible.length} ${visible.length === 1 ? "expense" : "expenses"} · ${formatPkr(total)}`
          : `Showing ${visible.length} of ${expenses.length} · ${formatPkr(total)}`}
      </p>

      {savedIsHidden && (
        <p className="mt-2 text-sm font-medium text-slate-700" role="status">
          Saved. Adjust the filters to see it in the list.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          {expenses.length === 0
            ? "No expenses yet. Add one above."
            : "No expenses match these filters."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((expense) => {
            const name = categoryName(expense.categoryId)
            const confirming = pendingDeleteId === expense.id
            return (
              <li
                key={expense.id}
                className={`rounded-xl border p-3 ${
                  editingId === expense.id
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xl font-semibold text-slate-900 tabular-nums">
                      {formatPkr(expense.amount)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColor(expense.categoryId) }}
                      />
                      <span className="font-medium">{name}</span>
                      <span className="text-slate-500">{formatExpenseDate(expense.date)}</span>
                    </p>
                    {expense.note && (
                      <p className="mt-1 text-sm break-words text-slate-600">{expense.note}</p>
                    )}
                    <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      {paymentLabel(expense.paymentMethod)}
                    </p>
                  </div>
                </div>

                {confirming ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="min-h-11 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(expense.id)
                        setPendingDeleteId(null)
                      }}
                      className="min-h-11 rounded-xl bg-red-600 text-sm font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDeleteId(null)
                        onEdit(expense.id)
                      }}
                      className="min-h-11 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800"
                      aria-label={`Edit ${name} expense of ${formatPkr(expense.amount)}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(expense.id)}
                      className="min-h-11 rounded-xl border border-red-200 text-sm font-semibold text-red-700"
                      aria-label={`Delete ${name} expense of ${formatPkr(expense.amount)}`}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
