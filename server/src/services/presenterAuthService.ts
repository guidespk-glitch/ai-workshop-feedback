import argon2 from 'argon2';

export class PresenterAuthService {
  constructor(private readonly pinHash: string) {}

  async verify(pin: string): Promise<boolean> {
    if (!pin || !this.pinHash) {
      return false;
    }
    try {
      return await argon2.verify(this.pinHash, pin);
    } catch {
      return false;
    }
  }
}
