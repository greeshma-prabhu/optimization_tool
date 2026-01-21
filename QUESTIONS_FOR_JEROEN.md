# Questions for Jeroen - API & Integration

## 🔌 API Connection Questions

### 1. Florinet API Connection
**Question**: "Can you show me how your tool connects to Florinet API?"

**What I need:**
- [ ] Working API call example (curl or code)
- [ ] Exact endpoint for orders (`/external/orderrows?deliveryDate=YYYY-MM-DD` or different?)
- [ ] Authentication method (JWT token or session cookies?)
- [ ] Sample API response JSON structure

**Why**: To match your working connection pattern

---

### 2. API Endpoints
**Question**: "What exact endpoints do you use for daily operations?"

**What I need:**
- [ ] Orders endpoint: `/external/orderrows` or `/api/orders` or different?
- [ ] Contracts endpoint: `/external/contracts`?
- [ ] Products endpoint: `/external/compositeproducts`?
- [ ] Any other endpoints you use?

**Why**: To use the same endpoints you're already using

---

### 3. Authentication Flow
**Question**: "How does authentication work in your tool?"

**What I need:**
- [ ] JWT token from `/authenticate` endpoint?
- [ ] Session cookies from `/login`?
- [ ] Token expiry time?
- [ ] How do you refresh tokens?

**Why**: To match your authentication method

---

### 4. API Response Structure
**Question**: "Can you share a sample order response from the API?"

**What I need:**
- [ ] Sample JSON response (anonymized is fine)
- [ ] Field names for: customer, delivery location, package type, quantity
- [ ] How are special flags stored? (Apart Houden, Vroeg!, Caac 1-5)
- [ ] How are package types represented? (612, 575, 902, etc.)

**Why**: To parse the data correctly

---

## 🔗 Integration Questions

### 5. Design System
**Question**: "Should I match your existing tool's design?"

**What I need:**
- [ ] Color scheme/theme
- [ ] Component styles
- [ ] Layout structure
- [ ] Navigation pattern

**Why**: For seamless integration

---

### 6. Shared Authentication
**Question**: "Do you have a shared authentication system?"

**What I need:**
- [ ] Should users log in once for both tools?
- [ ] Do you have a user session system?
- [ ] Should I integrate with your auth?

**Why**: For single sign-on

---

### 7. Integration Method
**Question**: "How should this integrate with your tool?"

**What I need:**
- [ ] Separate page/module?
- [ ] Embedded component?
- [ ] Standalone tool?
- [ ] API integration?

**Why**: To plan the integration approach

---

## 🧪 Testing Questions

### 8. Test Data
**Question**: "Do you have test order data I can use?"

**What I need:**
- [ ] Test date to use (today or specific date?)
- [ ] Sample orders for testing
- [ ] Expected results to verify

**Why**: To test with real data structure

---

### 9. Test Scenarios
**Question**: "What scenarios should I test?"

**What I need:**
- [ ] Normal day (all carts fit)
- [ ] Overflow scenario (too many carts)
- [ ] Danish cart heavy day (>6 Danish carts)
- [ ] Edge cases

**Why**: To ensure all scenarios work

---

## 🎯 Feature Questions

### 10. Cart Loading Optimization
**Question**: "Is the cart loading optimization working as expected?"

**What I need:**
- [ ] Does the visual truck loading make sense?
- [ ] Is the cart assignment logic correct?
- [ ] Are the route assignments correct?
- [ ] Any missing features?

**Why**: To refine the optimization algorithm

---

### 11. Manual Override
**Question**: "Do you need manual cart assignment (drag-and-drop)?"

**What I need:**
- [ ] Should users be able to manually move carts?
- [ ] Or is automatic optimization enough?
- [ ] Any manual adjustments needed?

**Why**: To add manual controls if needed

---

### 12. Missing Features
**Question**: "What else should I add?"

**What I need:**
- [ ] Print route sheets?
- [ ] Export to Excel?
- [ ] Email notifications?
- [ ] Mobile app?
- [ ] Other features?

**Why**: To prioritize development

---

## 🚀 Deployment Questions

### 13. Hosting
**Question**: "Where should this be hosted?"

**What I need:**
- [ ] Vercel (current)?
- [ ] Your server?
- [ ] Integrated into your tool?
- [ ] Separate domain?

**Why**: To deploy correctly

---

### 14. Domain
**Question**: "Do you have a preferred domain/subdomain?"

**What I need:**
- [ ] Subdomain like `logistics.yourdomain.com`?
- [ ] Path like `yourdomain.com/logistics`?
- [ ] Separate domain?

**Why**: For final deployment

---

### 15. Proxy Server
**Question**: "How should I handle the API proxy server?"

**What I need:**
- [ ] Deploy separately?
- [ ] Integrate into your backend?
- [ ] Use your existing proxy?
- [ ] Run locally?

**Why**: To handle CORS properly

---

## 📋 Priority Questions (Ask First)

**Top 3 Most Important:**

1. **API Connection** - Show me your working API call
2. **Data Structure** - Share sample API response
3. **Integration** - How should this connect to your tool?

---

## 💬 Conversation Starter

**Copy-paste this:**

"Hi Jeroen, I've built the cart loading optimizer. Before I connect the real API, I need your help with a few things:

1. Can you show me how your tool connects to Florinet API? (working code/curl example)
2. What does the order data look like? (sample JSON response)
3. How should this integrate with your existing tool?

The system is ready to test with demo data at [YOUR_URL]. Can we schedule a quick call to go through these questions?"

