/**
 * Generates admin credentials: a 32-character username and a 32-character password.
 *
 *   npm run admin:credentials
 *
 * Prints the username and password once (store them in a password manager) and
 * the two environment variables the app needs. Only hashes go into the
 * environment, so the credentials cannot be recovered from the server.
 */
import { hashPassword } from "better-auth/crypto";
import { createHash, randomInt } from "node:crypto";

const LETTERS_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SYMBOLS = "!#%+-=?@^_~";

function generate(length: number, alphabet: string) {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

const username = generate(32, LETTERS_DIGITS);
let password = generate(32, LETTERS_DIGITS + SYMBOLS);
while (!/[^A-Za-z0-9]/.test(password)) password = generate(32, LETTERS_DIGITS + SYMBOLS);

const usernameHash = createHash("sha256").update(username).digest("hex");
const passwordHash = await hashPassword(password);

console.log(`
Admin username: ${username}
Admin password: ${password}

Save both in a password manager now. They are not stored anywhere and cannot be recovered.

Environment (Kubernetes secret or .env.local):
ADMIN_USERNAME_SHA256=${usernameHash}
ADMIN_PASSWORD_HASH=${passwordHash}
`);
