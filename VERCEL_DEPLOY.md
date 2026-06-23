# Деплой на Vercel

## ⚠️ Важно: SQLite не работает на Vercel

Сейчас проект использует **SQLite** (локальный файл `db/custom.db`).
Vercel — serverless-платформа с **read-only filesystem**, поэтому SQLite там
**не сохраняет данные** (каждый запрос создаёт новый ephemeral инстанс).

Для продакшена нужно переключиться на **Vercel Postgres** (бесплатно, Neon под капотом).
Ниже — два варианта.

---

## Вариант A — Быстро: Vercel Postgres (рекомендуется)

### 1. Подготовка схемы
Перед деплоем нужно поменять провайдер БД в `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // было "sqlite"
  url      = env("DATABASE_URL")
}
```

Типы полей менять НЕ нужно — `String` для `dataJson` работает и в Postgres
(можно заменить на `Json` для эффективности, но не обязательно).

### 2. Создание базы на Vercel
1. Зайди на https://vercel.com → New Project → импортируй GitHub-репозиторий
2. В проекте: вкладка **Storage** → **Create Database** → **Postgres (Neon)** → бесплатный план
3. Скопируй `DATABASE_URL` (connection string вида `postgresql://...`)

### 3. Переменные окружения
В Vercel: **Settings** → **Environment Variables** добавь:
```
DATABASE_URL = postgresql://user:pass@host/db?sslmode=require
```

### 4. Применение схемы к новой БД
Локально (с тем же `DATABASE_URL`):
```bash
DATABASE_URL="postgresql://..." bun run db:push
```
Или через Vercel CLI:
```bash
vercel env pull .env.vercel
bun run db:push --env .env.vercel
```

### 5. Деплой
```bash
vercel --prod
```
Или просто push в GitHub — Vercel пересоберёт автоматически.

`postinstall: prisma generate` уже добавлен в package.json — Vercel сам запустит его.

---

## Вариант B — Остаться на SQLite (только для демо)

Если данные сохранять не критично (демо/тест) — можно задеплоить как есть.
Матчи будут создаваться, но **исчезать после перезагрузки** (serverless стирает файл).
Для постоянного хранения **только** Вариант A.

---

## 🖼️ Радары — добавить свои

Твои оригинальные радары лежат в `public/radars/`. Сейчас там placeholder'ы.
Замени их своими картинками с **теми же именами**:

```
public/radars/
├── mirage.webp       ← твоя Mirage
├── inferno.webp      ← твоя Inferno
├── nuke-upper.webp   ← верх Nuke
├── nuke-lower.webp   ← низ Nuke
├── overpass.webp
├── dust2.webp
├── ancient.webp
└── anubis.webp
```

Формат — `.webp` (можно и `.png`/`.jpg`, но тогда поменяй расширение в `src/app/App.jsx` строка 251, `RADAR_ASSETS`).

После замены — просто `git push`, Vercel подхватит автоматически.

---

## Чек-лист перед деплоем

- [ ] В `prisma/schema.prisma` поставлен `provider = "postgresql"`
- [ ] В Vercel создана Postgres база
- [ ] `DATABASE_URL` добавлен в Environment Variables Vercel
- [ ] `bun run db:push` выполнен с этим URL (создал таблицы)
- [ ] `public/radars/*.webp` заменены на твои картинки (по желанию)
- [ ] `git push` → Vercel авто-деплой

## Возможные проблемы

**`PrismaClientInitializationError` на Vercel**
→ `DATABASE_URL` не задан или неверный. Проверь Environment Variables.

**`Cannot find module '@prisma/client'`**
→ `postinstall` скрипт не выполнился. Vercel выполнит автоматически, но можно
добавить `prisma generate` в build-команду Vercel: `prisma generate && next build`.

**Данные пропадают**
→ Ты на SQLite. Переключайся на Postgres (Вариант A).
