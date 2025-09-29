# Plan Management Discovery Report

_Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)_

## 1. Repository Context

- **Backend stack:** FastAPI, SQLAlchemy, Pydantic, PostgreSQL/SQLite fallback.
- **Frontend stack:** React + TypeScript (Vite), Material UI, Tailwind utilities, custom services.
- **Shared goal:** Enable compensation plans across batch uploads, scenario modeling, admin workflows.

This report captures the current state of plan-management-related code paths as the foundation for subsequent implementation phases.

## 2. Backend Surfaces (FastAPI)

All plan management endpoints live under `backend/app/routers/plan_management.py` with router prefix `/plan-management` (mounted under `/api/v1`). Key groups:

| Capability | Current Endpoints | Notes |
|------------|------------------|-------|
| Plan CRUD | `GET /plans`, `GET /plans/{id}`, `PUT /plans/{id}` | No `POST /plans` or `DELETE /plans` routes discovered; creation handled elsewhere (needs confirmation). Responses wrapped in `PlatformApiResponse` with nested `plan`/`plans`. |
| Step CRUD | `POST /plans/{id}/steps`, `GET /plans/{id}/steps`, `GET/PUT/DELETE /steps/{step_id}` | Step payload exposes `expr`, `outputs`, optional `condition_expr`. |
| Input management | `POST /plans/{id}/inputs`, `GET /plans/{id}/inputs`, `DELETE /plan-inputs/{input_id}` | Inputs stored via plan service, limited metadata (no labels/types surfaced). |
| Validation utilities | `POST /plans/{id}/validate`, `POST /plans/{id}/reorder-steps`, `POST /plans/{id}/validate-expression` | Validation service verifies expression safety but returns minimal UI-friendly info. |
| Workflow actions | `POST /plans/{id}/submit`, `/approve`, `/lock`, `/archive`, `/revert-to-draft`, `/history`, `/status` | Integration with approval workflow service exists but needs testing + contract doc. |
| Missing features | Compatibility checks, preview execution, template listing, import/export | Not implemented in backend. |

Supporting services/dependencies:

- `PlanManagementService` handles ORM models (`BonusPlan`, `PlanStep`, `PlanInput`).
- `ExpressionValidationService` used for per-step validation.
- `ApprovalWorkflowService` powers submit/approve/lock flows.
- There is no dedicated plan compatibility, preview, or template service.

## 3. Frontend Expectations

### 3.1 Service Layer

`frontend/src/services/planService.ts` assumes base URL `/api/plans` with extensive features:

- `getPlans`, `getPlan`, `createPlan`, `updatePlan`, `deletePlan`, `duplicatePlan` (via `/duplicate`).
- Template endpoints under `/api/plan-templates` (list, detail, create-plan).
- Validation/test endpoints `/api/plans/{id}/validate` and `/test`.
- Versioning endpoints `/api/plans/{id}/versions`, `/versions/{version}/revert`.
- Collaborator management, sharing, bulk actions, search.

**Mismatch:** backend exposes `/api/v1/plan-management/...` with different payload shapes. Several client methods call endpoints that do not exist (duplicate, templates, collaboration, versioning).

### 3.2 UI Components

- `PlanLibrary.tsx` expects enriched plan data with fields such as `description`, `type`, `tags`, `collaborators`, `updatedAt`, `usageStats`. Backend responses currently deliver basic plan attributes (no metadata, nested structure, camel vs snake).
- Navigation actions route to `/plans/create`, `/plans/{id}/edit`, `/plans/{id}` expecting respective views; these rely on Plan Service endpoints that are absent.
- Batch flow components (e.g., `BatchUploadContainer.tsx`) do not yet integrate plan selection or compatibility.

## 4. Data & Models

- Database models (`backend/app/models.py`):
  - `BonusPlan` includes `name`, `version`, `status`, optional `plan_metadata` JSON, but lacks `updated_at` auto tracking.
  - `PlanStep` stores `expr`, `condition_expr`, `outputs` (JSON array).
  - `PlanInput` references catalog entries but metadata minimal.
- There is no separate plan template model.
- Unrecognized CSV columns are persisted in `EmployeeData.additional_data`.

## 5. Summary of Gaps

1. **Base Path & Contracts:** Frontend expects `/api/plans` with rich metadata; backend offers `/api/v1/plan-management` with lean payloads. Immediate reconciliation needed.
2. **Missing Endpoints:** No plan duplication, templates, collaboration, or compatibility APIs, despite frontend calls.
3. **Input Catalog Exposure:** Backend supports attaching inputs to plans but lacks user-friendly metadata and catalog management endpoints.
4. **Plan Studio v2:** Not implemented; existing Plan Builder relies on Plan Service stubs that do not match backend.
5. **Batch Integration:** No service connecting plan requirements to mapped columns.
6. **Versioning & Templates:** Some workflows exist (approve/lock) but version history endpoints referenced in frontend are absent.

## 6. Recommended Next Actions (Phase 1 Preview)

- Define canonical plan API (path, payload) and adjust either backend routes or frontend service accordingly.
- Patch the frontend Plan Service to consume actual responses (or vice versa) before adding new features.
- Document existing approval endpoints to prevent regressions when reorganizing routes.
- Plan migrations for `updated_at` field and enriched metadata support.

---

This discovery report will serve as the baseline reference for Phase 1 contract alignment.
