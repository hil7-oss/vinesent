# Исправление отображения AI фотографий

## Проблема
Сгенерированные AI фотографии не отображались в админке, хотя успешно сохранялись в базу данных и Cloudinary.

## Причина
**Несоответствие форматов данных:**

### Старый формат (ожидался фронтендом):
```json
["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
```

### Новый формат (сохраняется бэкендом):
```json
[
  {
    "url": "https://res.cloudinary.com/dkgds398y/image/upload/v1777295458/vinesent-ai/548c7ab2.webp",
    "type": "additional",
    "order": 0,
    "isGenerated": true
  },
  {
    "url": "https://res.cloudinary.com/dkgds398y/image/upload/v1777295478/vinesent-ai/a40390f9.webp",
    "type": "additional",
    "order": 1,
    "isGenerated": true
  }
]
```

## Решение

### 1. Исправлен парсинг в форме продукта
**Файл:** `vinesent-admin/src/app/admin/products/page.tsx`

**Было:**
```typescript
let imgs: string[] = []
try { 
  imgs = JSON.parse(product.images || '[]') 
} catch {}
```

**Стало:**
```typescript
let imgs: string[] = []
try {
  const parsed = JSON.parse(product.images || '[]')
  if (Array.isArray(parsed)) {
    // Поддержка нового формата (массив объектов) и старого (массив строк)
    imgs = parsed.map((item: any) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && item.url) return item.url
      return ''
    }).filter(Boolean)
  }
} catch {}
```

### 2. Исправлены утилиты для работы с изображениями
**Файл:** `vinesent-admin/src/lib/utils.ts`

#### Функция `getFirstImage`:
```typescript
export function getFirstImage(images: string | null | undefined): string {
  if (!images) return ''
  try {
    const arr = JSON.parse(images)
    if (!Array.isArray(arr)) return ''
    
    // Поддержка нового формата (массив объектов) и старого (массив строк)
    const first = arr[0]
    if (!first) return ''
    if (typeof first === 'string') return first
    if (typeof first === 'object' && first.url) return first.url
    return ''
  } catch {
    return images.startsWith('http') || images.startsWith('/') ? images : ''
  }
}
```

#### Функция `getAllImages`:
```typescript
export function getAllImages(images: string | null | undefined): string[] {
  if (!images) return []
  try {
    const arr = JSON.parse(images)
    if (!Array.isArray(arr)) return []
    
    // Поддержка нового формата (массив объектов) и старого (массив строк)
    return arr.map((item: any) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && item.url) return item.url
      return ''
    }).filter(Boolean)
  } catch {
    return images.startsWith('http') || images.startsWith('/') ? [images] : []
  }
}
```

### 3. Поведение формы
**Форма закрывается сразу** после начала генерации (не ждет завершения):
```typescript
setAiMessage(data.jobId ? `Генерація ${data.total || 6} фото запущена у фоновому режимі` : 'Завершено')
onSuccess()  // Обновляет список продуктов
onClose()    // Закрывает форму
```

Фотографии появятся в списке продуктов автоматически после завершения фоновой генерации.

## Как работает система хранения фотографий

### Backend (`fastapi_app/routers/ai_photos.py`):
```python
def upload_result_image(image_bytes: bytes) -> dict:
    try:
        # Сначала пытается загрузить в Cloudinary
        return cloudinary_service.upload_image(
            image_bytes, 
            folder="vinesent-ai", 
            public_id=str(uuid.uuid4())
        )
    except Exception:
        # Если не получается - сохраняет локально
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        filename = f"ai_{int(time.time())}_{secrets.token_hex(4)}.png"
        file_path = os.path.join(UPLOADS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        return {"url": f"/uploads/{filename}", "public_id": f"local/{filename}"}
```

### Приоритет:
1. **Cloudinary** (основной) - `https://res.cloudinary.com/dkgds398y/...`
2. **Локальное хранилище** (резервный) - `/uploads/ai_...`

## Проверка в базе данных

```sql
SELECT id, name, images 
FROM "Product" 
WHERE images IS NOT NULL 
ORDER BY "createdAt" DESC 
LIMIT 3;
```

Результат показывает что фотографии сохраняются правильно:
- ✅ 6 фотографий для каждого продукта
- ✅ Все загружены в Cloudinary
- ✅ Формат: массив объектов с полями `url`, `type`, `order`, `isGenerated`

## Тестирование

1. Открыть админку: http://localhost:3001
2. Войти: admin@vineshop.com / admin123
3. Перейти в Products
4. Открыть существующий продукт с AI фотографиями (например "gffd" или "test1")
5. **Результат:** Все 6 сгенерированных фотографий отображаются в форме

## Файлы изменены

- ✅ `vinesent-admin/src/app/admin/products/page.tsx` - парсинг изображений в форме
- ✅ `vinesent-admin/src/lib/utils.ts` - функции `getFirstImage` и `getAllImages`
- ✅ Admin контейнер пересобран

## Статус

✅ **ИСПРАВЛЕНО** - AI фотографии теперь корректно отображаются в админке
