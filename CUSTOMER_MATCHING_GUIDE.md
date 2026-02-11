# Customer Matching & Excel Update Guide

Complete guide for matching API customers with Excel customers and updating the Excel file.

---

## 📋 Prerequisites

### Install Python Dependencies

```bash
# Recommended: rapidfuzz (faster, better)
pip install rapidfuzz pandas openpyxl

# OR alternative: fuzzywuzzy (slower but works)
pip install fuzzywuzzy pandas openpyxl python-Levenshtein
```

---

## 🚀 Step-by-Step Process

### Step 1: Export API Data

1. Go to Dashboard
2. Click "Sync" to load orders
3. Click "Export Data" → Choose CSV format
4. Save as: `api_orders_export_2026-02-09.csv`

### Step 2: Run Fuzzy Matching

```bash
python fuzzy_match_customers.py \
  --api api_orders_export_2026-02-09.csv \
  --excel Planningstabel_2_0__2_.xlsx \
  --output customer_mapping.csv \
  --threshold-high 90 \
  --threshold-medium 70
```

**Output:** `customer_mapping.csv` with all matches and suggested actions.

**Review the mapping file:**
- ✅ **UPDATE_EXCEL** (High confidence ≥90%): Safe to auto-update
- ⚠️ **REVIEW** (Medium confidence 70-89%): Check manually
- ❌ **NOT_IN_API**: Customer in Excel but not in API (might be old/inactive)
- ➕ **ADD_TO_EXCEL**: Customer in API but not in Excel (needs to be added)

### Step 3: Review Mapping (IMPORTANT!)

Open `customer_mapping.csv` in Excel and review:

1. **Check high confidence matches** - Should be correct
2. **Review medium confidence matches** - Verify they're correct
3. **Handle special cases:**
   - **"Hoekhuis" → Multiple variants**: Excel has 1 entry, API has 5 variants
     - Solution: Will create 5 separate rows in Excel
   - **"Zalam" → "Zalam BV"**: Simple name update
   - **"Akkus" → "Akkus BV"**: Simple name update

### Step 4: Update Excel File

**Option A: Auto-update high confidence only (Recommended)**
```bash
python update_excel_customers.py \
  --excel Planningstabel_2_0__2_.xlsx \
  --mapping customer_mapping.csv \
  --output Planningstabel_2_0__2_UPDATED.xlsx \
  --auto-update
```

**Option B: Review before updating**
```bash
python update_excel_customers.py \
  --excel Planningstabel_2_0__2_.xlsx \
  --mapping customer_mapping.csv \
  --output Planningstabel_2_0__2_UPDATED.xlsx
```
This will show you all changes before applying them.

**What happens:**
- ✅ Creates backup of original file
- ✅ Updates customer names (e.g., "Akkus" → "Akkus BV")
- ✅ Adds missing customers to appropriate sheets
- ✅ Sorts customers alphabetically
- ✅ Creates "Changes_Log" sheet with all changes

### Step 5: Generate Reconciliation Report

```bash
python generate_reconciliation_report.py \
  --api api_orders_export_2026-02-09.csv \
  --excel-before Planningstabel_2_0__2_.xlsx \
  --excel-after Planningstabel_2_0__2_UPDATED.xlsx \
  --output reconciliation_report.xlsx
```

**Output:** Detailed report showing:
- Before/After comparison
- Match rates per route
- List of all changes
- Remaining issues

---

## 📊 Understanding the Results

### Mapping File Columns

| Column | Description |
|--------|-------------|
| Route | Route key (aalsmeer_evening, etc.) |
| Excel_Name | Customer name from Excel |
| API_Name | Customer name from API |
| Match_Score | Similarity score (0-100%) |
| Confidence | HIGH/MEDIUM/LOW/NONE |
| Action | UPDATE_EXCEL/ADD_TO_EXCEL/REVIEW/etc. |
| Notes | Explanation of the match |

### Example Mapping Results

```csv
Route,Excel_Name,API_Name,Match_Score,Confidence,Action,Notes
aalsmeer_evening,Akkus,Akkus BV,95.0%,HIGH,UPDATE_EXCEL,"High confidence match (95.0%)"
naaldwijk_evening,Hoekhuis,Hoekhuis Naaldwijk Villa,85.0%,MEDIUM,REVIEW,"Medium confidence match (85.0%) - review needed"
naaldwijk_evening,,Hoekhuis Naaldwijk Klondike,0%,NONE,ADD_TO_EXCEL,"Customer exists in API but not in Excel - needs to be added"
```

---

## 🔧 Handling Special Cases

### Case 1: One Excel Name → Multiple API Names

**Example:** Excel has "Hoekhuis", API has 5 variants:
- Hoekhuis Naaldwijk Villa
- Hoekhuis Naaldwijk Klondike
- Hoekhuis Naaldwijk Koolhaas
- Hoekhuis Naaldwijk Houter
- Hoekhuis Naaldwijk Zuidplas

**Solution:** The update script will:
1. Update "Hoekhuis" to "Hoekhuis Naaldwijk Villa" (best match)
2. Add the other 4 variants as new rows

**Manual fix (if needed):**
- Review the mapping file
- For each variant, ensure it's marked as "ADD_TO_EXCEL"
- Run update script

### Case 2: Name Variations

**Example:** "Hans Visser P" vs "Hans Visser Potplanten BV"

**Solution:**
- If match score ≥90%: Auto-update
- If match score 70-89%: Review manually
- If match score <70%: Manual review required

### Case 3: Customers Not in API

**Example:** Excel has "Old Customer" but API doesn't have it

**Action:** Marked as "NOT_IN_API"
- Keep in Excel (might be inactive but still in planning)
- Or remove if confirmed inactive

### Case 4: New Customers in API

**Example:** API has "New Customer BV" but Excel doesn't

**Action:** Marked as "ADD_TO_EXCEL"
- Will be added to appropriate route sheet
- Cart columns will be empty (fill manually later)

---

## ⚠️ Important Notes

1. **Always backup first!** The script creates a backup automatically, but keep your own backup too.

2. **Review before updating:** Don't auto-update everything blindly. Review medium/low confidence matches.

3. **Preserve Excel structure:** The script maintains:
   - Column structure (cart types, totals, etc.)
   - Existing data (only updates customer names)
   - Sheet organization

4. **Test on copy first:** Run on a copy of your Excel file first to verify results.

5. **Handle edge cases manually:**
   - Special characters (é, ü, etc.)
   - Very long names
   - Names with unusual formatting

---

## 🐛 Troubleshooting

### Issue: "No module named 'rapidfuzz'"

**Solution:**
```bash
pip install rapidfuzz
# OR
pip install fuzzywuzzy python-Levenshtein
```

### Issue: "Customer column not found"

**Solution:** The script looks for columns with names containing:
- "klant", "customer", "client", "naam", "name"
- If not found, uses first column
- Check your Excel file structure

### Issue: "Too many false matches"

**Solution:** Adjust thresholds:
```bash
python fuzzy_match_customers.py \
  --threshold-high 95 \  # Increase for stricter matching
  --threshold-medium 80
```

### Issue: "Excel file locked"

**Solution:** Close Excel file before running update script.

---

## 📈 Expected Results

### Before Fix:
- Aalsmeer Evening: 30 Excel, 0 API matches (0%)
- Naaldwijk Evening: 22 Excel, 0 API matches (0%)
- Rijnsburg Evening: 15 Excel, 1 API match (7%)

### After Fix:
- Aalsmeer Evening: ~30 Excel, ~25-30 API matches (80-100%)
- Naaldwijk Evening: ~25 Excel, ~20-25 API matches (80-100%)
- Rijnsburg Evening: ~15 Excel, ~10-15 API matches (70-100%)

**Note:** Match rates depend on:
- How many API customers actually exist
- Name similarity
- Route assignment accuracy

---

## ✅ Validation Checklist

After updating Excel, verify:

- [ ] Backup file created
- [ ] All high confidence matches updated
- [ ] New customers added to correct sheets
- [ ] Customer names match API format
- [ ] Excel structure preserved
- [ ] Changes log created
- [ ] Reconciliation report shows improvement

---

## 🆘 Need Help?

1. **Check mapping file:** Review `customer_mapping.csv` for issues
2. **Check changes log:** Review "Changes_Log" sheet in updated Excel
3. **Check reconciliation report:** See before/after comparison
4. **Manual review:** For low confidence matches, review manually

---

## 📞 Next Steps

After updating Excel:

1. **Update route-mapping.js:** Add new customer names to JavaScript mapping
2. **Test matching:** Use debug tool to verify customers match
3. **Re-export API data:** Verify match rates improved
4. **Update documentation:** Keep track of changes made

---

**Good luck! 🚀**

