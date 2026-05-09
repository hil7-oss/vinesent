#!/bin/bash

echo "🔄 Перезапуск локального окружения..."
echo ""

# Остановка всех контейнеров
echo "⏹️  Остановка контейнеров..."
docker-compose -f docker-compose.local.yml down

# Удаление старых контейнеров
echo "🗑️  Удаление старых контейнеров..."
docker container prune -f

# Запуск контейнеров
echo "🚀 Запуск контейнеров..."
docker-compose -f docker-compose.local.yml up -d --build

# Ожидание запуска
echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo ""
echo "📊 Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Готово!"
echo ""
echo "🌐 Доступные сервисы:"
echo "   - Клиентский фронтенд: http://localhost:3000"
echo "   - Админка: http://localhost:3001"
echo "   - Backend API: http://localhost:8000"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 Логи можно посмотреть командой:"
echo "   docker logs -f [имя_контейнера]"
echo ""
