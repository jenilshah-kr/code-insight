'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface AppearanceContextValue {
  theme: Theme
  toggle: () => void
}

const AppearanceContext = createContext<AppearanceContextValue>({
  theme: 'dark',
  toggle: () => {},
})

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggle() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <AppearanceContext.Provider value={{ theme, toggle }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  return useContext(AppearanceContext)
}
