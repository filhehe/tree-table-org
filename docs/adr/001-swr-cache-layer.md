# 001. Слой кэша SWR вместо React Query

- Status: Accepted
- Date: 2026-09-15
- Tags: cache, data-layer, bundle
- Relates: [architecture.md](../architecture.md), [002-sse-over-websocket.md](002-sse-over-websocket.md)

## Контекст

Решил сделать самописный в рамках ТЗ, в реальном проекте взял бы Tanstack Query.

ТЗ требует:

- запрос через слой кэширования;
- stale time 5 секунд;
- stale-while-revalidate;
- инвалидация только при реальном изменении данных;
- отмена запроса при размонтировании;
- в step/3 — применять патч **без полного рефетча**.

Переключение Tree/Table и повторный mount виджета не должны бить сеть, если snapshot свежий. Production-бюджет: JS ≤ 200 КБ gzip. TanStack Query решает SWR «из коробки», но прячет механику и добавляет вес к бандлу.

Нужен явный, тестируемый слой с одной операцией «заменить узел in-place».

## Решение

Самописный легкий кэш + store.

1. **Ключ** — идентичность payload: `org-tree` плюс нормализованные `scenario` / `status`. `delay` в ключ не входит (это транспорт mock API). `/` и `/?delay=2000` — один слот; `/?scenario=empty` и `/?status=500` — отдельные. In-flight дедуп тоже по этому ключу, не глобальный.
2. **Stale time = 5000 мс.** `age < 5s` → вернуть из кеша, запрос не слать. `age ≥ 5s` → отдать stale сразу, GET в фоне, подменить snapshot после успешного ответа, патч только того, что изменилось. Stale смотрится только в слоте текущего ключа: чужой scenario не подставляется.
3. **Abort:** `AbortController` на запрос; unsubscribe/unmount вызывает `abort()`. Abort из-за unmount не пишет `error` в store.
4. **Инвалидация:** не по таймеру и не по смене UI. Snapshot меняется только так:
   - успешный GET (первая загрузка / SWR revalidate);
   - `applyPatch` из SSE;
   - явный retry пользователя после `error`.
5. **Store:** `useSyncExternalStore` над этим кэшем. Нет Redux/Zustand. Состояние списка полей — в [architecture.md](../architecture.md).
6. **Валидация до кэша:** в кэш попадает только результат валидации zod. Сырой JSON не храним.

Интерфейс (целевой):

```ts
type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

interface OrgTreeCache {
  getFresh(): CacheEntry<OrgSnapshot> | null;
  load(signal: AbortSignal): Promise<OrgSnapshot>;
  applyPatch(patch: OrgPatch): void;
}
```

`load` сам решает: hit / SWR / miss. UI вызывает `load` при mount, не `fetch`.

## Альтернативы

| Вариант                         | Почему нет                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| TanStack Query                  | SWR и abort бесплатно; патч = `setQueryData`, но слой не виден в коде теста; extra bundle. |
| SWR (vercel/swr)                | Скрывает логику, лишняя зависимость.                                                       |
| React Context + useEffect fetch | Нет stale time, нет dedup, легко забыть abort, рефетч на каждый consumer.                  |
| Redux Toolkit Query             | Тяжело для одного эндпоинта, противоречит бюджету.                                         |

`useSyncExternalStore` vs Zustand: Zustand ~1–2 КБ и привычен, но для одного стора это обёртка над тем же паттерном.

## Последствия

Положительные:

- Поведение кэша читается в одном файле; проверяющий сверяет с ТЗ за минуты.
- Патч и SWR не конфликтуют: нет «revalidate убил локальный патч».
- Доменные функции остаются чистыми: кэш вызывает `buildTree` / `applyPatch`, сам ничего не считает.

Отрицательные:

- Нет готовых DevTools, retry-плагинов, persist.
- Легко ошибиться в SWR.

**Инвариант гонки:** каждый GET несёт `startedAt`. Применять snapshot только если `startedAt` ≥ `lastMutationAt` (время последнего патча или последнего успешного применения). Иначе ответ отбрасываем — патчи уже новее.
