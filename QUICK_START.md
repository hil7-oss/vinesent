# 🚀 Быстрый старт - Front/Back система изображений

## ⚡ За 5 минут

### 1. Запустить проект
```bash
docker-compose -f docker-compose.local.yml up -d --build
```

### 2. Проверить что работает
```bash
curl http://localhost:8000/health
```

Ожидаемый ответ:
```json
{"status": "ok", "db": "postgresql"}
```

### 3. Открыть Swagger UI
Откройте в браузере: **http://localhost:8000/docs**

### 4. Протестировать загрузку изображения

Получите admin токен (замените пароль):
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vineshop.com", "password": "YOUR_PASSWORD"}'
```

Загрузите изображение:
```bash
curl -X POST "http://localhost:8000/api/v1/products/{PRODUCT_ID}/images" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your_image.jpg" \
  -F "type=front"
```

### 5. Готово! ✅

---

## 📖 Что дальше?

### Полная документация:
- **API**: `API_IMAGES_DOCUMENTATION.md`
- **Тестирование**: `TESTING_GUIDE.md`
- **Реализация**: `FRONT_BACK_IMPLEMENTATION.md`
- **Резюме**: `SUMMARY.md`

### Основные возможности:

#### Загрузка изображений с типом
```bash
# Front (спереди)
-F "type=front"

# Back (сзади)
-F "type=back"

# Side (сбоку)
-F "type=side"

# Additional (дополнительные)
-F "type=additional"
```

#### AI Генерация с типом
```json
{
  "productId": "...",
  "gender": "male",
  "imageType": "back"  // front, back, side
}
```

#### Получение изображений
```bash
# Все изображения
GET /api/v1/products/{id}/images

# Только back
GET /api/v1/products/{id}/images/back
```

---

## 🎯 Типичные задачи

### Добавить фото спереди и сзади
```bash
# 1. Загрузить front
curl -X POST "http://localhost:8000/api/v1/products/PRODUCT_ID/images" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@front.jpg" \
  -F "type=front"

# 2. Загрузить back
curl -X POST "http://localhost:8000/api/v1/products/PRODUCT_ID/images" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@back.jpg" \
  -F "type=back"
```

### Сгенерировать AI фото сзади
```bash
curl -X POST "http://localhost:8000/api/admin/ai-photos/generate" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "gender": "male",
    "colorSource": "auto",
    "imageType": "back"
  }'
```

### Мигрировать существующие данные
```bash
# Просмотр (без изменений)
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.migrate_product_images

# Применить
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.migrate_product_images --apply
```

---

## 🔧 Troubleshooting

### Docker не запускается
```bash
# Проверить Docker Desktop запущен
docker ps

# Пересобрать контейнеры
docker-compose -f docker-compose.local.yml up -d --build
```

### Backend ошибки
```bash
# Посмотреть логи
docker-compose -f docker-compose.local.yml logs backend --tail=100

# Перезапустить backend
docker-compose -f docker-compose.local.yml restart backend
```

### Cloudinary не работает
Проверьте `.env`:
```env
CLOUDINARY_CLOUD_NAME=dkgds398y
CLOUDINARY_API_KEY=456431896469945
CLOUDINARY_API_SECRET=SjF0j6rADcPrkfwPZqovtW96H-4
```

---

## 📋 Чек-лист

- [ ] Docker запущен
- [ ] Backend отвечает на /health
- [ ] Swagger UI открывается
- [ ] Получен admin токен
- [ ] Загружено front изображение
- [ ] Загружено back изображение
- [ ] Протестирована AI генерация
- [ ] Проверено качество изображений

---

## 🎉 Готово!

Теперь у вас работает полная система управления изображениями с поддержкой front/back/side!

**Следующий шаг:** Интегрировать с фронтендом (см. `FRONT_BACK_IMPLEMENTATION.md`)
