import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import { ThemeProvider } from './ThemeContext.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
)
