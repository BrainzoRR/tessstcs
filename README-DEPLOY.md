# CS2 Pro Match Simulator — Деплой на Vercel

> ⚠️ **Важно про данные!** Если у тебя уже задеплоено на Vercel и статистика
> сбрасывается при обновлении — открой **`NEON-SETUP-RU.md`** и следуй инструкции.
> Там пошагово (с SQL-кодом) как подключить бесплатную облачную базу Neon.

## Быстрый старт (5 минут)

### 1. Распакуй архив
```bash
tar xzf cs2-project-for-vercel.tar.gz -C cs2-sim
cd cs2-sim
```

### 2. Загрузи на GitHub
- Создай новый репозиторий на https://github.com/new (название: `cs2-sim`, Private)
- Залей файлы:
```bash
git init
git add .
git commit -m "CS2 Pro Match Simulator"
git branch -M main
git remote add origin https://github.com/ТВОЙ_НИК/cs2-sim.git
git push -u origin main
```
(Или просто перетащи файлы через веб-интерфейс GitHub)

### 3. Деплой на Vercel
1. Иди на https://vercel.com → Login (через GitHub)
2. **Add New** → **Project** → выбери репозиторий `cs2-sim`
3. НЕ нажимай Deploy сразу — сначала создай базу:
4. В проекте: вкладка **Storage** → **Connect Database** → **Postgres (Neon)** → бесплатный план
5. Vercel автоматически добавит `DATABASE_URL` в Environment Variables
6. Вернись в **Settings** → **Build & Development Settings**:
   - Build Command: `prisma generate && next build` (на всякий случай)
7. Нажми **Deploy**
8. Дождись сборки (~2 мин)

### 4. Создай таблицы в БД
После первого деплоя таблиц ещё нет. Выполни локально:
```bash
# Скачай env с Vercel
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local

# Примени схему к Postgres
npx prisma db push
```
Или через Vercel CLI: `vercel env pull && npx prisma db push`

### 5. Готово! 
Открой свой домен `cs2-sim.vercel.app` — сайт работает, данные сохраняются в Postgres.

---

## Что в проекте

```
├── prisma/schema.prisma     # Схема БД (PostgreSQL)
├── src/
│   ├── app/
│   │   ├── App.jsx          # Твой оригинальный UI (7300+ строк)
│   │   ├── page.tsx         # Точка входа (dynamic import, ssr:false)
│   │   ├── layout.tsx       # Шрифты Rajdhani/JetBrains Mono
│   │   ├── globals.css      # Тёмная тема, янтарный акцент
│   │   └── api/             # API routes (matches, sync)
│   └── lib/
│       ├── simulation.js    # Твой движок симуляции (4300+ строк)
│       ├── archiveStats.js  # Агрегация/фильтры (600+ строк)
│       ├── db.ts            # Prisma client
│       └── db-sync.ts       # Конвертация entry↔DB row
├── public/radars/           # Твои 8 радаров (.webp)
├── package.json             # postinstall: prisma generate
└── VERCEL_DEPLOY.md         # Подробная инструкция
```

## Проблемы?

| Ошибка | Решение |
|--------|---------|
| `PrismaClientInitializationError` | `DATABASE_URL` не задан — проверь Storage в Vercel |
| `Cannot find module '@prisma/client'` | Build Command: `prisma generate && next build` |
| Данные пропадают | Ты не создал таблицы — выполни `npx prisma db push` |
| Радары не грузятся | Проверь что `public/radars/*.webp` на GitHub |

## Радары уже на месте ✅
Твои 8 оригинальных радаров в `public/radars/` — просто залей на GitHub, Vercel подхватит.
