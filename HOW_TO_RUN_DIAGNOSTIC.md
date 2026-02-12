# How to Run the Evening Routes Diagnostic

## Quick Steps (2 minutes)

### Step 1: Open Dashboard
1. Go to your Dashboard page (`index.html`)
2. Make sure you're logged in

### Step 2: Load Orders
1. Click the **"Sync"** button (or "Refresh Data")
2. Wait for orders to load (you should see "Found X orders from API")
3. **Important:** Don't close the page yet!

### Step 3: Open Browser Console
Press one of these keyboard shortcuts:
- **Windows/Linux:** `F12` or `Ctrl+Shift+J`
- **Mac:** `Cmd+Option+J` (Chrome/Edge) or `Cmd+Option+K` (Firefox)

You should see a panel open at the bottom or right side of your browser.

### Step 4: Copy the Diagnostic Code
1. Open the file: `diagnose_evening_routes.js`
2. Select **ALL** the code (Ctrl+A / Cmd+A)
3. Copy it (Ctrl+C / Cmd+C)

### Step 5: Paste and Run
1. Click in the **Console** panel (where you see the `>` prompt)
2. Paste the code (Ctrl+V / Cmd+V)
3. Press **Enter**

You should see:
```
✅ Diagnostic function loaded. Run: diagnoseEveningRoutes()
```

### Step 6: Run the Diagnostic
Type this in the console and press Enter:
```javascript
diagnoseEveningRoutes()
```

---

## What You'll See

The diagnostic will show:

```
═══════════════════════════════════════════════════════════════════
🔍 EVENING ROUTES DIAGNOSTIC
═══════════════════════════════════════════════════════════════════

📊 Total orders: 3391

📅 Orders by period:
   Morning: 3138
   Evening: 253
   Unknown: 0

🌆 Evening orders by route:
   Rijnsburg Evening: 2
   Aalsmeer Evening: 0
   Naaldwijk Evening: 18
   Unmatched: 233

📋 Expected customers (from Excel mapping):
   Rijnsburg Evening: 15 customers
   Aalsmeer Evening: 30 customers
   Naaldwijk Evening: 22 customers

   Aalsmeer Evening:
      Expected: 30 customers
      Found in API: 0 customers
      ✅ Matched: 0
      ❌ Missing: 30
         "Akkus"
         "Albert Heijn"
         "By Special"
         ...
      ⚠️  Unexpected (in API but not in Excel): 0

═══════════════════════════════════════════════════════════════════
📊 DIAGNOSTIC SUMMARY
═══════════════════════════════════════════════════════════════════
Issues found:
   ❌ Aalsmeer Evening has 0 orders - CRITICAL ISSUE
   ⚠️  233 evening orders are unmatched
═══════════════════════════════════════════════════════════════════
```

---

## Troubleshooting

### Problem: "No orders found!"
**Solution:** 
- Make sure you clicked "Sync" first
- Wait for orders to finish loading
- Check if orders are actually loaded (look at Dashboard stats)

### Problem: Console shows errors
**Solution:**
- Make sure you copied the ENTIRE file
- Make sure you pasted it in the Console tab (not Network or Elements)
- Try refreshing the page and running again

### Problem: Can't find Console
**Solution:**
- Press `F12` to open Developer Tools
- Look for tabs at the top: "Console", "Elements", "Network", etc.
- Click the "Console" tab

### Problem: Nothing happens when I run it
**Solution:**
- Make sure you typed: `diagnoseEveningRoutes()` (with parentheses)
- Check for typos
- Make sure the function loaded (you should see "✅ Diagnostic function loaded")

---

## What to Do With the Results

1. **Look for "Missing" customers** - These are in Excel but not found in API
2. **Look for "Unexpected" customers** - These are in API but not in Excel
3. **Check the summary** - See which routes have issues

Then:
- Use the Python matching tools to find name variations
- Add missing name variations to `route-mapping.js`
- Re-run diagnostic to verify fixes

---

## Video Guide (Text Version)

```
1. [Open Dashboard] → Click "Sync" → Wait for "Found X orders"
2. [Press F12] → Console tab opens
3. [Open diagnose_evening_routes.js] → Copy ALL code
4. [Paste in Console] → Press Enter
5. [Type: diagnoseEveningRoutes()] → Press Enter
6. [Read results] → See what's missing
```

---

## Need Help?

If you see errors or the diagnostic doesn't work:
1. Take a screenshot of the console
2. Note what error message you see
3. Share the diagnostic output

The diagnostic is safe to run - it only reads data, it doesn't change anything!


