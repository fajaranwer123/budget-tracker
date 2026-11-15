import { useRef, useState, type FormEvent } from "react"
import type { CategoryInput, CategoryUpdate } from "../hooks/useExpenseStore.ts"
import type { Category } from "../types/category.ts"
import type { AllocationDraft } from "../utils/money.ts"
import { ALLOCATION_LIMIT_MESSAGE, formatPkr, moneyToInput, parseMoney, previewRemaining } from "../utils/money.ts"

const NEW_CATEGORY_COLOR = "#ea580c"

const fieldClass =
  "mt-1 w-full min-h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"

type CategoryManagerProps = {
  categories: Category[]
  budgetTotal: number | null
  onAdd: (input: CategoryInput) => void
  onUpdate: (id: string, patch: CategoryUpdate) => void
  onDelete: (id: string) => void
  onDraftChange: (draft: AllocationDraft | null) => void
}

export function CategoryManager({
  categories,
  budgetTotal,
  onAdd,
  onUpdate,
  onDelete,
  onDraftChange,
}: CategoryManagerProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [amountText, setAmountText] = useState("")
  const [color, setColor] = useState(NEW_CATEGORY_COLOR)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = parseMoney(amountText)
  const draft: AllocationDraft | null =
    parsedAmount === null ? (editingId ? { id: editingId, amount: 0 } : null) : { id: editingId, amount: parsedAmount }
  const overBudget =
    budgetTotal !== null && draft !== null && previewRemaining(budgetTotal, categories, draft) < 0

  function publishDraft(nextAmount: string, id: string | null) {
    const parsed = parseMoney(nextAmount)
    if (parsed === null) {
      onDraftChange(id ? { id, amount: 0 } : null)
      return
    }
    onDraftChange({ id, amount: parsed })
  }

  function resetForm() {
    setEditingId(null)
    setName("")
    setAmountText("")
    setColor(NEW_CATEGORY_COLOR)
    setSubmitted(false)
    setError(null)
    onDraftChange(null)
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setName(category.name)
    setAmountText(moneyToInput(category.allocated))
    setColor(category.color)
    setSubmitted(false)
    setError(null)
    onDraftChange({ id: category.id, amount: category.allocated })
    requestAnimationFrame(() => {
      nameRef.current?.focus()
      nameRef.current?.select()
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setError(null)

    const trimmedName = name.trim()
    const allocated = parseMoney(amountText)
    if (!trimmedName || allocated === null || budgetTotal === null || overBudget) return

    const input = { name: trimmedName, allocated, color }

    try {
      if (editingId) onUpdate(editingId, input)
      else onAdd(input)
      resetForm()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the category.")
    }
  }

  function handleDelete(id: string) {
    onDelete(id)
    if (editingId === id) resetForm()
  }

  const nameError = submitted && name.trim() === "" ? "Enter a category name." : null
  const amountError =
    submitted && parseMoney(amountText) === null ? "Enter an allocated amount of 0 or more." : null
  const budgetError = submitted && budgetTotal === null ? "Enter a monthly budget of 0 or more." : null
  const message = overBudget ? ALLOCATION_LIMIT_MESSAGE : (nameError ?? amountError ?? budgetError ?? error)

  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
      <p className="mt-1 text-sm text-slate-600">
        Add a name, allocated amount, and colour. Edit or delete a category at any time.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            ref={nameRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            autoComplete="off"
            className={fieldClass}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Allocated
          <span className="relative mt-1 block">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-slate-400"
            >
              PKR
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amountText}
              onChange={(event) => {
                setAmountText(event.target.value)
                setError(null)
                publishDraft(event.target.value, editingId)
              }}
              onWheel={(event) => event.currentTarget.blur()}
              aria-invalid={overBudget || (submitted && parsedAmount === null)}
              aria-describedby="budget-status"
              className={`min-h-12 w-full min-w-0 rounded-xl border bg-white pr-3 pl-14 text-base text-slate-900 tabular-nums outline-none focus:ring-2 ${
                overBudget
                  ? "border-red-600 focus:border-red-600 focus:ring-red-600/20"
                  : "border-slate-300 focus:border-orange-600 focus:ring-orange-600/20"
              }`}
            />
          </span>
        </label>

        <label className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
          Colour
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-12 w-16 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={overBudget}
            className="min-h-12 flex-1 rounded-xl bg-orange-600 text-base font-semibold text-white disabled:bg-slate-300"
          >
            {editingId ? "Save changes" : "Add category"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-12 rounded-xl px-4 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {message ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-700">
            {message}
          </p>
        ) : null}
      </form>

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No categories yet.</p>
      ) : (
        <ul className="mt-4 border-t border-slate-200">
          {categories.map((category) => {
            const editing = category.id === editingId
            return (
              <li key={category.id} className={`border-b border-slate-200 py-3 ${editing ? "bg-orange-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium break-words text-slate-900">{category.name}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                        {formatPkr(category.allocated)}
                      </p>
                    </div>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        aria-label={`Edit ${category.name}`}
                        className="min-h-11 rounded-lg px-2 text-sm font-semibold text-orange-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id)}
                        aria-label={`Delete ${category.name}`}
                        className="min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
