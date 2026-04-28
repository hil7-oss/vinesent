# Vinesent Production Deployment

## Требования
- Docker и Docker Compose
- VPS сервер с минимум 2GB RAM
- Домен с настроенными DNS записями

## Установка

1. Распакуйте архив на сервере:
```bash
tar -xzf vinesent_production.tar.gz
cd vinesent_production
```

2. Создайте .env файл на основе .env.example:
```bash
cp .env.example .env
nano .env  # Заполните реальные данные
```

3. Запустите проект:
```bash
docker-compose up -d
```

4. Проверьте статус:
```bash
docker-compose ps
docker-compose logs -f
```

## Обновление

```bash
docker-compose pull
docker-compose up -d
```

## Резервное копирование

```bash
docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

## Восстановление

```bash
docker-compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```
