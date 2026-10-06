import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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

const g = globalThis as unknown as { __store?: Store };

export async function embed(texts: string[], kind: 'query' | 'passage'): Promise<number[][]> {
  const { embed: runEmbed } = await import('./embed');
  return runEmbed(texts, kind);
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

const BN_TO_EN_MAP: [RegExp, string][] = [
  [/(পার্সেল|কুরিয়ার)/i, 'parcel courier package send delivery booking item items restriction weight size'],
  [/(কী\s*কী\s*লাগে|প্রয়োজন|ডকুমেন্ট|কাগজপত্র|নিয়ম|নিয়ম)/i, 'requirements items prohibited restriction weight size information rules'],
  [/(রাইড|গাড়ি|বাইক|ড্রাইভার|চালক)/i, 'ride car bike driver trip'],
  [/(ফেলে|হারিয়ে|রেখে|হারিয়ে)/i, 'left lost item forgot belongings support hotline helpline contact'],
  [/(খাবার|ফুড|রেস্তোরাঁ|রেস্টুরেন্ট)/i, 'food meal restaurant order delivery wrong mistake'],
  [/(পে\s*লেটার|লেট\s*ফি|বিলম্ব)/i, 'pay later paylater late fee grace period penalty due overdue subscribe'],
  [/(দেরি|দেরিতে)/i, 'late delay overdue grace period'],
  [/(ফি|চার্জ|খরচ|ভাড়া)/i, 'fee charge fare cost penalty rate'],
  [/(টাকা|পেমেন্ট|পরিশোধ)/i, 'money payment pay dues cash'],
  [/(রিফান্ড|ফেরত)/i, 'refund overcharged return money back compensation claim'],
  [/(সমস্যা|অভিযোগ|নালিশ|ভুল)/i, 'issue problem complaint report error cancel cancelled wrong mistake'],
  [/(মার্চেন্ট|দোকান|ব্যবসা)/i, 'merchant business store shop partner panel onboarding'],
  [/(যোগ|যুক্ত|রেজিস্টার|রেজিস্ট্রেশন|অ্যাকাউন্ট)/i, 'register signup registration onboarding create account new merchant'],
  [/(টপ\s*আপ|টপআপ|রিচার্জ)/i, 'top-up top up recharge balance bkash'],
  [/(হেল্পলাইন|যোগাযোগ|ফোন|নাম্বার|কল)/i, 'hotline helpline support contact phone email customer care'],
];

export async function search(question: string, topK = 4): Promise<Hit[]> {
  const store = await load();
  if (!store.chunks.length) return [];
  try {
    const [q] = await embed([question], 'query');
    return store.chunks
      .map((c) => ({ docName: c.docName, text: c.text, score: cosine(q, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } catch {
    // Neural embedding unavailable (e.g. serverless without native ONNX runtime).
    // Use bilingual query expansion + heading-weighted lexical search.
    let expanded = question.toLowerCase();
    for (const [rx, en] of BN_TO_EN_MAP) {
      if (rx.test(expanded)) expanded += ' ' + en;
    }

    const STOP = new Set([
      'how', 'what', 'where', 'when', 'who', 'why', 'which', 'can', 'could', 'would', 'should',
      'the', 'and', 'for', 'from', 'with', 'have', 'has', 'had', 'you', 'your', 'our', 'are', 'is',
      'was', 'were', 'this', 'that', 'these', 'those', 'not', 'but', 'all', 'any', 'get', 'make',
      'will', 'shall', 'per', 'about', 'into', 'over', 'after', 'before', 'under', 'just', 'than',
    ]);

    const terms = expanded
      .replace(/[^\w\s-]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w));

    if (!terms.length) {
      return store.chunks.slice(0, topK).map((c) => ({ docName: c.docName, text: c.text, score: 0.5 }));
    }

    const scored = store.chunks
      .map((c) => {
        const text = c.text.toLowerCase();
        const heading = (c.text.split('\n')[0] || '').toLowerCase();
        let score = 0;
        for (const t of terms) {
          const re = new RegExp('\\b' + t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
          if (heading.match(re)) {
            score += 10;
          } else if (text.match(re)) {
            score += 2;
          }
        }
        return { docName: c.docName, text: c.text, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.length
      ? scored
      : store.chunks.slice(0, topK).map((c) => ({ docName: c.docName, text: c.text, score: 0.1 }));
  }
}
