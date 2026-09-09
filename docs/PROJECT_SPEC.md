# Project Spec: Restock & Inventory App

## 1. Problem

Jeremy Howell operates 60+ properties across three types — short-term
rentals (Airbnb, managed via Hostaway), long-term rentals, and HUD-VASH
voucher units. Tracking what needs restocking, when, and by how much is
currently manual and doesn't scale. This app needs to:

- Track what's stocked at each property and to what target quantity (par level)
- Auto-schedule the next restock per property
- Let the cleaning crew request an early/urgent restock with one tap
- Track central inventory and flag when to reorder (and eventually automate reordering)
- Let the crew attach phone photos to a property for repairs or notes
- Pull STR property data automatically from Hostaway instead of manual entry

## 2. Users & Roles

| Role | Access |
|---|---|
| Admin (Jeremy / office) | Full access: all properties, dashboard, inventory, reporting, settings |
| Field (cleaning crew) | Mobile view scoped to their assigned properties: log a restock, hit "urgent restock needed," upload a photo/note |
| Read-only (optional, future) | View dashboard only |

Field accounts should require close to zero typing — dropdowns and taps, not forms.

## 3. Core Features

### 3.1 Property & inventory catalog
Master property list (address, type, unit count, assigned crew) and item
catalog (name, category, unit of measure, central stock, reorder threshold/qty, vendor, cost).

### 3.2 Par levels
Target quantity of each item that belongs at each property — what "fully stocked" means per property.

### 3.3 Restocking workflow
- Auto-scheduling: each property has a restock cadence (days); next-due date = last restock date + cadence
- Crew logs what was actually delivered (property, item, quantity, date) after every visit
- One-tap "urgent restock needed" flag the crew can set any time, which overrides the schedule and surfaces at the top of the admin dashboard

### 3.4 Inventory & reordering
- Central stock levels decrement as items are logged as delivered to properties
- Low-stock alert when central stock <= reorder threshold
- Phase 1: auto-generate a purchase list for Jeremy to approve. Phase 2 (optional): vendor API integration to pre-fill a cart; still require human approval before charging, at least initially — real purchases should never be fully unattended by default.

### 3.5 Photos & repair notes
Crew can attach a phone photo to a property with a category (Restock Issue /
Repair / General) and description. Separate from the routine restock log.

### 3.6 Dashboard
Per-property status (URGENT / OVERDUE / DUE SOON / OK), portfolio summary
counts, and a reorder list. Same logic already proven in the Excel prototype's Dashboard tab.

### 3.7 Hostaway sync
Auto-pull STR listings from Hostaway so those properties don't need manual
entry. Long-term rental and HUD-VASH units are never in Hostaway and stay
manually entered. See section 6.

## 4. Data Model

Field names below match the validated Excel prototype
(`reference/Howell_Restock_Data_Model.xlsx`) — keep them consistent when
this becomes real database tables.

**properties**
| field | type | notes |
|---|---|---|
| id | PK | e.g. `P001` |
| name_address | text | |
| type | enum | STR / LTR / HUD-VASH |
| unit_count | int | |
| assigned_cleaning_team | text | |
| restock_frequency_days | int | drives auto-scheduling |
| urgent_restock_requested | bool | set by the crew's one-tap button |
| active | bool | |
| hostaway_listing_id | text, nullable, unique | null for manually-entered properties |
| source | enum | Hostaway / Manual |

**items**
| field | type | notes |
|---|---|---|
| id | PK | e.g. `I001` |
| name | text | |
| category | text | |
| unit_of_measure | text | |
| central_stock_qty | int | |
| reorder_threshold | int | |
| reorder_qty | int | |
| preferred_vendor | text | |
| unit_cost | decimal | |

**par_levels** (junction: property x item)
| field | type | notes |
|---|---|---|
| id | PK | |
| property_id | FK -> properties | |
| item_id | FK -> items | |
| target_qty | int | |

**restock_events**
| field | type | notes |
|---|---|---|
| id | PK | |
| property_id | FK -> properties | |
| item_id | FK -> items | |
| date | date | |
| qty_delivered | int | |
| logged_by | FK -> users | |
| urgent_flag | bool | was this an early/urgent visit |
| notes | text | |

**notes** (repair & photo log)
| field | type | notes |
|---|---|---|
| id | PK | |
| property_id | FK -> properties | |
| date | date | |
| category | enum | Restock Issue / Repair / General |
| description | text | |
| photo_url | text | |
| status | enum | Open / Resolved |

**users**
| field | type | notes |
|---|---|---|
| id | PK | |
| name | text | |
| email | text | |
| role | enum | Admin / Field |
| password_hash | text | |
| assigned_properties | FK list | for Field role scoping |

## 5. Dashboard Logic (per property)

```
last_restock_date  = MAX(restock_events.date WHERE property_id = X)
next_restock_due    = last_restock_date + properties.restock_frequency_days
days_until_due       = next_restock_due - today
status:
  if urgent_restock_requested        -> "URGENT"
  elif last_restock_date is null      -> "NOT SET"
  elif days_until_due < 0             -> "OVERDUE"
  elif days_until_due <= 7            -> "DUE SOON"
  else                                 -> "OK"
```

Portfolio summary: total active properties, count urgent, count overdue,
count due soon, count items where `central_stock_qty <= reorder_threshold`.

## 6. Hostaway Integration

- Auth: OAuth 2.0 Client Credentials Grant. Token endpoint
  `POST https://api.hostaway.com/v1/accessTokens`, base URL
  `https://api.hostaway.com/v1`, listings at `GET /listings`
  (cursor pagination via `afterId`). Credentials (Account ID + Secret API
  Key) come from the user's Hostaway dashboard: Settings -> Integrations -> API.
- Rate limits: 15 req/10s per IP, 20 req/10s per account — a full 60-property
  pull is a couple of calls, not a concern.
- Sync is additive and one-directional (Hostaway -> app): update
  Hostaway-sourced property records (name/address/unit count), append new
  listings as new properties with default cadence, and never touch
  manually-entered (`source = Manual`) rows.
- Reference implementation: `integrations/hostaway_sync.py` (Python,
  openpyxl-based — written for the Excel prototype, but the auth flow,
  pagination, and merge semantics port directly to the real backend). It's
  been unit-tested against mocked listing data
  (`integrations/test_hostaway_sync.py`) but never run against a live
  Hostaway account — verify against a real (or sandboxed) account before
  relying on it.
- In production this becomes a scheduled job (e.g. nightly), not something
  triggered by hand.

## 7. Tech Stack — Recommendation, Not a Decision

Discuss with the user before committing. A reasonable starting point given
the requirements (mobile-first crew view, photo upload, moderate but real
complexity, one operator maintaining it):

- Frontend: React (mobile-responsive), or Next.js if server rendering /
  simpler auth helps
- Backend: Node/Express or Python/FastAPI — whichever the user is more
  comfortable maintaining
- Database: PostgreSQL
- File storage: S3-compatible bucket for photos
- Auth: simple email/password + role-based access to start; revisit SSO later
- Hosting: something low-maintenance for a single-operator business
  (Render, Railway, Fly.io) rather than raw cloud infra

## 8. Phased Roadmap

1. Property + item list, par levels, manual restock logging, admin login only
2. Mobile crew view with the one-tap "urgent restock" button
3. Auto-scheduling dashboard (the logic in section 5)
4. Low-stock alerts + reorder list generation
5. Photo/repair capture
6. Hostaway sync as a scheduled job
7. Vendor integration for semi- or fully-automated reordering (approval step first)

## 9. Open Decisions (ask the user, don't assume)

- Does restock cadence need to vary by item within a property, or is one
  cadence per property enough? (Prototype assumes one per property.)
- Anything missing from item categories or the repair/notes fields?
- Auto-reorder: stop at "generate approval list," or eventually go further?
- Final tech stack (section 7 is a starting proposal only)
