import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

// Set cache directory to OS temp directory (/tmp on Vercel/Linux)
env.cacheDir = path.join(os.tmpdir(), 'transformers-cache');

// ---------- Types ----------

export type Doc = { id: string; name: string; chunks: number; createdAt: string };
export type Chunk = { id: string; docId: string; docName: string; text: string; embedding: number[] };
export type Hit = { docName: string; text: string; score: number };
type Store = { docs: Doc[]; chunks: Chunk[] };

// ---------- 1. Chunking: split a document into passages of ~maxChars ----------

export function chunkText(text: string, maxChars = 800): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    // A paragraph that is only a heading line ("# Title") carries no answer on its own.
    .map((raw) => ({ text: raw.replace(/\s+/g, ' '), headingOnly: raw.startsWith('#') && !raw.includes('\n') }));

  const chunks: string[] = [];
  let current = '';
  let hasBody = false;
  for (const p of paragraphs) {
    // A single huge paragraph gets hard-cut so no chunk exceeds maxChars.
    const pieces = p.text.length > maxChars ? p.text.match(new RegExp(`.{1,${maxChars}}(\\s|$)`, 'g'))! : [p.text];
    for (const piece of pieces) {
      // A markdown heading starts a new chunk so each section stays together,
      // unless the current chunk is only headings so far (then they stay with this section,
      // even if that pushes the chunk a heading's length over maxChars).
      const newSection = piece.startsWith('#') && hasBody;
      if (current && hasBody && (newSection || current.length + piece.length + 1 > maxChars)) {
        chunks.push(current);
        current = '';
        hasBody = false;
      }
      current = current ? `${current} ${piece.trim()}` : piece.trim();
      if (!p.headingOnly) hasBody = true;
    }
  }
  if (current) chunks.push(current);
  return chunks;
  // ponytail: no overlap between chunks; add a ~100-char overlap if answers get cut at boundaries.
}

// ---------- 2. Embeddings: text -> vector, runs locally, free ----------

// multilingual-e5-small: 384 numbers per text, understands Bangla + English.
// Downloaded once (~120 MB) into the HF cache on first use.
// e5 models expect "query: " for questions and "passage: " for documents.
const EMBED_MODEL = 'Xenova/multilingual-e5-small';

const g = globalThis as unknown as { __embedder?: Promise<FeatureExtractionPipeline>; __store?: Store };

function embedder() {
  g.__embedder ??= pipeline('feature-extraction', EMBED_MODEL, { dtype: 'q8' });
  return g.__embedder;
}

export async function embed(texts: string[], kind: 'query' | 'passage'): Promise<number[][]> {
  const extract = await embedder();
  const out = await extract(
    texts.map((t) => `${kind}: ${t}`),
    { pooling: 'mean', normalize: true },
  );
  return out.tolist() as number[][];
}

// Vectors are normalized, so cosine similarity is just the dot product. 1 = same meaning, ~0 = unrelated.
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ---------- 3. Vector store: a JSON file ----------

// ponytail: brute-force scan over a JSON file. Fine to ~10k chunks; past that use Postgres + pgvector.
const STORE_PATH = path.join(process.cwd(), 'data', 'store.json');

async function load(): Promise<Store> {
  if (g.__store) return g.__store;
  try {
    g.__store = JSON.parse(await fs.readFile(STORE_PATH, 'utf8')) as Store;
  } catch {
    g.__store = { docs: [], chunks: [] };
  }
  return g.__store;
}

async function save(store: Store) {
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store));
  } catch (err) {
    console.warn('Could not persist store to disk (e.g. read-only filesystem):', err);
  }
}

export async function listDocs(): Promise<Doc[]> {
  return (await load()).docs;
}

export async function addDoc(name: string, text: string): Promise<Doc> {
  const store = await load();
  const pieces = chunkText(text);
  if (!pieces.length) throw new Error('Document is empty');

  // Embed each chunk with its document name in front: a chunk like "## 13.1 Data & API" alone never says
  // it is about branches, but "13-retailer-branches.md: ## 13.1 Data & API" does. The stored text stays clean.
  const vectors = await embed(pieces.map((p) => `${name}: ${p}`), 'passage');
  const doc: Doc = { id: randomUUID(), name, chunks: pieces.length, createdAt: new Date().toISOString() };
  store.docs.push(doc);
  pieces.forEach((text, i) =>
    store.chunks.push({ id: randomUUID(), docId: doc.id, docName: name, text, embedding: vectors[i] }),
  );
  await save(store);
  return doc;
}

export async function deleteDoc(id: string) {
  const store = await load();
  store.docs = store.docs.filter((d) => d.id !== id);
  store.chunks = store.chunks.filter((c) => c.docId !== id);
  await save(store);
}

// ---------- 4. Retrieval: find the chunks closest in meaning to the question ----------

export async function search(question: string, topK = 4): Promise<Hit[]> {
  const store = await load();
  if (!store.chunks.length) return [];
  const [q] = await embed([question], 'query');
  return store.chunks
    .map((c) => ({ docName: c.docName, text: c.text, score: cosine(q, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
