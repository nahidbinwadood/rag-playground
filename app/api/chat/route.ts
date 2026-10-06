import OpenAI from 'openai';
import { search, type Hit } from '@/lib/rag';

// Any OpenAI-compatible provider works: OpenRouter (default), Google Gemini, Groq, local Ollama...
// Switch by setting LLM_BASE_URL + LLM_API_KEY + CHAT_MODELS in .env.local.
const BASE_URL = process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1';
const API_KEY = process.env.LLM_API_KEY ?? process.env.OPENROUTER_API_KEY;
const IS_OPENROUTER = BASE_URL.includes('openrouter.ai');

// Tried in order: free models are often rate-limited, OpenRouter falls through to the next one.
const MODELS = (process.env.CHAT_MODELS ?? 'qwen/qwen3.8-27b:free').split(',').map((m) => m.trim());

type Msg = { role: 'user' | 'assistant'; content: string };

const STYLE = `Style:
- Friendly, warm and to the point, like a good human support agent. Short paragraphs.
- Plain text only: no markdown symbols like ** or #. For lists, start each line with "• ".
- Write money as ৳ (for example ৳1,500).
- Citations always use English digits, like [1], never Bangla digits like [১].
- ALWAYS reply in Bangla (বাংলা script), even when the customer writes in English or Banglish
  and even though the SOURCES are in English. Translate facts faithfully. Keep phone numbers, emails,
  coupon codes and brand names (bKash, Pathao, Pay Later, InstaPay) exactly as written.`;

function systemPrompt(hits: Hit[] | null) {
  if (!hits) return `You are a helpful assistant.\n\n${STYLE}`;
  if (!hits.length) return `The knowledge base is empty. Tell the user (in Bangla) that the help center has no documents yet, so they should add documents first.\n\n${STYLE}`;
  const sources = hits.map((h, i) => `[${i + 1}] (${h.docName})\n${h.text}`).join('\n\n');
  return `You are the customer support assistant for the business described in the SOURCES below.

Decide which kind of message this is, then reply:

1. Greeting, thanks or small talk ("hi", "thank you", "how are you"):
   Reply warmly in one or two sentences and offer help with the business. No citations.

2. A question about the business that the SOURCES answer:
   Answer using ONLY the SOURCES. Be specific: exact prices, times, areas, steps.
   Cite every fact like [1] or [2], right after the sentence that uses it.

3. A question about the business that the SOURCES do not answer:
   Do not guess or invent anything. Say you don't have that information,
   then give the support contact details from the SOURCES (hotline, WhatsApp, email) with a citation.

4. A question or request that is clearly not about the business at all (general knowledge, maths, coding, news,
   other companies, writing tasks). Anything about the business's services (rides, food, parcels, payments,
   accounts, merchants, riders) is NEVER this case, even if the SOURCES do not cover it: use case 3.
   If unsure, use case 3.
   Do NOT answer it, not even partly. In one short sentence, politely say you can only help with
   this business, and suggest what you can help with (rides, food, parcels, payments, merchant account). No citations.

Never invent prices, policies, phone numbers, addresses or offers. Only the SOURCES are true for the business.

${STYLE}

SOURCES:
${sources}`;
}

// The support contact chunk is always attached, so "I don't know" (case 3 above) can still point somewhere useful.
// ponytail: a fixed extra search; a real app would store contact details as structured config instead.
async function retrieve(messages: Msg[], topK: number): Promise<Hit[]> {
  const users = messages.filter((m) => m.role === 'user').map((m) => m.content);
  // The latest question alone picks the main chunks, so a new topic is not dragged back to the old one.
  // A couple more come from the last two questions joined, so follow-ups like "and how long does it take?" keep their topic.
  const [own, joined, [contact]] = await Promise.all([
    search(users.at(-1) ?? '', topK),
    users.length > 1 ? search(users.slice(-2).join(' '), 2) : [],
    search('customer support contact hotline phone email', 1),
  ]);
  const hits = [...own, ...joined.filter((j) => !own.some((h) => h.text === j.text))];
  if (contact && !hits.some((h) => h.text === contact.text)) hits.push(contact);
  return hits;
}

// Response is NDJSON: one JSON object per line, so the UI can show sources first, then stream text.
export async function POST(req: Request) {
  if (!API_KEY) {
    return Response.json(
      { error: 'Set OPENROUTER_API_KEY (or LLM_API_KEY) in .env.local and restart pnpm dev' },
      { status: 500 },
    );
  }

  // OpenRouter speaks the OpenAI API format, so the official SDK works with a different baseURL.
  // The SDK default is a 10-minute timeout with 2 retries: far too long for a chat. Free models sometimes hang,
  // so give up after 30 s (one retry) and let the user press "Try again".
  const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
    timeout: 30_000,
    maxRetries: 1,
  });

  const {
    messages,
    useRag = true,
    topK = 4,
  } = (await req.json()) as {
    messages: Msg[];
    useRag?: boolean;
    topK?: number;
  };
  // ponytail: follow-ups are handled by searching with the last two questions together.
  // Upgrade: ask the LLM to rewrite the follow-up into a standalone question before searching.
  const hits = useRag ? await retrieve(messages, topK) : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      send({ type: 'sources', sources: hits ?? [] });
      try {
        const completion = await client.chat.completions.create({
          model: MODELS[0],
          // OpenRouter-only fields, not in the OpenAI types, hence the spread: fallback list,
          // no hidden "thinking" before the first word, and route to the fastest provider.
          // ponytail: speed over depth; drop `reasoning` if answers get sloppy.
          ...(IS_OPENROUTER
            ? ({ models: MODELS, reasoning: { enabled: false }, provider: { sort: 'latency' } } as object)
            : {}),
          stream: true,
          messages: [{ role: 'system', content: systemPrompt(hits) }, ...messages],
        });
        let announced = false;
        for await (const part of completion) {
          if (!announced && part.model) {
            send({ type: 'model', model: part.model });
            announced = true;
          }
          const delta = part.choices[0]?.delta?.content;
          if (delta) send({ type: 'text', delta });
        }
      } catch (e) {
        send({ type: 'error', message: (e as Error).message });
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
}
