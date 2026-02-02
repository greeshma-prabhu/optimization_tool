# CART CALCULATION FIX - TESTING GUIDE

**Date**: February 2, 2026  
**Issue**: Tool showing 153 carts instead of ~62 carts  
**Root Cause**: Counting STEMS instead of FUST CONTAINERS

---

## ✅ What Was Fixed

Created a **completely new cart calculation algorithm** in `js/cart-calculation.js`:

### Before (WRONG):
```
total_stems = assembly_amount × stems_per_bundle
carts = total_stems ÷ 72
```

### After (CORRECT):
```
fust_count = assembly_amount ÷ bundles_per_fust
carts = fust_count ÷ FUST_CAPACITIES[fustCode]
```

---

## 🧪 Testing Steps

### 1. **Clear Browser Cache**
```
1. Open browser DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
```

### 2. **Load Dashboard**
```
1. Navigate to http://localhost:8080 (or Vercel URL)
2. Open browser console (F12)
3. Select date: 2026-01-30 or 2026-02-01
4. Click "Refresh Today's Orders"
```

### 3. **Check Console Output**

You should see detailed logging like:

```
═══════════════════════════════════════════════════════════════════
🛒 CALCULATING CARTS - CORRECT ALGORITHM (FUST-BASED)
📦 Input: 457 orderrows
═══════════════════════════════════════════════════════════════════
👥 Grouped into XX customer-route combinations

Group 1: Customer Name → route
  Customer Name - route: 12.5 fust of type 612 = 1 carts (capacity: 72)
  → Total carts for this group: 1

Group 2: Another Customer → route
  Another Customer - route: 4.8 fust of type 902 = 1 carts (capacity: 40)
  → Total carts for this group: 1

...

═══════════════════════════════════════════════════════════════════
✅ TOTAL CARTS: 62
   Rijnsburg: 15 carts
   Aalsmeer: 23 carts
   Naaldwijk: 24 carts
═══════════════════════════════════════════════════════════════════
```

### 4. **Verify Dashboard Display**

The dashboard should show:
- **Total Orders**: 457
- **Total Carts Needed**: **~62** (NOT 153 or 1923!)
- **Route Status**: 3/3 routes

---

## ✅ Expected Results

| Metric | Expected Value | Previous (Wrong) |
|--------|----------------|------------------|
| Total Carts | **~62** | 153 or 1923 |
| Rijnsburg | ~15 carts | ? |
| Aalsmeer | ~23 carts | ? |
| Naaldwijk | ~24 carts | ? |
| Trucks Needed | ~5 trucks | 114 |

---

## 🔍 Verification Checklist

- [ ] Console shows "🛒 CALCULATING CARTS - CORRECT ALGORITHM (FUST-BASED)"
- [ ] Console shows detailed per-group calculation
- [ ] Console shows fust type (612, 575, 902, etc.) for each group
- [ ] Console shows correct capacity used (72, 32, 40, 20)
- [ ] Total carts is approximately **62** (not 153)
- [ ] Route distribution looks reasonable (not all in one route)
- [ ] No JavaScript errors in console

---

## 🚨 If Numbers Are Still Wrong

### Check 1: Is the new script loaded?
```javascript
// In console:
console.log(typeof window.CartCalculation);
// Should output: "object"
```

### Check 2: Are properties present?
```javascript
// In console, after loading data:
const testOrder = orderManager.orders[0];
console.log('Properties:', testOrder.properties);
console.log('Fust code (901):', testOrder.properties?.find(p => p.code === '901'));
```

### Check 3: Are fust calculations correct?
```javascript
// In console:
const testOrder = orderManager.orders[0];
const fustInfo = window.CartCalculation.extractFustInfo(testOrder);
console.log('Fust info:', fustInfo);
```

### Check 4: Manual calculation for one customer
```
Pick one customer from console logs:
1. Note their total fust count (e.g., 12.5)
2. Note their fust type (e.g., 612)
3. Look up capacity (612 = 72)
4. Calculate: Math.ceil(12.5 / 72) = 1 cart ✓
```

---

## 🔧 Debugging

### Enable detailed logging:
The new algorithm already has extensive logging. Just check the console!

### Common Issues:

**Issue**: "CartCalculation is not defined"
- **Fix**: Clear cache and reload page
- **Check**: `cart-calculation.js` is loaded in index.html

**Issue**: Properties array is empty
- **Fix**: Ensure API is returning full orderrow data (not slim=1)
- **Check**: `console.log(orderManager.orders[0].properties)`

**Issue**: bundles_per_fust is missing
- **Fix**: The algorithm extracts from property 'L14' as fallback
- **Check**: `console.log(orderManager.orders[0].bundles_per_fust)`

**Issue**: All fust types are 612
- **Fix**: Property '901' extraction may be failing
- **Check**: `orderManager.orders[0].properties?.find(p => p.code === '901')`

---

## 📋 Test Cases

### Test Case 1: January 30, 2026
```
Expected: ~62 carts
Previous: 1923 carts
Status: [ ] PASS / [ ] FAIL
```

### Test Case 2: February 1, 2026  
```
Expected: Similar range (~50-70 carts)
Previous: Unknown
Status: [ ] PASS / [ ] FAIL
```

### Test Case 3: Demo Data
```
Expected: Reasonable cart count
Previous: Unknown
Status: [ ] PASS / [ ] FAIL
```

---

## 📞 Contact

If issues persist:
1. Screenshot the console output
2. Note the date being tested
3. Share the "Total Carts" number shown
4. Share any JavaScript errors

---

## ✅ Success Criteria

The fix is successful if:
1. ✅ Console shows "CORRECT ALGORITHM (FUST-BASED)"
2. ✅ Total carts is **~62** (not 153 or 1923)
3. ✅ Route distribution is reasonable (~15/23/24)
4. ✅ Per-group calculations show correct fust types (612, 575, 902, etc.)
5. ✅ Per-group calculations show correct capacities (72, 32, 40, 20)
6. ✅ No JavaScript errors

---

**Last Updated**: February 2, 2026  
**Commit**: 87a4cd5  
**Files Modified**:
- `js/cart-calculation.js` (NEW)
- `index.html` (updated to use new calculation)

