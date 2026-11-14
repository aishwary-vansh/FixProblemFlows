import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import {store} from './store/store.ts'
import { registerServiceWorker } from './lib/push.ts'
import CrashScreen from './components/CrashScreen.tsx'
import { redactSecrets } from './lib/redact.ts'

// Error tracking is on only when VITE_SENTRY_DSN is set at build time.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    // Reset, invite, join and QR links carry secret codes; they must not reach Sentry in URLs or breadcrumbs.
    beforeSend: (event) => {
      if (event.request?.url) event.request.url = redactSecrets(event.request.url)
      return event
    },
    beforeBreadcrumb: (breadcrumb) => {
      const data = breadcrumb.data
      if (data) {
        for (const key of ['url', 'from', 'to']) {
          if (typeof data[key] === 'string') data[key] = redactSecrets(data[key])
        }
      }
      if (breadcrumb.message) breadcrumb.message = redactSecrets(breadcrumb.message)
      return breadcrumb
    },
  })
}

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashScreen />}>
      <Provider store={store}>
      <App />
      </Provider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
