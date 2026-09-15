# PomidorQA — тесты марафона «Автоматизация на Playwright + TypeScript»

## Установка

```bash
npm install
npx playwright install chromium
```

## Запуск тестов

```bash
npm run test:unit   # Unit — без сети и без браузера
npm run test:api    # API — HTTP-запросы к локальному мок-серверу
npm run test:e2e    # E2E — реальный браузер на живом aiqa.su/pomidorqa
npm test            # все три уровня сразу
npm run report      # открыть HTML-отчёт последнего прогона
```

По умолчанию E2E-тесты бьют в продакшен (`https://aiqa.su`). Если нужно направить на локальный
стенд — переопредели `POMIDORQA_BASE_URL`:

```bash
POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e
```

## Структура

```
src/pyramid/       — вспомогательный код: чистые функции (unit) и локальный мок-сервер (api)
tests/unit/        — пересечение слотов по времени, форматирование времени, валидация пароля
tests/api/         — регистрация, бронирование, гонка за слот — через HTTP к локальному мок-серверу
tests/e2e/         — реальный сценарий бронирования и негативный сценарий логина в браузере
```

