# 🧪 Руководство по тестированию системы Front/Back изображений

## Подготовка

### 1. Запустить проект
```bash
# Запустить все сервисы
docker-compose -f docker-compose.local.yml up -d

# Проверить что все работает
docker-compose -f docker-compose.local.yml ps

# Проверить логи backend
docker-compose -f docker-compose.local.yml logs backend --tail=50
```

### 2. Получить admin токен
```bash
# Войти как админ через API
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vineshop.com",
    "password": "your_admin_password"
  }'

# Сохранить токен из ответа
export ADMIN_TOKEN="eyJ..."
```

---

## Тест 1: Загрузка Front изображения

### Подготовить тестовое изображение
Создайте или скачайте изображение футболки спереди: `front.jpg`

### Загрузить
```bash
curl -X POST "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@front.jpg" \
  -F "type=front"
```

### Ожидаемый результат
```json
{
  "url": "https://res.cloudinary.com/dkgds398y/image/upload/...",
  "type": "front",
  "order": 0,
  "cloudinary": true,
  "cloudinaryPublicId": "vinesent/products/..."
}
```

### Проверить
```bash
# Получить все изображения продукта
curl "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images"
```

---

## Тест 2: Загрузка Back изображения

### Подготовить тестовое изображение
Создайте или скачайте изображение футболки сзади: `back.jpg`

### Загрузить
```bash
curl -X POST "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@back.jpg" \
  -F "type=back"
```

### Ожидаемый результат
```json
{
  "url": "https://res.cloudinary.com/dkgds398y/image/upload/...",
  "type": "back",
  "order": 1,
  "cloudinary": true
}
```

### Проверить
```bash
# Получить только back изображения
curl "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images/back"
```

---

## Тест 3: AI Генерация Front изображения

```bash
curl -X POST "http://localhost:8000/api/admin/ai-photos/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "{PRODUCT_ID}",
    "gender": "male",
    "colorSource": "auto",
    "imageType": "front"
  }'
```

### Ожидаемый результат
```json
{
  "id": 123,
  "productId": "{PRODUCT_ID}",
  "cloudinaryUrl": "https://res.cloudinary.com/...",
  "imageType": "front",
  "status": "done"
}
```

---

## Тест 4: AI Генерация Back изображения

```bash
curl -X POST "http://localhost:8000/api/admin/ai-photos/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "{PRODUCT_ID}",
    "gender": "male",
    "colorSource": "auto",
    "imageType": "back"
  }'
```

### Что проверить
1. ✅ Изображение сгенерировано с видом сзади
2. ✅ Модель повернута спиной к камере
3. ✅ Сохранены детали дизайна на спине
4. ✅ Качество изображения высокое
5. ✅ Текстуры реалистичные

---

## Тест 5: Получение изображений по типу

### Все изображения
```bash
curl "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images"
```

### Только front
```bash
curl "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images/front"
```

### Только back
```bash
curl "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images/back"
```

---

## Тест 6: Удаление изображения

```bash
curl -X DELETE "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images?url={IMAGE_URL}" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Ожидаемый результат
```json
{
  "success": true
}
```

---

## Тест 7: Миграция существующих данных

### Dry run (просмотр без изменений)
```bash
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.migrate_product_images
```

### Применить миграцию
```bash
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.migrate_product_images --apply
```

### Что проверить
1. ✅ Первое изображение стало `type: "front"`
2. ✅ Остальные стали `type: "additional"`
3. ✅ Все изображения имеют `isGenerated: false`
4. ✅ Старые URL сохранились

---

## Тест 8: Swagger UI

Откройте в браузере: `http://localhost:8000/docs`

### Проверить эндпоинты
1. ✅ `GET /api/v1/products/{product_id}/images`
2. ✅ `POST /api/v1/products/{product_id}/images`
3. ✅ `GET /api/v1/products/{product_id}/images/{type}`
4. ✅ `DELETE /api/v1/products/{product_id}/images`
5. ✅ `POST /api/admin/ai-photos/generate` (с параметром imageType)

---

## Проверка качества генерации

### Критерии для Front изображения
- ✅ Модель лицом к камере
- ✅ Видна передняя часть одежды
- ✅ Четкие детали и текстуры
- ✅ Правильный цвет
- ✅ Реалистичные складки
- ✅ Белый фон
- ✅ Хорошее освещение

### Критерии для Back изображения
- ✅ Модель спиной к камере
- ✅ Видна задняя часть одежды
- ✅ Сохранены принты/логотипы на спине
- ✅ Четкие детали дизайна
- ✅ Реалистичные текстуры
- ✅ Правильный цвет
- ✅ Белый фон
- ✅ Хорошее освещение

---

## Troubleshooting

### Backend не запускается
```bash
# Пересобрать контейнер
docker-compose -f docker-compose.local.yml up -d --build backend

# Проверить логи
docker-compose -f docker-compose.local.yml logs backend
```

### Cloudinary ошибки
```bash
# Проверить переменные окружения
docker-compose -f docker-compose.local.yml exec backend env | grep CLOUDINARY
```

### Ошибки генерации AI
```bash
# Проверить Gemini credentials
docker-compose -f docker-compose.local.yml exec backend env | grep GOOGLE

# Проверить логи генерации
docker-compose -f docker-compose.local.yml logs backend | grep "AI\|Gemini"
```

### База данных
```bash
# Подключиться к PostgreSQL
docker-compose -f docker-compose.local.yml exec postgres psql -U vinesent -d vinesent

# Проверить продукты
SELECT id, name, images FROM "Product" LIMIT 5;
```

---

## Чек-лист тестирования

### Backend API
- [ ] Загрузка front изображения работает
- [ ] Загрузка back изображения работает
- [ ] Загрузка side изображения работает
- [ ] Получение всех изображений работает
- [ ] Получение по типу работает
- [ ] Удаление изображения работает
- [ ] Cloudinary интеграция работает
- [ ] WebP конвертация работает

### AI Генерация
- [ ] Генерация front изображения работает
- [ ] Генерация back изображения работает
- [ ] Качество front изображений хорошее
- [ ] Качество back изображений хорошее
- [ ] Сохраняются детали дизайна
- [ ] Правильные цвета
- [ ] Реалистичные текстуры

### Миграция данных
- [ ] Dry run работает
- [ ] Миграция применяется успешно
- [ ] Старые данные сохранены
- [ ] Новый формат корректный

### Документация
- [ ] API документация актуальна
- [ ] Swagger UI работает
- [ ] Примеры запросов корректны

---

## Следующие шаги

После успешного тестирования backend:

1. **Интеграция с админкой (vinesent-admin)**
   - Добавить выбор типа при загрузке
   - Показывать тип в списке изображений
   - Добавить переключатель типа в AI генерации

2. **Интеграция с магазином (vinesent-storefront)**
   - Добавить переключатель Front/Back
   - Показывать бейдж "Design on back"
   - Реализовать hover/swipe

3. **Оптимизация**
   - Настроить кэширование
   - Добавить lazy loading
   - Оптимизировать размеры изображений

---

## Полезные команды

```bash
# Перезапустить backend
docker-compose -f docker-compose.local.yml restart backend

# Посмотреть все контейнеры
docker-compose -f docker-compose.local.yml ps

# Остановить все
docker-compose -f docker-compose.local.yml down

# Очистить volumes (ОСТОРОЖНО - удалит данные)
docker-compose -f docker-compose.local.yml down -v

# Войти в контейнер backend
docker-compose -f docker-compose.local.yml exec backend bash

# Проверить Python синтаксис
docker-compose -f docker-compose.local.yml exec backend python -m py_compile fastapi_app/routers/product_images.py
```
