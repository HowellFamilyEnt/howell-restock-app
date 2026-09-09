"""
Hostaway -> Restock Workbook property sync.

Pulls live listings from Hostaway's Public API and upserts them into the
"Properties" tab of the restock workbook, WITHOUT touching the operational
fields you set yourself (Assigned Cleaning Team, Restock Frequency, Urgent
flag). Rows are matched to Hostaway listings by the "Hostaway Listing ID"
column; rows with Source = "Manual" (your long-term rental / HUD-VASH units)
are never touched.

SETUP
-----
1. In Hostaway: Settings -> Integrations -> API, generate an Account ID
   (client_id) and Secret API Key (client_secret).
2. Set them as environment variables. Do not hardcode them in this file or
   paste them into a chat -- they're a credential, treat them like one.

       export HOSTAWAY_ACCOUNT_ID="12345"
       export HOSTAWAY_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"

3. Run:

       python hostaway_sync.py --workbook Howell_Restock_Data_Model.xlsx

WHAT IT DOES
------------
- Existing Hostaway-sourced rows: updates name/address/unit count only.
- New Hostaway listings not yet in the sheet: adds a new row with sensible
  defaults (14-day restock cadence, Active=Y, Urgent=N, Source=Hostaway) --
  edit Assigned Cleaning Team and cadence after the first sync.
- Manual rows (your LTR / HUD-VASH units): never modified or removed.

NOTE ON TESTING
----------------
This script was written and unit-tested against mocked Hostaway responses
(see test_hostaway_sync.py). It has NOT been run against your live Hostaway
account -- do that first against a copy of the workbook, not the original.
"""

import argparse
import os
import sys
import time

import openpyxl
from openpyxl.styles import Font

TOKEN_URL = "https://api.hostaway.com/v1/accessTokens"
LISTINGS_URL = "https://api.hostaway.com/v1/listings"
BLUE = Font(name="Arial", color="0000FF")

REQUIRED_COLUMNS = [
    "Property ID", "Property Name / Address", "Type", "Unit Count",
    "Assigned Cleaning Team", "Restock Frequency (Days)",
    "Urgent Restock Requested?", "Active?", "Hostaway Listing ID", "Source",
]


def get_access_token(account_id: str, api_key: str) -> str:
    import requests  # local import so the rest of the file works without the package installed

    resp = requests.post(
        TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Cache-control": "no-cache"},
        data={
            "client_id": account_id,
            "client_secret": api_key,
            "grant_type": "client_credentials",
            "scope": "general",
        },
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    time.sleep(1)  # Hostaway requires waiting >=1s before a freshly issued token is used
    return token


def fetch_all_listings(token: str) -> list:
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    listings = []
    after_id = 0
    while True:
        resp = requests.get(
            LISTINGS_URL,
            headers=headers,
            params={"limit": 100, "afterId": after_id},
            timeout=30,
        )
        resp.raise_for_status()
        page = resp.json().get("result", [])
        if not page:
            break
        listings.extend(page)
        after_id = page[-1]["id"]
        if len(page) < 100:
            break
    return listings


def map_listing(listing: dict) -> dict:
    """Map a Hostaway listing object onto our Properties row shape."""
    address_parts = [
        listing.get("address"),
        listing.get("city"),
        listing.get("state"),
        listing.get("zipcode"),
    ]
    address = ", ".join(p for p in address_parts if p)
    return {
        "hostaway_id": str(listing.get("id")),
        "name": listing.get("name") or address or f"Hostaway Listing {listing.get('id')}",
        "unit_count": 1,
    }


def sync_to_workbook(workbook_path: str, listings: list) -> tuple:
    """Upsert mapped listings into the Properties tab. Returns (created, updated)."""
    wb = openpyxl.load_workbook(workbook_path)
    if "Properties" not in wb.sheetnames:
        raise RuntimeError("Workbook has no 'Properties' tab.")
    ws = wb["Properties"]

    header = {cell.value: cell.column for cell in ws[1]}
    for col_name in REQUIRED_COLUMNS:
        if col_name not in header:
            raise RuntimeError(
                f"Properties tab is missing expected column '{col_name}'. "
                "This script expects the schema from Howell_Restock_Data_Model.xlsx."
            )

    last_row = ws.max_row
    existing_by_hostaway_id = {}
    existing_property_ids = set()
    for row in range(2, last_row + 1):
        pid = ws.cell(row=row, column=header["Property ID"]).value
        if pid:
            existing_property_ids.add(pid)
        hid = ws.cell(row=row, column=header["Hostaway Listing ID"]).value
        if hid:
            existing_by_hostaway_id[str(hid)] = row

    next_num = [1]

    def next_property_id() -> str:
        while f"P{next_num[0]:03d}" in existing_property_ids:
            next_num[0] += 1
        pid = f"P{next_num[0]:03d}"
        existing_property_ids.add(pid)
        return pid

    next_row = last_row + 1
    created, updated = 0, 0

    for listing in listings:
        mapped = map_listing(listing)
        hid = mapped["hostaway_id"]

        if hid in existing_by_hostaway_id:
            row = existing_by_hostaway_id[hid]
            ws.cell(row=row, column=header["Property Name / Address"], value=mapped["name"]).font = BLUE
            ws.cell(row=row, column=header["Unit Count"], value=mapped["unit_count"]).font = BLUE
            updated += 1
        else:
            row = next_row
            next_row += 1
            pid = next_property_id()
            values = {
                "Property ID": pid,
                "Property Name / Address": mapped["name"],
                "Type": "STR",
                "Unit Count": mapped["unit_count"],
                "Assigned Cleaning Team": "",
                "Restock Frequency (Days)": 14,
                "Urgent Restock Requested?": "N",
                "Active?": "Y",
                "Hostaway Listing ID": hid,
                "Source": "Hostaway",
            }
            for col_name, val in values.items():
                ws.cell(row=row, column=header[col_name], value=val).font = BLUE
            created += 1

    wb.save(workbook_path)
    return created, updated


def main():
    parser = argparse.ArgumentParser(description="Sync Hostaway listings into the restock workbook.")
    parser.add_argument("--workbook", default="Howell_Restock_Data_Model.xlsx",
                         help="Path to the workbook to update in place.")
    args = parser.parse_args()

    account_id = os.environ.get("HOSTAWAY_ACCOUNT_ID")
    api_key = os.environ.get("HOSTAWAY_API_KEY")
    if not account_id or not api_key:
        sys.exit("Set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_API_KEY environment variables first (see file header).")

    token = get_access_token(account_id, api_key)
    listings = fetch_all_listings(token)
    print(f"Pulled {len(listings)} listings from Hostaway.")

    created, updated = sync_to_workbook(args.workbook, listings)
    print(f"Sync complete: {created} new propert{'y' if created == 1 else 'ies'} added, "
          f"{updated} existing propert{'y' if updated == 1 else 'ies'} updated.")


if __name__ == "__main__":
    main()
