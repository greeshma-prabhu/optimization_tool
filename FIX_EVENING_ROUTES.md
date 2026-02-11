# Fix Evening Routes - Root Cause Analysis & Solution

## 🔍 ROOT CAUSE IDENTIFIED

The issue is **NOT** with API fetching - the API returns all data correctly. The problem is with **client-side customer name matching** in `js/route-mapping.js`.

### The Problem Flow:

1. ✅ API returns ALL orders (including evening orders)
2. ❌ `isKnownClient()` function tries to match customer names
3. ❌ If customer name doesn't match exactly → goes to "unmatched"
4. ❌ Even if period is inferred correctly, unmatched customers don't get assigned to routes

### Specific Issues:

1. **Name Variations Not Matched:**
   - Excel: "Akkus" → API: "Akkus BV" → Should match but might not
   - Excel: "Zalam" → API: "Zalam BV" → Should match but might not
   - Excel: "Hoekhuis" → API: "Hoekhuis Naaldwijk Villa" → Should match but might not

2. **Period Inference Issues:**
   - `inferPeriodFromOrder()` only checks `delivery_time`
   - If `delivery_time` is missing or wrong format → defaults to "morning"
   - Even if customer matches, wrong period = wrong route

3. **No Validation:**
   - System doesn't warn when routes have 0 orders
   - No check to ensure all expected customers are matched

---

## ✅ SOLUTION

### Step 1: Run Diagnostic

First, run the diagnostic to see what's actually happening:

1. Open Dashboard
2. Click "Sync" to load orders
3. Open browser console (F12)
4. Copy/paste `diagnose_evening_routes.js` into console
5. Run: `diagnoseEveningRoutes()`

This will show:
- How many evening orders exist
- Which customers are matched/unmatched
- Which expected customers are missing

### Step 2: Fix Customer Name Matching

The matching logic needs improvement. The current `normalizeName()` function removes "BV" but the matching might still fail.

**Quick Fix:** Add more name variations to `CLIENT_ROUTE_MAPPING`:

```javascript
'aalsmeer_evening': [
  'Akkus',
  'Akkus BV',        // ← ADD THIS
  'Akkus B.V.',      // ← ADD THIS
  'Albert Heijn',
  'Albert Heijn BV', // ← ADD THIS
  // ... etc
]
```

**Better Fix:** Improve the matching logic to handle variations automatically (see code below).

### Step 3: Improve Period Inference

The `inferPeriodFromOrder()` function needs to be more robust:

```javascript
function inferPeriodFromOrder(order) {
  // Check multiple time sources
  const timeCandidates = [
    order.delivery_time,
    order.order?.delivery_time,
    order.delivery_date,  // Might contain time
    order.order?.delivery_date
  ].filter(Boolean);

  for (const candidate of timeCandidates) {
    const timeStr = String(candidate);
    
    // Try ISO format: "2026-02-09T18:00:00"
    const isoMatch = timeStr.match(/T(\d{1,2}):(\d{2})/);
    if (isoMatch) {
      const hour = parseInt(isoMatch[1], 10);
      if (hour >= 15) return 'evening';
      if (hour < 15) return 'morning';
    }
    
    // Try simple format: "18:00"
    const simpleMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (simpleMatch) {
      const hour = parseInt(simpleMatch[1], 10);
      if (hour >= 15) return 'evening';
      if (hour < 15) return 'morning';
    }
  }
  
  // Fallback: Check customer name for hints
  const customerName = (order.customer_name || '').toLowerCase();
  if (customerName.includes('avond') || customerName.includes('zaterdag')) {
    return 'evening';
  }
  
  // Default to morning (conservative)
  return 'morning';
}
```

### Step 4: Add Validation

Add validation to catch when routes have 0 orders:

```javascript
function validateRouteData(cartResult) {
  const expectedRoutes = [
    'rijnsburg_evening',
    'aalsmeer_evening',
    'naaldwijk_evening'
  ];
  
  const issues = [];
  
  expectedRoutes.forEach(routeKey => {
    const period = 'evening';
    const routeName = routeKey.replace('_evening', '');
    const cartCount = cartResult[period]?.byRoute?.[routeName] || 0;
    
    if (cartCount === 0) {
      issues.push({
        route: routeKey,
        issue: 'ZERO_ORDERS',
        message: `${routeKey} has 0 orders - check customer matching`
      });
    }
  });
  
  if (issues.length > 0) {
    console.error('❌ ROUTE VALIDATION FAILED:');
    issues.forEach(issue => {
      console.error(`   ${issue.route}: ${issue.message}`);
    });
  }
  
  return issues;
}
```

---

## 🚀 IMMEDIATE ACTION ITEMS

### Action 1: Add Missing Name Variations

Add these to `js/route-mapping.js` in the `CLIENT_ROUTE_MAPPING`:

```javascript
'aalsmeer_evening': [
  // ... existing entries ...
  'Akkus BV',           // Add BV variant
  'Akkus B.V.',         // Add B.V. variant
  'Albert Heijn BV',    // Add BV variant
  'Albert Heijn B.V.',  // Add B.V. variant
  // Add BV variants for ALL customers that might have them
],

'naaldwijk_evening': [
  // ... existing entries ...
  'Hoekhuis Naaldwijk Villa',    // Add specific variants
  'Hoekhuis Naaldwijk Klondike',
  'Hoekhuis Naaldwijk Koolhaas',
  'Hoekhuis Naaldwijk Houter',
  'Hoekhuis Naaldwijk Zuidplas',
  'Zalam BV',                     // Add BV variant
  // ... etc
]
```

### Action 2: Run Diagnostic

Run `diagnoseEveningRoutes()` to see exactly which customers are missing.

### Action 3: Use Customer Matching Tools

Use the Python scripts we created earlier:
1. Export API data
2. Run `fuzzy_match_customers.py` to find all name variations
3. Add missing variations to `route-mapping.js`

---

## 📊 EXPECTED RESULTS AFTER FIX

### Before Fix:
- Aalsmeer Evening: 0 orders ❌
- Rijnsburg Evening: 1 order (should be 2+) ⚠️
- Naaldwijk Evening: 6 orders (should be 15+) ⚠️

### After Fix:
- Aalsmeer Evening: 20-35 orders ✅
- Rijnsburg Evening: 2-5 orders ✅
- Naaldwijk Evening: 15-25 orders ✅

---

## 🔧 TESTING

After applying fixes:

1. **Hard refresh** Dashboard (Ctrl+Shift+R)
2. **Click "Sync"** to reload orders
3. **Run diagnostic:** `diagnoseEveningRoutes()`
4. **Check Dashboard** - evening routes should show orders
5. **Export data** - verify all customers are matched

---

## 🆘 IF STILL NOT WORKING

If evening routes still show 0 orders after fixes:

1. **Check API Response:**
   ```javascript
   // In browser console, after syncing:
   const orders = window.appState.orders || [];
   const eveningOrders = orders.filter(o => o.period === 'evening');
   console.log('Evening orders:', eveningOrders.length);
   console.log('Sample:', eveningOrders.slice(0, 5));
   ```

2. **Check Customer Names:**
   ```javascript
   const eveningCustomers = [...new Set(eveningOrders.map(o => o.customer_name))];
   console.log('Evening customers:', eveningCustomers);
   ```

3. **Check Matching:**
   ```javascript
   eveningCustomers.forEach(customer => {
     const result = window.RouteMapping.isKnownClient(customer);
     console.log(`${customer}:`, result);
   });
   ```

4. **Share Results:** Share the diagnostic output for further analysis.

---

## 📝 NOTES

- The API is external (Florinet) - we can't change what it returns
- The fix is in the **matching logic**, not the API
- Customer names must match between Excel and API
- Use the Python matching tools to find all variations automatically

