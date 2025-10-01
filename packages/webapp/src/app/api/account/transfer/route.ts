import { NextResponse } from 'next/server';
import { getAccountContractClient } from '@/lib/soroban';
import { requireSession } from '@/lib/server-auth';
import type { SignatureVerification } from 'account';

interface TransferPayload {
  telegramUserId: string | number;
  destination: string;
  amount: string;
  nonce: string;
  signature: string;
}

function parseBigInt(value: string | number): bigint | null {
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
      return BigInt(value);
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
    const body = (await request.json()) as TransferPayload;

    const telegramUserId = parseBigInt(body.telegramUserId);
    if (telegramUserId === null) {
      return NextResponse.json({ error: 'Invalid telegramUserId' }, { status: 400 });
    }

    if (telegramUserId !== session.telegramUserId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    if (!body.destination || typeof body.destination !== 'string') {
      return NextResponse.json({ error: 'Invalid destination' }, { status: 400 });
    }

    const amount = parseBigInt(body.amount);
    if (amount === null || amount <= 0n) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const nonce = parseBigInt(body.nonce);
    if (nonce === null || nonce <= 0n) {
      return NextResponse.json({ error: 'Nonce must be positive integer' }, { status: 400 });
    }

    if (typeof body.signature !== 'string') {
      return NextResponse.json({ error: 'signature must be base64 string' }, { status: 400 });
    }

    let signatureBytes: Buffer;
    try {
      signatureBytes = Buffer.from(body.signature, 'base64');
    } catch {
      return NextResponse.json({ error: 'signature is not valid base64' }, { status: 400 });
    }

    if (signatureBytes.length !== 64) {
      return NextResponse.json({ error: 'signature must decode to 64 bytes' }, { status: 400 });
    }

    const currentNonceTx = await client.get_last_nonce();
    const currentNonce = currentNonceTx.result ?? 0n;
    if (nonce !== currentNonce + 1n) {
      return NextResponse.json(
        { error: `Nonce mismatch. Expected ${(currentNonce + 1n).toString()}, received ${nonce.toString()}` },
        { status: 409 },
      );
    }

    const verification: SignatureVerification = {
      telegram_user_id: telegramUserId,
      nonce,
      signature: signatureBytes,
    };

    const tx = await client.transfer_xlm({
      signature: verification,
      destination: body.destination,
      amount,
    });

    const sent = await tx.signAndSend();
    const hash = sent.sendTransactionResponse?.hash ?? null;

    return NextResponse.json({ ok: true, hash });
  } catch (error) {
    console.error('Failed to execute transfer', error);
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
  }
}
