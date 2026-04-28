# API Routes Fix - 404 Errors Resolved

## Проблема

Адмінка показувала 404 помилки для всіх API запитів:
- `GET /api/fastapi/products` → 404
- `GET /api/fastapi/categories` → 404
- `GET /api/fastapi/variants` → 404
- `POST /api/fastapi/auth/login` → 404

## Причина

В `fastapi_app/app_factory.py` не були підключені основні роутери:
- `products` - CRUD операції для товарів
- `categories` - операції з категоріями
- `variants` - операції з варіантами
- Інші роутери були підключені без правильних префіксів

## Виправлення

### 1. Створено Products Router
**Файл:** `fastapi_app/routers/products.py`

Створено повний CRUD роутер для товарів з ендпоінтами:
- `GET /api/v1/products` - список товарів з фільтрами
- `GET /api/v1/products/{id}` - отримати товар
- `POST /api/v1/products` - створити товар
- `PUT /api/v1/products/{id}` - оновити товар
- `DELETE /api/v1/products/{id}` - видалити товар
- `GET /api/v1/products/{id}/related` - пов'язані товари
- `PUT /api/v1/products/{id}/related` - оновити пов'язані товари
- `GET /api/v1/products/{id}/measurements` - заміри товару
- `PUT /api/v1/products/{id}/measurements` - оновити заміри

**Особливості:**
- Підтримка фільтрів: `category`, `search`, `sale`, `new`, `includeOutOfStock`
- Автоматична генерація slug якщо не вказано
- Динамічне оновлення полів (тільки ті, що передані)
- Підтримка JSON формату для images

### 2. Оновлено App Factory
**Файл:** `fastapi_app/app_factory.py`

Підключено всі роутери з правильними префіксами:

```python
# Роутери з префіксом /api/v1
app.include_router(products_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(variants_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(stores_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(utility_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")

# Роутери з власними префіксами
app.include_router(auth_router)  # має /auth/ в декораторах
app.include_router(liqpay_router)  # має /liqpay в префіксі
app.include_router(product_images_router)  # має /api/v1/products в префіксі
app.include_router(ai_photos.router, prefix="/api")  # має /admin/ai-photos
app.include_router(backup.router, prefix="/api")  # має /admin/backup
app.include_router(recommendations.router)  # має /api/v1/products в префіксі
```

## Структура API

### Публічні ендпоінти (без авторизації)
```
GET  /auth/me
POST /auth/login
POST /auth/register
POST /auth/logout
GET  /api/v1/products
GET  /api/v1/products/{id}
GET  /api/v1/categories
GET  /api/v1/content/{key}
```

### Адмін ендпоінти (потрібна авторизація)
```
POST   /api/v1/products
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}
POST   /api/v1/products/{id}/images
DELETE /api/v1/products/{id}/images
POST   /api/admin/ai-photos/generate
POST   /api/admin/ai-photos/generate-multiple
POST   /api/v1/products/ai-autofill
```

## Як працює Proxy

### Frontend → Backend
1. Фронтенд робить запит: `http://localhost:3001/api/fastapi/products`
2. Next.js proxy (`vinesent-admin/src/app/api/fastapi/[...path]/route.ts`) перехоплює
3. Proxy видаляє `/api/fastapi` і додає до `FASTAPI_URL`
4. Запит йде на backend: `http://backend:8000/api/v1/products`
5. Backend обробляє і повертає відповідь
6. Proxy передає відповідь фронтенду

### Приклади маршрутизації
```
Frontend                                  → Backend
http://localhost:3001/api/fastapi/auth/login          → http://backend:8000/auth/login
http://localhost:3001/api/fastapi/products            → http://backend:8000/api/v1/products
http://localhost:3001/api/fastapi/categories          → http://backend:8000/api/v1/categories
http://localhost:3001/api/fastapi/products/ai-autofill → http://backend:8000/api/v1/products/ai-autofill
```

## Тестування

### Перевірка через curl

```bash
# Логін
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vineshop.com","password":"admin123"}'

# Список товарів
curl http://localhost:8000/api/v1/products?includeOutOfStock=true

# Категорії
curl http://localhost:8000/api/v1/categories

# Варіанти
curl http://localhost:8000/api/v1/variants
```

### Перевірка через admin proxy

```bash
# Логін через proxy
curl -X POST http://localhost:3001/api/fastapi/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vineshop.com","password":"admin123"}'

# Товари через proxy
curl http://localhost:3001/api/fastapi/products?includeOutOfStock=true
```

## Результат

✅ **Всі API ендпоінти тепер працюють:**
- Логін/реєстрація
- Список товарів
- Категорії
- Варіанти
- Завантаження фото
- AI генерація
- Автозаповнення

✅ **Адмінка тепер повністю функціональна:**
- Можна увійти в систему
- Відображається список товарів
- Працює створення/редагування товарів
- Працює завантаження фото з типами (front/back/side)
- Працює AI генерація з вибором типу

## Файли змінені

1. **`fastapi_app/routers/products.py`** - створено новий роутер
2. **`fastapi_app/app_factory.py`** - підключено всі роутери з правильними префіксами

## Наступні кроки

Тепер можна:
1. Увійти в адмінку: http://localhost:3001
2. Створювати товари з фото різних типів
3. Генерувати AI фото спереду/ззаду/збоку
4. Працювати з категоріями та варіантами

Всі функції з попереднього апдейту (вибір типу фото, AI генерація з типом) тепер повністю працюють!
