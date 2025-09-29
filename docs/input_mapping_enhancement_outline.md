# Input Catalog & Column Mapping Enhancement Design

_Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)_

## 1. Objectives

1. Allow analysts to map arbitrary CSV columns to reusable, tenant-scoped input definitions with rich metadata.
2. Persist mapping presets (per plan, per upload, per template) for reuse across runs.
3. Surface validation feedback (missing required, type mismatches, transforms needed) before executing plans.
4. Preserve unmapped raw data in `EmployeeData.additional_data` while enabling future mapping without re-uploading files.

## 2. Current State Summary

- **Input Catalog** (`input_catalog` table + router) stores basic key/dtype/validation JSON but lacks labels, descriptions, or transform definitions.
- **Plan Inputs** (`PlanInput` model) link plans to catalog entries but response payloads omit user-friendly metadata.
- **Column Mapping UI** uses `ColumnMappingInterface.tsx` which auto-suggests mappings but only permits selecting system fields; it does not expose catalog metadata or persist presets.
- **Batch Processing** reads CSV rows, normalises headers to snake_case, stores recognized fields directly, and pushes unknown fields into `additional_data`.

## 3. Proposed Backend Changes

### 3.1 Input Catalog Metadata Expansion

- **Schema additions** (`input_catalog` table):
  - `label` (text, required) – human-readable name.
  - `description` (text) – tooltip/help.
  - `category` (text) – e.g., "employee", "fund", "performance".
  - `data_type` (enum: number, string, date, boolean, json).
  - `validation_rules` (JSONB, existing) – expand to include min/max, regex, enumeration.
  - `default_value` (JSONB) – optional fallback.
  - `transform` (JSONB) – describes transformation (trim, uppercase, division, mapping tables).
- Update `InputCatalogCreate/Update/Response` schemas to expose new fields.

### 3.2 Mapping Persistence Models

Add new tables:

1. `column_mapping_presets`
   - `id (uuid)`, `tenant_id`, `name`, `description`, `plan_id (nullable)`, `created_by`, timestamps.
2. `column_mapping_entries`
   - `preset_id`, `csv_column`, `input_id`, `transform` (JSON), `confidence` snapshot.
3. `upload_mappings`
   - `upload_id`, `preset_id`, `applied_at`, `applied_by`, `column_overrides` (JSON) for per-upload adjustments.

Ensure foreign keys respect tenant boundaries; cascade deletes appropriately.

### 3.3 Services & APIs

- Extend `input_catalog_service` with label/description support and type coercion utilities.
- Add `mapping_service` to manage presets:
  - `create_preset`, `update_preset`, `list_presets`, `get_preset`, `delete_preset`.
  - `apply_preset_to_upload(upload_id, preset_id, overrides)` – stores association and returns validation summary.
- Add compatibility endpoint stub referencing `PlanInput` requirements (paves way for Phase 5).
- Update `FileProcessingService` to optionally apply transforms when persisting employee rows (while still storing original value in `raw`).

### 3.4 API Routes

New router `/api/v1/column-mapping-presets` with:

- `POST /` – create preset.
- `GET /` – list presets (supports filters: plan_id, created_by, search).
- `GET /{id}` – fetch preset with entries.
- `PUT /{id}` – update preset metadata/entries.
- `DELETE /{id}` – soft delete preset.
- `POST /{id}/apply` – bind preset to upload.

Augment existing `/api/v1/plan-management/plans/{id}/inputs` to embed catalog metadata (label, data type, validation) for compatibility checks.

## 4. Proposed Frontend Changes

### 4.1 Column Mapping Interface Enhancements

- Show catalog metadata (label, datatype, description) in dropdown.
- Allow in-place creation of new catalog input (modal) with type/validation configuration.
- Support editing transforms (e.g., divide by 100, parse date format).
- Display required inputs (per selected plan or preset) alongside mapping suggestions.
- Provide status chips (required satisfied, optional mapped, unmapped, type warning).

### 4.2 Mapping Preset Management

- New "Save Mapping" dialog prompting for preset name, scope (global vs plan-specific), visibility.
- Preset selector at the top of the mapping wizard; supports search and filtering.
- Option to apply preset with overrides; diff view showing additions/removals.

### 4.3 Batch Workflow Tie-In

- After mapping, show summary card listing
  - required inputs satisfied/missing,
  - optional inputs mapped,
  - transforms applied.
- Persist mapping choice so subsequent uploads can reuse automatically.

## 5. Validation & Error Handling

- Backend should perform strict type checking when applying transforms; return structured warnings.
- Frontend to surface warnings inline (e.g., "Column EmpID inferred as string; expected number").
- On preset apply, show diff of columns not found in current CSV.

## 6. Security & Multi-Tenancy

- All new tables keyed by `tenant_id` with row-level filtering in DAL.
- Presets cannot be shared across tenants; enforce user permissions (only admins/analysts can create/edit; viewers can apply).
- Audit: log preset create/update/apply events.

## 7. Testing Strategy

- **Unit tests:**
  - Input catalog service (create/update validation, transform parsing).
  - Mapping service (preset lifecycle, apply logic).
- **Integration tests:**
  - Upload -> mapping -> preset save -> reapply -> validation summary.
  - Multi-tenant isolation (preset from tenant A not visible to tenant B).
- **Frontend tests:**
  - Component tests for mapping dropdown, preset modals.
  - E2E flow for saving/applying presets with Playwright.

## 8. Rollout Plan

1. Add backend metadata/migrations behind feature flag `INPUT_MAPPING_V2` (default OFF).
2. Ship API adjustments + contract tests.
3. Implement frontend UI toggled by the same flag.
4. Pilot with internal tenant, gather feedback, then enable progressively.

---

This design outline completes Phase 2 groundwork and should be refined into actionable tickets per subsystem before implementation.
