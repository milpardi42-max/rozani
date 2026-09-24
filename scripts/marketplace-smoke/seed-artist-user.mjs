/**
 * Seeds a local artist account so the artist-side flows (upload, wallet,
 * analytics, affiliate codes) can be exercised without going through
 * /creators/join. Writes to data/users.json — dev/demo only.
 *
 *   node scripts/marketplace-smoke/seed-artist-user.mjs [email] [password]
 *
 * Set DATA to the store the running server actually uses (the standalone build
 * chdir()s into its own folder):
 *   DATA=dist/.next/standalone/data node scripts/marketplace-smoke/seed-artist-user.mjs
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ITERATIONS = 100_000;
const email = process.argv[2] ?? "niloufar@example.com";
const password = process.argv[3] ?? "artist-dev-pass";

function hash(value) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.pbkdf2Sync(value, salt, ITERATIONS, 32, "sha256");
  return `pbkdf2:${ITERATIONS}:${salt}:${key.toString("hex")}`;
}

const dir = process.env.DATA ?? path.join("data");
const file = path.resolve(dir, "users.json");
const users = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
const record = {
  id: "usr_niloufar",
  name: "نیلوفر راد",
  email,
  role: "artist",
  artistId: "artist-niloufar-rad",
  passwordHash: hash(password),
  createdAt: new Date().toISOString(),
};
const next = [...users.filter((user) => user.email !== email), record];
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(next, null, 2));
console.log(`seeded ${email} (artist ${record.artistId}) → ${file}`);
