import { describe, expect, it } from 'vitest';
import argon2 from 'argon2';
import { PresenterAuthService } from './presenterAuthService';

describe('PresenterAuthService', () => {
  it('verifies correct PIN against the Argon2 hash', async () => {
    const pin = '123456';
    const hash = await argon2.hash(pin);
    const service = new PresenterAuthService(hash);

    await expect(service.verify(pin)).resolves.toBe(true);
  });

  it('rejects incorrect PIN', async () => {
    const pin = '123456';
    const hash = await argon2.hash(pin);
    const service = new PresenterAuthService(hash);

    await expect(service.verify('wrongpin')).resolves.toBe(false);
  });

  it('rejects empty PIN or missing hash', async () => {
    const service = new PresenterAuthService('');
    await expect(service.verify('123456')).resolves.toBe(false);
    await expect(service.verify('')).resolves.toBe(false);
  });
});
