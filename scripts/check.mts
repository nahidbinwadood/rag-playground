// Self-check for the RAG core. Run: pnpm check
// First run downloads the embedding model (~120 MB).
import assert from 'node:assert/strict';
import { chunkText, embed, cosine } from '../lib/rag.ts';

// Chunking: respects the size limit and loses no words.
const text = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ` + 'word '.repeat(40)).join('\n\n');
const chunks = chunkText(text, 800);
assert.ok(chunks.length > 1, 'long text splits into several chunks');
assert.ok(chunks.every((c) => c.length <= 800), 'no chunk exceeds the limit');
assert.equal(chunks.join(' ').split(/\s+/).length, text.split(/\s+/).filter(Boolean).length, 'no words lost');
assert.ok(chunkText('#### What if I pay late?\n\n' + 'fee '.repeat(300))[0].includes('fee'), 'heading stays with its long answer');

// Headings: each section is its own chunk; a bare title sticks to the first section instead of being alone.
const md = '# Shop\n\n## Delivery\n60 BDT in Dhaka.\n\n## Payment\nbKash or cash.';
assert.deepEqual(chunkText(md), ['# Shop ## Delivery 60 BDT in Dhaka.', '## Payment bKash or cash.']);

// Embeddings: same meaning scores higher than different meaning, across Bangla and English.
const [q] = await embed(['How much does delivery cost?'], 'query');
const [related, bangla, unrelated] = await embed(
  ['Delivery inside Dhaka costs 60 BDT.', 'ঢাকার ভিতরে ডেলিভারি চার্জ ৬০ টাকা।', 'Our office cat is named Mishti.'],
  'passage',
);
const s = { related: cosine(q, related), bangla: cosine(q, bangla), unrelated: cosine(q, unrelated) };
console.log('similarity', s);
assert.ok(s.related > s.unrelated, 'related English passage beats unrelated');
assert.ok(s.bangla > s.unrelated, 'related Bangla passage beats unrelated');

console.log('ok');
