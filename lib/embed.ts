import path from 'path';
import os from 'os';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

// multilingual-e5-small: 384 numbers per text, understands Bangla + English.
// Downloaded once (~120 MB) into the temp cache on first use.
// e5 models expect "query: " for questions and "passage: " for documents.
const EMBED_MODEL = 'Xenova/multilingual-e5-small';

const g = globalThis as unknown as { __embedder?: Promise<FeatureExtractionPipeline> };

function embedder() {
  g.__embedder ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = path.join(os.tmpdir(), 'transformers-cache');
    return pipeline('feature-extraction', EMBED_MODEL, { dtype: 'q8' });
  })();
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
