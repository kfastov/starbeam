import { NextResponse } from 'next/server';
import { getAccountContractClient } from '@/lib/soroban';
import { requireSession } from '@/lib/server-auth';

function parseTelegramUserId(value: unknown): bigint | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    return BigInt(Math.trunc(value));
  }

  if (typeof value === 'string') {
    if (!value.trim()) {
      return null;
    }
    try {
      const parsed = BigInt(value);
      if (parsed < 0n) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const { client } = getAccountContractClient();
    const body = await request.json();

    const telegramUserId = parseTelegramUserId(body.telegramUserId ?? session.telegramUserId.toString());
    if (telegramUserId === null) {
      return NextResponse.json({ error: 'Invalid telegramUserId provided' }, { status: 400 });
    }

    if (telegramUserId !== session.telegramUserId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    const tx = await client.get_last_nonce();
    const currentNonce = tx.result ?? 0n;

    return NextResponse.json({ nextNonce: (currentNonce + 1n).toString() });
  } catch (error) {
    console.error('Failed to compute nonce', error);
    return NextResponse.json({ error: 'Failed to compute nonce' }, { status: 500 });
  }
}
