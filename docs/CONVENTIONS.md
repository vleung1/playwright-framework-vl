# Conventions

Naming, POM rules, locator strategy, and where test data and secrets live.

## Naming

- **Test files**: `[feature].spec.ts` (e.g. `login.spec.ts`, `checkout.spec.ts`).
- **Test classes/blocks**: `test.describe('[Feature]', ...)`.
- **Test methods**: `should_[expected behavior]_when_[condition]` or clear BDD-style (e.g. `should display error when credentials are invalid`).
- **Page objects**: `[PageName]Page` (e.g. `LoginPage`, `CheckoutPage`), in `src/pages/`.
- **Constants**: `SCREAMING_SNAKE_CASE`; define in `config/constants.ts` or domain-specific files under `src/data/`.
- **Helper methods**: `camelCase`, descriptive verbs (e.g. `waitForNavigation`, `buildUserPayload`).

## Page Object Model (POM)

- One class per page (or major UI area) in `src/pages/`.
- Extend `BasePage`; receive `Page` in constructor.
- **Locators**: Private or readonly, defined at top of class. Prefer `getByRole`, `getByLabel`, `getByTestId`; avoid brittle CSS/XPath.
- **Action methods**: Perform interactions (click, fill, navigate). Return the next page object or `void`. Use the structured `logger` for traceability.
- **Locator getters**: Methods like `getMainHeading()` that return a Playwright `Locator` are allowed and idiomatic in Playwright. Tests use these with `expect(locator).toBeVisible()`, leveraging Playwright's web-first assertion engine. This differs from Selenium's pattern where returning raw elements is discouraged.
- **No assertions in page objects.** Pages navigate and interact; tests assert.

## Locator strategy

- Prefer **user-facing** attributes: `getByRole('button', { name: 'Submit' })`, `getByLabel('Email')`, `getByTestId('cart-count')`.
- Avoid relying on CSS classes or DOM structure that changes often.
- Use chaining/filtering when needed: `.filter({ hasText: 'Product 2' }).getByRole('button', { name: 'Add' })`.

## Waits and synchronization

- Do **not** use hard waits (e.g. `page.waitForTimeout`) except with a documented justification.
- Use Playwright's built-in auto-waiting and web-first assertions: `await expect(locator).toBeVisible()`.
- Timeouts come from `config/constants.ts`; reference them in config or fixtures, not magic numbers.

## Fixture usage

- All test files must import `test` and `expect` from `src/fixtures/test.fixture.ts`, **not** from `@playwright/test` directly.
- Page objects are injected via fixtures (e.g. `homePage`), not constructed manually in each test.
- Tests that need a fresh browser context (e.g. to test dialog appearance) may construct page objects manually in that context.

## Test data and secrets

- **Test data**: Use `src/fixtures/static/` (JSON, CSV), or factories/builders in `src/data/`. Do not hardcode data inside test methods.
- **Secrets**: Use environment variables or a secrets manager. Never commit credentials; document placeholders in `.env.example`.

## Assertions

- Use the most specific assertion available.
- Include a clear failure message where it helps: `expect(value, 'User role should be ADMIN').toBe('ADMIN')`.
- Use soft assertions when you need to collect multiple failures in one test.

## Tagging and traceability

- Use `test.describe` block names to group tests by feature area.
- Tag tests with the `tag` option (tags must start with `@`), e.g. `test('title', { tag: ['@regression', '@CRDCDH-1234'] }, async ({ page }) => { ... })`. Run by tag with `npx playwright test --grep @regression` or `--grep @CRDCDH-1234`; use `--grep-invert` to exclude tags.
- When possible, include a requirement or story reference in the test description comment.
- Smoke tests go in `tests/smoke/`; feature tests in `tests/ui/`; end-to-end flows in `tests/integration/`.

## Logging

- Use the structured `logger` from `src/utils/logger.ts` instead of `console.log`.
- Log at appropriate levels: `debug` for step-by-step detail, `info` for milestones, `warn` for recoverable issues, `error` for failures.
- Set `LOG_LEVEL` environment variable to control verbosity (default: `info`).
