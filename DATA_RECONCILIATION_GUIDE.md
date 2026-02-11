# Data Reconciliation Guide

This guide explains how to use the data export and reconciliation tools to debug route data mismatches.

## Problem: Aalsmeer Evening Shows 0 Orders

If the Dashboard shows **0 orders for Aalsmeer Evening (Route 5)** but Excel has 30+ clients, use these tools to identify the issue.

---

## Quick Start

### 1. Export API Data

**From Dashboard:**
1. Go to Dashboard (`index.html`)
2. Click **"Sync"** to load orders from API
3. Click **"Export Data"** button (green button next to Sync)
4. Choose Excel or CSV format
5. File will download: `api_orders_export_YYYY-MM-DD.xlsx` or `.csv`

**From Browser Console:**
```javascript
// Load export module
const exporter = new DataExporter();

// Export to Excel
await exporter.exportToExcel('2026-02-09');

// Or export to CSV
exporter.exportToCSV('2026-02-09');
```

### 2. Debug Route Issue

**Using Debug Page:**
1. Open `debug_route_issue.html` in browser
2. Select route: **"Aalsmeer Evening (Route 5)"**
3. Click **"🔍 Debug Route"**
4. Review the analysis:
   - Expected customers (from route mapping)
   - API orders found
   - Matched/unmatched customers
   - Potential name variations

**From Browser Console:**
```javascript
// Debug specific route
const exporter = new DataExporter();
exporter.debugRouteIssue('aalsmeer_evening');

// Debug specific customer
exporter.debugCustomerRoute('Akkus');
```

### 3. Compare with Excel

**Using Python Script:**
```bash
# Install dependencies
pip install pandas openpyxl

# Run reconciliation
python data_reconciliation.py \
  --excel Planningstabel_2_0__2_.xlsx \
  --api-export api_orders_export_2026-02-09.csv \
  --date 2026-02-09 \
  --output reconciliation_report.xlsx
```

This generates:
- **Summary sheet**: Route-by-route comparison
- **Details sheet**: Missing/extra customers
- **Per-route sheets**: Detailed differences

---

## Export File Structure

### Excel Format (`api_orders_export_YYYY-MM-DD.xlsx`)

**Sheet 1: Summary**
| Route | Departure Time | Total Orders | Unique Customers | Total Carts | Status |
|-------|---------------|--------------|------------------|-------------|--------|
| Rijnsburg Morning | 09:00 | 162 | 25 | 45 | ✅ Active |
| Aalsmeer Evening | 18:00 | 0 | 0 | 0 | ❌ No Orders |

**Sheet 2-N: Per Route**
| Row # | Order ID | Customer Name | Route | Period | City | Delivery Date | FUST Type | FUST Count | Carts Needed | Status |
|-------|----------|---------------|-------|--------|------|---------------|-----------|------------|--------------|--------|
| 1 | ORD001 | Akkus | Aalsmeer (EVENING) | EVENING | Aalsmeer | 2026-02-09 | 612 | 5 | 1 | Active |

### CSV Format (`api_orders_export_YYYY-MM-DD.csv`)

Same columns as Excel, all routes in one file, grouped by `Route Key` column.

---

## Debugging Checklist

### Step 1: Verify API Has Orders
```javascript
// Check total orders
const orders = window.appState.orders || [];
console.log(`Total orders: ${orders.length}`);

// Check Aalsmeer evening orders
const aalsmeerEvening = orders.filter(o => 
    (o.route || '').toLowerCase() === 'aalsmeer' && 
    (o.period || 'morning') === 'evening'
);
console.log(`Aalsmeer evening orders: ${aalsmeerEvening.length}`);
```

### Step 2: Check Route Mapping
```javascript
// Check expected customers
const expected = window.RouteMapping.CLIENT_ROUTE_MAPPING['aalsmeer_evening'];
console.log('Expected customers:', expected);

// Test customer matching
window.RouteMapping.getRouteInfoForCustomer('Akkus');
```

### Step 3: Check Customer Names
```javascript
// Get all unique customers
const allCustomers = [...new Set(orders.map(o => o.customer_name || o.customer))];
console.log('All API customers:', allCustomers);

// Find customers that might match Aalsmeer evening
const aalsmeerCustomers = window.RouteMapping.CLIENT_ROUTE_MAPPING['aalsmeer_evening'];
allCustomers.forEach(apiCustomer => {
    const matched = aalsmeerCustomers.some(expected => 
        expected.toLowerCase().includes(apiCustomer.toLowerCase()) ||
        apiCustomer.toLowerCase().includes(expected.toLowerCase())
    );
    if (matched) {
        console.log(`✅ Potential match: "${apiCustomer}"`);
    }
});
```

### Step 4: Check Date Filtering
```javascript
// Check delivery dates
const orders = window.appState.orders || [];
orders.forEach(order => {
    console.log(`Order: ${order.customer_name}, Date: ${order.delivery_date}, Route: ${order.route}, Period: ${order.period}`);
});
```

---

## Common Issues & Solutions

### Issue 1: Route Shows 0 Orders

**Possible Causes:**
1. **Customer names don't match route mapping**
   - Solution: Add name variations to `js/route-mapping.js`
   - Use `debug_route_issue.html` to find unmatched customers

2. **Date filtering excludes orders**
   - Check: `order.delivery_date` format
   - Check: Date picker value matches API date format

3. **Period assignment incorrect**
   - Check: `order.period` is set to `'evening'` not `'morning'`
   - Check: `inferPeriodFromOrder()` logic in `route-mapping.js`

4. **Route assignment incorrect**
   - Check: `order.route` is set to `'aalsmeer'` not `'rijnsburg'`
   - Check: `isKnownClient()` returns correct route

### Issue 2: Customer Names Don't Match

**Solution: Add Name Variations**
```javascript
// In js/route-mapping.js, add to CLIENT_ROUTE_MAPPING['aalsmeer_evening']:
'aalsmeer_evening': [
    // ... existing entries ...
    'Akkus',                    // Original
    'Akkus BV',                 // Add variation
    'Akkus Bloemen',            // Add variation
    // ... etc
]
```

**Use Debug Tool to Find Variations:**
1. Open `debug_route_issue.html`
2. Enter customer name in "Customer Name Matching Test"
3. Check which route it matches (or if it doesn't match)
4. Add variation to correct route mapping

### Issue 3: Export File Empty

**Check:**
1. Orders are loaded: `window.appState.orders.length > 0`
2. Export module loaded: `typeof DataExporter !== 'undefined'`
3. Browser allows downloads (check popup blocker)

**Fix:**
```javascript
// Force reload orders
await window.syncDataForDate();

// Then export
const exporter = new DataExporter();
await exporter.exportToExcel();
```

---

## Python Reconciliation Script

### Installation
```bash
pip install pandas openpyxl
```

### Usage
```bash
python data_reconciliation.py \
  --excel /path/to/Planningstabel_2_0__2_.xlsx \
  --api-export /path/to/api_orders_export_2026-02-09.csv \
  --date 2026-02-09 \
  --output reconciliation_report.xlsx
```

### Output
The script generates `reconciliation_report.xlsx` with:
- **Summary**: Route-by-route comparison table
- **Details**: List of missing/extra customers per route
- **Per-route sheets**: Detailed differences for each route

### Example Output
```
Route                  | Excel Orders | API Orders | Difference | Status
----------------------|--------------|------------|------------|--------
aalsmeer_evening      | 30           | 0          | -30        | ❌ MISMATCH
rijnsburg_evening     | 2            | 2          | 0          | ✅ MATCH
naaldwijk_evening     | 18           | 18         | 0          | ✅ MATCH
```

---

## SQL Debugging Queries

If you have direct database access, use these queries:

### Check Orders by Route
```sql
-- Count orders by route and period
SELECT 
    route,
    period,
    COUNT(DISTINCT order_id) as order_count,
    COUNT(DISTINCT customer_name) as customer_count
FROM orders
WHERE delivery_date = '2026-02-09'
GROUP BY route, period;
```

### Check Aalsmeer Evening Orders
```sql
-- Find all Aalsmeer evening orders
SELECT 
    order_id,
    customer_name,
    delivery_date,
    delivery_time,
    route,
    period
FROM orders
WHERE delivery_date = '2026-02-09'
  AND route = 'aalsmeer'
  AND period = 'evening';
```

### Check Unmatched Customers
```sql
-- Find customers not in route mapping
SELECT DISTINCT customer_name
FROM orders
WHERE delivery_date = '2026-02-09'
  AND customer_name NOT IN (
    -- List of expected customers from route mapping
    SELECT customer_name FROM route_mapping
  );
```

---

## Files Created

1. **`js/data-export.js`**: Export module for browser
2. **`data_reconciliation.py`**: Python comparison script
3. **`debug_route_issue.html`**: Visual debugging tool
4. **`DATA_RECONCILIATION_GUIDE.md`**: This file

---

## Next Steps After Finding Issue

1. **If customer names don't match:**
   - Add variations to `js/route-mapping.js`
   - Test with `debug_route_issue.html`
   - Re-export and verify

2. **If date filtering issue:**
   - Check date format in API response
   - Check `filterOrdersByDeliveryDate()` function
   - Verify date picker value

3. **If route assignment issue:**
   - Check `isKnownClient()` function
   - Check `inferPeriodFromOrder()` function
   - Add special cases if needed

4. **If period assignment issue:**
   - Check delivery_time vs period logic
   - Verify evening route time windows (17:00-19:00)
   - Check `separateOrdersByClientMatch()` function

---

## Support

If issues persist:
1. Export API data and Excel data
2. Run reconciliation script
3. Check browser console for errors
4. Use debug tool to identify specific mismatches
5. Share export files and debug output for analysis

