export type PaymentMethod = "cash" | "card" | "wallet"

export type Expense = {
  id: string
  amount: number
  categoryId: string
  date: string
  note: string
  paymentMethod: PaymentMethod
}
