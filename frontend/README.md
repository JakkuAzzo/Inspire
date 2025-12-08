# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Inspire Frontend

  Quick commands you are likely to need while iterating on the UI.

  ## Dev and build

  - `npm run dev` – start Vite locally.
  - `npm run build` – type-check and build the app.
  - `npm run preview` – serve the production build.

  ## E2E layout check (Playwright)

  - `npm run test:e2e` – boots the dev server on `http://localhost:4173`, forks a demo pack from the community feed, opens a pack detail, returns to the list, and captures screenshots in `test-artifacts/` (`layout-list.png`, `layout-detail.png`, `layout-back.png`).
  - Reuse an existing dev server by setting `PLAYWRIGHT_BASE_URL=http://localhost:4173` before running the command.
    ],
