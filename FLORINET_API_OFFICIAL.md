# Florinet API - Official Connection Guide

## Base URL
```
https://summit.florinet.nl/api/v1
```

## Authentication

### Step 1: Get Token
```bash
POST https://summit.florinet.nl/api/v1/authenticate
Content-Type: application/json

{
  "username": "JeroenMainfact",
  "password": "&WWpxaM@#"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 2: Use Token
Include in Authorization header:
```bash
Authorization: Bearer <token>
```

## Available Endpoints

| Endpoint | Description | Status |
|----------|-------------|--------|
| `/external/contracts` | Get all contracts | ✅ Available |
| `/external/orderrows` | Get orders (with deliveryDate param) | ✅ Using |
| `/external/compositeproducts` | Get composite products | ✅ Available |
| `/external/base-products` | Get base products | ✅ Available |
| `/external/product-groups` | Get product groups | ✅ Available |
| `/external/growers` | Get growers (includes m² data) | ✅ Available |

## Current Implementation

### ✅ What's Working
- Authentication via `/authenticate`
- Fetching orderrows via `/external/orderrows?deliveryStartDate=DD-MM-YYYY&deliveryEndDate=DD-MM-YYYY`
- Token caching (valid ~1 hour)
- Getting 351 orderrows successfully

### 🔍 Key Field: `customer_reference`
The orderrows contain customer names in the **`customer_reference`** field:
```json
{
  "id": 3041720,
  "order_id": 864143,
  "customer_reference": "Golden Flowers",  // ← Customer name here!
  "location_description": "...",           // ← Delivery location here!
  "amount_of_transport_carriers": 0.46875,
  ...
}
```

### ❌ Not Working
- `/external/orders` - Returns 404 (endpoint doesn't exist for this API version)

## Token Expiry
- Tokens valid for ~1 hour
- Code caches token for 50 minutes (safe margin)
- Auto-refreshes when expired

## API Documentation
Full Swagger docs: https://summit.florinet.nl/apidocs/

## Example cURL
```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST https://summit.florinet.nl/api/v1/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"JeroenMainfact","password":"&WWpxaM@#"}' \
  | jq -r '.token')

# 2. Fetch orderrows
curl -s "https://summit.florinet.nl/api/v1/external/orderrows?deliveryStartDate=28-01-2026&deliveryEndDate=28-01-2026" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 3. Fetch contracts
curl -s https://summit.florinet.nl/api/v1/external/contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Implementation Status

✅ **FIXED:**
- Customer names now read from `customer_reference` field
- Orders grouped by `order_id` (351 rows → ~50-100 orders)
- Location read from `location_description` field
- Routes distributed correctly
- Cart calculations accurate

🚀 **Next: Refresh browser and sync to see real customer names!**
