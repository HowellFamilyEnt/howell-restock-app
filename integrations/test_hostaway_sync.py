"""
Unit test for the merge/upsert logic in hostaway_sync.py, using mocked
Hostaway listing payloads -- no network call, no real credentials needed.
Run against a throwaway COPY of the workbook, never the original.
"""
import shutil
import openpyxl
from hostaway_sync import sync_to_workbook, map_listing

SRC = "Howell_Restock_Data_Model.xlsx"
COPY = "test_copy.xlsx"
shutil.copy(SRC, COPY)

# Fake Hostaway API payload: one listing that should UPDATE an existing
# manually-tagged-as-Hostaway row (P002 style), plus two brand-new listings.
mock_listings = [
    {  # pretend this one was already synced once before (hostaway id 9001)
        "id": 9001, "name": "Existing STR Unit - Downtown Loft",
        "address": "500 N Broadway", "city": "Oklahoma City", "state": "OK", "zipcode": "73102",
    },
    {"id": 9002, "name": "New Listing - Bricktown 2BR", "address": "212 E California Ave",
     "city": "Oklahoma City", "state": "OK", "zipcode": "73104"},
    {"id": 9003, "name": None, "address": "77 Riverside Dr",
     "city": "Oklahoma City", "state": "OK", "zipcode": "73109"},
]

wb = openpyxl.load_workbook(COPY)
ws = wb["Properties"]
before_rows = ws.max_row
before_manual = [ws.cell(row=r, column=2).value for r in range(2, 10)]  # original 8 manual rows

# Pre-seed hostaway id 9001 onto an existing row to simulate "ran sync before"
ws.cell(row=10, column=1, value="P009")
ws.cell(row=10, column=2, value="Old Name Before Update")
ws.cell(row=10, column=3, value="STR")
ws.cell(row=10, column=4, value=1)
ws.cell(row=10, column=9, value="9001")
ws.cell(row=10, column=10, value="Hostaway")
wb.save(COPY)

created, updated = sync_to_workbook(COPY, mock_listings)
print(f"created={created} updated={updated}")
assert created == 2, f"expected 2 new rows, got {created}"
assert updated == 1, f"expected 1 updated row, got {updated}"

wb2 = openpyxl.load_workbook(COPY)
ws2 = wb2["Properties"]

# Confirm the pre-existing Hostaway row got its name updated, not duplicated
row10_name = ws2.cell(row=10, column=2).value
assert row10_name == "Existing STR Unit - Downtown Loft", row10_name

# Confirm the 8 original MANUAL rows were untouched
after_manual = [ws2.cell(row=r, column=2).value for r in range(2, 10)]
assert after_manual == before_manual, "manual rows were modified!"

# Confirm two new rows were appended with correct defaults
new_ids = set()
for r in range(11, ws2.max_row + 1):
    pid = ws2.cell(row=r, column=1).value
    src = ws2.cell(row=r, column=10).value
    freq = ws2.cell(row=r, column=6).value
    active = ws2.cell(row=r, column=8).value
    assert src == "Hostaway"
    assert freq == 14
    assert active == "Y"
    new_ids.add(pid)
assert len(new_ids) == 2, new_ids

print("ALL CHECKS PASSED")
print(f"Workbook grew from {before_rows} to {ws2.max_row} rows as expected.")
