import { createContext } from 'react'
import type { ResolvedTheme } from '../lib/palette'

export type ThemePreference = 'system' | 'light' | 'dark'

export interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (p: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)
