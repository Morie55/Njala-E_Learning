import { useEffect, useState } from 'react'

/**
 * useDarkMode — persists dark mode preference in localStorage and
 * applies/removes the "dark" class on <html>.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('nelms-dark-mode')
    if (stored !== null) return stored === 'true'
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('nelms-dark-mode', String(isDark))
  }, [isDark])

  const toggle = () => setIsDark(d => !d)

  return { isDark, toggle }
}
