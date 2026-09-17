# ✅ TaskGlass — Glassmorphism To-Do App

A beautiful, fully-functional to-do list web app with a **water-glass (frosted glassmorphism) design**, **dark & light themes**, and a **feature-packed Settings panel**. 100% vanilla HTML/CSS/JS — no frameworks, no build step, no dependencies. Works completely offline and stores all data locally in your browser.

![License](https://img.shields.io/badge/license-MIT-green.svg)
![No dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)

## 🔗 Live Demo

**https://melleeyyy.github.io/taskglass-todo-app/**

## ✨ Features

### Tasks
- ➕ Create, edit, complete and delete tasks
- 📝 Titles, notes, priorities (Low / Medium / High)
- 🗓️ Due dates & times with overdue/today highlighting
- ⭐ Important (starred) tasks
- 🏷️ Custom categories with colours
- 🔍 Live search across titles & notes
- ↕️ Sorting: manual drag-to-reorder, date, priority, alphabetical
- 🧲 Multiple views: All, Today, Upcoming, Important, Completed, per-category
- 🎯 Filter chips: Active, Completed, High priority, Due today, Overdue
- 📊 Dashboard stats + animated progress ring
- 🎉 Confetti celebration on completing a task
- ⏰ Optional browser notifications for due tasks
- 🔊 Soft sound effects (WebAudio — no audio files needed)
- 🧹 Clear-all-completed button
- ⌨️ Shortcuts: N new task, / search, Esc close

### ⚙️ Settings (everything adjustable)
| Setting | Options |
|---|---|
| Theme | 🌙 Dark / ☀️ Light / 🖥️ System (auto) |
| Accent colour | 8 presets + custom colour picker |
| Glass (frost) intensity | 0–100% blur & transparency slider |
| Corner roundness | 0–30px |
| Font size | 13–19px |
| Font family | 5 typefaces |
| Compact mode | On / Off |
| Animations | On / Off |
| Background | Aurora blobs / Plain gradient / Solid |
| Default view & default sort | per preference |
| Show completed tasks | On / Off |
| Confirm before delete | On / Off |
| Sound effects | On / Off |
| Confetti | On / Off |
| Due-date reminders | On / Off |
| Week starts on | Monday / Sunday |
| Data | Export / Import JSON backup, reset, storage usage |

All settings persist in `localStorage` — nothing leaves your device.

## 🚀 Free Live Hosting

The app is 100% static, so any free static host works:

### GitHub Pages (already enabled for this repo ✅)
- This repository deploys automatically from the `main` branch: **https://melleeyyy.github.io/taskglass-todo-app/**
- For a fork/copy: Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save.

### Netlify (drag & drop)
1. Go to [netlify.com](https://netlify.com) → drag the repo folder onto the dashboard.
2. Done — instant free HTTPS URL. (A `netlify.toml` is included.)

### Vercel
1. Import the repo at [vercel.com](https://vercel.com) — zero config (`vercel.json` included).

## 🛠️ Run locally
Just open `index.html` in any modern browser, or:

```bash
npx serve .        # or
python3 -m http.server
```

## 📁 Project structure
```
├── index.html          # App markup
├── css/style.css       # Glassmorphism design system (dark/light themes)
├── js/app.js           # All logic (CRUD, filters, settings, storage)
├── LICENSE             # MIT
├── netlify.toml        # Netlify config
├── vercel.json         # Vercel config
└── .nojekyll           # Ensure GitHub Pages serves files as-is
```

## 🌐 Browser support
Chrome, Edge, Firefox, Safari (desktop & mobile). Uses `backdrop-filter` (glass effect), `color-mix` and CSS custom properties — all supported in current browsers.

## 📄 License
Released under the [MIT License](LICENSE) — free to use, modify and distribute.
