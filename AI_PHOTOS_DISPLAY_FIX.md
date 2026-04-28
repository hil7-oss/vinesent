# AI Photos Display Fix

## Problem
Generated AI photos were not displaying in the product form after generation completed. The photos were being generated successfully and saved to the database, but the form closed immediately without showing them.

## Root Cause
The AI photo generation happens as a **background job** (asynchronous):
1. Frontend sends request to `/api/admin/ai-photos/generate-multiple`
2. Backend returns immediately with `jobId` and starts processing in background
3. Frontend received the response and **immediately closed the form** with `onSuccess()` and `onClose()`
4. The background job was still running, so images weren't in the database yet
5. User couldn't see the generated photos

## Solution Implemented

### Frontend Changes (`vinesent-admin/src/app/admin/products/page.tsx`)

Modified the `handleSubmit` function to:

1. **Poll job status** after receiving `jobId`:
   - Check job status every 2 seconds via `/api/admin/ai-photos/batch-status/{jobId}`
   - Display progress: "Генерація фото (2/6)..."

2. **Wait for completion**:
   - Continue polling until `status === 'completed'` or `status === 'failed'`

3. **Fetch updated product**:
   - After job completes, fetch the product again: `GET /api/v1/products/{id}`
   - Parse the updated `images` field
   - Update the form state with new images

4. **Show results before closing**:
   - Display success message: "Згенеровано 6 фото!"
   - Wait 1.5 seconds so user can see the generated photos
   - Then close the form

### Code Flow (After Fix)

```typescript
// 1. Start AI generation
const aiRes = await fetch(`${API_BASE}/api/admin/ai-photos/generate-multiple`, ...)
const data = await aiRes.json()

// 2. If background job - poll status
if (data.jobId) {
  setAiMessage(`Генерація фото (0/${data.total || 6})...`)
  
  const pollInterval = setInterval(async () => {
    const statusRes = await fetch(`${API_BASE}/api/admin/ai-photos/batch-status/${jobId}`)
    const status = await statusRes.json()
    
    // Update progress
    setAiMessage(`Генерація фото (${status.done}/${status.total})...`)
    
    // 3. When completed - fetch updated product
    if (status.status === 'completed') {
      clearInterval(pollInterval)
      
      const updatedRes = await fetch(`${API_BASE}/api/v1/products/${saved.id}`)
      const updatedProduct = await updatedRes.json()
      const newImages = JSON.parse(updatedProduct.images || '[]')
      
      // 4. Update form with new images
      setImages(newImages.map(url => ({ id: Math.random().toString(36).slice(2), url })))
      setAiMessage(`Згенеровано ${status.done} фото!`)
      
      // 5. Show results, then close
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    }
  }, 2000) // Poll every 2 seconds
}
```

## Two-Photo System

The fix also supports the two-photo AI generation system:
- **Front photo** (required): Generates 4 variations
- **Back photo** (optional): Generates 2 additional variations
- **Total**: 6 photos when both are provided

The backend (`fastapi_app/routers/ai_photos.py`) already handles this correctly:
```python
if fileBack:
    # Add 2 prompts for back photo
    back_prompts = build_prompts(rgb_str)[:2]
    prompts = prompts + back_prompts
```

## Testing

To test the fix:

1. **Open admin panel**: http://localhost:3001
2. **Login**: admin@vineshop.com / admin123
3. **Go to Products** → Click "Додати товар"
4. **Fill required fields**:
   - Name
   - Price
   - Category
   - Stock (or variants)
5. **Upload AI photos**:
   - Upload front photo (required)
   - Upload back photo (optional)
   - Select color and gender
6. **Click "Зберегти"**
7. **Watch progress**: "Генерація фото (1/6)..." → "Генерація фото (2/6)..." etc.
8. **See results**: After completion, the form will show all 6 generated photos
9. **Form closes automatically** after 1.5 seconds

## Files Modified

- `vinesent-admin/src/app/admin/products/page.tsx` (lines 621-650)
  - Added job status polling
  - Added product refetch after completion
  - Added progress display
  - Added delay before closing form

## Container Rebuilt

```bash
docker-compose -f docker-compose.local.yml up -d --build admin
```

## Status

✅ **FIXED** - Generated AI photos now display correctly in the product form after generation completes.
