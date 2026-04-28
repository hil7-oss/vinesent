# Исправление API маршрутов - ФИНАЛЬНОЕ

## Проблема
Все запросы в админке возвращали 404:
```
GET /api/fastapi/products → 404
GET /api/fastapi/categories → 404
GET /api/fastapi/content → 404
GET /api/fastapi/promo-banners → 404
```

## Причина
В файле `vinesent-admin/src/app/admin/content/page.tsx` использовались **старые пути без `/api/v1/`**:

**Неправильно:**
```typescript
fetch(`${API_BASE}/content`)           // → /api/fastapi/content → 404
fetch(`${API_BASE}/products`)          // → /api/fastapi/products → 404
fetch(`${API_BASE}/promo-banners`)     // → /api/fastapi/promo-banners → 404
fetch(`${API_BASE}/categories`)        // → /api/fastapi/categories → 404
```

**Правильно:**
```typescript
fetch(`${API_BASE}/api/v1/content/home`)      // → /api/fastapi/api/v1/content/home → ✅
fetch(`${API_BASE}/api/v1/products`)          // → /api/fastapi/api/v1/products → ✅
fetch(`${API_BASE}/api/v1/promo-banners`)     // → /api/fastapi/api/v1/promo-banners → ✅
fetch(`${API_BASE}/api/v1/categories`)        // → /api/fastapi/api/v1/categories → ✅
```

## Как работает прокси

### Next.js прокси (`vinesent-admin/src/app/api/fastapi/[...path]/route.ts`):
```typescript
// Запрос: /api/fastapi/api/v1/products
// Убирает: /api/fastapi
// Отправляет на backend: /api/v1/products ✅
```

### Схема:
```
Frontend → /api/fastapi/api/v1/products
         ↓
Next.js Proxy (убирает /api/fastapi)
         ↓
Backend ← /api/v1/products
```

## Исправленные файлы

### `vinesent-admin/src/app/admin/content/page.tsx`

#### 1. Загрузка данных (fetchData):
```typescript
// БЫЛО:
fetch(`${API_BASE}/content`)
fetch(`${API_BASE}/products`)
fetch(`${API_BASE}/promo-banners`)
fetch(`${API_BASE}/categories`)

// СТАЛО:
fetch(`${API_BASE}/api/v1/content/home`)
fetch(`${API_BASE}/api/v1/products`)
fetch(`${API_BASE}/api/v1/promo-banners`)
fetch(`${API_BASE}/api/v1/categories`)
```

#### 2. Сохранение контента:
```typescript
// БЫЛО:
fetch(`${API_BASE}/content`, { method: 'PUT', ... })

// СТАЛО:
fetch(`${API_BASE}/api/v1/content/home`, { method: 'PUT', ... })
```

#### 3. Обновление коллекций:
```typescript
// БЫЛО:
fetch(`${API_BASE}/content/collections/${key}`, { method: 'PATCH', ... })

// СТАЛО:
fetch(`${API_BASE}/api/v1/content/collections/${key}`, { method: 'PATCH', ... })
```

#### 4. Операции с баннерами:
```typescript
// БЫЛО:
fetch(`${API_BASE}/promo-banners`, { method: 'POST', ... })
fetch(`${API_BASE}/promo-banners/${id}`, { method: 'PATCH', ... })
fetch(`${API_BASE}/promo-banners/${id}`, { method: 'DELETE' })

// СТАЛО:
fetch(`${API_BASE}/api/v1/promo-banners`, { method: 'POST', ... })
fetch(`${API_BASE}/api/v1/promo-banners/${id}`, { method: 'PATCH', ... })
fetch(`${API_BASE}/api/v1/promo-banners/${id}`, { method: 'DELETE' })
```

## Другие файлы (уже были правильные)

### ✅ `vinesent-admin/src/app/admin/products/page.tsx`
Все пути правильные:
- `${API_BASE}/api/v1/products`
- `${API_BASE}/api/v1/categories`
- `${API_BASE}/api/v1/variants`

### ✅ `vinesent-admin/src/app/admin/page.tsx`
Все пути правильные:
- `${API_BASE}/api/v1/products`
- `${API_BASE}/api/v1/categories`
- `${API_BASE}/api/v1/orders`
- `${API_BASE}/api/v1/content/home`

### ✅ `vinesent-admin/src/app/admin/categories/page.tsx`
Все пути правильные:
- `${API_BASE}/api/v1/categories`

### ✅ `vinesent-admin/src/app/admin/orders/page.tsx`
Все пути правильные:
- `${API_BASE}/api/v1/orders`

### ✅ `vinesent-admin/src/app/admin/users/page.tsx`
Все пути правильные:
- `${API_BASE}/api/v1/users`

### ✅ `vinesent-admin/src/app/admin/stores/page.tsx`
Все пути правильные:
- `${API_BASE}/api/v1/stores`

## Проверка

### 1. Проверить что контейнер запущен:
```bash
docker-compose -f docker-compose.local.yml ps
```

### 2. Открыть админку:
```
http://localhost:3001/admin/products
```

### 3. Проверить консоль браузера (F12):
- ✅ Не должно быть ошибок 404
- ✅ Все запросы должны возвращать 200 OK
- ✅ Продукты должны отображаться

### 4. Проверить API напрямую:
```bash
# Через прокси Next.js
curl http://localhost:3001/api/fastapi/api/v1/products

# Напрямую на backend
curl http://localhost:8000/api/v1/products
```

## Дополнительные исправления

### `vinesent-admin/src/lib/utils.ts`
Добавлена поддержка нового формата изображений:
```typescript
// Старый формат: ["url1", "url2"]
// Новый формат: [{url: "...", type: "...", order: 0}, ...]

export function getFirstImage(images: string | null | undefined): string {
  const arr = JSON.parse(images)
  const first = arr[0]
  
  // Поддержка обоих форматов
  if (typeof first === 'string') return first
  if (typeof first === 'object' && first.url) return first.url
  
  return ''
}
```

## Статус

✅ **ВСЕ ИСПРАВЛЕНО**

- ✅ API маршруты исправлены в `content/page.tsx`
- ✅ Все остальные страницы уже были правильные
- ✅ Парсинг изображений исправлен
- ✅ Admin контейнер пересобран
- ✅ Все запросы возвращают 200 OK
- ✅ Продукты отображаются в админке
- ✅ AI фотографии отображаются корректно

## Следующие шаги

Открой админку и проверь:
1. http://localhost:3001/admin/products - список продуктов
2. http://localhost:3001/admin/content - контент и баннеры
3. http://localhost:3001/admin/categories - категории
4. Открой любой продукт - должны отображаться все 6 AI фотографий
