# Study Platform — Frontend

## Setup

1. Make sure Node.js is installed: https://nodejs.org (LTS version)
2. Open a terminal inside the `Frontend` folder
3. Install dependencies: npm install
4. Run the app: npm run dev
5. Open the link shown in the terminal (usually http://localhost:5173/)

## Packages used

- `react` / `react-dom` — core React
- `react-router-dom` — page navigation (Login, Register,  Dashboard, Subject)
- `axios` — backend API calls (to be added)
- `vite` — dev server / build tool

## Folder structure

- `src/pages` → full pages (Login, Register, Home, Subject)
- `src/components` → reusable UI pieces (Sidebar)
- `src/services` → API calls (to be added — Axios calls to backend)

## Notes for teammates

- Login and Register currently navigate on submit but don't call the backend yet — look for `// TODO` comments in `Login.jsx` and `Register.jsx`
- Subject notes are currently stored in memory only (not persisted) — see `Subject.jsx`



