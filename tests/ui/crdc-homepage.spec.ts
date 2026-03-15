/**
 * CRDC Submission Portal homepage tests.
 * Run: npm run test:crdc (or npx playwright test --project=crdc-homepage).
 * Base URL comes from TEST_ENV (prod | qa | stage | qa2) or BASE_URL override.
 * Uses HomePage page object via fixture injection; assertions in tests only.
 * beforeEach navigates to the hub and dismisses the system use warning dialog
 * so tests run against the main content.
 */
import { test, expect } from '../../src/fixtures/test.fixture';
import { getCrdcBaseURL } from '../../config/env/urls';
import { HomePage } from '../../src/pages/home.page';

test.describe('CRDC Hub Homepage', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.gotoHome();
    // Wait for warning dialog to appear (React useEffect), then dismiss so tests run behind it
    await homePage.ensureSystemUseWarningDismissed();
  });

  /**
   * Asserts the document title is "CRDC Submission Portal".
   * Tags: use -g / --grep to run (e.g. npx playwright test --grep @regression or --grep @CRDCDH-1234).
   */
  test('Test - Should display correct page title', { tag: ['@CRDCDH-1234', '@regression'] }, async ({ page }) => {
    await expect(page).toHaveTitle('CRDC Submission Portal');
  });

  /**
   * Asserts the main H1 "Login to CRDC Submission Portal", the Login.gov
   * prompt text, and the "Log In" link are visible.
   */
  test('Test - Should display main heading and login prompt', { tag: ['@CRDCDH-1235', '@regression', '@smoke'] }, async ({
    page,
    homePage,
  }) => {
    await expect(homePage.getMainHeading()).toBeVisible();
    await expect(
      page.getByText(/Please login with a Login.gov account/, { exact: false })
    ).toBeVisible();
    await expect(homePage.getLoginLink()).toBeVisible();
  });

  /**
   * Asserts all top-level nav items are visible: Submission Requests, Data
   * Submissions, Data Explorer, Documentation, Model Navigator, Login.
   */
  test('should show primary navigation links', async ({ homePage }) => {
    await expect(homePage.getNavSubmissionRequests()).toBeVisible();
    await expect(homePage.getNavDataSubmissions()).toBeVisible();
    await expect(homePage.getNavDataExplorer()).toBeVisible();
    await expect(homePage.getNavDocumentation()).toBeVisible();
    await expect(homePage.getNavModelNavigator()).toBeVisible();
    await expect(homePage.getNavLogin()).toBeVisible();
  });

  /**
   * Asserts the US government banner text "An official website of the United
   * States government" is visible in the header.
   */
  test('should show government banner', async ({ homePage }) => {
    await expect(homePage.getGovBanner()).toBeVisible();
  });

  /**
   * Asserts the footer sections "More Information" and "Policies" are visible.
   */
  test('should show footer with More Information and Policies', async ({
    homePage,
  }) => {
    await expect(homePage.getFooterMoreInfo()).toBeVisible();
    await expect(homePage.getFooterPolicies()).toBeVisible();
  });

  /**
   * Asserts the footer "System Info" section and the "Release Notes" link are
   * visible.
   */
  test('should show System Info and Release Notes in footer', async ({
    homePage,
  }) => {
    await expect(homePage.getFooterSystemInfo()).toBeVisible();
    await expect(homePage.getFooterReleaseNotes()).toBeVisible();
  });

  /**
   * Asserts the system use warning dialog appears on first load, shows a
   * Continue button, and closes after Continue. Uses a fresh browser context so
   * sessionStorage is empty and the dialog is shown (beforeEach already ran and
   * dismissed on the default page).
   */
  test('should show system use warning dialog before continuing', async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: getCrdcBaseURL() });
    const page = await context.newPage();
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const freshHomePage = new HomePage(page);
      await expect(freshHomePage.getSystemUseDialog()).toBeVisible({
        timeout: 15_000,
      });
      await expect(freshHomePage.getDialogContinueButton()).toBeVisible();
      await freshHomePage.dismissSystemUseWarning();
      await expect(freshHomePage.getSystemUseDialog()).not.toBeVisible();
    } finally {
      await context.close();
    }
  });

  /**
   * Clicks the main "Log In" link and asserts navigation to NIH SSO
   * (auth.nih.gov), not a hub path.
   */
  test('should navigate to login when Log In is clicked', async ({
    homePage,
    page,
  }) => {
    await homePage.getLoginLink().click();
    await expect(page).toHaveURL(/auth\.nih\.gov/);
  });
});
