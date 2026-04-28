# API для управления изображениями продуктов

## Обзор

Новая система поддерживает несколько типов изображений для каждого продукта:
- **front** - фото спереди (основное)
- **back** - фото сзади
- **side** - фото сбоку
- **additional** - дополнительные фото

Все изображения автоматически загружаются в Cloudinary с оптимизацией WebP.

## Формат данных

### Новый формат (рекомендуется)
```json
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

### Старый формат (поддерживается для обратной совместимости)
```json
{
  "images": ["url1", "url2", "url3"]
}
```

## API Endpoints

### 1. Получить все изображения продукта

```http
GET /api/v1/products/{product_id}/images
```

**Response:**
```json
{
  "images": [
    {
      "url": "https://res.cloudinary.com/...",
      "type": "front",
      "order": 0,
      "isGenerated": false
    }
  ]
}
```

---

### 2. Загрузить новое изображение

```http
POST /api/v1/products/{product_id}/images
Content-Type: multipart/form-data
Authorization: Bearer {admin_token}
```

**Parameters:**
- `file` (required) - файл изображения (PNG, JPG, WEBP, GIF)
- `type` (optional) - тип изображения: `front`, `back`, `side`, `additional` (default: `additional`)

**Response:**
```json
{
  "url": "https://res.cloudinary.com/...",
  "type": "front",
  "order": 0,
  "cloudinary": true,
  "cloudinaryPublicId": "vinesent/products/..."
}
```

**Примеры:**

```bash
# Загрузить фото спереди
curl -X POST "http://localhost:8000/api/v1/products/{product_id}/images" \
  -H "Authorization: Bearer {token}" \
  -F "file=@front.jpg" \
  -F "type=front"

# Загрузить фото сзади
curl -X POST "http://localhost:8000/api/v1/products/{product_id}/images" \
  -H "Authorization: Bearer {token}" \
  -F "file=@back.jpg" \
  -F "type=back"
```

---

### 3. Получить изображения определенного типа

```http
GET /api/v1/products/{product_id}/images/{type}
```

**Parameters:**
- `type` - тип изображения: `front`, `back`, `side`, `additional`

**Response:**
```json
{
  "images": [
    {
      "url": "https://res.cloudinary.com/...",
      "type": "front",
      "order": 0,
      "isGenerated": false
    }
  ]
}
```

---

### 4. Удалить изображение

```http
DELETE /api/v1/products/{product_id}/images?url={image_url}
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `url` (required) - URL изображения для удаления

**Response:**
```json
{
  "success": true
}
```

---

### 5. Генерация AI изображения с типом

```http
POST /api/admin/ai-photos/generate
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body:**
```json
{
  "productId": "product-id",
  "gender": "male",
  "colorSource": "auto",
  "imageType": "front"  // NEW: front, back, side
}
```

**Response:**
```json
{
  "id": 123,
  "productId": "product-id",
  "cloudinaryUrl": "https://res.cloudinary.com/...",
  "imageType": "front",
  "status": "done"
}
```

---

## Миграция существующих данных

Для конвертации существующих изображений из старого формата в новый:

```bash
# Dry run (просмотр изменений без применения)
python -m fastapi_app.scripts.migrate_product_images

# Применить миграцию
python -m fastapi_app.scripts.migrate_product_images --apply
```

**Логика миграции:**
- Первое изображение → `type: "front"`
- Остальные изображения → `type: "additional"`
- Все изображения получают `isGenerated: false`

---

## Использование на фронтенде

### React/Next.js пример

```typescript
interface ProductImage {
  url: string;
  type: 'front' | 'back' | 'side' | 'additional';
  order: number;
  isGenerated: boolean;
  cloudinaryPublicId?: string;
}

// Получить изображения
const response = await fetch(`/api/v1/products/${productId}/images`);
const { images } = await response.json();

// Найти фото спереди
const frontImage = images.find(img => img.type === 'front');

// Найти фото сзади
const backImage = images.find(img => img.type === 'back');

// Проверить есть ли дизайн сзади
const hasBackDesign = images.some(img => img.type === 'back');
```

### Компонент переключения Front/Back

```tsx
function ProductImageSwitcher({ productId }: { productId: string }) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [currentType, setCurrentType] = useState<'front' | 'back'>('front');
  
  useEffect(() => {
    fetch(`/api/v1/products/${productId}/images`)
      .then(res => res.json())
      .then(data => setImages(data.images));
  }, [productId]);
  
  const frontImage = images.find(img => img.type === 'front');
  const backImage = images.find(img => img.type === 'back');
  const currentImage = currentType === 'front' ? frontImage : backImage;
  
  return (
    <div>
      <img src={currentImage?.url} alt="Product" />
      
      {backImage && (
        <div className="toggle-buttons">
          <button onClick={() => setCurrentType('front')}>
            Front
          </button>
          <button onClick={() => setCurrentType('back')}>
            Back
          </button>
        </div>
      )}
      
      {backImage && (
        <div className="badge">
          Design on back
        </div>
      )}
    </div>
  );
}
```

---

## Оптимизация Cloudinary

Все изображения автоматически оптимизируются при загрузке:
- ✅ Конвертация в WebP
- ✅ Качество: auto:good (80-85%)
- ✅ Прогрессивная загрузка
- ✅ Responsive breakpoints (200px, 400px, 800px, 1200px)

### Получение оптимизированных URL

```python
from fastapi_app.services.cloudinary_service import get_optimized_url, get_responsive_urls

# Получить URL с определенной шириной
url = get_optimized_url(public_id, width=800, quality="auto:good")

# Получить набор responsive URLs
urls = get_responsive_urls(public_id)
# {
#   "thumbnail": "url_200px",
#   "small": "url_400px",
#   "medium": "url_800px",
#   "large": "url_1200px",
#   "original": "url_optimized"
# }
```

---

## Обратная совместимость

API автоматически поддерживает старый формат:
- При чтении: старый формат конвертируется в новый
- При записи: всегда используется новый формат
- Существующий код продолжит работать без изменений

---

## Безопасность

- ✅ Все эндпоинты загрузки/удаления требуют admin токен
- ✅ Валидация типов файлов (только изображения)
- ✅ Проверка сигнатур файлов
- ✅ Ограничение размера файла (10MB)
- ✅ Блокировка опасных расширений

---

## Troubleshooting

### Cloudinary не настроен
```json
{
  "detail": "Cloudinary not configured. Image upload requires Cloudinary."
}
```
**Решение:** Проверьте переменные окружения:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Продукт не найден
```json
{
  "detail": "Product not found"
}
```
**Решение:** Проверьте правильность `product_id`

### Неверный тип изображения
```json
{
  "detail": "Invalid image type. Must be one of: front, back, side, additional"
}
```
**Решение:** Используйте один из допустимых типов
