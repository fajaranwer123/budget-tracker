import { useState } from "react"
import type { ExpenseInput, ExpenseUpdate } from "../hooks/useExpenseStore.ts"
import type { Category } from "../types/category.ts"
import type { Expense } from "../types/expense.ts"
import { ExpenseForm } from "./ExpenseForm.tsx"
import { ExpenseHistory } from "./ExpenseHistory.tsx"

type ExpenseScreenProps = {
  categories: Category[]
  expenses: Expense[]
  addExpense: (input: ExpenseInput) => Expense
  updateExpense: (id: string, patch: ExpenseUpdate) => void
  deleteExpense: (id: string) => void
}

export function ExpenseScreen({
  categories,
  expenses,
  addExpense,
  updateExpense,
  deleteExpense,
}: ExpenseScreenProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editToken, setEditToken] = useState(0)
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)
  const editing = expenses.find((expense) => expense.id === editingId) ?? null

  function handleCreate(input: ExpenseInput) {
    const created = addExpense(input)
    setLastSavedId(created.id)
  }

  function handleUpdate(id: string, patch: ExpenseUpdate) {
    updateExpense(id, patch)
    setLastSavedId(null)
  }

  function handleDelete(id: string) {
    deleteExpense(id)
    if (editingId === id) setEditingId(null)
    if (lastSavedId === id) setLastSavedId(null)
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
      </header>
      <ExpenseForm
        categories={categories}
        editing={editing}
        editToken={editToken}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onCancel={() => setEditingId(null)}
      />
      <ExpenseHistory
        expenses={expenses}
        categories={categories}
        editingId={editing?.id ?? null}
        lastSavedId={lastSavedId}
        onEdit={(id) => {
          setEditingId(id)
          setEditToken((token) => token + 1)
        }}
        onDelete={handleDelete}
      />
    </main>
  )
}
