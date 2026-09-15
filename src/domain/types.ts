export type OrgNode = {
  id: string;
  name: string;
  parentId: string | null;
  headcount: number;
  budget: number;
  performance: number;
  updatedAt: string;
};

export type OrgIndex = {
  nodesById: Map<string, OrgNode>;
  childrenByParent: Map<string | null, string[]>;
  roots: string[];
  levels: Map<string, number>;
};

export type Aggregate = {
  level: number;
  totalHeadcount: number;
  totalBudget: number;
  weightedSum: number;
  weightedPerformance: number;
};

export type OrgPatch = {
  id: string;
  headcount?: number;
  budget?: number;
  performance?: number;
  updatedAt: string;
};

export type UpdatedField =
  | 'ownHeadcount'
  | 'ownPerformance'
  | 'totalHeadcount'
  | 'totalBudget'
  | 'weightedPerformance'
  | 'descendantHeadcount';

export type OrgSnapshot = {
  nodes: OrgNode[];
  index: OrgIndex;
  aggregates: Map<string, Aggregate>;
};

export class OrgGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrgGraphError';
  }
}
