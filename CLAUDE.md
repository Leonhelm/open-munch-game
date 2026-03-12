# Open Munch Game

Карточная игра «Манчкин» — Angular 21 + TypeScript 5.9 + Vitest

## Команды

```bash
npm start        # dev-сервер (ng serve)
npm run build    # production-сборка
npm test         # запуск тестов (vitest)
```

## Архитектура

- **Zoneless** — `provideZonelessChangeDetection()` в `app.config.ts`
- **OnPush** — все компоненты используют `ChangeDetectionStrategy.OnPush`
- **Standalone** — все компоненты standalone (Angular 21 по умолчанию)
- **Signals** — состояние игры на Angular signals, без RxJS где возможно

## Структура

```
src/app/
  core/models/    — типы и интерфейсы (карты, игроки, состояние)
  core/engine/    — сервисы игрового движка (колоды, бой, ходы, экипировка)
  core/bot/       — AI ботов
  features/       — UI-компоненты (lobby, game-board, hand, combat, card)
  shared/         — общие утилиты
  data/           — данные карт
```

## Конвенции

- Минимум внешних зависимостей
- CSS только для позиционирования, базовые HTML-элементы
- Тесты рядом с файлами: `*.spec.ts`
- Цель покрытия: 80%
