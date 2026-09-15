import "./lib/fullscreen.js";
import "./lib/autoUpdate.js";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// עלייה יציבה — מאפסים את מונה לולאת הקריסה מ-index.html כדי שתקלה חד-פעמית
// לא תיחשב לחלק מרצף קריסות בעלייה הבאה.
setTimeout(() => {
  try { sessionStorage.removeItem('lobby_crash_count'); } catch { /* ignore */ }
}, 60000);
