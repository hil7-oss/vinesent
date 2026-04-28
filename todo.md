TODO (P0 — критично)

Убрать хардкод/seed из entrypoint: C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:174 (startup) + C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:180 ( _seed_base_categories() с SQL INSERT’ами и данными) — вынести в миграции/отдельную команду/админ-скрипт.
Починить mojibake-артефакты в коде (это реально лежит в файле): C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:1 и “разделители” в”Ђ… в комментах C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:35.
Закрыть админские роуты авторизацией (сейчас просто “/admin” в URL не защищает):
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\ai_photos.py:24 (prefix /admin/ai-photos, но нет require_admin)
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\backup.py:9 (prefix /admin/backup, но нет require_admin)
Починить recommendations (сейчас архитектурно/технически сломан и ещё и с двойным /api):
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\recommendations.py:21 делает from ..main import _get_product_out (жёсткая сцепка с entrypoint / риск ImportError/циклов)
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\recommendations.py:14 уже содержит prefix="/api/v1/products", а подключается ещё и так: C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:166 с prefix="/api" ⇒ получится /api/api/v1/....
TODO (P1 — рефакторинг entrypoint)

Сделать main.py “тонким”: сейчас там намешаны middleware/метрики/рейтконтроль/handlers/сидинг (всё это не должно жить в entrypoint) — C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:56.
Убрать локальный in-memory rate limiter из main.py (он не шарится между воркерами/инстансами и дублирует Traefik rate-limit): C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:80.
Убрать прямую работу с БД из main.py (SessionLocal + raw SQL): C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:32 и C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:210.
TODO (P1 — доступ/безопасность перед подключением “неподключенных” роутов)

Сейчас в main.py подключено только 7 роутеров: C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\main.py:160.
Роутеры, которые есть в проекте, но НЕ подключены (либо подключить, либо удалить/переписать под новую схему): ai_tryon, categories, content, liqpay, products, stores, uploads, users, variants.
Перед тем как подключать их обратно — добавить авторизацию на чувствительные CRUD’ы (иначе утечки/удаление данных):
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\users.py:8 — список пользователей без require_admin.
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\stores.py:24 — POST/PUT/DELETE без require_admin.
TODO (P2 — слой БД/Depends/дубли)

Убрать SessionLocal() из роутеров и дубли get_db() (должен быть один fastapi_app.database.get_db):
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\ai_photos.py:102 (свой get_db + SessionLocal)
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\backup.py:11 (свой get_db + SessionLocal)
Принять единый подход “роутер ↔ сервис ↔ репозиторий/SQL”: сейчас куча raw SQL прямо в роутерах (text(...) почти в каждом CRUD/аналитике), что мешает рефакторингу и тестированию.
TODO (P2 — блокирующие операции в хендлерах)

Убрать time.sleep() из request path (блокирует воркер):
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\ai_photos.py:209, :458, :715
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\services\gemini_service.py:145
Синхронный requests внутри API-эндпоинтов (перевести на async http client или в threadpool/фоновые задачи):
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\ai_photos.py:154
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\liqpay.py:146
TODO (P2 — дубли функционала/мёртвый код)

Дубли upload-эндпоинта:
защищённый upload есть в C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\utility.py:76 (с require_admin)
незашищённый аналог есть в C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\uploads.py:20 (без auth, и сейчас не подключён) — удалить/переписать/не подключать.
Пустой файл-артефакт: C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\products.py (0 байт) — удалить или реализовать и подключить.
CLI/скриптовый код лежит в routers/ и тянется в runtime:
C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\routers\run_generate_4_photos.py:1 — по смыслу это не роутер (там print, argparse-логика, креды, промпты) → вынести в utils//scripts/.
TODO (P3 — конфиги/инициализация)

Дублируется загрузка .env в двух местах: C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\config.py:18 и C:\Users\AMG\Desktop\prod.1\update0.2\fastapi_app\database.py:9 — оставить один источник правды.
Дублируется логика Google credentials (config и gemini/run_generate): привести к одному месту и убрать побочные эффекты в рантайме (создание temp-файлов/переопределение env).
