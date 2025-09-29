# Connector Guide

## Overview
- HRIS, Payroll, and DWH connectors integrate external systems.

## Setup
- Configure connector type, system, credentials.
- Test connectivity via `/api/v1/connectors/{id}/test`.
- Enable after approval.

## Data Mapping
- HRIS to employee CSV schema.
- DWH metrics to KPI CSV schema.

## CSV Fallback
- On failure, provide CSV via platform upload.

## Security
- Credentials stored in config_json (encrypt in production).
- Audit and lineage recorded.
