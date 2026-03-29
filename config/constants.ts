/**
 * Central timeout and framework constants.
 * No magic numbers in tests or page objects — reference these values.
 *
 * Only export constants that are actively used. Add new constants here
 * when needed and reference them in playwright.config.ts or page objects.
 */

/** How long to wait for an individual element action (click, fill, etc.). */
export const ELEMENT_TIMEOUT = 15_000;

/** How long to wait for page navigation to complete. */
export const NAVIGATION_TIMEOUT = 30_000;

/** How long to wait for an API response in API-layer tests. */
export const API_RESPONSE_TIMEOUT = 10_000;

/**
 * Default environment when `TEST_ENV` is not set.
 * Prefer **qa** over prod so a plain `npm test` without `.env` does not hit production.
 * Set `TEST_ENV=prod` explicitly when you intend to run against production.
 */
export const DEFAULT_ENV = 'qa';
