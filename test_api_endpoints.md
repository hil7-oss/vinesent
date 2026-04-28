# API Endpoints Test Checklist

## ✅ Fixed Issues
1. **Slug Import Error** - Fixed `generate_slug` → `build_product_slug` + `ensure_unique_product_slug`
2. **API Routing** - All frontend calls now use `/api/v1/` prefix

## 🧪 Test Endpoints

### Authentication
- [ ] POST `/auth/login` - Login with admin@vineshop.com / admin123
- [ ] GET `/auth/me` - Get current user

### Products
- [ ] GET `/api/v1/products` - List all products
- [ ] POST `/api/v1/products` - Create new product
- [ ] PUT `/api/v1/products/{id}` - Update product
- [ ] DELETE `/api/v1/products/{id}` - Delete product
- [ ] POST `/api/v1/products/ai-autofill` - AI autofill from text

### Categories
- [ ] GET `/api/v1/categories` - List all categories
- [ ] POST `/api/v1/categories` - Create new category
- [ ] PUT `/api/v1/categories/{id}` - Update category
- [ ] DELETE `/api/v1/categories/{id}` - Delete category

### Orders
- [ ] GET `/api/v1/orders` - List all orders
- [ ] PUT `/api/v1/orders/{id}` - Update order status

### Users
- [ ] GET `/api/v1/users` - List all users

### Stores
- [ ] GET `/api/v1/stores` - List all stores
- [ ] POST `/api/v1/stores` - Create new store
- [ ] PUT `/api/v1/stores/{id}` - Update store
- [ ] DELETE `/api/v1/stores/{id}` - Delete store

### Variants
- [ ] GET `/api/v1/variants` - List all variants
- [ ] POST `/api/v1/variants/batch` - Batch create variants

### Content
- [ ] GET `/api/v1/content/home` - Get home page content
- [ ] PATCH `/api/v1/content/hero-slides` - Update hero slides
- [ ] POST `/api/v1/content/collections` - Create collection
- [ ] PATCH `/api/v1/content/collections/{key}` - Update collection
- [ ] DELETE `/api/v1/content/collections/{key}` - Delete collection

### Uploads
- [ ] POST `/api/v1/upload` - Upload image

### AI Photos (Special prefix: /api/admin/ai-photos)
- [ ] POST `/api/admin/ai-photos/generate-multiple` - Generate 6 photos (4 front + 2 back)

### POS
- [ ] GET `/api/v1/barcodes/lookup?barcode={code}` - Lookup product by barcode
- [ ] POST `/api/v1/pos/simple-sale` - Quick sale
- [ ] POST `/api/v1/inventory/adjust` - Adjust inventory

## 🔍 Quick Test Commands

### Test Product Creation
```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 100,
    "stock": 10,
    "categoryId": "some-category-id"
  }'
```

### Test Category Creation
```bash
curl -X POST http://localhost:8000/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Category",
    "slug": "test-category"
  }'
```

### Test AI Autofill
```bash
curl -X POST http://localhost:8000/api/v1/products/ai-autofill \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Чорна футболка з принтом, розмір M, ціна 500 грн"
  }'
```

## 🐛 Known Issues (Fixed)
- ~~ImportError: cannot import name 'generate_slug'~~ ✅ FIXED
- ~~404 errors on all API endpoints~~ ✅ FIXED

## 📝 Notes
- Admin panel: http://localhost:3001
- Backend API: http://localhost:8000
- Credentials: admin@vineshop.com / admin123
- All containers rebuilt and running
