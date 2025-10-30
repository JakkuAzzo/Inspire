Playwright end-to-end test (backend root UI)

This repo includes a small Playwright test that exercises the backend root dev console (http://localhost:3001/).

Files:
- `backend/e2e/playwright.config.ts` — Playwright config (baseURL defaults to http://localhost:3001)
- `backend/e2e/tests/save-pack.spec.ts` — Simple test: generates a fuel pack and asserts UI updated.

Run locally

1. Install Playwright and the browsers (one-time):

```bash
cd backend
npm install -D @playwright/test
npx playwright install
```

2. Start the backend server in another terminal (dev mode):

```bash
cd backend
npm run dev
```

3. Run the Playwright test:

```bash
cd backend
npx playwright test e2e/tests/save-pack.spec.ts --project=chromium
```

CI notes

- In CI, install `@playwright/test` and run `npx playwright install --with-deps` before `npx playwright test`.
- Use the `PW_BASE_URL` env var to point tests at a deployed instance if necessary.
