# Framework onboarding: end-to-end guide

This document explains how the Playwright test framework is structured and why it is designed this way. It is written for QA engineers with basic programming knowledge who need to understand, run, and extend the tests.

---

## 1. What this framework is

- **Technology:** [Playwright](https://playwright.dev/) for browser automation, written in **TypeScript**.
- **Purpose:** Run UI tests against web applications (e.g. the CRDC Submission Portal) in a repeatable way.
- **Design goals:** Tests should be easy to read, easy to maintain, and independent of environment (no hardcoded URLs or timeouts). When the UI changes, we want to update one place (the page object), not every test.

When you run a test, Playwright starts a browser, navigates to the app, performs actions (click, type), and checks that the page looks or behaves as expected. This document walks through where each part of that flow lives in the project.

---

## 2. High-level flow: from command to result

When you run `npm run test:crdc`:

1. **Playwright** reads `playwright.config.ts` and sees which tests to run and which **project** (e.g. `crdc-home`) to use. The project defines things like which browser and **base URL** (e.g. `https://hub.datacommons.cancer.gov`).

2. For each test file (e.g. `tests/ui/crdc-home.spec.ts`), Playwright reads the test suite. Instead of tests manually creating page objects, they rely on **fixtures**. When a test runs, the fixture automatically builds the necessary page object (e.g., `homePage`) and injects it. Before each test, Playwright runs the **beforeEach** hook if the suite defines one (e.g. uses the injected page to go to the homepage and dismiss the warning dialog).

3. The test uses the injected **page object** (e.g. `homePage`). The page object knows how to find elements (links, buttons, dialogs) and how to perform actions (navigate, click Continue). The test itself only calls those methods and then **asserts** (e.g. “this heading should be visible”, “the URL should match auth.nih.gov”).

4. **Configuration** (timeouts, base URL) comes from `config/` and from environment variables, not from numbers or URLs written inside the test.

5. When a test fails, Playwright can capture a **screenshot** and a **trace** so you can see what the page looked like and what was clicked. Reports are written to `playwright-report/` and can be opened with `npm run report`.

So: **config** drives where and how we run; **page objects** encapsulate the UI; **tests** orchestrate actions and assertions; **reports** help you debug.

---

## 3. Directory structure and why it’s organized this way

```
playwright-framework-vl/
├── config/           # All configuration: timeouts, environments, base URLs
├── src/
│   ├── pages/       # Page Object Model: one class per page/screen
│   ├── fixtures/    # Shared test setup (e.g. custom fixtures)
│   └── utils/       # Helpers (logging, etc.)
├── tests/
│   ├── ui/          # UI test specs by feature (e.g. crdc-home.spec.ts)
│   ├── smoke/       # Short critical-path suite for quick checks
│   └── integration/ # Cross-feature or E2E flows
├── scripts/         # Shell scripts for CI (e.g. run smoke only)
├── docs/            # This documentation and other guides
├── playwright.config.ts   # Playwright entry point: projects, timeouts, reporters
├── package.json     # Dependencies and npm scripts
└── .env.example     # Template for environment variables (copy to .env)
```

**Why separate these?**

- **Config in one place:** So we can change timeouts or the base URL without searching through tests. It also lets us support multiple environments (prod, qa, stage, qa2) by switching `TEST_ENV` or the Playwright project.
- **Page objects in `src/pages`:** So all locators and UI actions for a given page live in one class. If a button’s text or test id changes, we update the page object once and all tests that use it stay valid.
- **Tests in `tests/`:** So test logic (what to do and what to expect) stays in spec files, and we don’t put assertions inside page objects. That keeps responsibilities clear: pages “do” things, tests “check” outcomes.
- **Scripts in `scripts/`:** So CI or developers can run a standard set of commands (e.g. smoke only) without remembering long `npx playwright test ...` invocations.

---

## 4. Configuration: where values come from

### 4.1 Timeouts and constants (`config/constants.ts`)

All timeouts are defined in one file so we never scatter “magic numbers” (e.g. `15000`) in tests or page objects:

- `ELEMENT_TIMEOUT` — how long to wait for an element (e.g. button) to be ready.
- `NAVIGATION_TIMEOUT` — how long to wait for a page load.
- `PAGE_LOAD_TIMEOUT`, `API_RESPONSE_TIMEOUT` — for other operations.

`playwright.config.ts` imports these and sets `actionTimeout` and `navigationTimeout`. If a step takes longer than the configured time, the test fails with a clear timeout instead of hanging.

### 4.2 Environments (`config/env/`)

Different environments have different **base URLs**. The file `config/env/urls.ts` acts as the single source of truth, mapping `TEST_ENV` strings to URL strings. The resolver uses the `TEST_ENV` variable (or a default) to instantly return the correct URL for the Playwright Config to use. Available profiles include:

- **prod** — CRDC hub production: `https://hub.datacommons.cancer.gov` (default).
- **qa** — CRDC hub QA: `https://hub-qa.datacommons.cancer.gov`.
- **stage** — CRDC hub stage: `https://hub-stage.datacommons.cancer.gov`.
- **qa2** — CRDC hub QA2: `https://hub-qa2.datacommons.cancer.gov`.

Tests don’t branch on “if staging do X”; they just use the injected base URL (e.g. via the Playwright project’s `baseURL`).

### 4.3 Playwright projects (`playwright.config.ts`)

A **project** is a named configuration: which browser, which base URL, which test files, and optionally a custom timeout. For example:

- **chromium / firefox / webkit:** Default projects that run all tests with the default base URL (from `process.env.BASE_URL` or a fallback).
- **crdc-home:** Uses Chrome and a fixed base URL for the CRDC hub, and only runs tests matching `crdc-home.spec.ts`. It also sets a longer test timeout so heavy pages have time to load.

So when you run `npm run test:crdc`, you’re running the `crdc-home` project: same tests, but with the CRDC base URL and timeout applied.

---

## 5. Page Object Model (POM): why we use it

Instead of putting long selectors and repeated “click this, then that” logic inside every test, we use **page objects**: one class per page (or major area) of the app.

**What a page object does:**

- Holds **locators** (how to find elements: by role, by test id, by text). These are defined once at the top of the class.
- Exposes **methods** that perform actions (e.g. `gotoHome()`, `dismissSystemUseWarning()`, `ensureSystemUseWarningDismissed()`). Methods may return another page object or nothing; they do **not** assert.
- Optionally exposes **getters** that return locators so the test can assert on them (e.g. `getMainHeading()`, `getSystemUseDialog()`).

**What a page object does not do:**

- It does **not** contain assertions (no `expect`). Assertions live in the test. That way the page object stays a description of the UI and its actions; the test stays the specification of what should be true.

**Base page (`src/pages/base.page.ts`):**

All page classes extend `BasePage`. The base class receives the Playwright `page` and provides a shared `goto(path, options)` method so we can navigate with a consistent pattern (e.g. optional `waitUntil: 'domcontentloaded'` for heavy pages). New pages add their own locators and methods on top of this.

**Example: `HomePage` (`src/pages/home.page.ts`):**

- Defines locators for the CRDC hub homepage: government banner, nav links, main heading, Log In link, footer sections, system use warning dialog (by `data-testid`), and Continue button.
- Methods: `gotoHome()`, `dismissSystemUseWarning()`, `ensureSystemUseWarningDismissed()`.
- Getters like `getMainHeading()`, `getSystemUseDialog()` return locators so tests can do `expect(homePage.getMainHeading()).toBeVisible()`.

When the CRDC UI changes (e.g. a new test id or label), we update `HomePage` in one place; the spec file only cares about “go home, dismiss warning, check that the heading is visible.”

---

## 6. Tests: what they do and how they’re written

Test files live under `tests/`: `tests/ui/` for feature-focused UI tests, `tests/smoke/` for a small critical-path suite.

**Structure of a typical spec file:**

1. **Imports:** `test` and `expect` from `src/fixtures/test.fixture` (not from `@playwright/test` directly — the custom fixture injects page objects like `homePage`).
2. **describe block:** `test.describe('CRDC Hub Homepage', () => { ... })` groups tests and can share a **beforeEach**.
3. **beforeEach:** Runs before every test in the suite. For the CRDC homepage suite, it uses the injected `homePage` fixture to navigate to the hub and calls `ensureSystemUseWarningDismissed()` so every test runs with the warning dialog already closed. That way tests don't have to repeat "dismiss dialog" and don't accidentally depend on the dialog still being open.
4. **Individual tests:** Each `test('should ...', async ({ page, homePage }) => { ... })` destructures the fixtures it needs. The `homePage` fixture is automatically created by the framework — no need to call `new HomePage(page)`. Test names follow a "should [expected behavior]" style so the report is readable.

**How test steps are written (async/await and TypeScript):**

If you are new to TypeScript or to the style of code in the specs, here is what the common patterns mean.

- **`async` and `await`:** Browser actions (click, type, navigate) take time. In JavaScript/TypeScript we treat them as **asynchronous**: the test doesn’t block the whole program, it “waits” for that step to finish before moving to the next. A function that does such work is marked **`async`**. Inside it, we put **`await`** in front of any call that returns a Promise (e.g. “when this finishes, continue”). So when you see:
  - `await homePage.gotoHome();` — it means “go to the homepage and wait until the navigation is done before running the next line.”
  - `await expect(homePage.getMainHeading()).toBeVisible();` — it means “wait until the main heading is visible (or the timeout is reached), then continue.”
  Without `await`, the next line would run before the click or navigation finished, and the test could become flaky or fail in a confusing way. So **every step that does something in the browser or waits for a condition is awaited.**

- **`async ({ page, homePage }) => { ... }`:** The test function is **async** (so we can use `await` inside it). Playwright passes in an object of **fixtures**; here we **destructure** it to get `page` and `homePage`. The `homePage` fixture is defined in `src/fixtures/test.fixture.ts` — it automatically creates a `new HomePage(page)` for each test, so you don't have to. The `page` is the browser tab the test runs in.

- **TypeScript:** Types (e.g. `Page`, `Locator`) help the editor and the compiler catch mistakes; you don’t have to write types everywhere because they are often inferred. In the specs we mostly write straightforward code; the page objects and Playwright APIs are already typed.

- **Order of steps:** A typical test reads like a short script: “set up the page object, perform one or more actions (each awaited), then assert (each awaited).” For example: navigate, then wait for and dismiss the dialog, then assert that a heading is visible. The `await`s ensure that the steps run in order and that each step completes before the next one starts.

**Important conventions:**

- **No assertions in page objects.** The test is the only place that checks outcomes.
- **Prefer user-facing locators:** `getByRole('button', { name: 'Continue' })`, `getByTestId('system-use-warning-dialog')`, instead of fragile CSS or XPath that breaks when the DOM structure changes.
- **No hard waits** (e.g. arbitrary `setTimeout`) unless there’s a documented reason. We use Playwright’s built-in waiting (e.g. `expect(locator).toBeVisible({ timeout: 15000 })`) and methods like `ensureSystemUseWarningDismissed()` that wait for the dialog then act.
- **Comment above each test** describing what it verifies, so a reader can understand intent without decoding the code.

One test (“should show system use warning dialog before continuing”) needs to see the dialog on a fresh load. Because **beforeEach** already runs and dismisses the dialog on the default page, that test uses a **new browser context** (and new page) so that sessionStorage is empty and the dialog appears. It then asserts that the dialog and Continue button are visible, dismisses the dialog, and asserts it closes. This shows how we adapt to app behavior (dialog only when sessionStorage is empty) without changing the rest of the suite.

---

## 7. Fixtures and hooks (optional reading)

**Fixtures** are a way to inject shared setup into tests. The framework has a custom fixture in `src/fixtures/test.fixture.ts` that extends Playwright's default `test` and injects page objects:

- **`homePage`** — A `HomePage` instance, ready to use. Tests destructure it: `async ({ homePage }) => { ... }`.
- To add more page objects (e.g. `loginPage`, `dashboardPage`), add them to the `Fixtures` type and the `extend` block in `test.fixture.ts`.

**All test files must import `test` and `expect` from `src/fixtures/test.fixture`**, not from `@playwright/test`. This ensures every test receives the injected fixtures.

**beforeEach / afterEach** are lifecycle hooks that run before or after each test in a `test.describe` block. We use **beforeEach** in the CRDC suite to go to the hub and dismiss the warning so tests start from a consistent state.

---

## 8. Running tests and viewing results

- **CRDC hub homepage tests:** `npm run test:crdc` (headless) or `npm run test:crdc:headed` (browser visible).
- **All tests:** `npm test`.
- **Smoke only:** `npm run test:smoke` or `./scripts/run-smoke.sh`.
- **Debug:** `npm run test:debug` to step through with the Playwright inspector.
- **Report:** After a run, `npm run report` opens the HTML report (screenshots, traces, and which tests passed or failed).

Environment variables that matter:

- `BASE_URL` — overrides the base URL used by the default Playwright project.
- `TEST_ENV` — selects which env config to load (local, dev, staging, crdc).
- `CI` — when set (e.g. in CI), Playwright can enable retries and use fewer workers.

Copy `.env.example` to `.env` and set values as needed; don’t commit `.env`.

More detail: see **docs/RUNNING-TESTS.md**.

---

## 9. Adding a new test or a new page

**Adding a new test to an existing suite (e.g. CRDC homepage):**

1. Open the spec file (e.g. `tests/ui/crdc-home.spec.ts`).
2. Add a short comment above the test describing what it verifies.
3. Add a `test('should ...', async ({ homePage }) => { ... })` that uses the injected page object (`homePage`) to perform actions and `expect(...)` to assert. Reuse existing getters/methods where possible; if you need a new element, add a locator and optionally a getter in the page object first.

**Adding a new page (e.g. Login page):**

1. Create a new class in `src/pages/` that extends `BasePage` (e.g. `login.page.ts` with `LoginPage`).
2. Define locators (private/readonly) at the top, using `getByRole`, `getByTestId`, or `getByText` as appropriate.
3. Add methods for actions (e.g. `enterEmail`, `clickSubmit`) and getters for elements the test will assert on. No `expect` inside the page object.
4. Update `src/fixtures/test.fixture.ts` to add your new `loginPage` to the `Fixtures` type and `extend` block.
5. In the spec, just destructure your new fixture: `async ({ loginPage }) => { ... }` and call its methods and getters.

**Adding a new suite (e.g. a new feature area):**

1. Add a new spec file under `tests/ui/` (e.g. `login.spec.ts`).
2. Use `test.describe` and, if needed, `beforeEach` to set up a shared state (e.g. navigate to login page).
3. If the app has multiple environments, you can add a new project in `playwright.config.ts` (like `crdc-home`) that sets `baseURL` and `testMatch` for that suite.

---

## 10. Summary and where to read more

- **Config** (`config/`) centralizes timeouts and environments so tests stay environment-agnostic.
- **Page objects** (`src/pages/`) hold locators and actions per page; tests only orchestrate and assert.
- **Tests** (`tests/`) are organized by feature (ui, smoke, integration) and use clear names and comments.
- **Playwright config** defines projects (browsers, base URL, which tests) and applies constants for timeouts and reporting.

**Other docs in this repo:**

- **docs/PROJECT-STRUCTURE.md** — Folder tree and responsibility of each directory.
- **docs/CONVENTIONS.md** — Naming, POM rules, locator strategy, waits, test data.
- **docs/RUNNING-TESTS.md** — Commands, environment variables, reports, CRDC POC.

The **.cursor/rules/sdet-framework-standards.md** file (if present) describes the SDET standards and principles that guided this design; it’s useful for understanding the “why” behind the rules in CONVENTIONS and this guide.
