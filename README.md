# Tarot Photo Bot

Telegram-бот для анализа фотографии расклада Таро по вопросу пользователя.

## Логика MVP

1. Пользователь отправляет фото расклада.
2. В подписи к фото пишет вопрос.
3. Cloudflare Worker получает изображение через Telegram Bot API.
4. Workers AI анализирует фото и вопрос.
5. Бот показывает распознанные карты, положение, общий анализ, итог и совет.
6. При низкой уверенности бот не должен выдавать догадку за факт.

## Стек

- Cloudflare Workers
- Cloudflare Workers AI
- Telegram Bot API
- TypeScript
- Только нативный `fetch` в runtime

## Secrets

Telegram token не хранится в GitHub.

Создать secret:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

## Первый запуск

Cloudflare требует принять лицензию Meta перед первым использованием Llama 3.2 11B Vision Instruct. Это делается один раз для аккаунта через Workers AI.

После настройки secret и AI binding:

```bash
npm install
npm run deploy
```

После деплоя установить Telegram webhook на URL Worker:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR_WORKER>.workers.dev
```

Токен не помещать в GitHub, README или код.
