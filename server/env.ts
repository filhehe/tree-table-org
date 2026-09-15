import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Заполняет process.env из корневого .env, не перезаписывая уже заданные переменные. */
export function loadDotEnv() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function envInt(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) ? raw : fallback;
}
