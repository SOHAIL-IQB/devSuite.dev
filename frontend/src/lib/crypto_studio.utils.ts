/**
 * High-Entropy Secure Token & Password Generator.
 */
export function generateSecureToken(options: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}): string {
  const { length, uppercase, lowercase, digits, symbols } = options;
  let charset = '';
  if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (digits) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  // Check if crypto is available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  return result;
}

/**
 * Calculates Shannon Entropy for password/key strength evaluation.
 */
export function calculateEntropy(str: string): { bits: number; strength: 'Very Weak' | 'Weak' | 'Moderate' | 'Strong' | 'Very Strong' } {
  if (!str) return { bits: 0, strength: 'Very Weak' };

  const frequencies: Record<string, number> = {};
  for (const ch of str) {
    frequencies[ch] = (frequencies[ch] || 0) + 1;
  }

  let entropy = 0;
  for (const ch in frequencies) {
    const p = frequencies[ch] / str.length;
    entropy -= p * Math.log2(p);
  }

  const totalBits = Math.round(entropy * str.length);
  let strength: 'Very Weak' | 'Weak' | 'Moderate' | 'Strong' | 'Very Strong' = 'Very Weak';
  if (totalBits > 100) strength = 'Very Strong';
  else if (totalBits > 75) strength = 'Strong';
  else if (totalBits > 50) strength = 'Moderate';
  else if (totalBits > 30) strength = 'Weak';

  return { bits: totalBits, strength };
}

/**
 * Generates an HMAC signature (SHA-256 or SHA-512) for a given message and secret key.
 */
export async function generateHmac(
  message: string,
  secret: string,
  algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts plaintext with AES-256-GCM and PBKDF2 key derivation.
 */
export async function encryptAesGcm(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(plaintext)
  );

  // Combine salt + iv + ciphertext into base64 payload
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts AES-256-GCM base64 payload with password.
 */
export async function decryptAesGcm(encryptedBase64: string, password: string): Promise<string> {
  const binaryString = atob(encryptedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ciphertext = bytes.slice(28);

  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
