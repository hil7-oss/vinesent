# Очистка .env из Git истории

## ВАЖНО! .env уже удалён из текущего коммита, но всё ещё в истории!

Чтобы полностью удалить .env из всей истории Git, выполни:

## Вариант 1: BFG Repo-Cleaner (РЕКОМЕНДУЕТСЯ)

```bash
# 1. Скачай BFG
curl -L https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -o bfg.jar

# 2. Удали .env из всей истории
java -jar bfg.jar --delete-files .env

# 3. Очисти Git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Force push
git push origin main --force
```

## Вариант 2: Git Filter-Repo

```bash
# 1. Установи git-filter-repo
pip install git-filter-repo

# 2. Удали .env из истории
git filter-repo --path .env --invert-paths --force

# 3. Добавь remote обратно
git remote add origin https://github.com/hil7-oss/vinesent.git

# 4. Force push
git push origin main --force --all
git push origin main --force --tags
```

## После очистки - ОБЯЗАТЕЛЬНО смени все секреты!

1. JWT_SECRET
2. POSTGRES_PASSWORD
3. GOOGLE_APPLICATION_CREDENTIALS_B64
4. CLOUDINARY_API_SECRET
5. Все другие пароли и ключи

## Проверка

После force push проверь на GitHub:
https://github.com/hil7-oss/vinesent/blob/main/.env

Если файл не открывается (404) - всё ОК!
