# PRD — Pluggable Compensation Platform for Fund Managers

## 1. Problem, Users, Scope

### Problem
The current app hard-codes bonus logic in code, limiting reuse across funds with different formulas, inputs, approval flows, and reporting needs. We need a configurable, multi-tenant platform where plans, rules, inputs, and workflows are data, not code. 

Today's system is FastAPI + SQLAlchemy + React/Vite with batch/scenario modules, revenue banding admin, and anonymous sessions. It lacks RBAC, audit, centralized monitoring, multi-tenant isolation, and a generalizable rule engine.

### Primary Users
- **HR Admins** - define plans/inputs, run batches, export statements
- **Finance/COO** - approve pools/runs, audit trail
- **Managers** - review teams
- **Auditors** - read-only, evidence & reproducibility

### In Scope
Pluggable rule engine, input catalog + file mapping, plan versioning, approvals & audit, dynamic reports, tenant isolation, observability, and migration from the current app. 

Backlog already includes Redis sessions, job queues, streaming uploads, monitoring, CI/CD, and a phased migration/strangler plan.

### Out of Scope (v1)
- Mobile app
- ML-based scoring
- Cross-tenant analytics

## 2. Goals & Non-Goals

### Goals
- Move from hard-coded Python to DB-driven bonus plans with rules/expressions and IF/THEN conditions; full explainability and step-level trace
- Multi-tenant isolation with RLS + RBAC; SSO-ready
- Approvals & audit built-in; immutable run snapshots; reproducibility guarantees
- Batch performance for 10k+ employees per run; parallel/vectorized calc; background workers (backlog already targets job queues & parallel engine)
- Dynamic reporting (pool vs target, individual statements, history)

### Non-Goals
- Microservices split (stay modular monolith first)
- Advanced data science; keep deterministic finance math

## 3. Architecture Overview

**Pattern**: Modular monolith with clear module boundaries (Auth/Session, Files, Calculations, Scenarios, Analytics, Admin). Keep Postgres primary, Redis for sessions/cache/queue, background workers, centralized metrics/logging. (Matches existing stack & suggested rewrite plan.)

**Core shift**: `calculation_engine` becomes a generic executor that loads a plan + steps from DB, evaluates a safe DSL/JSON ruleset over typed inputs (employee- and fund-level), persists step results, and returns artifacts. Today's batch service calls will point to the executor instead of inline logic.

## 4. Data Model (SQL DDL)

**Database**: Postgres 15+. Use schema `comp`. All monetary/ratios use `numeric(38,10)` to prevent precision loss; display rounding is separate. RLS policies added in §11.

### Tenancy
```sql
create schema if not exists comp;

create table comp.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'
);

create table comp.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  email citext not null,
  display_name text,
  role text not null check (role in ('admin','hr','manager','auditor','readonly')),
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);
```

### Input Catalog
```sql
create table comp.input_catalog (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  key text not null,             -- e.g., 'employee_score', 'aum', 'fund_return'
  label text not null,
  dtype text not null check (dtype in ('decimal','int','text','date','bool')),
  required boolean not null default false,
  default_value jsonb,
  validation jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);
```

### Bonus Plans & Steps
```sql
create table comp.bonus_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  name text not null,            -- e.g., "2025 Analyst Bonus Plan"
  version int not null,          -- immutable after lock
  status text not null check (status in ('draft','approved','locked','archived')),
  effective_from date,
  effective_to date,
  notes text,
  metadata jsonb not null default '{}',
  created_by uuid references comp.users(id),
  created_at timestamptz not null default now(),
  locked_by uuid references comp.users(id),
  locked_at timestamptz,
  unique (tenant_id, name, version)
);

create table comp.plan_inputs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references comp.bonus_plans(id) on delete cascade,
  input_id uuid not null references comp.input_catalog(id) on delete restrict,
  required boolean not null default true,
  source_mapping jsonb not null default '{}' -- e.g., CSV column names, transforms
);

create table comp.plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references comp.bonus_plans(id) on delete cascade,
  step_order int not null,
  name text not null,            -- e.g., "performance_multiplier"
  expr text not null,            -- DSL or CEL/JSONLogic string
  condition_expr text,           -- optional IF guard
  outputs jsonb not null default '[]', -- which variables this step defines
  notes text,
  unique (plan_id, step_order)
);
```

### Bonus Pools
```sql
create table comp.bonus_pools (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references comp.bonus_plans(id) on delete cascade,
  currency char(3) not null,
  amount numeric(38,10) not null,
  allocation_rules jsonb not null default '[]',
  created_at timestamptz not null default now()
);
```

### Uploads & Employee Data
```sql
create table comp.uploads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  created_by uuid references comp.users(id),
  filename text not null,
  status text not null check (status in ('received','processing','failed','ready')),
  file_size bigint,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table comp.employee_rows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  upload_id uuid not null references comp.uploads(id) on delete cascade,
  employee_ref text not null,            -- external id or HR id
  raw jsonb not null,                    -- raw mapped fields as JSON
  created_at timestamptz not null default now()
);
create index on comp.employee_rows(upload_id);
```

### Runs & Results
```sql
create table comp.plan_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  plan_id uuid not null references comp.bonus_plans(id) on delete restrict,
  upload_id uuid references comp.uploads(id) on delete set null,
  scenario_name text,
  approvals_state jsonb not null default '{"state":"draft","history":[]}',
  snapshot_hash text not null,           -- hash of plan+steps+inputs+funcs
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('draft','manager_approved','hr_approved','finance_approved','finalized','failed'))
);

create table comp.run_step_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references comp.plan_runs(id) on delete cascade,
  employee_ref text not null,
  step_name text not null,
  value jsonb not null,                  -- store numeric as string inside JSON for precision
  created_at timestamptz not null default now()
);
create index on comp.run_step_results(run_id);

create table comp.run_totals (
  run_id uuid primary key references comp.plan_runs(id) on delete cascade,
  totals jsonb not null default '{}'     -- aggregated metrics, pool usage, etc.
);
```

### Audit
```sql
create table comp.audit_events (
  id bigserial primary key,
  tenant_id uuid not null references comp.tenants(id) on delete cascade,
  actor_user_id uuid references comp.users(id),
  action text not null,                  -- 'plan.create','run.finalize', etc.
  entity text not null,                  -- 'bonus_plan','plan_run','upload', ...
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now(),
  signature text                         -- optional tamper-evident chain
);
```

### Indexing Examples
```sql
create index on comp.bonus_plans(tenant_id, status);
create index on comp.plan_steps(plan_id, step_order);
create index on comp.plan_runs(tenant_id, plan_id, status);
```

**Rationale**: Entity set mirrors your current "sessions, uploads, employee_data, batch results, scenarios, revenue banding" but projects it into a plan/rules/runs universe, with JSONB for flexible inputs and step outputs.

## 5. Expression Engine (DSL) — Spec & Safety

### Requirement
A safe, side-effect-free expression language with arithmetic, comparisons, conditionals, and a finance function library (clip, round, min/max, hurdle, brackets, caps). Human-readable, diff-able, and evaluable on server (and optionally mirrored on client).

### Grammar (minimal v1)
```
expr       := or_expr
or_expr    := and_expr ( "||" and_expr )*
and_expr   := cmp_expr ( "&&" cmp_expr )*
cmp_expr   := sum ( ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) sum )?
sum        := term ( ("+" | "-") term )*
term       := factor ( ("*" | "/" | "%") factor )*
factor     := unary | power
power      := primary ( "^" unary )?
unary      := ("+"|"-") unary | primary
primary    := NUMBER | NAME | "(" expr ")" | call | ifexpr
call       := NAME "(" arglist? ")"
arglist    := expr ( "," expr )*
ifexpr     := "if" "(" expr ")" "then" expr "else" expr
```

### Whitelisted Functions (v1)
`min(x,y)`, `max(x,y)`, `round2(x)`, `clip(x,lo,hi)`, `hurdle(perf,rate)`, `pct(x)`, `pct_change(cur,prev)`, `cap_floor(x, cap, floor)`. More can be added with versioned docs.

### Safety
Parse to an AST with a whitelist of node types; forbid attributes/subscripts; no eval. Deterministic rounding (banker's) via Decimal.

### Explainability
Persist variable bindings & each step's result in `run_step_results`, and produce a per-employee "calculation tape" used by statements.

## 6. APIs (OpenAPI Sketch)

**Base**: `/api/v1` (your backlog already standardizes versioned routers).

```yaml
openapi: 3.1.0
info:
  title: Compensation Platform API
  version: 1.0.0
servers:
  - url: /api/v1
paths:
  /tenants/{tenantId}/input-catalog:
    get:
      summary: List input definitions
      responses: { "200": { description: OK } }
    post:
      summary: Create input definition
  /tenants/{tenantId}/bonus-plans:
    get: { summary: List plans }
    post:
      summary: Create plan
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BonusPlanCreate'
  /bonus-plans/{planId}:
    get: { summary: Get plan }
    patch: { summary: Update plan (only when draft) }
  /bonus-plans/{planId}/lock:
    post: { summary: Lock plan (immutable version) }
  /bonus-plans/{planId}/steps:
    get: { summary: List steps }
    post: { summary: Add step }
  /uploads:
    post:
      summary: Create upload (pre-signed or multipart)
  /uploads/{uploadId}/map:
    post:
      summary: Save column→input mapping
  /runs:
    post:
      summary: Start a run
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RunStart'
  /runs/{runId}:
    get: { summary: Run status & totals }
  /runs/{runId}/results:
    get: { summary: Paginated per-employee step results }
  /runs/{runId}/approve:
    post:
      summary: Advance approvals state (role-gated)
  /runs/{runId}/finalize:
    post:
      summary: Finalize run (freeze outputs)
  /reports/individual-statement:
    post:
      summary: Generate statement for an employee
components:
  schemas:
    BonusPlanCreate:
      type: object
      required: [tenant_id, name, version]
      properties:
        tenant_id: { type: string, format: uuid }
        name: { type: string }
        version: { type: integer }
        effective_from: { type: string, format: date }
        notes: { type: string }
    RunStart:
      type: object
      required: [tenant_id, plan_id, upload_id]
      properties:
        tenant_id: { type: string, format: uuid }
        plan_id: { type: string, format: uuid }
        upload_id: { type: string, format: uuid }
        scenario_name: { type: string }
```

Keep the current health/docs endpoints and error middleware patterns from the existing app.

## 7. Frontend Spec — "Plan Builder" & Mapping

### Plan Builder (Admin)
- Create Plan (name/version/effective dates)
- Define Inputs (from catalog) + add transforms/defaults
- **Steps Editor**: Monaco-based expression editor, autocompletion (input keys & functions), linting, step ordering, test vector runner
- **Guards**: Can't lock until validation passes (acyclic graph, all outputs bound, no unknown names)
- **Versioning**: Lock creates immutable version; edits require new version
- **Approvals** state viewer per run

### Upload & Mapping
After CSV upload: guided mapping UI (detect columns → suggested matches), save mapping presets per tenant; preview 100 rows with type warnings; resumable streaming uploads and progress via WS.

### Reports
- Individual Statement (inputs → steps → final)
- Pool vs Target
- Historical Payout by team/fund/role

## 8. Approvals & Audit

### Workflow
Run state machine: `draft → manager_approved → hr_approved → finance_approved → finalized`. Persist actor + time; freeze `snapshot_hash` (SHA-256 over plan, steps, function catalog version, and uploaded inputs) at first approval. Attempts to mutate a locked plan or finalized run are rejected and audited.

### Audit
`audit_events` on plan/rule changes, run lifecycle, mapping changes, bulk exports, and admin actions; optional hash chaining for tamper-evidence.

## 9. Performance & Scalability

Engine evaluates over columnar data (Polars/pyarrow) to avoid Python row loops; partition employees and parallelize via Redis-backed workers; cache plan graph and fund-level invariants per run.

**Targets**: 10k employees, P95 run time ≤ 2 minutes (baseline hardware), memory bounded by streaming ingestion + typed frames.

Deterministic rounding at final display; internal numeric with `numeric(38,10)/Decimal`.

## 10. Observability, SLOs, Ops

### Metrics
Queue depth, run durations, step failures, P95 API latencies, upload throughput, mapping error rate.

### Logs
JSON structured + correlation IDs; audit to WORM if required.

### SLOs
- API P95 < 300 ms (non-run)
- Run start→finish P95 < 2 min for 10k
- Export P95 < 30 s
- Availability 99.9%

### CI/CD
Test gates, staging deploy, prod gates with approvals and security scan.

## 11. Security & Multi-Tenancy

### AuthZ
Role model `admin|hr|manager|auditor|readonly`; route guards on approvals/export; least privilege.

### AuthN
OIDC/SAML ready; keep local for dev.

### RLS
Postgres row-level security: all core tables carry `tenant_id`; policies enforce `current_setting('app.tenant_id')`.

### PII
Field-level encryption for sensitive columns; KMS rotation.

### Sessions/Cache
Redis 7 with TTL, namespace per tenant.

## 12. Migration Plan

Follow your Strangler plan with dual-write and shadow comparisons:

1. **Phase 0**: Infra (PG/Redis/CI/Monitoring) & scaffolding
2. **Phase 1**: API foundation + Redis sessions (dual-write → full cutover)
3. **Phase 2**: Streaming uploads + job queue + validation/reporting
4. **Phase 3**: New engine shadow mode; parity within 1bp; then cutover
5. **Phase 4**: Plan Builder UI & mapping; approvals & audit; reports

Keep legacy for history until decommission criteria met.

## 13. Acceptance Criteria (System-Level)

### Plan Authoring
- Create/edit steps; validation prevents cycles/unknown names
- Lock/approve enforces immutability + versioning
- All actions audited; audit queryable by time/user/entity

### Upload & Mapping
- Upload 250MB CSV via streaming; resumable; virus-scanned; WS progress
- Mapping UI suggests ≥90% correct matches on clean headers; presets persist
- Validation report includes row/column references, sample values, and fix hints

### Run Execution
- Engine executes plan on 10k rows with P95 ≤ 2 min; deterministic results across re-runs
- Step-level results persisted; per-employee statement generated
- Snapshot hash present; changing plan/inputs produces a new hash

### Approvals & Finalize
- Only permitted roles can advance state; immutable after finalize
- Export bundles (CSV/XLSX/PDF) reflect frozen state

### Observability
- Prometheus metrics + Grafana dashboards; error budget reports; JSON logs with correlation IDs

### Security
- RLS enforced; multi-tenant access tests pass; rate limits on write endpoints

## 14. Test Plan (Representative Case List)

### Unit
- Parser rejects disallowed AST nodes; accepts DSL grammar; function library coverage
- Decimal rounding rules (banker's) on edge cases
- Plan DAG: cycle detection, topo sort, undefined variable errors

### Property/Mutation
- Generate random thresholds near boundaries; mutation tests ensure tests fail on operator swaps

### Integration
- Upload → map → validate → run → export happy path; 250MB file; network blips; resume works
- Approvals gates by role; audit events emitted for each action

### Parity / Shadow
- For N historical batches, legacy vs new engine diffs ≤ 0.01 currency units

### Perf/Load
- 10k and 50k rows; measure run time, memory, queue depth; trigger auto-scale of workers

### Security
- RLS bypass attempts; IDOR on run/plan IDs; fuzz input payloads; CSV injection prevention

## 15. Developer Contracts (Detailed)

### 15.1 Create Plan
```http
POST /api/v1/tenants/{tid}/bonus-plans
Request:
{ "name":"2025 Analyst Bonus Plan", "version":1, "effective_from":"2025-01-01", "notes":"initial" }
```
Response: 201 with plan object (status=draft).

### 15.2 Add Step
```http
POST /api/v1/bonus-plans/{planId}/steps
{
  "step_order": 10,
  "name": "perf_multiplier",
  "expr": "if(employee_score >= 0.8) then 1.2 else 0.9",
  "condition_expr": "fund_return >= 0.0",
  "outputs": ["perf_multiplier"]
}
```
Validations: outputs unique; names legal; expressions parse; no cycles.

### 15.3 Lock Plan
```http
POST /api/v1/bonus-plans/{planId}/lock → 200
```
After lock, only status can change via approvals; editing requires a new version.

### 15.4 Upload + Map
```http
POST /api/v1/uploads (multipart or pre-signed flow) → {uploadId}
POST /api/v1/uploads/{uploadId}/map → mapping JSON: 
{ "employee_ref":"EMP_ID", "employee_score":"SCORE_2025", "fund_return":"FUND_RET" }
```

### 15.5 Start Run
```http
POST /api/v1/runs
{
  "tenant_id":"<uuid>",
  "plan_id":"<uuid>",
  "upload_id":"<uuid>",
  "scenario_name":"Base"
}
```
Response: `{ "run_id":"...", "status":"draft" }` + background job queued.

### 15.6 Approvals
```http
POST /api/v1/runs/{runId}/approve 
Body: { "action":"manager_approve" }
```
→ advances state if role permits; emits audit.

### 15.7 Finalize & Export
```http
POST /api/v1/runs/{runId}/finalize → freeze;
GET /api/v1/runs/{runId}/results?employee_ref=E123 → step tape;
POST /api/v1/reports/individual-statement → returns PDF.
```

## 16. Example Code (Engine Safety Pattern)

This shows the whitelisting/Decimal approach you'll expand and later vectorize (columnar execution). It's production-grade in its safety pattern, not yet in feature breadth.

```python
# app/modules/calculations/safe_engine.py
from __future__ import annotations
import ast, operator as op
from decimal import Decimal, ROUND_HALF_EVEN, getcontext

getcontext().prec = 28
def to_dec(x): return x if isinstance(x, Decimal) else Decimal(str(x))

ALLOWED_BINOPS = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul, ast.Div: op.truediv, ast.Mod: op.mod, ast.Pow: op.pow}
ALLOWED_CMPS   = {ast.Eq: op.eq, ast.NotEq: op.ne, ast.Gt: op.gt, ast.GtE: op.ge, ast.Lt: op.lt, ast.LtE: op.le}
ALLOWED_UNARY  = {ast.UAdd: lambda x: x, ast.USub: op.neg}
FUNCS = {
    "min": lambda a,b: to_dec(min(to_dec(a), to_dec(b))),
    "max": lambda a,b: to_dec(max(to_dec(a), to_dec(b))),
    "round2": lambda x: to_dec(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN),
    "clip": lambda x, lo, hi: to_dec(min(max(to_dec(x), to_dec(lo)), to_dec(hi))),
    "hurdle": lambda perf, rate: Decimal("0") if to_dec(perf) < to_dec(rate) else to_dec(perf),
}

class SafeEval(ast.NodeVisitor):
    def __init__(self, env: dict[str, Decimal | int | float | str]): 
        self.env = {k: to_dec(v) for k,v in env.items()}
    def visit(self, node):
        m = "visit_" + node.__class__.__name__
        if not hasattr(self, m): 
            raise ValueError(f"Disallowed node: {node.__class__.__name__}")
        return getattr(self, m)(node)
    def visit_Constant(self, n): 
        if isinstance(n.value, (int,float,str)): 
            return to_dec(n.value)
        raise ValueError("Only numeric/string constants allowed")
    def visit_Name(self, n):
        if n.id not in self.env: 
            raise NameError(f"Unknown variable: {n.id}")
        return self.env[n.id]
    def visit_BinOp(self, n):
        f = ALLOWED_BINOPS.get(type(n.op))
        if not f: 
            raise ValueError("Operator not allowed")
        return f(to_dec(self.visit(n.left)), to_dec(self.visit(n.right)))
    def visit_UnaryOp(self, n):
        f = ALLOWED_UNARY.get(type(n.op))
        if not f: 
            raise ValueError("Unary operator not allowed")
        return f(to_dec(self.visit(n.operand)))
    def visit_Compare(self, n):
        if len(n.ops)!=1 or len(n.comparators)!=1: 
            raise ValueError("No chained comparisons")
        f = ALLOWED_CMPS.get(type(n.ops[0]))
        if not f: 
            raise ValueError("Comparison operator not allowed")
        return Decimal(1) if f(to_dec(self.visit(n.left)), to_dec(self.visit(n.comparators[0]))) else Decimal(0)
    def visit_IfExp(self, n):
        return self.visit(n.body) if to_dec(self.visit(n.test)) != Decimal(0) else self.visit(n.orelse)
    def visit_Call(self, n):
        if not isinstance(n.func, ast.Name): 
            raise ValueError("Only named functions allowed")
        fn = FUNCS.get(n.func.id)
        if not fn: 
            raise ValueError(f"Function not allowed: {n.func.id}")
        return fn(*[self.visit(a) for a in n.args])

def evaluate(expr: str, env: dict[str, float|int|str|Decimal]) -> Decimal:
    tree = ast.parse(expr, mode="eval")
    for node in ast.walk(tree):
        if isinstance(node, (ast.Attribute, ast.Subscript, ast.Lambda, ast.Dict, ast.List, ast.Set, ast.Assign, ast.AugAssign, ast.Import)):
            raise ValueError(f"Disallowed node: {type(node)}")
    return to_dec(SafeEval(env).visit(tree.body))
```

Later: compile the validated AST to Polars expressions for vectorized batch execution.

## 17. Rollout & Go/No-Go Gates

- **Gate A** (engine PoC): Legacy parity ≤ 0.01 across 1000 sampled employees from 3 historical batches; exact match of rounding on 10 canonical cases
- **Gate B** (mapping/uploads): 250MB streaming upload, resume works; detailed validation report; queue dashboards green
- **Gate C** (approvals/audit): All actions appear in audit with actor/time/before/after; approvals state machine enforces role gates
- **Gate D** (SLOs): P95 API latency < 300ms non-run; P95 run < 2 min/10k; error rate <1% for 7 days; alert rules in place

## 18. Risks & Mitigations

- **DSL complexity creep** → Keep v1 small; add functions only with docs & tests
- **Security of expressions** → Parser whitelist; no eval; CI fuzz tests
- **Data isolation** → RLS + tenant middleware; CI IDOR tests
- **Performance regressions** → Shadow mode, perf tests, dashboards
- **Change management** → Versioned plans; snapshot hash; strong explainability

## 19. Task Plan Mapped to Existing Epics

### New Epics (Platformization)

#### BP-01 Bonus Plan Builder (Frontend)
- BP-01.1 Monaco editor + autocomplete for inputs/functions (linting & hints)
- BP-01.2 Step list (CRUD, drag-order), validation panel (cycles, unknowns)
- BP-01.3 Plan versioning & lock UI; effective dates; diff view between versions
- BP-01.4 Approvals state UI on runs; per-employee statement view
- BP-01.5 Column-mapping flow with presets & detection (ties to F-03.3)

#### RE-01 Rules/Engine (Backend)
- RE-01.1 DSL parser + evaluator (safe AST, Decimal)
- RE-01.2 DAG builder & cycle detection; variable registry
- RE-01.3 Vectorized batch evaluation (Polars/Arrow) with worker integration (ties to C-01)
- RE-01.4 Step-level persistence; snapshot hash; reproducibility
- RE-01.5 Function catalog v1 with docs & golden tests

#### MT-01 Multi-Tenancy & RBAC
- MT-01.1 RLS policies + tenant middleware; migration of data
- MT-01.2 Roles/permissions; route guards; rate limits (ties to A-01.3)

#### WF-01 Approvals & Audit
- WF-01.1 Approvals state machine; role-gated transitions
- WF-01.2 audit_events & query APIs; optional hash chaining
- WF-01.3 Export bundle signing

#### RP-01 Reporting
- RP-01.1 Individual Statement (PDF/XLSX)
- RP-01.2 Pool vs Target; Trend/Outliers; Scenario deltas

### Tie-ins to Existing Epics/Stories
- **F-01** Infrastructure: PG + Redis + CI/CD + backups + containers (PRD depends on it)
- **F-02** Monitoring & Observability: Prometheus/Grafana, structured logs, Sentry (Needed for run metrics & queues)
- **A-01** Enhanced API Foundation: modular routers, error middleware, versioned OpenAPI (Hosts the new endpoints)
- **A-02** Redis Sessions: replace SQLite sessions → Redis + analytics (Baseline multi-tenant session layer)
- **F-03** Enhanced File Processing: streaming uploads, job queues, validation/error reporting, progress (Directly used by Upload & Mapping UX)
- **C-01** High-Performance Calculation Engine: parallelism, resource limits, failure handling (Backs RE-01.3 and run SLOs)

**Timeline alignment**: Keep your 180-day phased approach and cutover gates; this PRD simply defines the Platform increments within those phases.

## 20. Developer Checklists (DoD)

- **Schema**: Migrations created; RLS policies verified by tests; indexes present
- **API**: OpenAPI examples + error shapes; 100% router coverage in tests
- **Engine**: Golden parity tests; property-based tests; mutation tests
- **Perf**: Load tests at 10k & 50k; dashboards screenshot attached in PR
- **Security**: ZAP/OWASP checks; IDOR/RLS tests; rate limits
- **Docs**: Plan authoring guide; DSL reference; "how to investigate a run"

## Appendix A — Alembic Migration Seed (Excerpt)

```python
# versions/2025_01_foo_init_platform.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as psql

def upgrade():
    op.execute("create schema if not exists comp")
    op.create_table(
        'tenants', 
        sa.Column('id', psql.UUID, primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.text('true')),
        sa.Column('metadata', psql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        schema='comp'
    )
    # ... (follow DDL above)

def downgrade():
    op.execute("drop schema if exists comp cascade")
```

## Appendix B — Worker Wiring (Excerpt)

```python
# app/shared/queue.py
from rq import Queue
from redis import Redis
redis = Redis.from_url(os.getenv("REDIS_URL","redis://localhost:6379/0"))
runs_q = Queue("plan_runs", connection=redis)

# app/modules/calculations/tasks.py
@rq_job('plan_runs')
def execute_run(run_id: str):
    # load run + plan graph → execute vectorized → persist step results → totals
    # emit metrics, audit events, and progress updates (WS)
    ...
```