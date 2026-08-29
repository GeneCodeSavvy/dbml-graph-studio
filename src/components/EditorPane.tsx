"use client";

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useStudio } from '@/lib/store';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export function EditorPane() {
  const source = useStudio((s) => s.source);
  const setSource = useStudio((s) => s.setSource);
  const issue = useStudio((s) => s.issue);
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) return;
    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(model, 'dbml-parser', issue ? [{
      severity: monaco.MarkerSeverity.Error,
      message: issue.message,
      startLineNumber: issue.line ?? 1,
      endLineNumber: issue.line ?? 1,
      startColumn: issue.column ?? 1,
      endColumn: (issue.column ?? 1) + 1,
    }] : []);
  }, [issue]);

  return (
    <div className="editor-pane">
      <div className="pane-caption">
        <span>DBML editor</span>
        {issue ? <span className="parse-status parse-status--error">{issue.line ? `L${issue.line}:${issue.column ?? 1}` : 'Parse error'}</span> : <span className="parse-status">valid</span>}
      </div>
      <div className="editor-shell">
        <Editor
          language="dbml"
          theme="vs-dark"
          value={source}
          onChange={(value) => setSource(value ?? '')}
          beforeMount={(monaco) => {
            if (!monaco.languages.getLanguages().some((l: any) => l.id === 'dbml')) monaco.languages.register({ id: 'dbml' });
            monaco.languages.setMonarchTokensProvider('dbml', {
              keywords: ['Project','Table','TableGroup','Enum','Ref','Note','Indexes','TablePartial','TablePartialInjection'],
              tokenizer: {
                root: [
                  [/\/\/.*$/, 'comment'],
                  [/\/\*/, 'comment', '@comment'],
                  [/'(?:[^'\\]|\\.)*'/, 'string'],
                  [/"(?:[^"\\]|\\.)*"/, 'string'],
                  [/\b(Project|Table|TableGroup|Enum|Ref|Note|Indexes|TablePartial|TablePartialInjection)\b/, 'keyword'],
                  [/\b(pk|primary key|unique|not null|null|increment|default|ref|note|delete|update)\b/i, 'type.identifier'],
                  [/[<>?-]+/, 'operator'],
                  [/\b\d+(?:\.\d+)?\b/, 'number'],
                  [/[A-Za-z_][\w.]*/, 'identifier'],
                ],
                comment: [[/[^/*]+/, 'comment'], [/\*\//, 'comment', '@pop'], [/[/*]/, 'comment']],
              },
            } as any);
          }}
          onMount={(editor, monaco) => { editorRef.current = editor; monacoRef.current = monaco; }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 21,
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            stickyScroll: { enabled: true },
          }}
        />
      </div>
      {issue ? <div className="parse-error">{issue.message}</div> : null}
    </div>
  );
}
