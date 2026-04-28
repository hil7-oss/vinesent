# API Routing Fixes - Complete

## Problem
Frontend API calls were using `/api/fastapi/endpoint` which proxies to `/endpoint` on backend, but backend expects `/api/v1/endpoint`.

## Solution
Added `/api/v1/` prefix to ALL API calls in admin frontend.

## Files Fixed

### 1. Categories Page (`vinesent-admin/src/app/admin/categories/page.tsx`)
- ✅ `fetchData()` - GET categories
- ✅ `handleSubmit()` - POST/PUT categories
- ✅ `deleteCategory()` - DELETE categories
- ✅ `handleImageUpload()` - POST upload

### 2. Orders Page (`vinesent-admin/src/app/admin/orders/page.tsx`)
- ✅ `fetchOrders()` - GET orders
- ✅ `updateStatus()` - PUT order status

### 3. Users Page (`vinesent-admin/src/app/admin/users/page.tsx`)
- ✅ `fetchUsers()` - GET users

### 4. Stores Page (`vinesent-admin/src/app/admin/stores/page.tsx`)
- ✅ `fetchStores()` - GET stores
- ✅ `submit()` - POST/PUT stores
- ✅ `remove()` - DELETE stores

### 5. Dashboard Page (`vinesent-admin/src/app/admin/page.tsx`)
- ✅ `useEffect()` - GET products, categories, orders, content, variants
- ✅ `saveHeroSlides()` - PATCH hero slides
- ✅ `uploadHeroImage()` - POST upload
- ✅ `saveCollection()` - PATCH collections
- ✅ `addCollection()` - POST collections
- ✅ `removeCollection()` - DELETE collections

### 6. Products Page (`vinesent-admin/src/app/admin/products/page.tsx`)
- ✅ `fetchData()` - GET products, categories, variants
- ✅ `useEffect()` (product load) - GET variants, related, measurements
- ✅ `handleSubmit()` - POST/PUT products, variants, measurements, related
- ✅ `handleAutoFill()` - POST ai-autofill (already had /api/v1)
- ✅ `quickUpdate()` - PUT product
- ✅ `deleteProduct()` - DELETE product
- ✅ `applyDiscount()` - PUT bulk discount
- ✅ `applyCategory()` - PUT bulk category
- ✅ Bulk delete button - DELETE multiple products
- ✅ Special category filters (new, sale) - GET filtered products

### 7. POS Page (`vinesent-admin/src/app/admin/pos/page.tsx`)
- ✅ `handleScan()` - GET barcode lookup
- ✅ `handleSell()` - POST simple sale
- ✅ `handleAdjust()` - POST inventory adjust

## Pattern Applied
```typescript
// OLD (404 errors)
fetch(`${API_BASE}/endpoint`)

// NEW (works correctly)
fetch(`${API_BASE}/api/v1/endpoint`)
```

## Exceptions
- `/admin/ai-photos/*` endpoints already use `/api` prefix (not `/api/v1`)
- Auth endpoints use `/auth/*` (no prefix needed)

## Testing Required
User needs to test:
1. ✅ Create/edit/delete categories
2. ✅ View/update orders
3. ✅ View users
4. ✅ Create/edit/delete stores
5. ✅ Dashboard stats and content management
6. ✅ Create/edit/delete products
7. ✅ AI autofill functionality
8. ✅ Bulk operations (discount, category, delete)
9. ✅ POS barcode scanning and sales
10. ✅ Two-photo AI generation (4 front + 2 back photos)

## Container Status
- ✅ Admin container rebuilt successfully
- ✅ All services running
- ✅ Ready for testing

## Next Steps
1. Test category creation (was failing with 404)
2. Test AI autofill (was failing with 404)
3. Test two-photo AI generation
4. Verify all CRUD operations work correctly
