import { NextResponse } from 'next/server';
import { verifySessionToken } from './session';

export function requireSession(request: Request): { telegramUserId: bigint } | NextResponse {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const token = header.slice(7).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  return payload;
}
