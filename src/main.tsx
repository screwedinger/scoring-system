import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installQuizKeyboardShortcuts } from './keyboardShortcuts'

const removeQuizKeyboardShortcuts = installQuizKeyboardShortcuts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => removeQuizKeyboardShortcuts())
}
