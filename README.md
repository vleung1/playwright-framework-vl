# Playwright Framework for CRDCDH

UI test automation framework using **Playwright** and **TypeScript**, following industry best practices and framework standards.

## Prerequisites

- **Node.js** 18 or higher
- **npm** (or pnpm/yarn)

## Quick start

```bash
# Install dependencies
npm ci

# Install Playwright browsers (one-time)
npx playwright install

# Run all tests
npm test

# Run smoke suite only
npm run test:smoke

# Run CRDC Submission Portal homepage POC (base URL from TEST_ENV; default qa hub)
npm run test:crdc

# Run with UI mode
npm run test:ui

# Open last report
npm run report

# Lint and type check
npm run lint
npm run typecheck
```

## Documentation

- **[Framework onboarding](docs/FRAMEWORK-ONBOARDING.md)** — End-to-end guide to how the framework works and why it's structured this way (for QA engineers joining the project).
- **[Project structure](docs/PROJECT-STRUCTURE.md)** — Directory layout and responsibilities.
- **[Conventions](docs/CONVENTIONS.md)** — Naming, POM rules, fixtures, locator strategy, and test data.
- **[Running tests](docs/RUNNING-TESTS.md)** — CLI commands, environment variables, and viewing reports/traces.

## CRDC Hub Homepage POC

The framework includes a proof-of-concept suite for the [CRDC Submission Portal](https://hub.datacommons.cancer.gov/) homepage:

- **Page object:** `src/pages/home.page.ts` — header, main content, footer, system use warning dialog
- **Tests:** `tests/ui/crdc-homepage.spec.ts` — title, heading, nav links, footer, warning dialog, login navigation

Run with: `npm run test:crdc` (uses project `crdc-homepage`; base URL from `getCrdcBaseURL()` — **qa** by default, or set `TEST_ENV` / `BASE_URL`). Ensure Playwright browsers are installed: `npx playwright install`.

## Configuration

- Copy `.env.example` to `.env` if you want overrides; without `.env`, **`TEST_ENV` defaults to `qa`** (see `config/constants.ts`). Set `TEST_ENV=prod` only when you intend to hit production.
- Timeouts and constants live in `config/constants.ts`; environment URL resolution in `config/env/urls.ts`.

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs:

1. **Lint & Type Check** — on every push and PR
2. **Smoke Tests** — on every push and PR
3. **CRDC Regression** — on push to `main` or manual dispatch

## Documentation

- **docs/FRAMEWORK-ONBOARDING.md** — End-to-end guide for new team members.
- **docs/RUNNING-TESTS.md** — How to run tests, env vars, reports.
- **docs/MULTI-PROJECT-EXTENSIBILITY-PLAN.md** — Plan for multi-project, multi-environment support (one repo, many apps).

## License

Private. All rights reserved.
