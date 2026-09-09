# Howell Family Properties — Restock App (project starter)

This folder is a starting point for building the real app in Claude Code,
carried over from planning done in claude.ai.

## How to use this

1. Open **Claude Code Desktop** (or `claude` in a terminal) and open this
   folder as your project.
2. Claude Code reads `CLAUDE.md` automatically at the start of the session —
   you don't need to re-explain the project.
3. Just say something like "let's start on Phase 1" and it can pick up from
   `docs/PROJECT_SPEC.md`.

## What's in here

- `CLAUDE.md` — short persistent instructions Claude Code reads every session
- `docs/PROJECT_SPEC.md` — full feature list, data model, Hostaway
  integration details, and phased roadmap
- `integrations/hostaway_sync.py` — reference implementation of the Hostaway
  API sync (OAuth2 client-credentials flow, listing pull, merge logic).
  Unit-tested against mocked data; not yet run against a live account.
- `integrations/test_hostaway_sync.py` — the test that validated the merge
  logic (updates existing rows, adds new ones, never touches manually-entered
  properties)
- `reference/Howell_Restock_Data_Model.xlsx` — the working Excel prototype
  the data model and dashboard logic were validated against before any code
  was written
