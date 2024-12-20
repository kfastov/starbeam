// packages/webapp/src/app/api/auth/telegram/route.ts
import { NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

class TelegramAuth {
  private readonly botToken: string;

  constructor(botToken: string) {
    if (!botToken) throw new Error('Bot token is required');
    this.botToken = botToken;
  }

  validateAuthData(initData: string): boolean {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      if (!hash) return false;

      params.delete('hash');
      
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = createHash('sha256')
        .update(this.botToken)
        .digest();

      const generatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      return generatedHash === hash;
    } catch {
      return false;
    }
  }

  getUserData(initData: string): TelegramUser | null {
    if (!this.validateAuthData(initData)) return null;
    
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    
    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    const auth = new TelegramAuth(process.env.TELEGRAM_BOT_TOKEN!);
    const userData = auth.getUserData(initData);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Invalid authentication data' }, 
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: userData 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' }, 
      { status: 500 }
    );
  }
}
