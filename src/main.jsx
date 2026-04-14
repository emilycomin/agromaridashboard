import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css'
import '@mantine/tiptap/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import App from './App.jsx'

const theme = createTheme({
  primaryColor: 'green',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>,
)
