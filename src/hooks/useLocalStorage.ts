import { useEffect, useState, type Dispatch, type SetStateAction } from "react"

type InitialValue<T> = T | (() => T)

function resolveInitial<T>(initialValue: InitialValue<T>): T {
  return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue
}

function readStored<T>(
  key: string,
  fallback: T,
  parse?: (value: unknown) => T | undefined,
): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!parse) return parsed as T
    return parse(parsed) ?? fallback
  } catch {
    return fallback
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: InitialValue<T>,
  parse?: (value: unknown) => T | undefined,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStored(key, resolveInitial(initialValue), parse))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore quota errors and private-mode storage failures.
    }
  }, [key, value])

  return [value, setValue]
}
