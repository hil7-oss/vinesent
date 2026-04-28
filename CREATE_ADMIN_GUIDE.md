# 🔐 Создание админа

## Быстрый способ (рекомендуется)

### Через Docker (если проект запущен):
```bash
docker-compose -f docker-compose.local.yml exec backend python create_admin_quick.py
```

### Локально (если Python установлен):
```bash
python create_admin_quick.py
```

**Создаст админа с дефолтными credentials:**
- Email: `admin@vineshop.com`
- Password: `admin123`
- URL: `http://localhost:3001`

---

## Продвинутый способ (кастомные данные)

### Через Docker:
```bash
# Интерактивно (введете пароль)
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.create_admin

# С параметрами
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.create_admin \
  --email your@email.com \
  --password yourpassword \
  --name "Your Name"
```

### Локально:
```bash
# Интерактивно
python -m fastapi_app.scripts.create_admin

# С параметрами
python -m fastapi_app.scripts.create_admin \
  --email your@email.com \
  --password yourpassword \
  --name "Your Name"
```

---

## Что делает скрипт?

1. ✅ Проверяет существует ли пользователь с таким email
2. ✅ Если существует - предлагает обновить роль на ADMIN
3. ✅ Если не существует - создает нового пользователя
4. ✅ Хеширует пароль (PBKDF2-SHA256)
5. ✅ Устанавливает роль ADMIN
6. ✅ Выводит credentials для входа

---

## После создания

### 1. Войти в админку
Откройте: **http://localhost:3001**

### 2. Ввести credentials
- Email: `admin@vineshop.com`
- Password: `admin123`

### 3. Сменить пароль (рекомендуется)
После первого входа смените пароль на более безопасный.

---

## Troubleshooting

### Ошибка подключения к БД
```bash
# Проверить что PostgreSQL запущен
docker-compose -f docker-compose.local.yml ps postgres

# Проверить что можно подключиться
docker-compose -f docker-compose.local.yml exec postgres \
  psql -U vinesent -d vinesent -c "SELECT 1"
```

### Пользователь уже существует
Скрипт предложит обновить роль на ADMIN. Введите `yes`.

### Забыли пароль
Запустите скрипт снова с новым паролем:
```bash
docker-compose -f docker-compose.local.yml exec backend \
  python -m fastapi_app.scripts.create_admin \
  --email admin@vineshop.com \
  --password newpassword
```

---

## Проверка

### Проверить что админ создан:
```bash
docker-compose -f docker-compose.local.yml exec postgres \
  psql -U vinesent -d vinesent \
  -c 'SELECT id, email, name, role FROM "User" WHERE role = '\''ADMIN'\'';'
```

### Проверить что можно войти:
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vineshop.com",
    "password": "admin123"
  }'
```

Должен вернуть токен.

---

## Безопасность

⚠️ **ВАЖНО:**
- Дефолтный пароль `admin123` только для разработки
- Смените пароль после первого входа
- Не используйте простые пароли в продакшене
- Храните credentials в безопасном месте

---

## Быстрая шпаргалка

```bash
# 1. Создать админа (быстро)
docker-compose -f docker-compose.local.yml exec backend python create_admin_quick.py

# 2. Войти в админку
# http://localhost:3001
# Email: admin@vineshop.com
# Password: admin123

# 3. Готово! ✅
```
