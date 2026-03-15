# Project structure

Directory layout and responsibility of each folder.

## Tree

```
crdc-dh-automation-pw/
├── .github/
│   └── workflows/
│       └── ci.yml                          # GitHub Actions CI/CD pipeline
├── config/
│   ├── env/                                # Environment-specific config (TEST_ENV)
│   │   ├── index.ts                        # Env name resolver and re-exports
│   │   ├── types.ts                        # EnvConfig type definition
│   │   └── urls.ts                         # Sync base URL resolver by TEST_ENV
│   └── constants.ts                        # Timeouts, no magic numbers
├── src/
│   ├── pages/                              # Page Object Model classes
│   │   ├── base.page.ts                    # Base class for all pages
│   │   └── home.page.ts                    # CRDC Hub homepage
│   ├── components/                         # Reusable UI components (modals, nav)
│   ├── api/                                # API client wrappers (optional)
│   ├── data/                               # Test data factories, builders
│   ├── utils/                              # Helpers: logger, waits, file I/O
│   │   └── logger.ts                       # Structured logger
│   ├── fixtures/
│   │   ├── test.fixture.ts                 # Custom Playwright fixtures (homePage, etc.)
│   │   └── static/                         # JSON/CSV test data (no secrets)
│   └── hooks/                              # Global setup/teardown
├── tests/
│   ├── ui/                                 # UI tests by feature
│   │   └── crdc-homepage.spec.ts           # CRDC Hub homepage tests
│   ├── smoke/                              # Critical path smoke tests
│   │   └── smoke.spec.ts                   # Health check suite
│   └── integration/                        # Cross-layer / E2E
├── reports/                                # Generated reports (gitignored)
├── scripts/                                # CI helper scripts
│   ├── run-smoke.sh                        # Smoke suite runner
│   └── run-regression.sh                   # Full regression runner
├── docs/                                   # This documentation
│   ├── CONVENTIONS.md                      # Naming, POM rules, fixtures, locators
│   ├── FRAMEWORK-ONBOARDING.md             # End-to-end guide for new QA engineers
│   ├── PROJECT-STRUCTURE.md                # This file
│   └── RUNNING-TESTS.md                    # CLI commands, env vars, reports
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── .editorconfig
├── .env.example
└── README.md
```

## Responsibilities

| Folder / file | Purpose |
|---------------|---------|
| **.github/workflows/** | CI/CD pipeline: lint, typecheck, smoke tests on PR; regression on main. |
| **config/** | All environment-specific values and timeouts. No env branching inside tests; use config injection. |
| **config/constants.ts** | `ELEMENT_TIMEOUT`, `NAVIGATION_TIMEOUT`, etc. Single source for timeouts. |
| **config/env/** | Base URL resolver and env config type. Loaded by `TEST_ENV`. |
| **src/pages/** | One class per page; locators and interactions only; no assertions. |
| **src/components/** | Reusable UI fragments (header, modals) composed by pages. |
| **src/api/** | Typed API clients for setup, teardown, or API-layer assertions. |
| **src/data/** | Test data builders, factories, and constants. |
| **src/utils/** | Logger, retries, file I/O. |
| **src/fixtures/** | Playwright fixtures (e.g. `homePage`) and static data files. All tests import `test` from here. |
| **src/hooks/** | Global before/after, custom reporters. |
| **tests/ui/** | UI test specs organized by feature. |
| **tests/smoke/** | Fast critical-path suite; run on every commit. |
| **tests/integration/** | Cross-layer or E2E flows. |
| **scripts/** | `run-smoke.sh`, `run-regression.sh` for CI. |
