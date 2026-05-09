# Архітектура системи варіантів продуктів

## Загальна схема

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL (Next.js)                    │
│                  vinesent-admin/ProductForm.tsx              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST/GET
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  /api/v1/variants/batch                            │    │
│  │  /api/v1/variants?productId=xxx                    │    │
│  │  /api/v1/products/{id}/measurements                │    │
│  └────────────────────────────────────────────────────┘    │
│                              │                               │
│                              │ SQLAlchemy                    │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  models.py                                         │    │
│  │  - Product (with measurements JSONB)               │    │
│  │  - ProductVariant                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ SQL
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Product                                           │    │
│  │  ├─ id (PK)                                        │    │
│  │  ├─ name                                           │    │
│  │  ├─ price                                          │    │
│  │  ├─ stock (calculated from variants)              │    │
│  │  └─ measurements (JSONB) ← NEW                    │    │
│  └────────────────────────────────────────────────────┘    │
│                              │                               │
│                              │ FK: productId                 │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ProductVariant                                    │    │
│  │  ├─ id (PK)                                        │    │
│  │  ├─ productId (FK)                                 │    │
│  │  ├─ size                                           │    │
│  │  ├─ color                                          │    │
│  │  ├─ stock                                          │    │
│  │  ├─ price                                          │    │
│  │  ├─ salePrice                                      │    │
│  │  ├─ sku (optional, auto-generated) ← FIXED        │    │
│  │  └─ barcode                                        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Потік даних при створенні продукту

```
1. USER ACTION
   ┌─────────────────────────────────────┐
   │ Користувач заповнює форму:          │
   │ - Назва: "Куртка зимова"            │
   │ - Ціна: 1200 грн                    │
   │ - Розміри: [104, 110, 116]          │
   │ - Кольори: [#000000, #ffffff]       │
   │ - Залишки: [10, 15, 8, 12, 5, 7]   │
   └─────────────────────────────────────┘
                  │
                  ▼
2. FRONTEND PROCESSING
   ┌─────────────────────────────────────┐
   │ ProductForm.tsx генерує варіанти:   │
   │                                     │
   │ variants = [                        │
   │   {size:"104",color:"#000000",      │
   │    stock:10, price:1200},           │
   │   {size:"110",color:"#000000",      │
   │    stock:15, price:1200},           │
   │   {size:"116",color:"#000000",      │
   │    stock:8, price:1200},            │
   │   {size:"104",color:"#ffffff",      │
   │    stock:12, price:1200},           │
   │   {size:"110",color:"#ffffff",      │
   │    stock:5, price:1200},            │
   │   {size:"116",color:"#ffffff",      │
   │    stock:7, price:1200}             │
   │ ]                                   │
   │                                     │
   │ totalStock = 10+15+8+12+5+7 = 57   │
   └─────────────────────────────────────┘
                  │
                  ▼
3. API REQUEST
   ┌─────────────────────────────────────┐
   │ POST /api/v1/products               │
   │ {                                   │
   │   name: "Куртка зимова",            │
   │   price: 1200,                      │
   │   stock: 57,                        │
   │                                  │
   │ }                                   │
   │                                     │
   │ Response: { id: "abc-123",  }   │
   └─────────────────────────────────────┘
                  │
                  ▼
4. VARIANTS REQUEST
   ┌─────────────────────────────────────┐
   │ POST /api/v1/variants/batch         │
   │ {                                   │
   │   productId: "abc-123",             │
   │   variants: []                   │
   │ }                                   │
   └─────────────────────────────────────┘
                  │
                  ▼
5. BACKEND PROCESSING
   ┌─────────────────────────────────────┐
   │ variants.py: variants_batch()       │
   │                                     │
   │ For each variant:                   │
   │   1. Generate ID if missing         │
   │   2. Generate SKU if missing:       │
   │      "ABC123-104-000000"            │
   │   3. INSERT or UPDATE in DB         │
   │                                     │
   │ Return: [                           │
   │   {id:"v1",sku:"ABC123-104-000000", │
   │    size:"104",color:"#000000",}, │
   │                                  │
   │ ]                                   │
   └─────────────────────────────────────┘
                  │
                  ▼
6. DATABASE STATE
   ┌─────────────────────────────────────┐
   │ Product:                            │
   │ ├─ id: "abc-123"                    │
   │ ├─ name: "Куртка зимова"            │
   │ ├─ price: 1200                      │
   │ └─ stock: 57                        │
   │                                     │
   │ ProductVariant (6 rows):            │
   │ ├─ {id:"v1", productId:"abc-123",  │
   │ │   size:"104", color:"#000000",    │
   │ │   stock:10, sku:"ABC123-104-000"} │
   │ ├─ {id:"v2", productId:"abc-123",  │
   │ │   size:"110", color:"#000000",    │
   │ │   stock:15, sku:"ABC123-110-000"} │
   │ └─  (4 more)                     │
   └─────────────────────────────────────┘
```

## Автогенерація SKU

```
Input:
  productId = "abc-123-def-456"
  size = "104"
  color = "#000000"

Processing:
  1. Take first 8 chars of productId: "ABC-123-"
  2. Add size: "ABC-123--104"
  3. Remove # from color: "000000"
  4. Combine: "ABC-123--104-000000"
  5. Uppercase: "ABC-123--104-000000"

Output:
  sku = "ABC-123--104-000000"
```

## Measurements Structure

```json
{
  "measurements": {
    "sizeChart": {
      "104": {
        "chest": 56,
        "length": 42,
        "sleeve": 38,
        "waist": 52
      },
      "110": {
        "chest": 58,
        "length": 44,
        "sleeve": 40,
        "waist": 54
      },
      "116": {
        "chest": 60,
        "length": 46,
        "sleeve": 42,
        "waist": 56
      }
    },
    "material": "100% бавовна",
    "weight": "350г",
    "careInstructions": [
      "Прати при 30°C",
      "Не відбілювати",
      "Прасувати при низькій температурі"
    ],
    "features": [
      "Водовідштовхувальна тканина",
      "Знімний капюшон",
      "Внутрішні кишені"
    ]
  }
}
```

## API Endpoints

### Products

```
GET    /api/v1/products
GET    /api/v1/products/{id}
POST   /api/v1/products
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}

GET    /api/v1/products/{id}/measurements
PUT    /api/v1/products/{id}/measurements
```

### Variants

```
GET    /api/v1/variants
GET    /api/v1/variants?productId={id}
POST   /api/v1/variants/batch          ← NEW
POST   /api/v1/variants/sync
GET    /api/v1/variants/{id}
PUT    /api/v1/variants/{id}
DELETE /api/v1/variants/{id}
```

## Database Schema

```sql
-- Product table
CREATE TABLE "Product" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "salePrice" DECIMAL(65,30),
    "stock" INTEGER DEFAULT 0,
    "measurements" JSONB,              -- ← NEW
    "images" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- ProductVariant table
CREATE TABLE "ProductVariant" (
    "id" TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL REFERENCES "Product"("id"),
    "size" TEXT,
    "color" TEXT,
    "sku" TEXT,                        -- ← MADE OPTIONAL
    "barcode" TEXT,
    "price" DECIMAL(65,30),
    "salePrice" DECIMAL(65,30),
    "cost" DECIMAL(65,30),
    "stock" INTEGER DEFAULT 0,
    "images" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "ProductVariant_sku_key" 
    ON "ProductVariant"("sku") WHERE "sku" IS NOT NULL;
CREATE UNIQUE INDEX "ProductVariant_barcode_key" 
    ON "ProductVariant"("barcode") WHERE "barcode" IS NOT NULL;
```

## State Management (Frontend)

```typescript
// ProductForm.tsx state
const [form, setForm] = useState({
  name: '',
  price: '',
  stock: '0',
  // 
})

const [variants, setVariants] = useState<Variant[]>([])
const [selectedSizes, setSelectedSizes] = useState<string[]>([])
const [selectedColors, setSelectedColors] = useState<string[]>([])

// When user clicks "Create Variants"
const addVariantRows = () => {
  const newVariants = []
  for (const size of selectedSizes) {
    for (const color of selectedColors) {
      newVariants.push({
        size,
        color,
        stock: 0,
        price: parseFloat(form.price) || 0,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
        cost: parseFloat(form.cost) || 0
      })
    }
  }
  setVariants([variants, newVariants])
}

// When user saves product
const handleSubmit = async () => {
  // 1. Save product
  const product = await saveProduct(form)
  
  // 2. Save variants
  if (variants.length > 0) {
    await fetch('/api/v1/variants/batch', {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        variants
      })
    })
  }
  
  // 3. Save measurements
  if (measurementsText) {
    await fetch(`/api/v1/products/${product.id}/measurements`, {
      method: 'PUT',
      body: JSON.stringify(JSON.parse(measurementsText))
    })
  }
}
```

## Error Handling

```
Frontend                Backend                 Database
   │                       │                        │
   │  POST /variants/batch │                        │
   ├──────────────────────>│                        │
   │                       │  INSERT variant        │
   │                       ├───────────────────────>│
   │                       │                        │
   │                       │  ❌ SKU already exists │
   │                       │<───────────────────────┤
   │                       │                        │
   │  ❌ 400 Bad Request   │                        │
   │<──────────────────────┤                        │
   │  {detail: "SKU"}   │                        │
   │                       │                        │
   │  Show error message   │                        │
   │  "SKU вже існує"      │                        │
   │                       │                        │
```

## Performance Considerations

### Batch Operations
- Use `/variants/batch` instead of individual requests
- Single transaction for all variants
- Reduces network overhead

### Database Indexes
- `sku` has unique index (partial, only non-null)
- `barcode` has unique index (partial, only non-null)
- `productId` has foreign key index

### JSONB Performance
- `measurements` stored as JSONB for efficient queries
- Can query nested fields: `measurements->'sizeChart'->'104'`
- Can index specific paths if needed

## Security

### Authentication
- All write operations require admin role
- Checked via `require_admin` dependency

### Validation
- SKU uniqueness enforced by database
- Barcode uniqueness enforced by database
- Stock cannot be negative
- Price must be positive

### SQL Injection
- All queries use parameterized statements
- SQLAlchemy ORM provides protection
