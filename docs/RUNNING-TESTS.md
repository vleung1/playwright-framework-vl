# Running tests

CLI commands, environment variables, and how to view reports and traces.

## Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (default: list reporter + HTML report). |
| `npm run test:smoke` | Run only `tests/smoke/`. |
| `npm run test:crdc` | Run CRDC hub homepage POC tests (hub.datacommons.cancer.gov). |
| `npm run test:ui` | Open Playwright UI mode (explore, run, debug). |
| `npm run test:headed` | Run tests with browser visible. |
| `npm run test:debug` | Run with Playwright inspector (step-through). |
| `npm run report` | Open the last HTML report. |

## Scripts (CI)

- `./scripts/run-smoke.sh` — smoke suite only. Use on every commit.
- `./scripts/run-regression.sh` — full suite. Use on schedule or pre-release.

Both respect `TEST_ENV` and forward extra args to `playwright test`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `TEST_ENV` | CRDC hub profile: `prod`, `qa`, `stage`, `qa2`. Default: **`qa`** (when unset; see `config/constants.ts`). |
| `BASE_URL` | Override the hub URL. If set, it is used instead of the `TEST_ENV` default. |
| `LOG_LEVEL` | Optional: `debug`, `info`, `warn`, `error`. Default: `info`. |
| `CI` | Set by most CI systems; enables retries and reduces workers. |

**TEST_ENV vs BASE_URL:** Set **TEST_ENV** to pick a named environment (prod, qa, stage, qa2); each has a default URL in `config/env/urls.ts`. Set **BASE_URL** only when you need a specific URL (e.g. a custom host). If both are set, **BASE_URL wins** and the TEST_ENV default is ignored. You typically set only one: use TEST_ENV for standard envs, or BASE_URL for a one-off URL.

### Using a `.env` file

The project loads `.env` automatically (via `dotenv`) when Playwright starts. To run against a specific environment without passing vars on the command line:

1. Copy `.env.example` to `.env` in the project root.
2. Edit `.env` and set `TEST_ENV` (e.g. `TEST_ENV=qa`) and optionally `BASE_URL` if you want to override.
3. Run `npm run test:crdc` (or any test command); values from `.env` are applied.

Do not commit `.env`; it is for local overrides and may contain secrets.

## CRDC Hub Homepage POC

To run the homepage tests against the CRDC Submission Portal:

```bash
npm run test:crdc
```

This uses the `crdc-homepage` project, which sets `baseURL` to `https://hub.datacommons.cancer.gov` and runs only `tests/ui/crdc-homepage.spec.ts`. By default tests run **headless**. To watch the browser:

```bash
npm run test:crdc:headed
```

Alternatively:

```bash
npx playwright test --project=crdc-homepage
npx playwright test --project=crdc-homepage --headed
```

Or run with a custom base URL: `BASE_URL=https://hub.datacommons.cancer.gov npx playwright test tests/ui/crdc-homepage.spec.ts`

## Run by project (browser)

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Run by file or test name

```bash
npx playwright test tests/smoke/smoke.spec.ts
npx playwright test -g "should load application"
```

## Run by tag (grep)

Tests can be tagged with a details object, e.g. `{ tag: ['@regression', '@CRDCDH-1234'] }`. Tags must start with `@`. Use `--grep` to run only tests whose title or tags match, or `--grep-invert` to exclude:

```bash
# Run only tests tagged @regression
npx playwright test --grep @regression

# Run only tests for a specific Jira ticket
npx playwright test --grep @CRDCDH-1234

# Run CRDC project but only @smoke-tagged tests
npx playwright test --project=crdc-homepage --grep @smoke

# Exclude tests tagged @slow
npx playwright test --grep-invert @slow
```

## Smoke tests

`npm run test:smoke` runs the suite in `tests/smoke/`. Those tests use the **default project** and thus the **default baseURL** from config (from `getCrdcBaseURL()`, i.e. the CRDC hub for the current `TEST_ENV`). When the framework supports multiple projects, smoke still runs against whatever is the default baseURL unless you run a specific project; document any project-specific smoke in the multi-project plan.

## Viewing results

- **HTML report**: After a run, `npm run report` opens the last report (or `npx playwright show-report`). Use it to inspect failures, traces, and screenshots.
- **Trace on failure**: Traces are recorded on first retry (see `playwright.config.ts`). In the HTML report, open a failed test and use “Trace” to step through the run.
- **Local debug**: Use `npm run test:debug` or run from VS Code with the Playwright extension; set breakpoints and use the inspector.

## Type check and lint

- `npm run typecheck` — `tsc --noEmit` (run in CI).
- `npm run lint` — ESLint for `.ts` files.
