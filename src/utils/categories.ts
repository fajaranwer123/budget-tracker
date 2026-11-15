import type { Category } from "../types/category.ts"

export function createDefaultCategories(): Category[] {
  return [
    { id: "food", name: "Food", allocated: 0, color: "#c4552a" },
    { id: "transport", name: "Transport", allocated: 0, color: "#2f6f8f" },
    { id: "bills", name: "Bills", allocated: 0, color: "#5c4d7a" },
    { id: "education", name: "Education", allocated: 0, color: "#3d6b4f" },
    { id: "shopping", name: "Shopping", allocated: 0, color: "#a34b6b" },
    { id: "savings", name: "Savings", allocated: 0, color: "#b0893e" },
  ]
}
