/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useTransition } from "react"

export function useAsyncData<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const nextData = await loader()
      startTransition(() => setData(nextData))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  // The caller owns the dependency list so route params can trigger reloads.
  useEffect(() => {
    queueMicrotask(() => void load())
  }, dependencies)

  return {
    data,
    error,
    loading: loading || isPending,
    reload: load,
  }
}
