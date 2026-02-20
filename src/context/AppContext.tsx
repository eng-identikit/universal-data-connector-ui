import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import i18n from '../i18n'

interface AppContextType {
  themeMode: 'light' | 'dark'
  toggleTheme: () => void
  language: string
  setLanguage: (lang: string) => void
  apiBaseUrl: string
  setApiBaseUrl: (url: string) => void
}

const AppContext = createContext<AppContextType>({} as AppContextType)

export function AppProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('udc-theme') as 'light' | 'dark') || 'dark',
  )
  const [language, setLanguageState] = useState(
    () => localStorage.getItem('udc-language') || 'it',
  )
  const [apiBaseUrl, setApiBaseUrlState] = useState(
    () => localStorage.getItem('udc-api-url') || 'http://localhost:3000',
  )

  // Sync i18n language on mount
  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light'
    setThemeMode(next)
    localStorage.setItem('udc-theme', next)
  }

  const setLanguage = (lang: string) => {
    setLanguageState(lang)
    localStorage.setItem('udc-language', lang)
    i18n.changeLanguage(lang)
  }

  const setApiBaseUrl = (url: string) => {
    setApiBaseUrlState(url)
    localStorage.setItem('udc-api-url', url)
  }

  return (
    <AppContext.Provider
      value={{ themeMode, toggleTheme, language, setLanguage, apiBaseUrl, setApiBaseUrl }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
