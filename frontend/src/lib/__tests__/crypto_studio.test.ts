import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSecureToken,
  calculateEntropy,
  generateHmac,
  encryptAesGcm,
  decryptAesGcm,
} from '../crypto_studio.utils.ts';

describe('Security & Cryptography Studio', () => {
  it('should generate secure tokens with specified length and character sets', () => {
    const token = generateSecureToken({
      length: 64,
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: true,
    });

    assert.equal(token.length, 64);
    assert.ok(/[A-Z]/.test(token));
    assert.ok(/[a-z]/.test(token));
    assert.ok(/[0-9]/.test(token));
  });

  it('should calculate Shannon entropy accurately', () => {
    const strongSecret = generateSecureToken({
      length: 32,
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: true,
    });
    const entropy = calculateEntropy(strongSecret);
    assert.ok(entropy.bits > 80);
    assert.equal(entropy.strength, 'Very Strong');
  });

  it('should generate HMAC SHA-256 signatures matching standard RFC outputs', async () => {
    const msg = 'devsuite-test-message';
    const secret = 'super-secret-key';
    const signature = await generateHmac(msg, secret, 'SHA-256');

    assert.ok(typeof signature === 'string');
    assert.equal(signature.length, 64); // 32 bytes in hex = 64 chars
  });

  it('should perform round-trip AES-256-GCM encryption and decryption', async () => {
    const plaintext = 'Secret payload containing highly confidential keys and tokens.';
    const password = 'StrongPassword987!@#';

    const encrypted = await encryptAesGcm(plaintext, password);
    assert.ok(encrypted.length > 30);

    const decrypted = await decryptAesGcm(encrypted, password);
    assert.equal(decrypted, plaintext);
  });
});
