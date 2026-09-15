# Data model

Контракты дерева, алгоритм агрегации и форма SSE-патча.
Реализация — чистые функции в `src/domain/`.

## OrgNode

Плоский элемент `GET /api/org-tree`. Клиент валидирует **весь массив** через zod; любой сбой схемы → состояние `error`, дерево не строится.

| Поле          | Тип              | Инвариант                                    |
| ------------- | ---------------- | -------------------------------------------- |
| `id`          | `string`         | непустой, уникален в ответе                  |
| `name`        | `string`         | непустой                                     |
| `parentId`    | `string \| null` | `null` = корень; иначе id существующего узла |
| `headcount`   | `number`         | целое ≥ 0                                    |
| `budget`      | `number`         | целое ≥ 0, рубли                             |
| `performance` | `number`         | 0…100 включительно                           |
| `updatedAt`   | `string`         | ISO-8601 datetime с timezone (`Z` или `±HH:MM`) |

```ts
// src/domain/schema.ts
orgNodeSchema = {
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  headcount: z.number().int().nonnegative(),
  budget: z.number().int().nonnegative(),
  performance: z.number().min(0).max(100),
  updatedAt: z.iso.datetime({ offset: true }),
}
```

### Инварианты графа

- Нет циклов по `parentId`.
- Нет висячих `parentId` (ссылка на отсутствующий id).
- ≥1 корень допустим; несколько корней допустимы.
- Пустой массив `[]` валиден → UI `empty`, не `error`.

Сервер гарантирует инварианты генератором. Клиент при нарушении графа (после успешного zod) трактует ответ как ошибку данных.

Уровни орг-структуры в фикстуре: дивизион (0) → отдел (1) → команда (2). Модель уровнями не ограничена: `level` — длина пути от корня.

## Индексы после загрузки

Считаются **один раз** на snapshot (`buildTree` + `aggregateTree`), результат мемоизируется в store.

```ts
type OrgIndex = {
  nodesById: Map<string, OrgNode>;
  childrenByParent: Map<string | null, string[]>;
  roots: string[];
};

type Aggregate = {
  level: number;
  totalHeadcount: number;
  totalBudget: number;
  weightedSum: number;
  weightedPerformance: number;
};
```

`childrenByParent.get(null)` — id корней. Порядок детей стабильный: как в исходном массиве (не алфавит, чтобы дерево не «прыгало»).

## Построение дерева

```
buildTree(nodes: OrgNode[]): OrgIndex
```

1. Заполнить `nodesById`.
2. Для каждого узла: `childrenByParent[parentId].push(id)`.
3. `roots = childrenByParent.get(null) ?? []`.
4. Проверить: каждый `parentId !== null` есть в `nodesById`; DFS/BFS на циклы.

UI-дерево — проекция: для id список детей из `childrenByParent`, данные узла из `nodesById`. Отдельный тип `TreeNode { node, children }` view-model, но источник истины — индексы.

## Агрегация

Суммарные показатели узла **включают сам узел и всех потомков**. Средняя эффективность — **взвешенная по headcount** (headcount узла входит в вес).

### Формулы

Для листа:

```
totalHeadcount(n)      = n.headcount
totalBudget(n)         = n.budget
weightedSum(n)         = n.performance * n.headcount
weightedPerformance(n) = totalHeadcount === 0 ? 0 : weightedSum / totalHeadcount
level(n)               = 0 если parentId === null, иначе level(parent) + 1
```

Для внутреннего узла:

```
totalHeadcount(n) = n.headcount + Σ totalHeadcount(child)
totalBudget(n)    = n.budget    + Σ totalBudget(child)
weightedSum(n)    = n.performance * n.headcount + Σ weightedSum(child)
weightedPerformance(n) = totalHeadcount === 0 ? 0 : weightedSum / totalHeadcount
```

`weightedSum` хранится явно, чтобы патч предка не терял точность и не требовал спускаться в листья.

### Полный проход

```
aggregateTree(index: OrgIndex): Map<string, Aggregate>
```

Постпорядок (дети до родителя): для каждого корня DFS post-order или итеративный стек.
Вызывается после первой загрузки и после замены snapshot с сервера (SWR revalidate). **Не** вызывается на каждый патч.

### Пример

```
A  headcount=10 performance=50 budget=100
└─ B headcount=6  performance=100 budget=40
```

```
B: totalHeadcount=6,  totalBudget=40,  weightedSum=600,  avg=100
A: totalHeadcount=16, totalBudget=140, weightedSum=50*10+600=1100, avg=68.75
```

Неверно: среднее арифметическое `(50+100)/2 = 75`.
Неверно: игнорировать собственный headcount A (`600/6 = 100`).

## OrgPatch (SSE)

Одно событие = частичное обновление **существующего** узла. Новых узлов и удалений в mock нет.

```ts
type OrgPatch = {
  id: string;
  headcount?: number;
  budget?: number;
  performance?: number;
  updatedAt: string;
};
```

| Поле                | Правило                                                 |
| ------------------- | ------------------------------------------------------- |
| `id`                | обязателен, должен быть в `nodesById`                   |
| метрики             | хотя бы одно из `headcount`, `budget`, `performance`    |
| значения            | те же инварианты, что у `OrgNode`                       |
| `name` / `parentId` | **нет** в контракте v1 (перестройка дерева не нужна)    |
| `updatedAt`         | обязателен, ISO; монотонность относительно предыдущего. |

Wire-форма SSE:

```
event: patch
data: {"id":"team-12","headcount":8,"updatedAt":"2026-09-15T08:00:00.000Z"}

```

Неизвестные поля клиент игнорирует (zod `.strip()`). Патч с неизвестным `id` — лог + skip, соединение не рвём. Невалидный JSON/схема патча — skip этого события, логирование.

## Инкрементальный пересчёт

```
applyPatch(index, aggregates, patch): { index, aggregates, touchedIds }
```

1. Найти узел.
2. Смержить поля патча в `nodesById` (новый объект узла, Map — новая ссылка на уровень store).
3. Пересчитать `Aggregate` этого узла из **собственных** полей + уже посчитанных агрегатов детей (дети не менялись).
4. Подняться по `parentId` до корня: каждый предок = собственные поля + Σ агрегатов детей.
5. `touchedIds` = узел + предки. UI подсвечивает fade только их (ячейки строки / индикатор в дереве).

Соседние ветки не входят в `touchedIds` и не пересчитываются. Их поддеревья не зависят от патча.

Сложность: O(depth + branching(предков)). При depth ≈ 3 и n ≥ 40 это требование ТЗ «пересчёт только затронутого узла и предков», не оптимизация ради 40 узлов.

Подробности решения: [ADR 003](adr/003-incremental-aggregation.md).

## Проекция для таблицы

Строка таблицы = узел + его `Aggregate` (не сырые `headcount`/`budget`/`performance`, кроме имени и уровня).

| Колонка               | Источник                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| Подразделение         | `node.name`                                                                      |
| Уровень               | `aggregate.level` (отображение: 0 дивизион / 1 отдел / 2 команда / иначе число)  |
| Всего сотрудников     | `aggregate.totalHeadcount`                                                       |
| Бюджет суммарный      | `aggregate.totalBudget`, формат `12 345 678 руб.` неразрывный пробел             |
| Средняя эффективность | `aggregate.weightedPerformance`, округление — один раз в форматтере, не в домене |

Фильтр по названию: substring, case-insensitive, по `node.name`. Дебаунс 250 мс — слой UI, не домен.

NL-поиск накладывает `StructuredFilter` поверх той же проекции ([ADR 004](adr/004-nl-search.md)).

## Структурированный фильтр

```ts
type StructuredFilter = {
  nameContains?: string;
  level?: number;
  minHeadcount?: number;
  maxHeadcount?: number;
  minBudget?: number;
  maxBudget?: number;
  minPerformance?: number;
  maxPerformance?: number;
};
```

Пустой объект = нет NL-ограничений. Неизвестные фразы → fallback: `{ nameContains: rawQuery }`.

## Тесты домена (обязательный unit-тест)

Минимум:

1. Лист: агрегаты равны собственным полям.
2. Родитель + дети: формулы как в примере A/B.
3. `headcount === 0` на всём поддереве → `weightedPerformance === 0`, без NaN.
4. `applyPatch` на листе меняет предков и **не** меняет агрегаты сиблинга.
5. Невалидный snapshot (цикл / битый parentId) → ошибка.

Файл: `src/domain/aggregate.test.ts`
