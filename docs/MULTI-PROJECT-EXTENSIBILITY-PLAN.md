# Multi-Project and Multi-Environment Extensibility Plan

This document describes how to evolve the framework from a single-application (CRDC) setup to a **multi-project, multi-environment** model. The goal is to use **one repository** to orchestrate test runs for many different projects (e.g. CRDC and a dozen others), each with its own environments (prod, qa, stage, etc.), similar to Katalon’s profile/suite model—run the right suite for the right project and environment without maintaining separate repos.

**Status:** Plan only. Not yet implemented. Use this as a reference for team discussion and future implementation.

---

## 1. Goal and motivation

- **One repo** — Single codebase for shared framework, config, and conventions; one CI pipeline and one place to add dependencies and tooling.
- **Many projects** — Support multiple applications (e.g. CRDC Submission Portal, Project B, Project C). Not all may be automatable; only those with tests need a “profile.”
- **Many environments per project** — Each project can have its own envs (e.g. CRDC: prod, qa, stage, qa2; Project B: prod, staging). Select env at run time (e.g. `TEST_ENV=qa`).
- **Orchestrated runs** — Run a specific “profile” (e.g. “CRDC homepage tests,” “Project B regression”) for a specific environment via CLI or CI, e.g. `npm run test:crdc` or `PROJECT=project-b TEST_ENV=staging npx playwright test --project=project-b-regression`.

No need to create separate repos per project; this repo becomes the central test automation hub.

---

## 2. Current state and limitations

### What works today

- **Playwright projects** — One project (`crdc-homepage`) already defines baseURL, testMatch, and timeout. Playwright supports many projects; selection is via `--project=name`.
- **Environments** — `TEST_ENV` (prod, qa, stage, qa2) plus `getCrdcBaseURL()` provide multi-env for a single app.
- **Layout** — `tests/ui/`, `tests/smoke/`, `tests/integration/`, page objects, and fixtures can accommodate more specs and apps.
- **Scripts** — `npm run test:crdc` runs one project; the pattern can be repeated for other projects.

### What is limiting

| Area | Current behavior | Limitation |
|------|------------------|------------|
| **Config** | `config/env/urls.ts` exposes only `getCrdcBaseURL()`. No concept of “which app.” | Cannot resolve base URL (or other config) per project/app. |
| **Default baseURL** | Global `use.baseURL` in `playwright.config.ts` is CRDC. | With multiple apps, default should depend on which project (or app) is running. |
| **Env vars** | Only `TEST_ENV` and `BASE_URL`. | Need a way to select app/project (e.g. `PROJECT` or `APP`) when resolving URLs. |
| **Fixtures** | Single shared fixture with `homePage` (CRDC). | Other apps may need different page objects; design choice: add more fixtures per app vs. minimal fixture and construct POMs in specs. |
| **Scripts** | Only `test:crdc` and `test:crdc:headed`. | Need scripts or conventions for running other projects and envs. |
| **Docs** | Onboarding and running guides assume CRDC. | Need to document PROJECT, multi-app env matrix, and “how to add a project.” |

---

## 3. Target architecture

### 3.1 Concepts

- **Project (app)** — A named application under test (e.g. `crdc`, `project-b`). Used to look up base URL and env-specific config. Selected via env var (e.g. `PROJECT=crdc`).
- **Environment** — A named environment for that project (e.g. prod, qa, stage). Selected via existing `TEST_ENV`. Each project can define its own set of envs and URLs.
- **Playwright project** — A runnable “profile” in `playwright.config.ts` (e.g. `crdc-homepage`, `project-b-regression`). Each has a `name`, `baseURL`, `testMatch` (and optionally `testDir`), and any project-specific options. One app can have multiple Playwright projects (e.g. crdc-homepage, crdc-smoke).
- **Base URL resolution** — For a given run, base URL is determined by: `PROJECT` (or derived from Playwright project name) + `TEST_ENV`, with optional `BASE_URL` override.

### 3.2 Env var model (proposed)

| Variable | Purpose | Example |
|----------|---------|---------|
| `PROJECT` | Which application (used for URL/config lookup). | `crdc`, `project-b` |
| `TEST_ENV` | Which environment for that application. | `prod`, `qa`, `stage` |
| `BASE_URL` | Override base URL for the run (overrides project+env). | `https://custom.example.com` |

Resolution order: if `BASE_URL` is set, use it; else use the URL for `PROJECT` + `TEST_ENV` from the config map. Defaults: e.g. `PROJECT=crdc`, `TEST_ENV=prod` when unset.

### 3.3 Config shape (proposed)

- **Central app/env → URL map** — One place (e.g. `config/apps/` or a single `config/apps.ts`) that defines, per app, the list of envs and their base URLs. Example:

  ```ts
  // Conceptual: not implemented
  const APP_URLS: Record<string, Record<string, string>> = {
    crdc: {
      prod: 'https://hub.datacommons.cancer.gov',
      qa: 'https://hub-qa.datacommons.cancer.gov',
      stage: 'https://hub-stage.datacommons.cancer.gov',
      qa2: 'https://hub-qa2.datacommons.cancer.gov',
    },
    'project-b': {
      prod: 'https://app-b.example.com',
      staging: 'https://staging-b.example.com',
    },
  };
  ```

- **Single resolver** — e.g. `getBaseURL(project?: string): string` that reads `PROJECT` (or uses the passed-in project), `TEST_ENV`, and `BASE_URL`, and returns the appropriate URL. Playwright projects would call this (e.g. `getBaseURL('crdc')` for CRDC projects).

### 3.4 Playwright projects (proposed)

- **Default / shared projects** — Optional: keep `chromium`, `firefox`, `webkit` for generic runs; their baseURL could come from `getBaseURL(process.env.PROJECT)` so they run against the selected app.
- **Per-app projects** — For each automatable app, define one or more projects, e.g.:
  - `crdc-homepage` — testMatch: `crdc-homepage.spec.ts`, baseURL: `getBaseURL('crdc')`
  - `crdc-smoke` — testMatch: smoke specs that target CRDC, baseURL: `getBaseURL('crdc')`
  - `project-b-regression` — testMatch: `tests/project-b/**/*.spec.ts` (or similar), baseURL: `getBaseURL('project-b')`

Each project’s baseURL is resolved at config load time using current env vars, so `PROJECT` and `TEST_ENV` (and optional `BASE_URL`) control where tests run.

### 3.5 Test and source layout (proposed)

- **Option A (current-style)** — Keep all specs under `tests/ui/`, `tests/smoke/`, `tests/integration/` and distinguish by file/dir naming (e.g. `crdc-homepage.spec.ts`, `project-b-dashboard.spec.ts`). Playwright projects use `testMatch` to include the right files.
- **Option B (per-app dirs)** — Add subdirs per app, e.g. `tests/crdc/`, `tests/project-b/`. Each Playwright project uses `testDir` + `testMatch` or just `testMatch` with a path pattern. Eases organization when many projects exist.

Choose one convention and document it; both are compatible with the config model above.

### 3.6 Fixtures (proposed)

- **Option A** — Extend the shared fixture with more page objects as apps are added (e.g. `homePage`, `projectBDashboardPage`). Simple but can become a long list if there are many apps.
- **Option B (recommended for many projects)** — Keep the shared fixture minimal (e.g. only CRDC’s `homePage` or a small set of shared pages). For other apps, specs in that app’s suite construct their own page objects and rely on `page` and the project’s `baseURL`. No need to register every app in the fixture.

---

## 4. What needs to change or be added

### 4.1 Config layer

| Item | Current | Change / addition |
|------|---------|-------------------|
| **App/env URL map** | Only CRDC in `config/env/urls.ts` | Add a central map (e.g. in `config/apps.ts` or `config/apps/index.ts`) that defines, per app, env names and base URLs. Migrate CRDC URLs into this map. |
| **URL resolver** | `getCrdcBaseURL()` in `config/env/urls.ts` | Add `getBaseURL(project?: string): string` that uses `PROJECT` (or argument), `TEST_ENV`, and `BASE_URL`. Keep or deprecate `getCrdcBaseURL()` (e.g. thin wrapper that calls `getBaseURL('crdc')`). |
| **Env types** | `EnvConfig` in `config/env/types.ts` | Optionally extend or add an “app config” type (e.g. per-app env list, optional apiBaseURL, timeouts). Not strictly required for first phase. |
| **Constants** | `DEFAULT_ENV` in `config/constants.ts` | Add `DEFAULT_PROJECT` (e.g. `'crdc'`) and use it when `PROJECT` is unset. |

### 4.2 Playwright config

| Item | Current | Change / addition |
|------|---------|-------------------|
| **Default baseURL** | `getCrdcBaseURL()` | Use `getBaseURL()` (no arg or `process.env.PROJECT`) so the default follows the selected project. |
| **CRDC project** | `crdc-homepage` with `getCrdcBaseURL()` | Switch to `getBaseURL('crdc')` (or keep `getCrdcBaseURL()` as a wrapper). |
| **New projects** | N/A | For each new app, add one or more projects with appropriate `name`, `testMatch` (and optionally `testDir`), `baseURL: getBaseURL('app-id')`, and timeouts/settings. |
| **Docs comment** | Inline | Brief comment that baseURL is resolved from PROJECT + TEST_ENV via `getBaseURL()`. |

### 4.3 Fixtures

| Item | Current | Change / addition |
|------|---------|-------------------|
| **Shared fixture** | `homePage` (CRDC) | Either add more page objects per app (Option A) or keep minimal and let app-specific specs create their own POMs (Option B). Document the chosen approach. |

### 4.4 Tests and page objects

| Item | Current | Change / addition |
|------|---------|-------------------|
| **Layout** | `tests/ui/crdc-homepage.spec.ts`, etc. | Either keep naming convention (e.g. `project-b-*.spec.ts`) or add `tests/<app>/` dirs. Document convention. |
| **New apps** | N/A | For each new app: add specs (and optionally page objects under `src/pages/` or `src/pages/<app>/`), and a Playwright project that matches those specs and uses `getBaseURL('<app>')`. |

### 4.5 Scripts and CLI

| Item | Current | Change / addition |
|------|---------|-------------------|
| **package.json** | `test:crdc`, `test:crdc:headed` | Add scripts for other projects, e.g. `test:project-b`, `test:project-b:headed`. Optionally add a generic script that takes project name (e.g. `npm run test:project -- project-b`) if desired. |
| **Shell scripts** | `run-smoke.sh`, `run-regression.sh` | Optionally accept PROJECT and pass it through (e.g. `PROJECT=crdc ./scripts/run-smoke.sh`). Document how to run a given project + env. |
| **.env.example** | TEST_ENV, BASE_URL | Add `PROJECT` with a short comment. |

### 4.6 Documentation

| Item | Current | Change / addition |
|------|---------|-------------------|
| **This plan** | N/A | Keep this document; update “Status” when work is done. |
| **RUNNING-TESTS.md** | Describes TEST_ENV, BASE_URL, CRDC | Add PROJECT; describe multi-project runs and examples (e.g. `PROJECT=project-b TEST_ENV=staging npx playwright test --project=project-b-regression`). |
| **FRAMEWORK-ONBOARDING.md** | CRDC-centric | Add a short “Multiple projects and environments” section: PROJECT vs TEST_ENV, how baseURL is resolved, how to run a specific project. |
| **PROJECT-STRUCTURE.md** | Single app | Mention `config/apps` (or equivalent) and optional `tests/<app>/` layout; list Playwright projects as “profiles.” |
| **CONVENTIONS.md** | N/A | Optional: add convention for naming specs or dirs per app, and for adding a new project (checklist below). |

---

## 5. Implementation phases (suggested)

**Phase 1 — Config and resolver (no new apps yet)**  
- Add central app/env URL map; move CRDC URLs into it.  
- Add `getBaseURL(project?: string)` and `DEFAULT_PROJECT`; keep `getCrdcBaseURL()` as wrapper.  
- Update `playwright.config.ts` to use `getBaseURL()` for default and for `crdc-homepage`.  
- Update `.env.example` and RUNNING-TESTS.md with `PROJECT`.  
- No change to existing tests or fixtures.

**Phase 2 — Second project (proof of concept)**  
- Add one more app (e.g. “project-b”) to the URL map with at least one env.  
- Add a Playwright project (e.g. `project-b-regression`) and a minimal spec (or placeholder) plus testMatch.  
- Add `npm run test:project-b` (and optionally headed).  
- Update docs (onboarding, RUNNING-TESTS, this plan) with multi-project examples.

**Phase 3 — Conventions and scaling**  
- Decide and document test layout (Option A vs B) and fixture strategy (Option A vs B).  
- Add “Adding a new project” checklist (see below).  
- Optionally add scripts that accept PROJECT or project name.  
- Extend PROJECT-STRUCTURE and CONVENTIONS.

**Phase 4 (optional)** — Per-app config and CI  
- If needed: per-app timeouts, apiBaseURL, or other options.  
- CI: matrix or jobs that run by PROJECT and TEST_ENV (e.g. “run crdc-homepage on qa,” “run project-b-regression on staging”).  

---

## 6. Checklist: adding a new project

Use this when the team adds support for a new application.

1. **Config**  
   - [ ] Add the app to the central URL map (e.g. `config/apps.ts`) with all environments and base URLs.

2. **Playwright config**  
   - [ ] Add one or more projects in `playwright.config.ts` with `name`, `baseURL: getBaseURL('app-id')`, `testMatch` (and optionally `testDir`), and any timeout/settings.

3. **Tests**  
   - [ ] Add specs (and optionally page objects) following the chosen layout and naming convention.

4. **Scripts**  
   - [ ] Add npm scripts (e.g. `test:<app>`, `test:<app>:headed`) in `package.json` that run the new project(s).

5. **Docs**  
   - [ ] Update RUNNING-TESTS.md (and optionally FRAMEWORK-ONBOARDING and PROJECT-STRUCTURE) with the new project and how to run it.

6. **Fixtures (if using shared fixture)**  
   - [ ] If the team chose Option A for fixtures, add the new app’s page object(s) to the fixture type and extend block.

---

## 7. Summary

| Topic | Summary |
|-------|---------|
| **Goal** | One repo; many projects (apps); many envs per project; run by “profile” (Playwright project) and env. |
| **Key change** | Generalize config from “CRDC + TEST_ENV” to “PROJECT + TEST_ENV” with a central URL map and `getBaseURL(project)`. |
| **Playwright** | Each runnable profile is a Playwright project; add more projects per app as needed. |
| **Env vars** | Add `PROJECT`; keep `TEST_ENV` and `BASE_URL`. |
| **Fixtures** | Either extend with more page objects per app or keep minimal and use app-specific POMs in specs. |
| **Docs** | Update RUNNING-TESTS, onboarding, structure, and (optionally) CONVENTIONS; keep this plan as the single reference for the multi-project design. |

Implementing the config and resolver (Phase 1) and one extra project (Phase 2) is enough to validate the approach; the rest can follow incrementally as more projects are onboarded.
