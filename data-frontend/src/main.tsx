import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

if (rawApiBase && typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        return originalFetch(`${rawApiBase}${input}`, init)
      }
      return originalFetch(input, init)
    }

    if (input instanceof Request) {
      const current = input.url
      const originPrefix = `${window.location.origin}/api/`
      if (current.startsWith(originPrefix)) {
        const nextUrl = `${rawApiBase}/api/${current.slice(originPrefix.length)}`
        return originalFetch(new Request(nextUrl, input), init)
      }
      return originalFetch(input, init)
    }

    return originalFetch(input, init)
  }) as typeof window.fetch
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
