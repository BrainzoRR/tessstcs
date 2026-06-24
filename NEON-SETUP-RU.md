# Подключение Neon Postgres к Vercel — ПОШАГОВО (для новичков)

## Проблема
При обновлении сайта на Vercel вся история матчей сбрасывается.
**Причина:** Vercel использует SQLite-файл, который стирается при каждом деплое.
**Решение:** Подключить облачную базу Neon Postgres (бесплатно, навсегда).

---

## ШАГ 1: Создай базу на Neon (2 минуты)

1. Открой https://neon.tech в браузере
2. Нажми **Sign up** (бесплатно, можно через GitHub/Google)
3. После входа нажми **Create new project**
4. Заполни:
   - **Project name**: `cs2-sim-db` (любое имя)
   - **Database name**: `neondb` (оставь по умолчанию)
   - **Region**: выбери ближайший (например Frankfurt для Европы)
5. Нажми **Create project**

После создания Neon покажет страницу с connection string. **НЕ ЗАКРЫВАЙ ЕЁ**.

---

## ШАГ 2: Скопируй DATABASE_URL

На странице проекта Neon найди блок **Connection Details** (или вкладка **Dashboard** → **Connection string**).
Там будет строка вида:

```
postgresql://username:password@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Скопируй её целиком** (от `postgresql://` до `sslmode=require`).

⚠️ ВАЖНО: эта строка — твой "ключ" к базе. Никому её не показывай и не коммить в GitHub!

---

## ШАГ 3: Добавь DATABASE_URL в Vercel

1. Открой https://vercel.com → зайди в свой проект `cs2-sim`
2. В верхнем меню проекта нажми **Settings**
3. Слева в меню найди **Environment Variables** → нажми
4. Нажми **Add New**
5. Заполни:
   - **Key**: `DATABASE_URL`  (ровно так, большими буквами, с подчёркиванием)
   - **Value**: вставь свою строку из Neon (из Шага 2)
   - **Environment**: галочки на **Production**, **Preview**, **Development** (все три)
6. Нажми **Save**

---

## ШАГ 4: Создай таблицы в базе (один раз!)

В Neon проекте открой вкладку **SQL Editor** (слева в меню), скопируй ВЕСЬ текст ниже и вставь в редактор:

```sql
CREATE TABLE IF NOT EXISTS "MatchRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchDate" TEXT NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "teamAName" TEXT NOT NULL,
    "teamBName" TEXT NOT NULL,
    "teamATag" TEXT NOT NULL,
    "teamBTag" TEXT NOT NULL,
    "seriesScoreA" INTEGER NOT NULL,
    "seriesScoreB" INTEGER NOT NULL,
    "winnerKey" TEXT NOT NULL,
    "winnerName" TEXT NOT NULL,
    "mvpNickname" TEXT,
    "mapsLabel" TEXT NOT NULL,
    "includedInStats" BOOLEAN NOT NULL DEFAULT true,
    "dataJson" TEXT NOT NULL,
    CONSTRAINT "MatchRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MatchRecord_tournamentName_idx" ON "MatchRecord"("tournamentName");
CREATE INDEX IF NOT EXISTS "MatchRecord_stage_idx" ON "MatchRecord"("stage");
CREATE INDEX IF NOT EXISTS "MatchRecord_eventType_idx" ON "MatchRecord"("eventType");
CREATE INDEX IF NOT EXISTS "MatchRecord_matchDate_idx" ON "MatchRecord"("matchDate");
CREATE INDEX IF NOT EXISTS "MatchRecord_teamAName_idx" ON "MatchRecord"("teamAName");
CREATE INDEX IF NOT EXISTS "MatchRecord_teamBName_idx" ON "MatchRecord"("teamBName");
CREATE INDEX IF NOT EXISTS "MatchRecord_includedInStats_idx" ON "MatchRecord"("includedInStats");
```

Нажми **Run**. Должно появиться "Query executed successfully".

---

## ШАГ 5: Передеплой на Vercel

1. В Vercel открой свой проект
2. Вкладка **Deployments**
3. Найди последний деплой → нажми **⋮** (три точки) → **Redeploy**
4. Дождись сборки (~2 минуты)
5. Открой `https://твой-домен.vercel.app/api/debug` — должен показать `dbProvider: "postgresql"` и `totalMatches: 0`
6. Симилируй матч на сайте → проверь `/api/debug` снова → `totalMatches` должен вырасти

Готово! Данные сохраняются навсегда. 🎉

---

## Если что-то не работает

### `PrismaClientInitializationError`
→ `DATABASE_URL` не задан в Vercel или неверный. Проверь Settings → Environment Variables.

### `The table MatchRecord does not exist`
→ Ты не выполнил Шаг 4 (создание таблиц). Иди в Neon SQL Editor и выполни SQL.

### Данные пропадают
→ Проверь `/api/debug`. Если `dbProvider: "file"` — DATABASE_URL ещё SQLite, поменяй на Neon.
