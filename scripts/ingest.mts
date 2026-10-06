// Bulk-load .md / .txt files into memory through the running app.
// Usage: pnpm ingest <folder-or-file> [...more]        (pnpm dev must be running)
//        RAG_URL=http://localhost:3055 pnpm ingest docs
// Re-running replaces documents with the same name, so it is safe to repeat.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const BASE = process.env.RAG_URL ?? 'http://localhost:3000';
const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('Usage: pnpm ingest <folder-or-file> [...more]');
  process.exit(1);
}

async function* walk(p: string): AsyncGenerator<string> {
  const stat = await fs.stat(p);
  if (stat.isFile()) {
    if (/\.(md|txt)$/i.test(p)) yield p;
    return;
  }
  for (const entry of await fs.readdir(p)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    yield* walk(path.join(p, entry));
  }
}

// Fail early with a clear message instead of one error per file.
const existing: { id: string; name: string }[] = await fetch(`${BASE}/api/docs`)
  .then((r) => r.json())
  .catch(() => {
    console.error(`Cannot reach ${BASE}. Start the app with pnpm dev first (or set RAG_URL).`);
    process.exit(1);
  });

let added = 0;
let chunks = 0;
for (const target of targets) {
  const root = path.resolve(target);
  const isDir = (await fs.stat(root)).isDirectory();
  for await (const file of walk(root)) {
    // Name = folder name + path inside it, e.g. "features/13-retailer-branches.md"
    const name = isDir ? path.join(path.basename(root), path.relative(root, file)).replaceAll('\\', '/') : path.basename(file);
    const text = await fs.readFile(file, 'utf8');
    if (!text.trim()) continue;

    for (const old of existing.filter((d) => d.name === name)) {
      await fetch(`${BASE}/api/docs/${old.id}`, { method: 'DELETE' });
    }
    const res = await fetch(`${BASE}/api/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, text }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error(`✗ ${name}: ${body.error}`);
      continue;
    }
    added++;
    chunks += body.chunks;
    console.log(`✓ ${name}  (${body.chunks} chunks)`);
  }
}
console.log(`\n${added} documents, ${chunks} chunks added.`);
