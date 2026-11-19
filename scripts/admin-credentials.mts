/**
 * Generates admin credentials: a 32-character username and a 32-character password.
 *
 *   npm run admin:credentials              print everything
 *   npm run admin:credentials -- --save    also write the hashes into .env.local
 *
 * Prints the username and password once (store them in a password manager) and
 * the two environment variables the app needs. Only hashes go into the
 * environment, so the credentials cannot be recovered from the server.
 */
import { hashPassword } from "better-auth/crypto";
import { createHash, randomInt } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

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

const envLines = `ADMIN_USERNAME_SHA256=${usernameHash}\nADMIN_PASSWORD_HASH=${passwordHash}`;

let saved = "";
if (process.argv.includes("--save")) {
  const file = ".env.local";
  const kept = existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !/^ADMIN_(USERNAME_SHA256|PASSWORD_HASH)=/.test(line))
        .join("\n")
        .trimEnd()
    : "";
  writeFileSync(file, `${kept ? `${kept}\n` : ""}${envLines}\n`);
  chmodSync(file, 0o600);
  saved = `\nSaved to ${file}. Restart the dev server to use the new credentials.\n`;
}

console.log(`
Admin username: ${username}
Admin password: ${password}

Save both in a password manager now. They are not stored anywhere and cannot be recovered.

Environment (Kubernetes secret or .env.local):
${envLines}
${saved}`);
