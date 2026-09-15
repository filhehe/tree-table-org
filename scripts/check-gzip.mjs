import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const LIMIT = 200 * 1024;

let jsGzip = 0;
for (const name of readdirSync(ASSETS)) {
  if (!name.endsWith('.js')) continue;
  const gz = gzipSync(readFileSync(path.join(ASSETS, name))).length;
  jsGzip += gz;
  console.log(`${String(gz).padStart(7)} B gzip  ${name}`);
}

if (jsGzip > LIMIT) {
  console.error(`JS gzip ${jsGzip} B > ${LIMIT} B`);
  process.exit(1);
}

console.log(`JS gzip ${jsGzip} B ≤ ${LIMIT} B`);
