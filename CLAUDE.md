# Howell Family Properties — Restock & Inventory App

## What this is
A web app with login that replaces manual spreadsheet tracking for restocking
supplies across 60+ properties (STR/Airbnb, long-term rental, HUD-VASH),
with a mobile-friendly view the cleaning crew uses in the field.

## Read first
`docs/PROJECT_SPEC.md` has the full feature list, data model, and phased
build plan. It was derived from a working Excel prototype
(`reference/Howell_Restock_Data_Model.xlsx`) that's already validated —
match its field names and logic unless the user asks to change them.

## Status
Nothing has been built yet. Start with Phase 1 in the spec (property +
item list, manual restock logging, admin login) — don't try to build
everything in the spec at once.

## Conventions
- Match the data model in `docs/PROJECT_SPEC.md` exactly (table/field names)
  unless directed otherwise — it's already been validated against the
  prototype and against real Hostaway API field shapes.
- `integrations/hostaway_sync.py` is a reference implementation of the
  Hostaway sync logic (tested against mocked API data, never against a live
  account). Port its merge semantics into the real sync job: update
  Hostaway-sourced property records, never overwrite manually-entered ones.
- Ask the user before picking the final tech stack — `docs/PROJECT_SPEC.md`
  has a recommendation, not a decision.

## Do not
- Do not build auto-purchase/auto-reorder that executes without a human
  approval step, unless the user explicitly asks to change that.
- Do not overwrite manually-entered (non-Hostaway) property records during
  any sync, ever.
- Do not hardcode the Hostaway Account ID or Secret API Key anywhere in the
  codebase — read them from environment variables / a secrets manager.
