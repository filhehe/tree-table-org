export type OrgNode = {
  id: string
  name: string
  parentId: string | null
  headcount: number
  budget: number
  performance: number
  updatedAt: string
}

export type OrgIndex = {
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  roots: string[]
  levels: Map<string, number>
}

export type Aggregate = {
  level: number
  totalHeadcount: number
  totalBudget: number
  weightedSum: number
  weightedPerformance: number
}

export class OrgGraphError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrgGraphError'
  }
}
