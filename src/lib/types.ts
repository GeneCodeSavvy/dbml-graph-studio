export type SchemaField = {
  name: string;
  type: string;
  primary: boolean;
  unique: boolean;
  notNull: boolean;
  increment: boolean;
  note?: string;
  defaultValue?: string;
};

export type SchemaIndex = {
  name?: string;
  unique?: boolean;
  primary?: boolean;
  columns: string[];
};

export type SchemaTable = {
  id: string;
  name: string;
  schemaName?: string;
  note?: string;
  fields: SchemaField[];
  indexes: SchemaIndex[];
};

export type SchemaRelation = {
  id: string;
  sourceTable: string;
  sourceFields: string[];
  targetTable: string;
  targetFields: string[];
  sourceRelation: string;
  targetRelation: string;
  onDelete?: string;
  onUpdate?: string;
  name?: string;
};

export type SchemaEnum = { name: string; values: string[] };
export type SchemaGroup = { name: string; tables: string[]; color?: string; note?: string };

export type ParsedSchema = {
  tables: SchemaTable[];
  relations: SchemaRelation[];
  enums: SchemaEnum[];
  groups: SchemaGroup[];
};

export type ParseIssue = { message: string; line?: number; column?: number };

export type AnalysisNode = {
  id: string;
  community: number;
  degree: number;
  inbound: number;
  outbound: number;
  betweenness: number;
  pagerank: number;
  articulation: boolean;
};

export type GraphAnalysis = {
  nodes: Record<string, AnalysisNode>;
  communities: { id: number; tables: string[] }[];
  bridgePairs: [string, string][];
  topHubs: AnalysisNode[];
  topBridgeEdges: { source: string; target: string; score: number }[];
};

export type LayoutMode = 'layered' | 'community';
