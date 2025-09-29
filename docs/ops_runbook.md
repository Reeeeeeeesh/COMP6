# Operations Runbook: Year-End Bonus Cycle

## Pre-Cycle Preparation
- System health checks (DB, Redis, File store)
- Data validation and backups
- Environment variables reviewed (ENGINE_VERSION, PLATFORM_VERSION)

## Data Collection and Validation
- Download CSV templates
- Upload procedures via Platform Uploads
- Validation checkpoints and exception handling

## Team RAF Configuration and Approval
- Upload revenue data, compute RAF
- Maker-checker approval workflow
- Archive approved RAF snapshots with inputs_hash

## Batch Calculation Execution
- Configure parameters/presets
- Execute batch runs, monitor logs
- Handle validation exceptions

## Payout Generation and Review
- Apply active payout policies
- Split payouts to legs
- Generate statements and payroll export

## Risk Event Management
- Record malus/clawback events
- Maker-checker approvals
- Amend payout legs, restate statements

## Evidence Pack Generation
- Build ZIP pack with configurations, inputs, RAF snapshots
- Include risk events, amendments, docs

## Post-Cycle Activities
- Data retention and archiving
- Lessons learned and continuous improvement
