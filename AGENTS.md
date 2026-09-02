# Repository Guidelines

## Project Structure & Module Organization
PulsePay is split into four main areas. `client/` contains the React 19 + Vite UI, with pages in `client/src/pages/`, shared components in `client/src/components/`, API helpers in `client/src/api/`, and static assets in `client/src/assets/` or `client/public/`. `server/` contains the Express API, with routes in `server/routes/`, controllers in `server/controllers/`, Mongoose models in `server/models/`, business logic in `server/services/`, and tests in `server/tests/`. `ml/` contains the FastAPI anomaly service under `ml/app/` plus model artifacts in `ml/models/`. `docs/` holds architecture, security, demo, and recovery notes.

## Build, Test, and Development Commands
Install dependencies per service:

```sh
cd client && npm install
cd server && npm install
cd ml && pip install -r requirements.txt
```

Run locally with `npm run dev` from `client/` for the Vite UI, `npm run dev` from `server/` for the Nodemon API on port `5000`, and `uvicorn app.main:app --reload --port 8000` from `ml/` for the ML service. Use `npm run build` in `client/` for production assets, `npm run preview` to inspect them, `npm run lint` for Oxlint, and `npm test` in `server/` for backend tests.

## Coding Style & Naming Conventions
Use JavaScript modules in the client and CommonJS in the server. Follow the existing two-space indentation in JSX and server files; Python code in `ml/` uses four spaces. Name React pages and components in `PascalCase` (`RecoveryBenchmark.jsx`), service modules in `camelCase` (`recoveryPolicyEngine.js`), and tests as `featureName.test.js`. Keep route/controller/service boundaries intact: controllers should orchestrate request handling, while domain logic belongs in `server/services/`.

## Testing Guidelines
Backend tests use Node's built-in `assert` with custom runners, not Jest. Add files in `server/tests/` and include them in `server/package.json` when introducing a new test file. Prefer focused scenario names such as `Duplicate Event Detection`. There are no committed client or ML test runners yet; validate UI changes with `npm run lint` and a local Vite pass.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `Finalize PulsePay submission`. Keep commits focused by service or feature. Pull requests should describe the user-facing change, list commands run, call out config or data assumptions, and include screenshots for UI changes.

## Security & Configuration Tips
Keep secrets in local `.env` files; they are ignored by Git. Server configuration reads `MONGODB_URI`, `PORT`, `ML_SERVICE_URL`, and optional `GEMINI_API_KEY`. Preserve the project boundary that all payment activity is synthetic/test-mode and never introduce live funds or production banking credentials.
