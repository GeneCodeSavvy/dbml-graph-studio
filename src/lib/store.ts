import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalFileHandle } from './file-access';
import type { GraphAnalysis, LayoutMode, ParsedSchema, ParseIssue } from './types';

type StudioState = {
  source: string;
  fileName: string;
  fileHandle?: LocalFileHandle;
  parsed?: ParsedSchema;
  issue?: ParseIssue;
  analysis?: GraphAnalysis;
  selectedTable?: string;
  search: string;
  layoutMode: LayoutMode;
  colorByCommunity: boolean;
  showCrossCommunityEdges: boolean;
  showEdgeLabels: boolean;
  layoutNonce: number;
  setSource: (source: string) => void;
  loadFile: (fileName: string, source: string, fileHandle?: LocalFileHandle) => void;
  setParsed: (parsed?: ParsedSchema, issue?: ParseIssue, analysis?: GraphAnalysis) => void;
  setSelectedTable: (id?: string) => void;
  setSearch: (search: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleCommunityColors: () => void;
  toggleCrossCommunityEdges: () => void;
  toggleEdgeLabels: () => void;
  requestLayout: () => void;
  appendReference: (sourceTable: string, sourceField: string, targetTable: string, targetField: string) => void;
};

export const useStudio = create<StudioState>()(persist((set, get) => ({
  source: '',
  fileName: 'schema.dbml',
  search: '',
  layoutMode: 'community',
  colorByCommunity: true,
  showCrossCommunityEdges: true,
  showEdgeLabels: true,
  layoutNonce: 0,
  setSource: (source) => set({ source }),
  loadFile: (fileName, source, fileHandle) => set({ fileName, source, fileHandle, issue: undefined, selectedTable: undefined }),
  setParsed: (parsed, issue, analysis) => set({ parsed, issue, analysis }),
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setSearch: (search) => set({ search }),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  toggleCommunityColors: () => set((s) => ({ colorByCommunity: !s.colorByCommunity })),
  toggleCrossCommunityEdges: () => set((s) => ({ showCrossCommunityEdges: !s.showCrossCommunityEdges })),
  toggleEdgeLabels: () => set((s) => ({ showEdgeLabels: !s.showEdgeLabels })),
  requestLayout: () => set((s) => ({ layoutNonce: s.layoutNonce + 1 })),
  appendReference: (sourceTable, sourceField, targetTable, targetField) => {
    const line = `Ref: ${sourceTable}.${sourceField} > ${targetTable}.${targetField}`;
    const current = get().source.trimEnd();
    if (current.includes(line)) return;
    set({ source: `${current}\n\n${line}\n` });
  },
}), {
  name: 'dbml-graph-studio',
  partialize: (s) => ({
    source: s.source,
    fileName: s.fileName,
    layoutMode: s.layoutMode,
    colorByCommunity: s.colorByCommunity,
    showCrossCommunityEdges: s.showCrossCommunityEdges,
    showEdgeLabels: s.showEdgeLabels,
  }),
}));
