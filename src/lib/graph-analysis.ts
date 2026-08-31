import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import pagerank from 'graphology-metrics/centrality/pagerank';
import type { GraphAnalysis, ParsedSchema } from './types';

function buildAdjacency(nodes: string[], pairs: [string, string][]) {
  const adj = new Map(nodes.map((n) => [n, new Set<string>()]));
  for (const [a, b] of pairs) {
    if (a === b) continue;
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  return adj;
}

function findArticulationAndBridges(nodes: string[], pairs: [string, string][]) {
  const adj = buildAdjacency(nodes, pairs);
  let time = 0;
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const articulation = new Set<string>();
  const bridges: [string, string][] = [];

  const dfs = (u: string) => {
    disc.set(u, ++time);
    low.set(u, time);
    let children = 0;

    for (const v of adj.get(u) ?? []) {
      if (!disc.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));

        if (parent.get(u) == null && children > 1) articulation.add(u);
        if (parent.get(u) != null && low.get(v)! >= disc.get(u)!) articulation.add(u);
        if (low.get(v)! > disc.get(u)!) bridges.push([u, v]);
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  };

  for (const n of nodes) {
    if (!disc.has(n)) {
      parent.set(n, null);
      dfs(n);
    }
  }

  return { articulation, bridges };
}

function bridgeImpactScore(source: string, target: string, nodes: string[], pairs: [string, string][]) {
  const adj = buildAdjacency(nodes, pairs);

  const countReachable = (start: string) => {
    const seen = new Set<string>([start]);
    const queue = [start];

    while (queue.length) {
      const current = queue.shift()!;
      for (const next of adj.get(current) ?? []) {
        const isRemovedBridge =
          (current === source && next === target) ||
          (current === target && next === source);
        if (isRemovedBridge || seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }

    return seen.size;
  };

  const left = countReachable(source);
  const right = countReachable(target);
  return left * right;
}

export function analyzeSchema(schema: ParsedSchema): GraphAnalysis {
  // Graph analysis intentionally uses a simple table-to-table projection.
  // Self-referential FKs still render in the ER diagram, but they add no
  // connectivity between tables and can destabilize/distort graph metrics.
  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
  for (const table of schema.tables) graph.addNode(table.id);

  for (const rel of schema.relations) {
    if (!graph.hasNode(rel.sourceTable) || !graph.hasNode(rel.targetTable)) continue;
    if (rel.sourceTable === rel.targetTable) continue;
    graph.mergeUndirectedEdge(rel.sourceTable, rel.targetTable);
  }

  const pairSet = new Set<string>();
  const pairs: [string, string][] = [];
  for (const rel of schema.relations) {
    if (rel.sourceTable === rel.targetTable) continue;
    if (!graph.hasNode(rel.sourceTable) || !graph.hasNode(rel.targetTable)) continue;

    const [a, b] = [rel.sourceTable, rel.targetTable].sort();
    const key = `${a}\u0000${b}`;
    if (!pairSet.has(key)) {
      pairSet.add(key);
      pairs.push([a, b]);
    }
  }

  const tableIds = schema.tables.map((t) => t.id);
  const structural = findArticulationAndBridges(tableIds, pairs);

  const communityMap: Record<string, number> = graph.size
    ? louvain(graph, { getEdgeWeight: null })
    : Object.fromEntries(tableIds.map((id, index) => [id, index]));

  const between = graph.order ? betweennessCentrality(graph, { getEdgeWeight: null }) : {};
  const ranks = graph.order ? pagerank(graph, { getEdgeWeight: null }) : {};

  const ids = [...new Set(Object.values(communityMap))].sort((a, b) => a - b);
  const remap = new Map(ids.map((id, i) => [id, i]));
  const communities = ids
    .map((id, i) => ({
      id: i,
      tables: schema.tables.map((t) => t.id).filter((t) => communityMap[t] === id).sort(),
    }))
    .sort((a, b) => b.tables.length - a.tables.length)
    .map((c, i) => ({ ...c, id: i }));

  const finalCommunity = new Map<string, number>();
  communities.forEach((c) => c.tables.forEach((t) => finalCommunity.set(t, c.id)));

  const inbound = new Map(schema.tables.map((t) => [t.id, 0]));
  const outbound = new Map(schema.tables.map((t) => [t.id, 0]));
  for (const r of schema.relations) {
    outbound.set(r.sourceTable, (outbound.get(r.sourceTable) ?? 0) + 1);
    inbound.set(r.targetTable, (inbound.get(r.targetTable) ?? 0) + 1);
  }

  const nodes: GraphAnalysis['nodes'] = {};
  for (const t of schema.tables) {
    nodes[t.id] = {
      id: t.id,
      community: finalCommunity.get(t.id) ?? remap.get(communityMap[t.id]) ?? 0,
      degree: graph.degree(t.id),
      inbound: inbound.get(t.id) ?? 0,
      outbound: outbound.get(t.id) ?? 0,
      betweenness: Number((between as Record<string, number>)[t.id] ?? 0),
      pagerank: Number((ranks as Record<string, number>)[t.id] ?? 0),
      articulation: structural.articulation.has(t.id),
    };
  }

  const topHubs = Object.values(nodes)
    .sort((a, b) => b.betweenness - a.betweenness || b.degree - a.degree)
    .slice(0, 12);

  // Rank only true structural bridges. For a bridge, removing the edge splits
  // its connected component into two sides; |left| * |right| is the number of
  // table pairs whose connectivity depends on that bridge.
  const topBridgeEdges = structural.bridges
    .map(([source, target]) => ({
      source,
      target,
      score: bridgeImpactScore(source, target, tableIds, pairs),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return { nodes, communities, bridgePairs: structural.bridges, topHubs, topBridgeEdges };
}
