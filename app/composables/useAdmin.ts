import type { FetchError } from 'ofetch'

export interface Toast {
  id: number
  kind: 'saved' | 'error' | 'info'
  text: string
}

const toasts = ref<Toast[]>([])
let nextId = 1

/** Saved / error feedback that works on a phone: big, short-lived, polite. */
export function useAdminToast() {
  function push(kind: Toast['kind'], text: string, ms = kind === 'error' ? 6000 : 2500) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, kind, text }]
    if (import.meta.client) window.setTimeout(() => dismiss(id), ms)
    return id
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return { toasts, push, dismiss, saved: (text = 'Saved') => push('saved', text), error: (text: string) => push('error', text) }
}

export function errorMessage(error: unknown): string {
  const e = error as FetchError | undefined
  const data = e?.data as { statusMessage?: string; message?: string } | undefined
  return data?.statusMessage || e?.statusMessage || (error instanceof Error ? error.message : 'Something went wrong')
}

/** Mutations: JSON, same-origin, surfaces server messages, redirects on 401. */
export function useAdminApi() {
  const toast = useAdminToast()
  async function call<T>(url: string, opts: { method?: 'POST' | 'PUT' | 'DELETE'; body?: unknown; quiet?: boolean } = {}): Promise<T | null> {
    try {
      // Untyped call: the typed-route inference recurses on method unions.
      const fetcher = $fetch as unknown as (u: string, o: { method: string; body?: unknown }) => Promise<unknown>
      return (await fetcher(url, { method: opts.method ?? 'POST', body: opts.body })) as T
    } catch (error) {
      const e = error as FetchError
      if (e?.statusCode === 401 || e?.status === 401) {
        await navigateTo({ path: '/admin/login', query: { next: useRoute().fullPath } })
        return null
      }
      if (!opts.quiet) toast.error(errorMessage(error))
      throw error
    }
  }
  return { call }
}

export const formatCents = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '' : (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const centsToInput = (cents: number | null | undefined) => (cents === null || cents === undefined ? '' : (cents / 100).toFixed(2))

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function formatDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
