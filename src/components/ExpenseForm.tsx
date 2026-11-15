import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import type { ExpenseInput, ExpenseUpdate } from "../hooks/useExpenseStore.ts"
import { PAYMENT_METHODS, parseAmount, todayISO } from "../lib/expenses.ts"
import type { Category } from "../types/category.ts"
import type { Expense, PaymentMethod } from "../types/expense.ts"

type ExpenseFormProps = {
  categories: Category[]
  editing: Expense | null
  editToken: number
  onCreate: (input: ExpenseInput) => void
  onUpdate: (id: string, patch: ExpenseUpdate) => void
  onCancel: () => void
}

type ExpenseDraft = {
  amount: string
  categoryId: string
  date: string
  note: string
  paymentMethod: PaymentMethod
}

const fieldClass =
  "mt-1 w-full min-h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"

export function ExpenseForm(props: ExpenseFormProps) {
  const [draft, setDraft] = useState<ExpenseDraft | null>(null)
  const formKey = props.editing ? `${props.editing.id}:${props.editToken}` : "add"

  return <ExpenseFormFields key={formKey} {...props} draft={draft} onDraftChange={setDraft} />
}

function ExpenseFormFields({
  categories,
  editing,
  onCreate,
  onUpdate,
  onCancel,
  draft,
  onDraftChange,
}: ExpenseFormProps & {
  draft: ExpenseDraft | null
  onDraftChange: (draft: ExpenseDraft) => void
}) {
  const amountId = useId()
  const categoryFieldId = useId()
  const dateId = useId()
  const noteId = useId()
  const errorId = useId()
  const amountRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState(() =>
    editing ? editing.amount.toFixed(2) : (draft?.amount ?? ""),
  )
  const [categoryId, setCategoryId] = useState(() => {
    if (editing) return editing.categoryId
    return draft?.categoryId || categories[0]?.id || ""
  })
  const [date, setDate] = useState(() => editing?.date ?? draft?.date ?? todayISO())
  const [note, setNote] = useState(() => editing?.note ?? draft?.note ?? "")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () => editing?.paymentMethod ?? draft?.paymentMethod ?? "cash",
  )
  const [error, setError] = useState<string | null>(null)

  const selectedCategoryId =
    categoryId && (Boolean(editing) || categories.some((category) => category.id === categoryId))
      ? categoryId
      : (categories[0]?.id ?? "")

  function remember(overrides: Partial<ExpenseDraft> = {}) {
    if (editing) return
    onDraftChange({
      amount,
      categoryId: selectedCategoryId,
      date,
      note,
      paymentMethod,
      ...overrides,
    })
  }

  useEffect(() => {
    if (!editing) return
    amountRef.current?.focus()
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.getElementById("expense-form")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }, [editing])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseAmount(amount)
    if (parsed === null) {
      setError("Enter an amount greater than 0.")
      amountRef.current?.focus()
      return
    }
    if (!selectedCategoryId) {
      setError("Choose a category.")
      categoryRef.current?.focus()
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Choose a date.")
      dateRef.current?.focus()
      return
    }

    const input: ExpenseInput = {
      amount: parsed,
      categoryId: selectedCategoryId,
      date,
      note: note.trim(),
      paymentMethod,
    }

    try {
      if (editing) {
        onUpdate(editing.id, input)
        onCancel()
        return
      }
      onCreate(input)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this expense.")
      return
    }

    setAmount("")
    setNote("")
    setError(null)
    onDraftChange({
      amount: "",
      categoryId: selectedCategoryId,
      date,
      note: "",
      paymentMethod,
    })
    amountRef.current?.focus()
  }

  const missingCategory =
    selectedCategoryId !== "" && !categories.some((category) => category.id === selectedCategoryId)
  const categoryOptions = missingCategory
    ? [
        { id: selectedCategoryId, name: "Unknown category", allocated: 0, color: "#94a3b8" },
        ...categories,
      ]
    : categories

  return (
    <form
      id="expense-form"
      noValidate
      onSubmit={handleSubmit}
      className="scroll-mt-20 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      aria-describedby={error ? errorId : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {editing ? "Edit expense" : "Add expense"}
        </h2>
        {editing && (
          <button
            type="button"
            onClick={() => {
              onCancel()
              amountRef.current?.blur()
            }}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>

      <label htmlFor={amountId} className="mt-4 block text-sm font-medium text-slate-700">
        Amount
        <span className="relative mt-1 block">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-slate-400"
          >
            PKR
          </span>
          <input
            ref={amountRef}
            id={amountId}
            name="amount"
            inputMode="decimal"
            autoComplete="transaction-amount"
            enterKeyHint="next"
            placeholder="0.00"
            maxLength={12}
            value={amount}
            aria-invalid={error !== null && parseAmount(amount) === null}
            onChange={(event) => {
              const next = event.target.value
              setAmount(next)
              setError(null)
              remember({ amount: next })
            }}
            onBlur={() => {
              const parsed = parseAmount(amount)
              if (parsed === null) return
              const next = parsed.toFixed(2)
              setAmount(next)
              remember({ amount: next })
            }}
            className="min-h-16 w-full min-w-0 rounded-xl border border-slate-300 bg-white pr-3 pl-14 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums outline-none placeholder:text-slate-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
          />
        </span>
      </label>

      <label htmlFor={categoryFieldId} className="mt-4 block text-sm font-medium text-slate-700">
        Category
        <select
          ref={categoryRef}
          id={categoryFieldId}
          name="category"
          value={selectedCategoryId}
          onChange={(event) => {
            const next = event.target.value
            setCategoryId(next)
            setError(null)
            remember({ categoryId: next })
          }}
          className={fieldClass}
        >
          {categoryOptions.length === 0 && <option value="">No categories</option>}
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor={dateId} className="mt-4 block text-sm font-medium text-slate-700">
        Date
        <input
          ref={dateRef}
          id={dateId}
          name="date"
          type="date"
          value={date}
          onChange={(event) => {
            const next = event.target.value
            setDate(next)
            setError(null)
            remember({ date: next })
          }}
          className={fieldClass}
        />
      </label>

      <label htmlFor={noteId} className="mt-4 block text-sm font-medium text-slate-700">
        Note <span className="font-normal text-slate-500">optional</span>
        <input
          id={noteId}
          name="note"
          type="text"
          enterKeyHint="done"
          autoComplete="off"
          maxLength={200}
          placeholder="Coffee, groceries, taxi…"
          value={note}
          onChange={(event) => {
            const next = event.target.value
            setNote(next)
            remember({ note: next })
          }}
          className={fieldClass}
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">Payment method</legend>
        <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.value
            return (
              <button
                key={method.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setPaymentMethod(method.value)
                  remember({ paymentMethod: method.value })
                }}
                className={`min-h-11 rounded-lg text-sm font-semibold ${
                  selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                {method.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {categories.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">Add a category before logging an expense.</p>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={categories.length === 0 && !editing}
        className="mt-4 min-h-12 w-full rounded-xl bg-orange-600 text-base font-semibold text-white active:bg-orange-700 disabled:bg-slate-300"
      >
        {editing ? "Save changes" : "Add expense"}
      </button>
    </form>
  )
}
