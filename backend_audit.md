# Полный аудит бэкенда FastAPI — Вердикт и TODO

## TL;DR — Общая оценка: 5/10

Бэкенд **работоспособен, но не масштабируем**. Сейчас всё держится на одном монолите, где роутеры смешаны с сервисами, SQL смешан с бизнес-логикой, одни и те же роуты регистрируются по 2 раза, а конфигурация LiqPay дублируется в 3 местах. Перед добавлением интеграций **нужна чистка**, иначе каждая новая интеграция будет закапывать глубже.

---

## 1. КРИТИЧЕСКИЕ ПРОБЛЕМЫ (ломают продакшн прямо сейчас)

### 🔴 1.1 Двойная регистрация роутеров в app_factory.py
```
app.include_router(content_router, prefix="/api/v1")

app.include_router(content_router, prefix="")   ← ДУБЛИРУЕТ
```
**Файл:** `app_factory.py` строки 131–161  
Роутеры `content`, `categories`, `products`, `variants`, `stores`, `uploads`, `orders`, `auth`, `analytics`, `liqpay` — **зарегистрированы ДВАЖДЫ**.  
Это означает: каждый запрос к этим роутам существует по двум путям, Swagger задваивает эндпоинты, и иногда срабатывает не тот путь.  
**Причина:** было попыткой совместимости для фронта, но это неправильное решение — нужен единый prefix и proxy redirect.

### 🔴 1.2 `utility.py` дублирует `seo.py` — один и тот же эндпоинт `/sitemap-data`
`routers/utility.py:30` и `routers/seo.py:14` — оба делают `GET /sitemap-data`.  
Один из них лишний и они конфликтуют.

### 🔴 1.3 `routers/run_generate_photos.py` ещё не удалён
Мы создали `services/photo_prompts.py`, но старый `routers/run_generate_photos.py` (28 KB!) всё ещё существует.  
`ai_photos.py` уже переключён на новый импорт — но старый файл запутывает.

### 🔴 1.4 `ai_tryon.py` НЕ зарегистрирован в app_factory
Файл существует, роутер есть, но в `app_factory.py` он нигде не подключён.  
`/ai/tryon` — просто не работает.

### 🔴 1.5 `utility.py` записывает файлы в `/tmp/uploads` (Docker-несовместимо)
```python
UPLOADS_DIR = "/tmp/uploads"
```
В Docker контейнере `/tmp` — tmpfs, перезагрузка = потеря файлов.  
В то же время `config.py` задаёт правильный `UPLOADS_DIR = fastapi_app/uploads`.  
Два разных `UPLOADS_DIR` в одном проекте.

---

## 2. АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ (мешают интеграциям и росту)

### 🟠 2.1 Нет разделения на домены — всё в одной папке `routers/`
Сейчас в `routers/` сложено:
- Аутентификация (`auth.py`) 
- Платежи (`liqpay.py`)
- AI генерация (`ai_photos.py`, `ai_tryon.py`)
- Аналитика (`analytics.py`)
- Контент (`content.py`)
- Системное (`utility.py`, `root.py`, `metrics.py`, `backup.py`, `seo.py`)
- Каталог (`products.py`, `categories.py`, `variants.py`, `orders.py`, `stores.py`, `users.py`)
- AI промпты (`prompts.py`)

22 файла в одной папке — невозможно найти что где и понять зависимости.

**Нужна структура по доменам:**
```
routers/
  catalog/       → products, categories, variants, stores
  orders/        → orders, liqpay
  auth/          → auth, users
  ai/            → ai_photos, ai_tryon, prompts
  analytics/     → analytics, metrics
  system/        → utility, root, seo, backup, uploads
  content/       → content
```

### 🟠 2.2 Конфигурация LiqPay в 3 местах
- `config.py` — `LIQPAY_PUBLIC_KEY`, `get_liqpay_callback_url()`, `get_liqpay_result_base()`
- `routers/liqpay.py` — `_liqpay()`, `_liqpay_callback_url()`, `_liqpay_result_base()` (повтор того же кода)
- `liqpay.py` в корне — `LiqPayHelper` класс

Одна и та же логика разбросана по трём файлам. Изменение ключа = нужно найти все три.

### 🟠 2.3 Прямые SQL-запросы через `text()` везде (нет ORM слоя)
Повторяющийся паттерн в каждом роутере:
```python
db.execute(text('SELECT * FROM "Product" WHERE id=:id'), {"id": id})
```
Это работает, но:
- Нет типизации — опечатки в именах колонок не поймаются
- Нет централизованной логики — одна и та же выборка Product дублируется в products.py, recommendations.py, ai_photos.py, analytics.py
- Сложно тестировать — нельзя мокнуть
- Миграции руками — нет Alembic, только 4 голых SQL-файла

### 🟠 2.4 Нет единого API-роута для промптов из коробки
Ты спрашиваешь — **есть ли промпты из коробки?**  
**Да** — они есть в `services/photo_prompts.py` (TOP/BOTTOM/ACCESSORY/SET по 6-8 ракурсов каждый) и в `services/gemini_service.py` (DEFAULT_SEO_TEXT_PROMPT, DEFAULT_PRODUCT_CONTENT_PROMPT, DEFAULT_AUTOFILL_PROMPT).  
Они работают **автоматически** если ты ничего не трогаешь в UI промптов.  
Кастомные из UI применяются **поверх** дефолтных только если ты что-то сохранил в `data/prompts.json`.

### 🟠 2.5 Нет Repository/Service слоя для бизнес-логики
Бизнес-логика (подсчёт stock, обновление статуса заказа, генерация slug) **прямо в роутерах**.  
Роутер должен только: принять запрос → вызвать сервис → вернуть ответ.  
Сейчас роутеры — это и контроллер, и сервис, и репозиторий одновременно.

---

## 3. ТЕХНИЧЕСКИЙ ДОЛГ (замедляет разработку)

### 🟡 3.1 `auth.py` использует `text()` для динамического определения колонок
```python
cols = get_user_columns(db)  # SELECT information_schema
pass_col = get_password_column(db)  # ещё один запрос
```
При каждом запросе авторизации — 2-3 лишних SELECT к `information_schema`. Это медленно и хрупко. Колонки должны быть в модели.

### 🟡 3.2 `backup.py` — импортирует `pymongo` напрямую
`pymongo` нет в `requirements.txt`? Если нет — контейнер упадёт при сборке.  
Если есть — MongoDB подключается без connection pooling, без timeout.

### 🟡 3.3 `recommendations.py` делает N+1 запросов
```python
for pid in ids:
    p_out = _get_product_out(pid, db)  # SELECT для каждого ID отдельно
```
При 12 рекомендациях = 12 SELECT запросов. Нужен один `WHERE id IN (:ids)`.

### 🟡 3.4 `analytics.py` — дублирование: `/analytics/overview` и `/statistics` делают одно и то же
Два эндпоинта с 90% одинаковой логикой. Один лишний.

### 🟡 3.5 `utility.py` имеет пустой `/metrics` endpoint
```python
@router.get("/metrics")
def metrics():
    return {}  # ← просто пустой объект
```
Зачем он есть?

### 🟡 3.6 Нет Alembic — миграции вручную
4 SQL-файла в `migrations/` без системы версионирования.  
При добавлении новых таблиц (например для интеграций) — нет способа откатить или автоматически применить изменения.

### 🟡 3.7 `config.py` читает legacy `.env` пути (vinesent-api)
Три места загрузки `.env`: `fastapi_app/.env`, `root .env`, `vinesent-api/.env`.  
Это legacy fallback который должен был исчезнуть после рефакторинга, но остался.

---

## 4. СОСТОЯНИЕ main.py

`main.py` — **правильный и минимальный:**
```python
from .app_factory import create_app
app = create_app()
```
Это идеально. `main.py` не надо трогать.  
Проблема не в `main.py` — проблема в `app_factory.py` (двойная регистрация роутеров).

---

## 5. СОСТОЯНИЕ ПРОМПТОВ "ИЗ КОРОБКИ"

| Тип | Где хранятся | Работают без UI? |
|-----|-------------|------------------|
| Фото TOP (6 ракурсів) | `services/photo_prompts.py` | ✅ Да, автоматически |
| Фото BOTTOM (6 ракурсів) | `services/photo_prompts.py` | ✅ Да |
| Фото ACCESSORY (6 ракурсів) | `services/photo_prompts.py` | ✅ Да |
| Фото SET (8 ракурсів) | `services/photo_prompts.py` | ✅ Да |
| SEO метадані | `services/gemini_service.py` DEFAULT_SEO_TEXT_PROMPT | ✅ Да |
| SEO контент товару | `services/gemini_service.py` DEFAULT_PRODUCT_CONTENT_PROMPT | ✅ Да |
| SEO автозаповнення | `services/gemini_service.py` DEFAULT_AUTOFILL_PROMPT | ✅ Да |
| Кастомні з UI | `fastapi_app/data/prompts.json` | Тільки після збереження |

---

## TODO-ЛИСТ (пріоритети)

### 🔴 КРИТИЧНО (зробити першочергово)

- [ ] **BUGFIX** `app_factory.py` — видалити дубльову реєстрацію роутерів (рядки 151–161). Замінити на middleware або Next.js rewrites для proxy-сумісності
- [ ] **BUGFIX** Підключити `ai_tryon.py` в `app_factory.py` — `app.include_router(ai_tryon.router)`
- [ ] **CLEANUP** Видалити `routers/run_generate_photos.py` (замінений на `services/photo_prompts.py`)
- [ ] **BUGFIX** `utility.py` — замінити `UPLOADS_DIR = "/tmp/uploads"` на `from ..config import UPLOADS_DIR`
- [ ] **BUGFIX** Видалити один з дублів `/sitemap-data` (або `utility.py` або `seo.py`)

### 🟠 ВАЖЛИВО (перед інтеграціями)

- [ ] **REFACTOR** Згрупувати роутери по доменам (`catalog/`, `orders/`, `auth/`, `ai/`, `system/`)
- [ ] **REFACTOR** Централізувати LiqPay config — прибрати дублювання між `routers/liqpay.py` і `config.py`
- [ ] **REFACTOR** `auth.py` — прибрати dynamic column detection (`get_user_columns`, `get_password_column`), зафіксувати схему User в моделі
- [ ] **MIGRATE** Перейти на Alembic для міграцій бази даних
- [ ] **BUGFIX** `recommendations.py` — замінити N+1 запити на `WHERE id IN (:ids)`
- [ ] **CLEANUP** Видалити дублікат `analytics/statistics` — залишити один endpoint

### 🟡 БАЖАНО (технічний борг)

- [ ] **REFACTOR** Ввести Repository шар — виділити DB-операції з роутерів в `repositories/`
- [ ] **REFACTOR** Видалити legacy `.env` paths в `config.py` (vinesent-api)
- [ ] **REFACTOR** `backup.py` — перевірити `pymongo` в `requirements.txt`, додати connection timeout
- [ ] **CLEANUP** Видалити або реалізувати порожній `GET /metrics` endpoint в `utility.py`
- [ ] **DOCS** Додати OpenAPI теги і descriptions для всіх роутерів — щоб API-документація була читабельна

---

## Структура яка потрібна (кінцева мета)

```
fastapi_app/
├── main.py                    ✅ ОК (не чіпати)
├── app_factory.py             🔴 Виправити дубляж
├── config.py                  🟡 Прибрати legacy paths
├── database.py                ✅ ОК
├── dependencies.py            ✅ ОК
├── models.py                  🟡 Доповнити User полями
├── schemas.py                 ✅ ОК
├── liqpay.py                  ✅ ОК (helper клас)
│
├── routers/
│   ├── catalog/               ← products, categories, variants, stores
│   ├── orders/                ← orders, liqpay
│   ├── auth/                  ← auth, users
│   ├── ai/                    ← ai_photos, ai_tryon, prompts
│   ├── analytics/             ← analytics, metrics
│   ├── system/                ← utility, root, seo, backup, uploads
│   └── content/               ← content
│
├── services/
│   ├── auth_service.py        ✅
│   ├── cloudinary_service.py  ✅
│   ├── content_service.py     ✅
│   ├── gemini_service.py      ✅ (виправлено)
│   ├── photo_prompts.py       ✅ (новий)
│   ├── prompt_service.py      ✅ (розширено)
│   └── slug_service.py        ✅
│
├── repositories/              ← NEW: DB operations layer
│   ├── product_repo.py
│   ├── order_repo.py
│   └── user_repo.py
│
├── core/
│   ├── cache.py               ✅
│   └── storage.py             ✅
│
├── migrations/                🟡 Перейти на Alembic
└── data/
    ├── content.json
    ├── prompts.json           ✅ (новий)
    └── seo_hidden.json
```
