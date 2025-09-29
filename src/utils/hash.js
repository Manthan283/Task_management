import bcrypt from 'bcrypt';

const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
