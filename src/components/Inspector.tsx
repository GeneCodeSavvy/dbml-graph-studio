"use client";

import { useMemo } from 'react';
import { ArrowRight, CircleDot, Network, TableProperties } from 'lucide-react';
import { useStudio } from '@/lib/store';

export function Inspector() {
  const parsed = useStudio((s) => s.parsed);
  const analysis = useStudio((s) => s.analysis);
  const selected = useStudio((s) => s.selectedTable);

  const table = parsed?.tables.find((t) => t.id === selected);
  const relations = useMemo(() => parsed?.relations.filter((r) => r.sourceTable === selected || r.targetTable === selected) ?? [], [parsed, selected]);
  if (!table) return <div className="empty-panel">Select a table to inspect columns, indexes, relationships, and graph metrics.</div>;
  const metric = analysis?.nodes[table.id];

  return (
    <div className="inspector-scroll">
      <section className="inspector-section">
        <div className="inspector-title"><TableProperties size={15} /> {table.id}</div>
        {table.note ? <p className="muted-copy">{table.note}</p> : null}
        {metric ? <div className="metric-grid">
          <Metric label="degree" value={metric.degree} />
          <Metric label="inbound" value={metric.inbound} />
          <Metric label="outbound" value={metric.outbound} />
          <Metric label="betweenness" value={metric.betweenness.toFixed(3)} />
          <Metric label="PageRank" value={metric.pagerank.toFixed(3)} />
          <Metric label="community" value={`C${metric.community + 1}`} />
        </div> : null}
      </section>

      <section className="inspector-section">
        <div className="inspector-kicker">Columns</div>
        {table.fields.map((f) => <div className="inspect-row" key={f.name}>
          <div><strong>{f.name}</strong><div className="inspect-meta">{[f.primary && 'PK', f.unique && 'unique', f.notNull && 'not null', f.increment && 'increment'].filter(Boolean).join(' · ')}</div></div>
          <code>{f.type}</code>
        </div>)}
      </section>

      {table.indexes.length ? <section className="inspector-section">
        <div className="inspector-kicker">Indexes</div>
        {table.indexes.map((idx, i) => <div className="inspect-row" key={`${idx.name}-${i}`}><span>{idx.name || `index ${i + 1}`}</span><code>{idx.columns.join(', ')}</code></div>)}
      </section> : null}

      <section className="inspector-section">
        <div className="inspector-kicker"><Network size={13} /> Relationships</div>
        {relations.length ? relations.map((r) => <div className="relation-card" key={r.id}>
          <div className="relation-line"><span>{r.sourceTable}.{r.sourceFields.join(',')}</span><ArrowRight size={13}/><span>{r.targetTable}.{r.targetFields.join(',')}</span></div>
          <div className="inspect-meta">{r.sourceRelation} → {r.targetRelation}{r.onDelete ? ` · delete ${r.onDelete}` : ''}{r.onUpdate ? ` · update ${r.onUpdate}` : ''}</div>
        </div>) : <div className="empty-small"><CircleDot size={12}/> No relationships</div>}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
