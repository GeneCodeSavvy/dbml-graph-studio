"use client";

import { useEffect, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { analyzeSchema } from '@/lib/graph-analysis';
import { useStudio } from '@/lib/store';
import { AnalysisSidebar } from './AnalysisSidebar';
import { EditorPane } from './EditorPane';
import { Inspector } from './Inspector';
import { SchemaCanvas } from './SchemaCanvas';
import { Toolbar } from './Toolbar';

export function Studio() {
  const source = useStudio((s) => s.source);
  const loadFile = useStudio((s) => s.loadFile);
  const setParsed = useStudio((s) => s.setParsed);
  const timer = useRef<number | undefined>(undefined);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!source) fetch('/examples/invello.dbml').then((r) => r.text()).then((text) => loadFile('invello.dbml', text)).catch(() => {});
  }, [source, loadFile]);

  useEffect(() => {
    if (!source.trim()) { setParsed(undefined, undefined, undefined); return; }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/parse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source }) });
        const data = await response.json();
        if (!response.ok) { setParsed(undefined, data.error ?? { message: 'Parse error' }, undefined); return; }
        const analysis = analyzeSchema(data.schema);
        setParsed(data.schema, undefined, analysis);
      } catch (error: any) {
        setParsed(undefined, { message: error?.message ?? 'Parser request failed' }, undefined);
      }
    }, 450);
    return () => window.clearTimeout(timer.current);
  }, [source, setParsed]);

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = [...event.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith('.dbml'));
    if (file) loadFile(file.name, await file.text());
  };

  return <div className="studio" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
    <Toolbar />
    <div className="workspace">
      <Group orientation="horizontal">
        <Panel id="sidebar" defaultSize="19" minSize="13" maxSize="34"><AnalysisSidebar /></Panel>
        <Separator className="resize-handle" />
        <Panel id="center" defaultSize="61" minSize="35">
          <Group orientation="vertical">
            <Panel id="diagram" defaultSize="66" minSize="30"><SchemaCanvas /></Panel>
            <Separator className="resize-handle resize-handle--horizontal" />
            <Panel id="editor" defaultSize="34" minSize="18"><EditorPane /></Panel>
          </Group>
        </Panel>
        <Separator className="resize-handle" />
        <Panel id="inspector" defaultSize="20" minSize="14" maxSize="35"><div className="inspector"><div className="pane-caption">Inspector</div><Inspector /></div></Panel>
      </Group>
    </div>
  </div>;
}
