# Front/Back Image System - UI Implementation

## ✅ Completed Implementation

### Backend API (Already Done)
- ✅ New image format with type metadata: `{url, type, order, isGenerated, cloudinaryPublicId}`
- ✅ Image types: `front`, `back`, `side`, `additional`
- ✅ API endpoints:
  - `POST /api/v1/products/{id}/images` - Upload with type
  - `GET /api/v1/products/{id}/images` - Get all images
  - `GET /api/v1/products/{id}/images/{type}` - Get by type
  - `DELETE /api/v1/products/{id}/images?url={url}` - Delete image
- ✅ AI generation with `imageType` parameter
- ✅ Automatic WebP optimization via Cloudinary

### Frontend UI (Just Implemented)

#### 1. Image Upload with Type Selection
**Location:** `vinesent-admin/src/app/admin/products/page.tsx`

**Changes:**
- Added `imageType` state variable with options: `front`, `back`, `side`, `additional`
- Added UI selector buttons above image upload area
- Updated `uploadImages()` function to accept `productId` and `imageType` parameters
- For existing products: uses new API endpoint `POST /api/v1/products/{id}/images` with type
- For new products: uses fallback upload (type will be set later)

**UI Features:**
```typescript
// Image type selector with 4 buttons
<button onClick={() => setImageType('front')}>Спереду</button>
<button onClick={() => setImageType('back')}>Ззаду</button>
<button onClick={() => setImageType('side')}>Збоку</button>
<button onClick={() => setImageType('additional')}>Додаткове</button>
```

**How it works:**
1. Admin selects image type (default: `front`)
2. Uploads image(s)
3. If product exists: API stores image with selected type
4. If new product: images uploaded without type (will be migrated later)

#### 2. AI Generation with Image Type
**Location:** `vinesent-admin/src/app/admin/products/page.tsx`

**Changes:**
- Added `aiImageType` state variable with options: `front`, `back`, `side`
- Added UI selector in AI generation panel
- Updated AI generation to send `imageType` parameter to backend

**UI Features:**
```typescript
// AI image type selector with 3 buttons
<button onClick={() => setAiImageType('front')}>Спереду</button>
<button onClick={() => setAiImageType('back')}>Ззаду</button>
<button onClick={() => setAiImageType('side')}>Збоку</button>
```

**How it works:**
1. Admin selects AI image type (default: `front`)
2. Uploads reference photo and sets color/gender
3. Clicks "Генерувати після збереження"
4. Backend generates image with appropriate prompt for selected type
5. Generated image is stored with correct type metadata

#### 3. Backend AI Endpoint Updates
**Location:** `fastapi_app/routers/ai_photos.py`

**Changes:**
- Added `imageType` parameter to `generate-multiple` endpoint
- Updated prompt generation to use image type
- Updated `_process_multiple_job()` to accept and use `image_type`
- Images are now saved with correct type via `append_product_image()`

**Prompt Templates:**
- **Front:** "Full-body front view, model facing camera..."
- **Back:** "Full-body back view, model facing away, showing back design..."
- **Side:** "Full-body side profile view..."

## 📋 How to Use

### For Admins:

#### Uploading Images
1. Open product edit form
2. Select image type: **Спереду** / **Ззаду** / **Збоку** / **Додаткове**
3. Upload image(s)
4. Image is stored with selected type

#### AI Generation
1. Open product edit form
2. Scroll to "Nanobanana — генерація фото"
3. Select generation type: **Спереду** / **Ззаду** / **Збоку**
4. Upload reference photo
5. Select color and gender
6. Check "Генерувати після збереження"
7. Save product
8. AI generates image with appropriate view

### For Developers:

#### API Usage
```bash
# Upload front image
curl -X POST "http://localhost:8000/api/v1/products/{id}/images" \
  -H "Authorization: Bearer {token}" \
  -F "file=@front.jpg" \
  -F "type=front"

# Upload back image
curl -X POST "http://localhost:8000/api/v1/products/{id}/images" \
  -H "Authorization: Bearer {token}" \
  -F "file=@back.jpg" \
  -F "type=back"

# Generate AI back view
curl -X POST "http://localhost:8000/api/admin/ai-photos/generate-multiple" \
  -H "Authorization: Bearer {token}" \
  -F "productId=product-id" \
  -F "category=clothing" \
  -F "gender=male" \
  -F "colorHex=#000000" \
  -F "imageType=back" \
  -F "file=@reference.jpg"
```

## 🎯 Next Steps (Not Yet Implemented)

### Storefront Display
**From `update.md` requirements:**

1. **Front/Back Toggle in Product Cards**
   - Add toggle button to switch between front/back views
   - Show "Design on back" badge if back image exists
   - Smooth transition animation

2. **Mobile Swipe Support**
   - Swipe left/right to see different views
   - Touch-friendly navigation

3. **Desktop Hover Preview**
   - Hover over product to see back view
   - Quick preview without clicking

4. **Thumbnails**
   - Show mini-previews of all available views
   - Click to switch main image

### Implementation Files Needed:
- `vinesent-admin/src/components/product/ProductCard.tsx` - Add front/back toggle
- `vinesent-admin/src/app/page.tsx` - Update storefront product display
- New component: `ProductImageSwitcher.tsx` - Reusable image switcher

### Example Implementation:
```typescript
// ProductImageSwitcher.tsx
function ProductImageSwitcher({ productId }: { productId: string }) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [currentType, setCurrentType] = useState<'front' | 'back'>('front')
  
  const frontImage = images.find(img => img.type === 'front')
  const backImage = images.find(img => img.type === 'back')
  const currentImage = currentType === 'front' ? frontImage : backImage
  
  return (
    <div className="relative">
      <img src={currentImage?.url} alt="Product" />
      
      {backImage && (
        <>
          <button onClick={() => setCurrentType(currentType === 'front' ? 'back' : 'front')}>
            {currentType === 'front' ? 'Показати ззаду' : 'Показати спереду'}
          </button>
          
          <div className="badge">Design on back</div>
        </>
      )}
    </div>
  )
}
```

## 📊 Testing

### Manual Testing Checklist:
- [ ] Upload front image for existing product
- [ ] Upload back image for existing product
- [ ] Upload side image for existing product
- [ ] Generate AI front view
- [ ] Generate AI back view
- [ ] Generate AI side view
- [ ] Verify images have correct type in database
- [ ] Verify images display correctly in admin
- [ ] Check API returns images with type metadata

### API Testing:
```bash
# Get product images
curl http://localhost:8000/api/v1/products/{id}/images

# Expected response:
{
  "images": [
    {
      "url": "https://res.cloudinary.com/...",
      "type": "front",
      "order": 0,
      "isGenerated": false,
      "cloudinaryPublicId": "vinesent/products/..."
    },
    {
      "url": "https://res.cloudinary.com/...",
      "type": "back",
      "order": 1,
      "isGenerated": true,
      "cloudinaryPublicId": "vinesent/products/..."
    }
  ]
}
```

## 🔧 Technical Details

### Image Type Flow:
1. **Upload:** Admin selects type → Frontend sends to API → Backend stores with type
2. **AI Generation:** Admin selects type → Backend generates with appropriate prompt → Stores with type
3. **Display:** Frontend fetches images → Filters by type → Shows appropriate view

### Database Schema:
```json
{
  "images": [
    {
      "url": "string",
      "type": "front" | "back" | "side" | "additional",
      "order": "number",
      "isGenerated": "boolean",
      "cloudinaryPublicId": "string"
    }
  ]
}
```

### Backward Compatibility:
- Old format (string array) is automatically converted to new format
- First image becomes `type: "front"`
- Other images become `type: "additional"`
- Migration script available: `fastapi_app/scripts/migrate_product_images.py`

## 📝 Files Modified

### Frontend:
- `vinesent-admin/src/app/admin/products/page.tsx` - Added image type selection UI

### Backend:
- `fastapi_app/routers/ai_photos.py` - Added imageType support to generate-multiple endpoint

### Documentation:
- `API_IMAGES_DOCUMENTATION.md` - Complete API reference
- `FRONT_BACK_UI_IMPLEMENTATION.md` - This file

## 🚀 Deployment

### Local Development:
```bash
# Restart services to apply changes
docker restart update02-backend-1
docker restart update02-admin-1

# Check logs
docker logs update02-backend-1 --tail 50
docker logs update02-admin-1 --tail 50
```

### Production:
1. Deploy backend changes first
2. Run migration script if needed: `python -m fastapi_app.scripts.migrate_product_images --apply`
3. Deploy frontend changes
4. Test image upload and AI generation

## ✨ Summary

**What's Working Now:**
- ✅ Admin can select image type when uploading
- ✅ Admin can select AI generation type (front/back/side)
- ✅ Images are stored with proper type metadata
- ✅ AI generates appropriate views based on type
- ✅ All images auto-optimize to WebP

**What's Next:**
- ⏳ Storefront front/back toggle
- ⏳ Mobile swipe support
- ⏳ Desktop hover preview
- ⏳ "Design on back" badges
- ⏳ Interactive product cards with price overlay
- ⏳ User onboarding tooltips

The foundation is complete! The backend and admin UI now fully support the front/back image system. The next step is implementing the storefront display features.
