# RAG Playground — Pathao help center chat (unofficial demo)

A learning project: a customer-support chatbot that answers from a business's own help center (RAG), in one Next.js app.
The knowledge base is the public help center of **Pathao** (rides, food, parcel, Pay Later, merchants), copied from help.pathao.com into `data/pathao/*.md` with `node scripts/fetch-pathao.mjs data/pathao`. Personal learning use only: this is not Pathao's official support, and the content belongs to Pathao.

- **Embeddings**: run locally and free with `@huggingface/transformers` (`multilingual-e5-small`, Bangla + English).
- **Vector store**: `data/store.json`, brute-force cosine search.
- **LLM**: free models on OpenRouter, with a fallback list.

## Setup

1. Put your OpenRouter key in `.env.local`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
2. `pnpm install`
3. `pnpm dev` → http://localhost:3000
4. If the Test panel shows no documents, run `pnpm ingest data/pathao` (with the dev server running).

The first document you add downloads the embedding model (~120 MB, once). `/learn` explains every part for JavaScript beginners.

## How the assistant replies

| Customer writes | Assistant does |
|---|---|
| "hi", "thanks" | Short warm reply, offers help |
| A question the help center answers | Answers only from it, cites `[1]` `[2]` |
| A business question the help center does not answer | Says it doesn't know, gives helpline / email |
| Something unrelated ("capital of Japan?", "write code") | Politely refuses, says it only helps with Pathao |

The rules live in `systemPrompt()` in `app/api/chat/route.ts`. The contact section is always attached to the sources so the "don't know" reply can point somewhere.

## How it works

```
Add document:  text → chunkText() → embed('document name: chunk') → data/store.json
Ask question:  last question (top K) + last two joined (2 more) → embed → chunks + contact chunk → system prompt → LLM → streamed answer
```

| File | What it does |
|---|---|
| `lib/rag.ts` | Chunking, embeddings, vector store, search: the whole RAG core |
| `app/api/docs/route.ts` | List / add documents |
| `app/api/chat/route.ts` | Retrieve, build the prompt, stream from OpenRouter (NDJSON) |
| `app/page.tsx` | Support chat + Test panel (knowledge base, settings) |
| `app/learn/page.tsx` | Beginner guide to every feature |
| `scripts/check.mts` | `pnpm check`: asserts chunking and embedding similarity work |
| `scripts/ingest.mts` | `pnpm ingest <folder>`: bulk-load .md/.txt through the running app |
| `scripts/fetch-pathao.mjs` | One-off: download help.pathao.com articles into `data/pathao/*.md` |

## Questions to test

- Pay Later: "What is the Pay Later late fee?" then "how long is the grace period?"
- Top-up: "How do I top up my Pathao account?" / "মোবাইল রিচার্জ কীভাবে করব?"
- Parcel: "What items can't I send by parcel?"
- Merchants: "Do I need a Facebook page to become a merchant?"
- Not in the help center: "I left my phone in a ride, what do I do?" → should give the helpline, not invent.
- Off-topic: "What is the capital of Japan?" → polite refusal, no answer.
- Turn "Use help center" off in the Test panel and ask a delivery question: the model has no idea.

## Limits (deliberate)

- Free OpenRouter models: about 50 requests/day, sometimes rate-limited (429).
- No chunk overlap, no hybrid keyword search; follow-ups add 2 chunks from the last two questions joined, not a rewritten query.
- JSON store is fine to ~10k chunks; beyond that use Postgres + pgvector.
