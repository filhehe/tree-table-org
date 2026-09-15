type OrgNodeDto = {
  id: string
  name: string
  parentId: string | null
  headcount: number
  budget: number
  performance: number
  updatedAt: string
}

/** id, name, headcount, budget, performance, children */
type Draft = [string, string, number, number, number, Draft[]?]

const TREE: Draft[] = [
  [
    'product',
    'Продукт',
    3,
    900_000,
    78,
    [
      ['discovery', 'Дискавери', 2, 320_000, 71, [
        ['research', 'Research', 3, 240_000, 74],
        ['interviews', 'Интервью', 2, 160_000, 66],
      ]],
      ['design', 'Дизайн', 2, 410_000, 84, [
        ['ui', 'UI', 3, 280_000, 88],
        ['brand', 'Бренд', 2, 190_000, 81],
      ]],
      ['delivery', 'Доставка', 2, 360_000, 62, [
        ['roadmap', 'Roadmap', 2, 210_000, 58],
        ['release', 'Релиз', 3, 250_000, 69],
      ]],
    ],
  ],
  [
    'eng',
    'Инженерия',
    4,
    1_400_000,
    73,
    [
      ['app', 'Приложение', 2, 520_000, 80, [
        ['web', 'Web', 5, 480_000, 86],
        ['mobile', 'Mobile', 4, 410_000, 77],
      ]],
      ['platform', 'Платформа', 2, 610_000, 70, [
        ['api', 'API', 4, 450_000, 82],
        ['infra', 'Infra', 3, 390_000, 64],
      ]],
      ['quality', 'Качество', 1, 280_000, 55, [
        ['qa', 'QA', 3, 220_000, 61],
        ['support-eng', 'Support eng', 2, 180_000, 39],
      ]],
    ],
  ],
  [
    'growth',
    'Рост',
    3,
    1_100_000,
    67,
    [
      ['marketing', 'Маркетинг', 2, 480_000, 72, [
        ['content', 'Контент', 3, 210_000, 79],
        ['performance', 'Performance', 2, 340_000, 54],
      ]],
      ['sales', 'Продажи', 2, 390_000, 60, [
        ['outbound', 'Outbound', 3, 260_000, 48],
        ['partners', 'Партнёры', 2, 180_000, 75],
      ]],
      ['success', 'Успех клиентов', 2, 310_000, 71, [
        ['onboarding', 'Онбординг', 3, 200_000, 68],
        ['care', 'Поддержка', 4, 240_000, 43],
      ]],
    ],
  ],
  [
    'ops',
    'Операции',
    2,
    620_000,
    76,
    [
      ['people', 'Люди', 2, 240_000, 82, [
        ['hr', 'HR', 2, 160_000, 85],
        ['recruiting', 'Рекрутинг', 2, 190_000, 70],
      ]],
      ['finance', 'Финансы', 1, 210_000, 74, [
        ['accounting', 'Бухгалтерия', 2, 150_000, 77],
        ['billing', 'Биллинг', 2, 170_000, 63],
      ]],
      ['office', 'Офис', 1, 140_000, 58, [
        ['admin', 'Админ', 2, 110_000, 52],
        ['legal', 'Юристы', 2, 200_000, 91],
      ]],
    ],
  ],
]

function flatten(drafts: Draft[], parentId: string | null, updatedAt: string, acc: OrgNodeDto[]) {
  for (const [id, name, headcount, budget, performance, children] of drafts) {
    acc.push({ id, name, parentId, headcount, budget, performance, updatedAt })
    if (children) flatten(children, id, updatedAt, acc)
  }
}

export function generateOrgTree(updatedAt = new Date().toISOString()): OrgNodeDto[] {
  const nodes: OrgNodeDto[] = []
  flatten(TREE, null, updatedAt, nodes)

  if (nodes.length < 40) {
    throw new Error(`Org fixture too small: ${nodes.length}`)
  }

  return nodes
}

export function getOrgTreeStats(nodes: OrgNodeDto[]) {
  const ids = new Set(nodes.map((node) => node.id))
  let maxDepth = 0

  for (const node of nodes) {
    let depth = 0
    let current: OrgNodeDto | undefined = node
    while (current?.parentId) {
      depth += 1
      current = nodes.find((candidate) => candidate.id === current?.parentId)
    }
    if (depth > maxDepth) maxDepth = depth
  }

  return { count: nodes.length, levels: maxDepth + 1, uniqueIds: ids.size }
}
