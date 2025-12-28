import type { SettingsRow } from '@/db/types'

export function applyTheme(settings: SettingsRow) {
  const root = document.documentElement
  if (settings.theme.mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')

  // primary accent token
  root.style.setProperty('--primary', settings.theme.accent)

  // Ensure readable contrast for default monochrome: if primary is light, make foreground dark.
  // Users can still pick any accent; this just avoids surprise.
  if (settings.theme.mode === 'dark') {
    root.style.setProperty('--primary-foreground', '0 0% 6%')
  } else {
    root.style.setProperty('--primary-foreground', '0 0% 98%')
  }
}


