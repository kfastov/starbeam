import { createHash, createHmac } from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export class TelegramAuth {
  private readonly botToken: string;

  constructor(botToken: string) {
    if (!botToken) {
      throw new Error('Bot token is required');
    }
    this.botToken = botToken;
  }

  validateAuthData(initData: string): boolean {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      if (!hash) return false;

      // Remove hash from data before checking
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
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  getUserData(initData: string): TelegramUser | null {
    try {
      if (!this.validateAuthData(initData)) {
        return null;
      }

      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (!userStr) return null;

      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}
