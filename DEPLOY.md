# הוראות פריסה — מסך לובי הוד השרון

## שלב 1 — התקנה מקומית (בדיקה)
```bash
npm install
npm run dev      # פתח את הכתובת שמופיעה (בד"כ http://localhost:5173)
```

## שלב 2 — יצירת ריפו ב-GitHub
דרך א' — עם GitHub CLI:
```bash
git init
git add .
git commit -m "מסך לובי v1.0.0"
gh repo create lobby-display --public --source=. --push
```
דרך ב' — ידני: צור ריפו ריק ב-github.com, ואז:
```bash
git init && git add . && git commit -m "מסך לובי v1.0.0"
git branch -M main
git remote add origin https://github.com/<USER>/lobby-display.git
git push -u origin main
```

## שלב 3 — פריסה ל-Vercel
דרך א' — CLI:
```bash
npx vercel --prod
```
דרך ב' — דרך vercel.com: "Add New Project" → בחר את הריפו → Vercel יזהה Vite אוטומטית → Deploy.

הכל כבר מוגדר: vercel.json (build + SPA rewrites), .npmrc (legacy-peer-deps).
Vercel יריץ `npm run build` ויגיש את תיקיית dist.

## עדכון גרסאות בעתיד
ערוך את src/version.js — העלה את VERSION והוסף רשומה לראש CHANGELOG.
כל push ל-main יפעיל פריסה מחדש אוטומטית ב-Vercel.
