# AI Assistant Guidelines for the COMP6 Repository

This document provides essential guidelines for AI assistants interacting with the COMP6 codebase. Adhering to these rules ensures consistency, quality, and adherence to the project's architectural principles.

## Imports (keep this file lean)
- @README
- @docs/ARCHITECTURE.md
- @docs/COMP_RULES_GUIDE.md
- @shared/types.ts

## 1. Project Overview & Repository Layout

This is a monorepo containing a multi-tenant compensation platform. The structure is strictly separated into three main areas:

-   **`/backend`**: A Python/FastAPI application that serves the core business logic, API, and data persistence.
-   **`/frontend`**: A React/TypeScript application that provides the user interface.
-   **`/shared`**: Contains shared TypeScript types to ensure consistency between the frontend and backend.

### Backend (`/backend`)

-   **Framework**: FastAPI
-   **Language**: Python
-   **Database**: SQLite for development (default), PostgreSQL for production (via SQLAlchemy ORM)
-   **Migrations**: Alembic (`/alembic`) is used for all database schema changes.
-   **Key Directories**:
    -   `app/routers`: API endpoint definitions.
    -   `app/services`: Core business logic. Keep routers thin; put logic here.
    -   `app/dal`: Data Access Layer for database interactions.
    -   `app/expression_engine`: The core rules engine. **(High Sensitivity)**

### Frontend (`/frontend`)

-   **Framework**: React
-   **Language**: TypeScript
-   **Build Tool**: Vite
-   **Styling**: Tailwind CSS + Material UI (MUI). Prefer Tailwind utilities for layout/spacing; use existing MUI components where appropriate. Avoid adding new global CSS beyond `index.css`.
-   **Key Directories**:
    -   `src/components`: Reusable UI components.
    -   `src/services`: API client logic for communicating with the backend.
    -   `src/types`: Component-specific or local types.

### Shared (`/shared`)

-   **Purpose**: To maintain a single source of truth for data structures (types) exchanged between the frontend and backend.
-   **Rule**: If you are modifying an API endpoint in the backend that changes a data model, you **must** update the corresponding type in `/shared/types.ts`.

---

## 2. The Expression Engine (High Sensitivity)

The core of the platform's calculation logic resides in the custom DSL (Domain-Specific Language) parser.

-   **Location**: `backend/app/expression_engine/`
-   **Critical File**: `dsl_parser.py`
-   **Primary Rule**: **DO NOT** modify the DSL parser or its logic without explicit instruction and a clear understanding of its system-wide impact. It is the most sensitive and critical part of the backend.
-   **Interaction**: When asked to modify calculation logic, your first approach should be to modify the *expressions* being saved into plans via `plan_management_service.py`, not the engine that processes them.
    -   Prefer the provided validation services/endpoints to validate and analyze expressions rather than editing parser code.

### Expression Engine — Approved Change Path
1) Modify expressions via `app/services/plan_management_service.py` (not the parser).
2) Add/extend table-driven tests (rounding, nulls, division by zero, negative values, tier edges).
3) Provide before/after examples for at least 3 representative plans.
4) If parser changes are unavoidable: submit a design note (diff-free) with risks, test plan, and rollback strategy; get explicit approval before coding.

---

## 3. Testing Standards

All new features and bug fixes must be accompanied by comprehensive tests.

### Backend Testing

-   **Framework**: `pytest`
-   **Location**: Prefer `backend/tests/` mirroring app structure (e.g., `tests/services/test_plan_management_service.py`). Create this tree if missing when adding tests.
-   **Execution**: From the `/backend` directory, run the command:
    ```bash
    pytest
    ```
-   **Convention**: Test files should mirror the application structure. For example, tests for `backend/app/services/plan_management_service.py` should be in `backend/tests/services/test_plan_management_service.py`.

### Frontend Testing

The frontend uses two forms of testing:

1.  **Unit & Component Testing**:
    -   **Framework**: Vitest with React Testing Library.
    -   **Location**: Co-located with components (e.g., `MyComponent.test.tsx`).
    -   **Execution**: From the `/frontend` directory, run:
        ```bash
        npm run test
        ```

2.  **End-to-End (E2E) Testing**:
    -   **Framework**: Playwright.
    -   **Location**: `/frontend/tests-e2e/`.
    -   **Execution**: From the `/frontend` directory, run:
        ```bash
        npm run test:e2e
        ```

> Tip: `npm run test:ui` opens Vitest UI; Playwright config is at `frontend/playwright.config.ts`.

---

## Commands (single source of truth)

### Backend
- Dev server: `uvicorn app.main:app --reload`
- Tests: `pytest`
- Lint/format: `ruff check .` ; `black .`
- Types: `mypy .`

### Frontend
- Dev: `npm run dev`
- Unit tests: `npm run test`
- E2E: `npm run test:e2e`
- Lint: `npm run lint`
- Types: `tsc --noEmit`

---

## PR Template

All pull requests should adhere to the following format to ensure clarity and a consistent review process.

```markdown
# [TYPE]: Brief description of the change

*   **JIRA Ticket**: [Link to JIRA Ticket]

## Description

A clear and concise description of what this PR accomplishes. Explain the "why" behind the change.

## Type of Change

Please check the options that apply.

-   [ ] Bug fix (non-breaking change which fixes an issue)
-   [ ] New feature (non-breaking change which adds functionality)
-   [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
-   [ ] This change requires a documentation update
-   [ ] This change requires a database migration

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

-   [ ] Backend: `pytest`
-   [ ] Frontend: `npm run test`
-   [ ] E2E: `npm run test:e2e`
-   [ ] Manual testing (describe steps)

## Checklist

-   [ ] My code follows the style guidelines of this project
-   [ ] I have performed a self-review of my own code
-   [ ] I have commented my code, particularly in hard-to-understand areas
-   [ ] I have made corresponding changes to the documentation
-   [ ] My changes generate no new warnings
-   [ ] I have added tests that prove my fix is effective or that my feature works
-   [ ] New and existing unit tests pass locally with my changes
```

---

## API Design & Error Handling

- Use appropriate HTTP status codes (4xx/5xx) for failures and return structured responses. Avoid `200 OK` with `success: false` except for known compatibility paths.
- Standardize responses via `ApiResponse`/`PlatformApiResponse` with `success`, `message`, `data`, and optional `error`.
- Keep routers thin (validation/orchestration). Place business logic in services.
- Make pagination/sorting/filtering explicit and validated via `Query` params.

## Multi‑Tenancy Guidelines

- Always propagate the tenant context via `X-Tenant-ID` from the frontend (Axios interceptor recommended). For dev, a `tenant_id` query param may be accepted where documented.
- In the backend, prefer `get_tenant_db_session(request)` for tenant-scoped operations; do not bypass tenant context.
- Respect RLS and DAL usage; avoid raw SQL that bypasses policy enforcement.

## What I Expect From Claude
- For multi-file or risky changes: propose a short plan first and give 2–3 options with trade-offs.
- Prefer minimal, targeted diffs with inline rationale.
- Tests-first for behavior changes (red→green), then implementation.
- Update `/shared/types.ts` and related docs when API shapes change.
- Never hard-code secrets; use env/config helpers only.
- For compensation logic: enumerate edge cases and add table-driven tests.

## PR & Change Management

- Keep diffs minimal and scoped. Avoid broad refactors unless requested.
- Prefer adding logic in services; keep routers focused on request/response.
- Avoid introducing new dependencies without justification and alignment with the existing stack.
- For sensitive areas (expression engine, migrations), seek explicit approval.

---

## Data Privacy & Security Rules

Protecting tenant and employee data is the highest priority. Failure to follow these rules is a critical error.

1.  **No PII in Logs**: Never log, print, or expose Personally Identifiable Information (PII) such as employee names, salaries, or personal details in any logs or exception messages. Always use non-identifiable IDs (e.g., `employee_id`, `user_id`) for tracking and debugging.

2.  **Respect Tenant Isolation**: The backend uses Row-Level Security (RLS) policies to enforce strict data isolation between tenants. All database queries **must** go through the Data Access Layer (`/backend/app/dal`) to ensure these policies are applied. Never write raw SQL queries that bypass the DAL.

3.  **Use Synthetic Data for Tests**: All test data, whether for automated tests or manual examples, must be synthetic and non-identifiable. Use placeholder names like "John Doe" or "Jane Smith" and randomized, unrealistic data for sensitive fields.

4.  **API Boundary is Sacred**: The frontend must only interact with the backend via the defined RESTful API. There should never be any attempt to directly access the database or other backend resources from the frontend.
5.  **CORS & Secrets**: Use permissive CORS only in development. Restrict `allow_origins` in production. Never commit secrets; use environment variables and documented config.
6.  **Uploads & Exports**: Enforce server-side size/type limits for uploads. Prefer server-side PDF/XLSX exports for consistency and auditability.

---

## Review Checklist
- [ ] Tests updated/added and passing (pytest, Vitest, Playwright as applicable)
- [ ] Shared types in `/shared/types.ts` synced with any API changes
- [ ] Security & multi-tenant boundaries preserved (DAL/RLS; no raw SQL)
- [ ] Docs updated (README / ARCHITECTURE / RULES GUIDE)
- [ ] Performance implications considered (large CSVs, N+1)
