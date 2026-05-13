import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/tiptap/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'

const theme = createTheme({
  primaryColor: 'brand',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  colors: {
    brand: [
      '#f0eff7', '#dddbe8', '#c4c1d6', '#a9a5c2', '#8e89ae',
      '#736e9b', '#625d88', '#514c72', '#3e3a53', '#2b283a',
    ],
  },
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
