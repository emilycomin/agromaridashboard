import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css'
import '@mantine/tiptap/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'

const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  components: {
    Select: {
      defaultProps: { checkIconPosition: 'right' },
    },
    MultiSelect: {
      defaultProps: { checkIconPosition: 'right' },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GCAL_CLIENT_ID ?? ''}>
      <MantineProvider theme={theme}>
        <App />
      </MantineProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
