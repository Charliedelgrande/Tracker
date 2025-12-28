import React from 'react'
import ReactDOM from 'react-dom/client'
import { bootstrapDb } from '@/db/bootstrap'
import { Root } from '@/app/root'
import '@/styles/globals.css'
import '@/styles/mono-theme.css'

import { registerSW } from 'virtual:pwa-register'

void bootstrapDb().then(() => {
  // Avoid SW in dev to prevent HMR/cache weirdness. Test offline via `npm run preview`.
  if (import.meta.env.PROD) registerSW({ immediate: true })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)


