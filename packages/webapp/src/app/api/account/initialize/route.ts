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

    const { client, owner } = getAccountContractClient();
    const body = await request.json();

    const telegramUserId = parseTelegramUserId(body.telegramUserId);
    if (telegramUserId === null) {
      return NextResponse.json(
        { error: 'Invalid telegramUserId provided' },
        { status: 400 },
      );
    }

    if (telegramUserId !== session.telegramUserId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    if (typeof body.accountPublicKey !== 'string') {
      return NextResponse.json(
        { error: 'accountPublicKey must be a base64 encoded string' },
        { status: 400 },
      );
    }

    let accountPublicKey: Buffer;
    try {
      accountPublicKey = Buffer.from(body.accountPublicKey, 'base64');
    } catch {
      return NextResponse.json(
        { error: 'accountPublicKey is not valid base64' },
        { status: 400 },
      );
    }

    if (accountPublicKey.length !== 32) {
      return NextResponse.json(
        { error: 'accountPublicKey must decode to 32 bytes' },
        { status: 400 },
      );
    }

    const tx = await client.initialize({
      telegram_user_id: telegramUserId,
      owner,
      account_public_key: accountPublicKey,
    });

    const sent = await tx.signAndSend();
    const hash = sent.sendTransactionResponse?.hash ?? null;

    return NextResponse.json({ ok: true, hash });
  } catch (error) {
    console.error('Failed to initialize account', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error during initialization';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
