import argon2 from 'argon2';

const pin = process.argv[2];
if (!pin) {
  console.error('Usage: node scripts/hash-presenter-pin.mjs <pin>');
  process.exit(1);
}

try {
  const hash = await argon2.hash(pin);
  console.log('Argon2id PIN Hash:');
  console.log(hash);
} catch (err) {
  console.error('Failed to hash PIN:', err);
  process.exit(1);
}
