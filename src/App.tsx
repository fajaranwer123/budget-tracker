import { useState } from "react"
import { BudgetSetup } from "./components/BudgetSetup.tsx"
import { ExpenseScreen } from "./components/ExpenseScreen.tsx"
import { useExpenseStore } from "./hooks/useExpenseStore.ts"

type Section = "budget" | "expenses"

export default function App() {
  const store = useExpenseStore()
  const [section, setSection] = useState<Section>("expenses")

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <nav
        aria-label="Sections"
        className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 backdrop-blur-sm"
      >
        <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-1 px-4 py-2">
          {(
            [
              ["expenses", "Expenses"],
              ["budget", "Budget"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={section === id}
              onClick={() => setSection(id)}
              className={`min-h-11 rounded-xl text-sm font-semibold ${
                section === id ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      <div className={section === "expenses" ? undefined : "hidden"}>
        <ExpenseScreen
          categories={store.categories}
          expenses={store.expenses}
          addExpense={store.addExpense}
          updateExpense={store.updateExpense}
          deleteExpense={store.deleteExpense}
        />
      </div>
      <div className={section === "budget" ? undefined : "hidden"}>
        <BudgetSetup
          budget={store.budget}
          categories={store.categories}
          updateBudget={store.updateBudget}
          addCategory={store.addCategory}
          updateCategory={store.updateCategory}
          deleteCategory={store.deleteCategory}
        />
      </div>
    </div>
  )
}
