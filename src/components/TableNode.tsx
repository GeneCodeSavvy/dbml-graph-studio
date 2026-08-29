"use client";

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { KeyRound, Link2, ListTree } from 'lucide-react';
import type { SchemaTable } from '@/lib/types';

const palette = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#4f46e5','#65a30d','#ea580c'];

type TableNodeData = {
  table: SchemaTable;
  community: number;
  foreignFields: string[];
  dimmed?: boolean;
  articulation?: boolean;
};

export function TableNode({ data, selected }: NodeProps) {
  const d = data as unknown as TableNodeData;
  const { table } = d;
  const color = palette[d.community % palette.length];
  const foreign = new Set(d.foreignFields);

  return (
    <div className={`table-node ${selected ? 'selected' : ''} ${d.dimmed ? 'dimmed' : ''}`} style={{ ['--community' as string]: color }}>
      <div className="table-node__header">
        <div className="table-node__title-wrap">
          <ListTree size={15} />
          <div>
            <div className="table-node__title">{table.name}</div>
            {table.schemaName && table.schemaName !== 'public' ? <div className="table-node__schema">{table.schemaName}</div> : null}
          </div>
        </div>
        {d.articulation ? <span className="table-node__bridge" title="Articulation table: structurally connects otherwise separable regions">bridge</span> : null}
      </div>
      <div className="table-node__fields">
        {table.fields.map((field) => (
          <div className="field-row" key={field.name}>
            <Handle className="field-handle field-handle--target" type="target" position={Position.Left} id={`target:${field.name}`} />
            <div className="field-flags">
              {field.primary ? <span className="field-badge field-badge--pk" title="Primary key"><KeyRound size={10} /> PK</span> : null}
              {foreign.has(field.name) ? <span className="field-badge field-badge--fk" title="Foreign key"><Link2 size={10} /> FK</span> : null}
              {!field.primary && field.unique ? <span className="field-badge">UQ</span> : null}
            </div>
            <span className="field-name">{field.name}</span>
            <span className="field-type">{field.type}{field.notNull ? ' · NN' : ''}</span>
            <Handle className="field-handle field-handle--source" type="source" position={Position.Right} id={`source:${field.name}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
