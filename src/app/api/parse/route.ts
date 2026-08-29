import { NextResponse } from 'next/server';
import { Parser } from '@dbml/core';
import { normalizeDatabase } from '@/lib/normalize-dbml';

export const runtime = 'nodejs';

function issueFromError(error: any) {
  const location = error?.location ?? error?.data?.location ?? error?.cause?.location;
  return {
    message: error?.message ?? String(error),
    line: location?.start?.line,
    column: location?.start?.column,
  };
}

export async function POST(request: Request) {
  try {
    const { source } = await request.json();
    if (typeof source !== 'string') return NextResponse.json({ error: { message: 'source must be a string' } }, { status: 400 });
    const parser = new Parser();
    const database = parser.parse(source, 'dbmlv2');
    return NextResponse.json({ schema: normalizeDatabase(database) });
  } catch (error) {
    return NextResponse.json({ error: issueFromError(error) }, { status: 422 });
  }
}
