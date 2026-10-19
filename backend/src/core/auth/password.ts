import bcrypt from 'bcryptjs';

/**
 * bcryptjs instead of Bun.password - Bun.password is Bun-only and broke the
 * plain-Node deployment target (Hostinger's Node.js app manager). bcryptjs is
 * pure JS (no native compilation, unlike bcrypt/better-sqlite3-style native
 * modules) and produces the same $2 hash format, so already-seeded password
 * hashes keep verifying correctly.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
