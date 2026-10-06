# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Learning project: a RAG customer-support chatbot for Pathao (Bangladesh rides/food/parcel) using its real public help center, copied into `data/pathao/*.md` by `scripts/fetch-pathao.mjs` (WordPress REST API, English articles only, numbered FAQ questions turned into `####` headings, contact section added). Unofficial, personal-use demo: UI says so; don't present it as Pathao's official bot, all in one Next.js 16 app. `/learn` (`app/learn/page.tsx`) is a beginner-facing guide to every feature — keep it in sync when behavior changes.

## Commands (pnpm)

- `pnpm dev` — dev server on http://localhost:3000
- `pnpm build` / `pnpm lint`
- `pnpm check` — the only test: `scripts/check.mts` asserts chunking + embedding similarity (plain `node:assert`, run via `node --experimental-strip-types`). First run downloads the embedding model (~120 MB).
- `pnpm ingest <folder-or-file> [...]` — bulk-load `.md`/`.txt` through the **running** app's HTTP API (`RAG_URL` overrides base URL). Replaces docs with the same name.

Scripts are `.mts` run by Node's type stripping, so imports between them and `lib/` use explicit `.ts` extensions (`tsconfig` has `allowImportingTsExtensions`).

## Environment

`.env.local`: `OPENROUTER_API_KEY` (default provider). Any OpenAI-compatible provider works via `LLM_BASE_URL` + `LLM_API_KEY` + `CHAT_MODELS` (comma-separated fallback list; OpenRouter gets the extra `models` field for server-side fallback).

## Architecture

- `lib/rag.ts` — the whole RAG core: `chunkText()` (heading-aware, ~800 chars, no overlap) → `embed()` with local `@huggingface/transformers` `Xenova/multilingual-e5-small` (Bangla + English) → JSON vector store at `data/store.json` (gitignored) → brute-force cosine `search()`.
  - e5 models need `query: ` / `passage: ` prefixes; `embed()` adds them via its `kind` arg.
  - Chunks are embedded as `"<docName>: <chunk>"` but stored clean.
  - Embedder and store are cached on `globalThis` (survive HMR). Editing `store.json` by hand while the server runs has no effect until restart.
- `app/api/docs/route.ts` (GET list, POST add) and `app/api/docs/[id]/route.ts` (DELETE).
- `app/api/chat/route.ts` — retrieval = top K for the latest user message + 2 more for the last two joined (crude follow-up handling; joined-only search dragged new topics back to the old one); a contact-info chunk is always appended to hits so the "don't know" reply can cite hotline/email. `systemPrompt()` holds the four reply rules (greeting / answer with `[n]` citations / unknown → contact / off-topic → polite refusal, no answer). `STYLE` forces every reply into Bangla regardless of the question's language. Responds as **NDJSON** stream: `{type:'sources'}` first, then `{type:'model'}`, `{type:'text', delta}`, or `{type:'error'}`. `app/page.tsx` parses this.
- `app/page.tsx` — chat UI (Bangla-first) plus a Test panel (knowledge base management, `useRag` toggle, `topK`).
- `app/ui.tsx` — `SiteHeader` (nav to chat + `/learn`, striped awning), `Logo`, `Icon`; shared by both pages (page files can't export extras).

## Conventions

- Code follows a deliberate minimalism style: shortcuts are marked with `// ponytail:` comments naming the limit and upgrade path (e.g. JSON store fine to ~10k chunks → pgvector). Preserve them; add one when taking a new shortcut.
- Known deliberate limits (README): free OpenRouter models (~50 req/day, 429s), no chunk overlap, no hybrid search, no query rewriting.
