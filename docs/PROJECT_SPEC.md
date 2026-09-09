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

### 3.8 Team & work orders
Built ahead of the original phased order at the user's explicit request
(see section 8).

- **Team**: admin maintains a list of team members (name, email, phone).
  Each property can have one assigned team member.
- **Work orders**: a snapshot task for one property's upcoming restock
  visit. Created either by hand (from the property page or the Work Orders
  page) or by the daily sweep (see below). Each line item copies that
  item's par level (`target_qty`) at creation time, so the work order stays
  stable even if par levels change afterward.
- **Crew access**: no crew login exists yet. Each work order gets an
  unguessable `share_token` and is reachable at `/wo/[token]` with no
  authentication — the token itself is the access control. That page shows
  the property name/address/master door code and, per item: name, qty
  needed, and fillable "qty on site" / "qty added" fields with a
  per-row "Mark completed" button. Completing a row creates a
  `restock_events` row (see below) and decrements central stock exactly
  like the admin `/restock` form; the parent work order auto-closes once
  every row is completed. This is a v1 tradeoff — a real crew-login system
  (Field role, scoped mobile view) is more secure and matches the original
  Phase 2 plan, but is a larger separate build.
- **Daily sweep**: for every active property whose next scheduled restock
  (last restock date + cadence) is tomorrow, and that doesn't already have
  a work order for that date, create one and email/text the shareable link
  to the assigned team member (Resend for email, Twilio for SMS — see
  section 6). Currently triggered by hand via the "Send today's work
  orders" button on the Work Orders page; true unattended daily automation
  needs a cron trigger, which needs a hosting decision first (section 7).
- **Managing a work order**: an admin can, at any time, reassign it to a
  different team member and resend the link (independent of the daily
  sweep), reopen a Completed/Archived one back to Open, archive it, or
  delete it outright. Deleting a work order removes its line items but
  never touches `restock_events` already logged from it, so usage reports
  aren't affected. The Work Orders list can be filtered by status
  (Open+Completed / Open / Completed / Archived / All) and supports
  selecting multiple rows for a bulk send / archive / delete.
- **Reporting**: `qty_added` on each completed line item is what drives
  central stock and `restock_events`, so "how much of X does property Y go
  through" reporting can run off `restock_events` alone, the same as
  manually-logged restocks. `qty_on_site` is captured but not currently
  used in any calculation — it's a snapshot for the admin to eyeball.

### 3.9 Team access links
A second, deliberately lower-security way into the app, built at the
user's explicit request ("I don't need secure logins"). From Settings, the
admin creates a named link (e.g. "Restocking Team") and checks which
sections it can see — any of Properties, Items, Log Restock, Calendar,
Work Orders, Team. **Settings itself is never an option and can never be
granted** — it holds the Hostaway/Resend/Twilio credentials, so it always
requires the real admin login regardless of what a link's permissions say.

Visiting `/access/[token]` sets a long-lived cookie and drops the visitor
into their first permitted section, with a nav bar showing only sections
they're allowed. The link's name (not an email) shows where the admin's
identity normally would, and "Exit" (clears the cookie) stands in for
"Sign out". There's no password and no per-user identity beyond the link
itself — anyone who has the URL has whatever access it grants, so treat
each link like a shared key: create one per team/role rather than one per
person, and delete/deactivate it from Settings if it's ever compromised.
Deactivating (not deleting) is reversible if it turns out to be needed
again; deleting is not.

## 4. Data Model

Field names below match the validated Excel prototype
(`reference/Howell_Restock_Data_Model.xlsx`) — keep them consistent when
this becomes real database tables.

**properties**
| field | type | notes |
|---|---|---|
| id | PK | e.g. `P001` |
| name_address | text | |
| address | text, nullable | street address; pulled from Hostaway for STR listings, entered manually for LTR/HUD-VASH |
| bedrooms | int, nullable | pulled from Hostaway (`bedroomsNumber`) for STR listings |
| bathrooms | decimal, nullable | pulled from Hostaway (`bathroomsNumber`) for STR listings |
| type | enum | STR / LTR / HUD-VASH |
| unit_count | int | |
| assigned_cleaning_team | text | |
| restock_frequency_days | int | drives auto-scheduling |
| urgent_restock_requested | bool | set by the crew's one-tap button |
| active | bool | |
| hostaway_listing_id | text, nullable, unique | null for manually-entered properties |
| source | enum | Hostaway / Manual |
| master_door_code | text, nullable | entered manually; never touched by Hostaway sync |
| general_notes | text, nullable | free-form notes; entered manually; never touched by Hostaway sync |
| assignedTeamMemberId | FK -> team_members, nullable | who work order links get sent to for this property |

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
| active | bool | soft delete - hides from catalog/logging/par levels without losing restock history; hard delete only allowed when the item has no restock history, par levels, or work order references |

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
| logged_by | FK -> users, nullable | null when logged via a work order's public link (no crew login) |
| logged_by_name | text, nullable | free-text attribution when `logged_by` is null, e.g. the team member's name |
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

**team_members** (see section 3.8 — separate from `users`; no login)
| field | type | notes |
|---|---|---|
| id | PK | |
| name | text | |
| email | text, nullable | |
| phone | text, nullable | E.164, e.g. `+15551234567` |
| active | bool | |

**work_orders**
| field | type | notes |
|---|---|---|
| id | PK | |
| property_id | FK -> properties | |
| assigned_team_member_id | FK -> team_members, nullable | can be reassigned after creation; not just a snapshot |
| share_token | text, unique | unguessable; grants access to `/wo/[token]` with no login |
| status | enum | Open / Completed / Archived — auto-flips to Completed when every line item is done; an admin manually archives it afterward (see 3.8) |
| scheduled_for | date, nullable | the restock-due date this work order corresponds to; used by the daily sweep to avoid creating duplicates |
| sent_at | timestamp, nullable | when the link was actually emailed/texted |
| created_by | FK -> users, nullable | null for sweep-created work orders |

**work_order_items**
| field | type | notes |
|---|---|---|
| id | PK | |
| work_order_id | FK -> work_orders | |
| item_id | FK -> items | |
| qty_needed | int | snapshot of the property's par level at creation time |
| qty_on_site | int, nullable | filled in by whoever completes the row |
| qty_added | int, nullable | filled in by whoever completes the row; drives the `restock_events` row created on completion |
| completed | bool | |

**access_links** (see section 3.9 — no relation to `users`)
| field | type | notes |
|---|---|---|
| id | PK | |
| name | text | shown in the nav in place of an email for this session |
| token | text, unique | unguessable; grants access to `/access/[token]` with no login |
| sections | text array | which of Properties/Items/Log Restock/Calendar/Work Orders/Team it can see; Settings can never appear here |
| active | bool | deactivating is reversible; deleting is not |

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
  Hostaway-sourced property records (name/address/unit count/bedrooms/
  bathrooms), append new listings as new properties with default cadence,
  and never touch manually-entered (`source = Manual`) rows.
- Reference implementation: `integrations/hostaway_sync.py` (Python,
  openpyxl-based — written for the Excel prototype, but the auth flow,
  pagination, and merge semantics port directly to the real backend). It's
  been unit-tested against mocked listing data
  (`integrations/test_hostaway_sync.py`) but never run against a live
  Hostaway account — verify against a real (or sandboxed) account before
  relying on it.
- In production this becomes a scheduled job (e.g. nightly), not something
  triggered by hand.

Work order notifications (section 3.8) use the same env-var-or-Settings-page
credential pattern: Resend for email (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
and Twilio for SMS (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM_NUMBER`). Neither is required — a team member missing both a
configured channel and their own email/phone just doesn't get a link sent,
and the work order still gets created for the admin to share by hand.

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

Built out of order, at the user's explicit request, ahead of the phases
above: item edit/deactivate/delete, Hostaway sync now also pulls
address/bedrooms/bathrooms, master door code + general notes per property,
and the Team & work order system (section 3.8) — including a crew-facing
work order page, which is a lighter-weight stand-in for the full Field-role
mobile view originally planned as Phase 2.

## 9. Open Decisions (ask the user, don't assume)

- Does restock cadence need to vary by item within a property, or is one
  cadence per property enough? (Prototype assumes one per property.)
- Anything missing from item categories or the repair/notes fields?
- Auto-reorder: stop at "generate approval list," or eventually go further?
- Final tech stack (section 7 is a starting proposal only)
