export type LocalFileHandle = {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
};

declare global {
  interface Window {
    showOpenFilePicker?: (options?: unknown) => Promise<LocalFileHandle[]>;
  }
}

export async function openDbmlFile(): Promise<{ name: string; text: string; handle?: LocalFileHandle } | null> {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'DBML schema', accept: { 'text/plain': ['.dbml'] } }],
    });
    const file = await handle.getFile();
    return { name: file.name, text: await file.text(), handle };
  }
  return null;
}

export async function saveToHandle(handle: LocalFileHandle, text: string) {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export function downloadText(name: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
