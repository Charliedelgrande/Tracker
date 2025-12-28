import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useSettings } from '@/db/hooks'
import { applyTheme } from '@/theme/apply-theme'
import { useEffect } from 'react'

export function Root() {
  const settings = useSettings()

  useEffect(() => {
    if (!settings) return
    applyTheme(settings)
  }, [settings])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        richColors
        theme={settings?.theme.mode ?? 'dark'}
        position="top-center"
        duration={2500}
        closeButton
      />
    </>
  )
}


