import ELK from 'elkjs/lib/elk.bundled.js';
import type { GraphAnalysis, LayoutMode, ParsedSchema } from './types';

const elk = new ELK();
const ROW = 28;
const HEADER = 42;
const WIDTH = 280;

export const tableHeight = (fieldCount: number) => HEADER + Math.max(1, fieldCount) * ROW + 8;

async function elkLayout(schema: ParsedSchema, ids: string[], direction = 'RIGHT') {
  const idSet = new Set(ids);
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: schema.tables.filter((t) => idSet.has(t.id)).map((t) => ({ id: t.id, width: WIDTH, height: tableHeight(t.fields.length) })),
    edges: schema.relations.filter((r) => idSet.has(r.sourceTable) && idSet.has(r.targetTable)).map((r) => ({ id: r.id, sources: [r.sourceTable], targets: [r.targetTable] })),
  };
  const result = await elk.layout(graph as any);
  const positions: Record<string, { x: number; y: number }> = {};
  for (const child of result.children ?? []) positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
  return { positions, width: result.width ?? 600, height: result.height ?? 400 };
}

export async function layoutSchema(schema: ParsedSchema, analysis: GraphAnalysis, mode: LayoutMode) {
  if (mode === 'layered' || analysis.communities.length <= 1) {
    return (await elkLayout(schema, schema.tables.map((t) => t.id))).positions;
  }

  const final: Record<string, { x: number; y: number }> = {};
  const layouts = [] as { c: number; pos: Record<string, { x: number; y: number }>; width: number; height: number }[];
  for (const community of analysis.communities) {
    const l = await elkLayout(schema, community.tables);
    layouts.push({ c: community.id, pos: l.positions, width: l.width, height: l.height });
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(layouts.length)));
  const gapX = 180, gapY = 160;
  const cellW = Math.max(...layouts.map((x) => x.width), 500) + gapX;
  const cellH = Math.max(...layouts.map((x) => x.height), 400) + gapY;
  layouts.forEach((l, i) => {
    const ox = (i % cols) * cellW;
    const oy = Math.floor(i / cols) * cellH;
    for (const [id, p] of Object.entries(l.pos)) final[id] = { x: ox + p.x, y: oy + p.y };
  });
  return final;
}
