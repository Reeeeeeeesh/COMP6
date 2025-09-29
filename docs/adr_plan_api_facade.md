# ADR: Canonical `/api/v1/plans` Facade

_Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)_

## Status
Proposed

## Context

- Backend plan routes currently reside under `/api/v1/plan-management/...` and expose nested payloads inside `PlatformApiResponse`.
- Frontend services (`PlanService`) assume a base URL `/api/plans` with richer metadata and direct payloads. Numerous methods call endpoints that do not exist, causing runtime failures when the UI is exercised.
- Upcoming work (Plan Studio v2, compatibility checks, templates) requires a stable, well-documented contract to evolve from.
- We must maintain backward compatibility for legacy consumers (including potential scripts hitting `/plan-management` directly).

## Decision

1. **Introduce a façade router** mounted as `/api/v1/plans` that delegates to the existing `PlanManagementService` but translates responses into the canonical shape expected by the frontend.
2. **Preserve `PlanManagementService` and `/plan-management` routes** for admin/backward compatibility; mark them as legacy in documentation.
3. **Adopt a minimal contract for phase one** matching existing data, with snake_case keys, while documenting future enriched fields.
4. **Wrap responses in `PlatformApiResponse`** for consistency, but ensure the `data` payload contains flattened arrays/objects (`plans`, `plan`, `steps`, `inputs`).
5. **Use feature flag `PLAN_API_FACADE_V1`** to guard the new routes initially. Flag defaults ON for local/dev once verified.

## Contract Snapshot

### List Plans
```
GET /api/v1/plans
Response:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "string",
        "version": 1,
        "status": "draft",
        "effective_from": "...",
        "effective_to": null,
        "notes": null,
        "plan_metadata": {},
        "created_by": "user",
        "created_at": "timestamp",
        "locked_by": null,
        "locked_at": null
      }
    ]
  },
  ...
}
```

### Get Plan with optional steps/inputs (via query params `include_steps`, `include_inputs`).

Values map 1:1 to `BonusPlanResponse`, `PlanStepResponse`, `PlanInputResponse`.

## Consequences

- Enables frontend to target `/api/v1/plans` with predictable responses without breaking older paths.
- Facilitates incremental addition of new endpoints (compatibility, preview) under the same façade namespace.
- Requires feature flag plumbing and tests to guarantee parity with legacy route.
- Long-term plan: once all clients adopt façade, mark `/plan-management` as deprecated and eventually remove or restrict to admin tooling.

## Implementation Notes

- Create new router `backend/app/routers/plans_facade.py` (name TBD) with dependency injection identical to legacy router.
- Shared response mappers (e.g., `serialize_plan(plan: BonusPlanResponse) -> dict`) should live in a helper module to avoid duplication.
- Add integration tests comparing `/plan-management/plans` and `/plans` outputs for equality.
- Update documentation (`docs/plan_api_baseline.md`) once façade is live.

