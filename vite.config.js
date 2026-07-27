import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// יעד בנייה מורחב לאחור — המסך רץ גם על מכשירי Android TV / MX ישנים
// שהדפדפן בהם מבוסס Chrome ישן. es2015 + chrome61 מוריד תחביר ו-CSS מודרניים
// (logical properties, color-mix וכו') לגרסאות שהמכשירים האלה מבינים.
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['es2015', 'chrome61', 'safari11'],
    cssTarget: ['chrome61', 'safari11'],
  },
})
