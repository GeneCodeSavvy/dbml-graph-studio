"use client";

import { Boxes, GitFork, Network, Search, Waypoints } from 'lucide-react';
import { useStudio } from '@/lib/store';

export function AnalysisSidebar() {
  const parsed = useStudio((s) => s.parsed);
  const analysis = useStudio((s) => s.analysis);
  const search = useStudio((s) => s.search);
  const setSearch = useStudio((s) => s.setSearch);
  const setSelected = useStudio((s) => s.setSelectedTable);
  const colorByCommunity = useStudio((s) => s.colorByCommunity);
  const showCross = useStudio((s) => s.showCrossCommunityEdges);
  const showLabels = useStudio((s) => s.showEdgeLabels);
  const toggleColors = useStudio((s) => s.toggleCommunityColors);
  const toggleCross = useStudio((s) => s.toggleCrossCommunityEdges);
  const toggleLabels = useStudio((s) => s.toggleEdgeLabels);

  return <div className="analysis-sidebar">
    <div className="search-box"><Search size={14}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find table or column…" /></div>
    <div className="toggle-stack">
      <Toggle checked={colorByCommunity} onChange={toggleColors} label="Color communities" />
      <Toggle checked={showCross} onChange={toggleCross} label="Cross-community FKs" />
      <Toggle checked={showLabels} onChange={toggleLabels} label="Edge cardinality labels" />
    </div>

    <SidebarSection icon={<Boxes size={13}/>} title={`Schema ${parsed ? `· ${parsed.tables.length} tables` : ''}`}>
      <div className="table-list">{parsed?.tables.filter((t) => {
        const q = search.trim().toLowerCase();
        return !q || t.id.toLowerCase().includes(q) || t.fields.some((f) => f.name.toLowerCase().includes(q));
      }).map((t) => <button className="table-list-item" key={t.id} onClick={() => setSelected(t.id)}><span>{t.id}</span><small>{t.fields.length}</small></button>)}</div>
    </SidebarSection>

    {analysis ? <>
      <SidebarSection icon={<Network size={13}/>} title={`Louvain communities · ${analysis.communities.length}`}>
        {analysis.communities.map((c) => <div className="community-card" key={c.id}><div className="community-card__head"><span className={`community-swatch c${c.id % 10}`}/><strong>C{c.id + 1}</strong><small>{c.tables.length} tables</small></div><div className="community-card__tables">{c.tables.slice(0, 8).map((t) => <button key={t} onClick={() => setSelected(t)}>{t}</button>)}{c.tables.length > 8 ? <span>+{c.tables.length - 8}</span> : null}</div></div>)}
      </SidebarSection>

      <SidebarSection icon={<Waypoints size={13}/>} title="Structural hubs">
        {analysis.topHubs.slice(0, 8).map((n) => <button className="rank-row" key={n.id} onClick={() => setSelected(n.id)}><span>{n.id}{n.articulation ? <em>bridge</em> : null}</span><strong>{n.betweenness.toFixed(3)}</strong></button>)}
      </SidebarSection>

      <SidebarSection icon={<GitFork size={13}/>} title={`True graph bridges · ${analysis.bridgePairs.length}`}>
        {analysis.bridgePairs.slice(0, 8).map(([a,b]) => <div className="bridge-row" key={`${a}-${b}`}><button onClick={() => setSelected(a)}>{a}</button><span>↔</span><button onClick={() => setSelected(b)}>{b}</button></div>)}
        {!analysis.bridgePairs.length ? <div className="empty-small">No single-edge structural bridges.</div> : null}
      </SidebarSection>
    </> : null}
  </div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={onChange}/><span>{label}</span></label>;
}

function SidebarSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="side-section"><div className="side-section__title">{icon}<span>{title}</span></div>{children}</section>;
}
