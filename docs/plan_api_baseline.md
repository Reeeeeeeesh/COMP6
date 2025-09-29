# Plan Management API Baseline Contracts

_Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)_

This document captures the current (v1) API contracts served by `backend/app/routers/plan_management.py` and compares them with what the frontend expects. It serves as the authoritative baseline before introducing v2 endpoints or refactoring.

## 1. Routing Overview

All routes are mounted under `/api/v1/plan-management`. Every handler returns a `PlatformApiResponse` wrapper with the following structure:

```json
{
  "success": true,
  "message": "optional",
  "data": { ... },
  "error": null,
  "tenant_id": "uuid",
  "timestamp": "2025-01-01T00:00:00.000000"
}
```

### 1.1 Plan Operations

| Method | Path | Description | Response `data` payload |
|--------|------|-------------|--------------------------|
| GET | `/plans` | List plans; supports `status`, `include_steps`, `include_inputs` query params | `{ "plans": [BonusPlanResponse] }` |
| GET | `/plans/{plan_id}` | Fetch single plan | `{ "plan": BonusPlanResponse }` |
| PUT | `/plans/{plan_id}` | Update mutable plan fields | `{ "plan": BonusPlanResponse }` |

### 1.2 Step Operations

| Method | Path | Description | Response `data` payload |
|--------|------|-------------|--------------------------|
| POST | `/plans/{plan_id}/steps` | Create step | `{ "step": PlanStepResponse }` |
| GET | `/plans/{plan_id}/steps` | List steps | `{ "steps": [PlanStepResponse] }` |
| GET | `/steps/{step_id}` | Fetch step | `{ "step": PlanStepResponse }` |
| PUT | `/steps/{step_id}` | Update step | `{ "step": PlanStepResponse }` |
| DELETE | `/steps/{step_id}` | Delete step | no `data` payload |

### 1.3 Input Operations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/plans/{plan_id}/inputs` | Attach plan input requirement |
| GET | `/plans/{plan_id}/inputs` | List plan inputs |
| DELETE | `/plan-inputs/{input_id}` | Remove plan input |

### 1.4 Validation & Workflow

- `POST /plans/{plan_id}/validate` – full plan validation.
- `POST /plans/{plan_id}/validate-expression` – single expression validation (expects `{ "expression": str, "step_order": Optional[int], "exclude_step_id": Optional[str] }`).
- `POST /plans/{plan_id}/reorder-steps` – expects array of `{ "step_id": str, "step_order": int }`.
- Workflow endpoints (submit, approve, lock, archive, revert, status, history) call into `ApprovalWorkflowService`.

_No compatibility, preview, template, version history, import/export, or collaboration routes currently exist._

## 2. Schema Snapshots

### 2.1 `BonusPlanResponse`

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "string",
  "version": 1,
  "status": "draft|approved|locked|archived",
  "effective_from": "2024-01-01T00:00:00",
  "effective_to": null,
  "notes": "optional string",
  "plan_metadata": {},
  "created_by": "user-id",
  "created_at": "2024-05-01T15:32:00",
  "locked_by": null,
  "locked_at": null
}
```

Missing fields compared to frontend expectations: `description`, `type`, `tags`, `updated_at`, `usageStats`.

### 2.2 `PlanStepResponse`

```json
{
  "id": "uuid",
  "plan_id": "uuid",
  "step_order": 1,
  "name": "Calculate Base Bonus",
  "expr": "base_salary * 0.1",
  "condition_expr": null,
  "outputs": ["base_bonus"],
  "notes": "optional"
}
```

Frontend Plan Studio calls the field `expression` and expects additional metadata (validation state, last updated), none of which are currently provided.

### 2.3 `PlanInputResponse`

```json
{
  "id": "uuid",
  "plan_id": "uuid",
  "input_id": "uuid",  // points to input_catalog entry
  "required": true,
  "source_mapping": { }
}
```

The response lacks input label, datatype, or validation hints, making the frontend mapping UX guesswork.

## 3. Frontend Contract Expectations (Gap Summary)

| Feature | Frontend Expectation | Backend Reality | Severity |
|---------|----------------------|-----------------|----------|
| Base URL | `/api/plans` | `/api/v1/plan-management` | High – every call fails without proxy rewrite. |
| Plan list payload | `PlanListResponse` with direct array (`plans: Plan[]`) + pagination | `PlatformApiResponse` wrapper with nested Pydantic models of limited fields | High |
| Plan create/delete endpoints | Present | Not implemented | High |
| Templates | `/api/plan-templates` suite | Not implemented | High |
| Versioning | `/plans/{id}/versions` etc. | Not implemented | High |
| Compatibility/Preview | Expected | Not implemented | High |
| Field names | camelCase (`updatedAt`, `createdAt`) | snake_case, some missing | Medium |
| Metadata | `description`, `type`, `tags`, `collaborators`, `usageStats` | Absent | Medium |

## 4. Immediate Remediation Checklist

1. **Decide on canonical base path.** Recommendation: introduce `/api/v1/plans` as façade returning the new contract while proxying to existing services, keeping `/api/v1/plan-management` for legacy/admin use.
2. **Normalize response shapes.** Provide flat arrays (`plans`, `steps`, `inputs`) with consistent casing and include minimal metadata necessary for current UI; add adapters in frontend during transition.
3. **Document unsupported frontend calls.** Mark Plan Service methods that hit nonexistent endpoints; disable or guard them until implemented to avoid runtime errors.
4. **Introduce `updated_at`.** Add DB column + migration to support sort semantics and then expose it.
5. **Define compatibility matrix.** For each new feature (templates, preview, etc.), explicitly note "not yet implemented" to avoid accidental scope creep.
6. **Add contract tests.** Once stabilized, generate OpenAPI spec and ensure TypeScript clients compile against it.

## 5. Next Steps Toward v2

- Author ADR describing strategy for new `/api/v1/plans` contract and the plan to add feature-flagged v2 endpoints.
- Update frontend service to consume the canonical contract once available; keep a compatibility adapter until then.
- Plan incremental delivery (per implementation roadmap) ensuring each new capability is feature-flagged.

---

This baseline document must remain up to date until the new contract is published and the legacy routes deprecated.
