import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  telegramUserId: bigint;
}

interface EncodedPayload {
  uid: string;
  iat: number;
  ver: number;
}

function getSessionSecret(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return Buffer.from(secret, 'utf8');
}

function encodePayload(payload: EncodedPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(segment: string): EncodedPayload | null {
  try {
    const json = Buffer.from(segment, 'base64url').toString('utf8');
    const data = JSON.parse(json) as EncodedPayload;
    if (typeof data.uid !== 'string' || typeof data.iat !== 'number' || typeof data.ver !== 'number') {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function signSegment(segment: string): string {
  const secret = getSessionSecret();
  return createHmac('sha256', secret).update(segment).digest('base64url');
}

export function createSessionToken(payload: SessionPayload): string {
  const encoded: EncodedPayload = {
    uid: payload.telegramUserId.toString(),
    iat: Date.now(),
    ver: 1,
  };
  const segment = encodePayload(encoded);
  const signature = signSegment(segment);
  return `${segment}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [segment, signature] = token.split('.');
  if (!segment || !signature) {
    return null;
  }

  const expected = signSegment(segment);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }

  const data = decodePayload(segment);
  if (!data || data.ver !== 1) {
    return null;
  }

  const ttlMs = Number(process.env.SESSION_TTL_MS ?? DEFAULT_SESSION_TTL_MS);
  if (Number.isFinite(ttlMs) && ttlMs > 0 && Date.now() - data.iat > ttlMs) {
    return null;
  }

  try {
    return { telegramUserId: BigInt(data.uid) };
  } catch {
    return null;
  }
}
