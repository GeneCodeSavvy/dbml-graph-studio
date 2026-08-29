"use client";

import { useRef, useState } from 'react';
import { Download, FileDown, FileUp, FolderOpen, LayoutDashboard, Save, Sparkles } from 'lucide-react';
import { downloadText, openDbmlFile, saveToHandle } from '@/lib/file-access';
import { useStudio } from '@/lib/store';

export function Toolbar() {
  const source = useStudio((s) => s.source);
  const fileName = useStudio((s) => s.fileName);
  const handle = useStudio((s) => s.fileHandle);
  const loadFile = useStudio((s) => s.loadFile);
  const layoutMode = useStudio((s) => s.layoutMode);
  const setLayoutMode = useStudio((s) => s.setLayoutMode);
  const requestLayout = useStudio((s) => s.requestLayout);
  const parsed = useStudio((s) => s.parsed);
  const issue = useStudio((s) => s.issue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');
  const [exportFormat, setExportFormat] = useState('postgres');

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200); };

  const open = async () => {
    try {
      const result = await openDbmlFile();
      if (result) loadFile(result.name, result.text, result.handle);
      else inputRef.current?.click();
    } catch (e: any) { if (e?.name !== 'AbortError') notify(e?.message ?? 'Could not open file'); }
  };

  const save = async () => {
    try {
      if (handle) { await saveToHandle(handle, source); notify(`Saved ${handle.name}`); }
      else { downloadText(fileName, source); notify('Browser cannot overwrite this file directly; downloaded a copy.'); }
    } catch (e: any) { notify(e?.message ?? 'Save failed'); }
  };

  const exportSql = async () => {
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source, format: exportFormat }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Export failed');
      downloadText(fileName.replace(/\.dbml$/i, '') + `.${exportFormat}.sql`, data.sql, 'text/sql');
    } catch (e: any) { notify(e?.message ?? 'SQL export failed'); }
  };

  return <div className="toolbar">
    <div className="brand"><div className="brand-mark"><Sparkles size={15}/></div><div><strong>DBML Graph Studio</strong><small>{fileName}</small></div></div>
    <div className="toolbar-divider"/>
    <button className="tool-button" onClick={open}><FolderOpen size={15}/>Open</button>
    <button className="tool-button" onClick={() => inputRef.current?.click()}><FileUp size={15}/>Upload</button>
    <button className="tool-button tool-button--primary" onClick={save}><Save size={15}/>Save</button>
    <button className="tool-button" onClick={() => downloadText(fileName, source)}><Download size={15}/>Download</button>
    <input ref={inputRef} type="file" accept=".dbml,text/plain" hidden onChange={async (e) => { const file=e.target.files?.[0]; if(file) loadFile(file.name, await file.text()); e.currentTarget.value=''; }}/>

    <div className="toolbar-divider"/>
    <select className="tool-select" value={layoutMode} onChange={(e) => setLayoutMode(e.target.value as any)}>
      <option value="community">Community layout</option>
      <option value="layered">Layered ERD</option>
    </select>
    <button className="tool-button" onClick={requestLayout}><LayoutDashboard size={15}/>Auto layout</button>

    <div className="toolbar-divider"/>
    <select className="tool-select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
      <option value="postgres">PostgreSQL</option><option value="mysql">MySQL</option><option value="mssql">MSSQL</option><option value="oracle">Oracle</option>
    </select>
    <button className="tool-button" onClick={exportSql} disabled={Boolean(issue)}><FileDown size={15}/>Export SQL</button>

    <div className="toolbar-spacer"/>
    <div className={`schema-health ${issue ? 'bad' : ''}`}><span/>{issue ? 'DBML error' : parsed ? `${parsed.tables.length} tables · ${parsed.relations.length} refs` : 'No schema'}</div>
    {notice ? <div className="toolbar-notice">{notice}</div> : null}
  </div>;
}
