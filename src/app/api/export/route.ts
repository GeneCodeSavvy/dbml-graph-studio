import { NextResponse } from 'next/server';
import { exporter } from '@dbml/core';

export const runtime = 'nodejs';
const formats = new Set(['postgres', 'mysql', 'mssql', 'oracle']);

export async function POST(request: Request) {
  try {
    const { source, format } = await request.json();
    if (typeof source !== 'string' || !formats.has(format)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const sql = exporter.export(source, format);
    return NextResponse.json({ sql });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 422 });
  }
}
