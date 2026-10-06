import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, SiteHeader } from '../ui';

export const metadata: Metadata = {
  title: 'শিখুন: চ্যাটবট কীভাবে কাজ করে · Pathao Help demo',
  description: 'How the Pathao help-center chatbot (unofficial demo) works, explained step by step for JavaScript beginners.',
};

// ---------- Small building blocks for the page ----------

// Long code is folded so a beginner can read the idea first and open the code when ready.
// ponytail: "long" is a fixed 12-line cutoff; add an explicit prop if a block needs to break the rule.
function Code({ children, file }: { children: string; file?: string }) {
  const code = children.trim();
  const long = code.split('\n').length > 12;
  const pre = (
    <pre className="overflow-x-auto bg-[#10261b] p-4 font-mono text-[13px] leading-relaxed text-[#e8f1ea]">
      <code>{code}</code>
    </pre>
  );
  const label = file && <span className="font-mono text-xs">{file}</span>;
  if (!long)
    return (
      <figure className="my-5 overflow-hidden rounded-xl border border-line">
        {file && <figcaption className="border-b border-line bg-surface px-4 py-2 text-muted">{label}</figcaption>}
        {pre}
      </figure>
    );
  return (
    <details className="group my-5 overflow-hidden rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand group-open:bg-brand group-open:text-white">
          <span className="group-open:hidden">কোড দেখুন</span>
          <span className="hidden group-open:inline">কোড লুকান</span>
        </span>
        {label ?? <span className="text-xs">{code.split('\n').length} lines</span>}
      </summary>
      {pre}
    </details>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 mb-2 text-base font-semibold text-brand">{children}</h3>;
}

function Try({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl bg-brand-soft p-4 text-[15px]">
      <p className="mb-1 flex items-center gap-2 font-semibold text-brand">
        <Icon name="chat" /> চ্যাটে নিজে চেষ্টা করুন
      </p>
      {children}
    </div>
  );
}

function Mistake({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-danger/25 bg-danger/5 p-4 text-[15px]">
      <p className="mb-1 font-semibold text-danger">সাধারণ ভুল</p>
      {children}
    </div>
  );
}

type Links = { js: (keyof typeof JS)[]; after: [number, string][]; next: [number, string][] };

function Section({ id, n, title, oneLine, links, children }: { id: string; n: number; title: string; oneLine: string; links: Links; children: ReactNode }) {
  const [, , bnTitle, bnPlain] = STEPS[n];
  return (
    <section id={id} className="scroll-mt-28 border-t border-line pt-14 pb-4">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-deep text-xl font-bold text-white">
          {n}
        </span>
        <div>
          <p className="text-sm font-medium text-muted">ধাপ {n} · {bnTitle}</p>
          <h2 className="font-display text-2xl leading-tight font-bold md:text-3xl">{title}</h2>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border-l-4 border-accent bg-surface p-4">
        <p className="text-sm font-semibold text-muted">সহজ কথায়</p>
        <p className="mt-1 text-lg leading-snug">{bnPlain}</p>
        <p className="mt-2 text-muted">{oneLine}</p>
      </div>
      <Connections links={links} />
      <div className="mt-2 space-y-4 text-[16px] leading-relaxed">{children}</div>
    </section>
  );
}

// Step number → [anchor id, title, Bangla title, Bangla one-liner]. Used by headings, the TOC and prerequisite links.
const STEPS: Record<number, [string, string, string, string]> = {
  1: ['chunking', 'Chunking', 'টুকরো করা', 'বড় লেখাকে ছোট ছোট টুকরোয় ভাগ করি, যাতে ঠিক দরকারি অংশটা খুঁজে পাওয়া যায়।'],
  2: ['embeddings', 'Embeddings', 'অর্থকে সংখ্যায় রূপান্তর', 'প্রতিটি টুকরোর অর্থকে সংখ্যার তালিকায় বদলাই, যাতে কম্পিউটার অর্থ তুলনা করতে পারে।'],
  3: ['similarity', 'Similarity', 'কতটা মিল', 'দুটো সংখ্যার তালিকা মিলিয়ে দেখি অর্থ দুটো কতটা কাছাকাছি।'],
  4: ['vector-store', 'Vector store', 'জমা রাখা', 'টুকরো আর তার সংখ্যা একবার হিসাব করে ফাইলে রেখে দিই, বারবার হিসাব করতে হয় না।'],
  5: ['retrieval', 'Retrieval', 'খুঁজে বের করা', 'প্রশ্নের সাথে সবচেয়ে মিলে যাওয়া কয়েকটা টুকরো বেছে নিই।'],
  6: ['prompt', 'The prompt', 'AI-কে নির্দেশনা', 'বাছাই করা টুকরোগুলো AI-কে দিয়ে বলি: শুধু এগুলো থেকে, বাংলায় উত্তর দাও।'],
  7: ['llm', 'Calling the LLM', 'AI-কে প্রশ্ন পাঠানো', 'ইন্টারনেটে AI মডেলের কাছে সব পাঠিয়ে উত্তর নিয়ে আসি।'],
  8: ['streaming', 'Streaming', 'শব্দে শব্দে দেখানো', 'পুরো উত্তরের অপেক্ষা না করে যা লেখা হচ্ছে সাথে সাথে দেখাই।'],
  9: ['memory', 'Chat memory', 'কথোপকথন মনে রাখা', 'AI কিছু মনে রাখে না, তাই প্রতিবার পুরো কথোপকথন আবার পাঠাই।'],
  10: ['api-routes', 'API routes', 'ব্রাউজার আর সার্ভারের সংযোগ', 'ব্রাউজার আর সার্ভার একই প্রজেক্টে থাকে; ফোল্ডারের নাম থেকেই URL তৈরি হয়।'],
  11: ['secrets', 'Secrets', 'গোপন চাবি', 'API key একটা পাসওয়ার্ড; এটা শুধু সার্ভারে থাকবে, ব্রাউজারে বা GitHub-এ কখনো না।'],
  12: ['errors', 'Stop, retry, errors', 'থামানো ও ভুল সামলানো', 'ব্যবহারকারী থামাতে পারবে, আবার চেষ্টা করতে পারবে, আর ভুল হলে সহজ ভাষায় জানবে।'],
};

// The JavaScript each step relies on, with the smallest example that shows it.
const JS = {
  strings: ['Strings and split', String.raw`'a\n\nb'.split(/\n\s*\n/)   // ['a', 'b']  (the regex means "an empty line")`],
  loops: ['for loops', 'for (let i = 0; i < arr.length; i++) { total += arr[i]; }'],
  arrays: ['map, sort, slice', '[3, 1, 2].sort((a, b) => b - a).slice(0, 2)   // [3, 2]'],
  objects: ['Objects and JSON', `JSON.stringify({ a: 1 })   // '{"a":1}'\nJSON.parse('{"a":1}').a  // 1`],
  async: ['async / await', 'const data = await fetch(url).then((r) => r.json());'],
  fetch: ['fetch with POST', `fetch('/api/x', { method: 'POST', body: JSON.stringify({ q: 'hi' }) })`],
  template: ['Template strings', 'const msg = `Hello ${name}, you have ${n} items`;'],
  modules: ['import and npm packages', `import OpenAI from 'openai';   // after: pnpm add openai`],
  trycatch: ['try / catch', 'try { await risky(); } catch (e) { console.log(e.message); }'],
  env: ['Environment variables', 'process.env.OPENROUTER_API_KEY   // read from .env.local, server only'],
  fs: ['Reading and writing files', `fs.writeFileSync('data.json', JSON.stringify(obj));`],
  react: ['React useState', 'const [messages, setMessages] = useState([]);'],
  http: ['HTTP basics', 'GET = read, POST = create, DELETE = remove\n200 ok · 400 bad input · 429 too many requests · 500 server error'],
} as const;

// One compact line instead of a big box: what to know first, and where this step leads.
function Connections({ links }: { links: Links }) {
  const chip = 'rounded-full border px-2.5 py-0.5 text-xs transition-colors';
  return (
    <div className="mt-4 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-muted">আগে জানা দরকার:</span>
        {links.js.map((k) => (
          <a key={k} href={`#js-${k}`} className={`${chip} border-line bg-surface text-muted hover:border-ink hover:text-ink`}>
            JS: {JS[k][0]}
          </a>
        ))}
        {links.after.map(([n, why]) => (
          <a key={n} href={`#${STEPS[n][0]}`} title={why} className={`${chip} border-brand/30 text-brand hover:bg-brand-soft`}>
            ধাপ {n}: {STEPS[n][1]}
          </a>
        ))}
        {!links.after.length && <span className="text-xs text-muted">(আগের কোনো ধাপ লাগবে না)</span>}
      </div>
      {!!links.next.length && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-muted">এরপর কাজে লাগে:</span>
          {links.next.map(([n, why]) => (
            <a key={n} href={`#${STEPS[n][0]}`} title={why} className={`${chip} border-brand/30 text-brand hover:bg-brand-soft`}>
              ধাপ {n}: {STEPS[n][1]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Grouped like a short course: start, the 12 steps, then what to do with it.
const PARTS: { title: string; items: [string, string][] }[] = [
  { title: 'শুরু', items: [['big-picture', 'পুরো ছবিটা'], ['words', 'নতুন শব্দগুলো'], ['js', 'যতটুকু JavaScript লাগবে']] },
  { title: '১২টি ধাপ', items: Object.values(STEPS).map(([id, t, bnT]) => [id, `${t} · ${bnT}`]) },
  { title: 'এরপর', items: [['build', 'নিজে বানান'], ['next', 'এরপর কী শিখবেন']] },
];

// The signature of this page: one real question travels the route like a delivery, stop by stop.
const JOURNEY: [string, string, string, number][] = [
  ['প্রশ্ন আসে', 'গ্রাহক লেখেন: "পে লেটারে দেরি করলে কত ফি?"', 'chat', 9],
  ['অর্থ বোঝা', 'প্রশ্নটা ৩৮৪টি সংখ্যায় রূপান্তর হয়', 'bolt', 2],
  ['খোঁজা', 'হেল্প সেন্টারের ১৪৯টি টুকরোর সাথে মিলিয়ে সেরা ৫টি বাছাই', 'globe', 5],
  ['AI পড়ে', 'ঐ ৫টি টুকরো + নিয়ম AI-কে পাঠানো হয়', 'book', 6],
  ['উত্তর', '"বকেয়ার ১০%, সর্বোচ্চ ৳২৫০ [1]" — সূত্রসহ, বাংলায়', 'send', 8],
];

// ---------- The page ----------

export default function LearnPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader active="learn" />

      {/* Mobile table of contents: a scrollable strip of the 12 steps. */}
      <nav aria-label="Steps" className="sticky top-[72px] z-10 border-b border-line bg-bg/95 backdrop-blur md:hidden">
        <ol className="flex gap-1.5 overflow-x-auto px-4 py-2 text-sm">
          {Object.entries(STEPS).map(([n, [id, t]]) => (
            <li key={id} className="shrink-0">
              <a href={`#${id}`} className="block rounded-full border border-line bg-surface px-3 py-1 text-muted">
                {n}. {t}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 md:grid-cols-[230px_1fr] md:px-6">
        {/* Table of contents */}
        <nav className="hidden md:block" aria-label="Topics">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto py-8 text-[13px]">
            {PARTS.map((part) => (
              <div key={part.title}>
                <p className="mb-1.5 px-2 text-xs font-semibold text-muted">{part.title}</p>
                <ol className="space-y-0.5">
                  {part.items.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`} className="block rounded-lg px-2 py-0.5 text-ink/75 hover:bg-brand-soft hover:text-brand">
                        {label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0 max-w-[740px] py-10">
          {/* Intro */}
          <p className="rise text-sm font-semibold text-brand">নতুনদের জন্য গাইড</p>
          <h1 className="rise mt-2 font-display text-3xl leading-tight font-bold md:text-5xl">
            চ্যাটবট কীভাবে আপনার
            <br />
            ডকুমেন্ট পড়ে উত্তর দেয়
          </h1>
          <p className="rise mt-5 text-lg leading-relaxed text-ink/80" style={{ ['--d' as string]: '100ms' }}>
            এই পাতায় পাঠাও হেল্প সেন্টারের চ্যাটবটের প্রতিটি অংশ ধাপে ধাপে ব্যাখ্যা করা হয়েছে। প্রতিটি ধাপে আগে সহজ বাংলায় মূল ধারণা,
            তারপর একটা বাস্তব উদাহরণ, আর চাইলে আসল কোড। কোড বুঝতে শুধু বেসিক JavaScript জানলেই চলবে।
          </p>

          {/* One question's journey */}
          <section className="rise mt-10 rounded-3xl bg-brand-deep p-5 text-white md:p-7" style={{ ['--d' as string]: '180ms' }}>
            <p className="text-sm text-white/70">একটা প্রশ্নের যাত্রা</p>
            <h2 className="mt-1 text-xl font-bold md:text-2xl">প্রশ্ন থেকে উত্তর পর্যন্ত ৫টি স্টপ</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-5 md:gap-2">
              {JOURNEY.map(([title, detail, icon, step], i) => (
                <li key={title} className="relative flex gap-3 md:flex-col md:items-center md:text-center">
                  {/* The dashed road between stops. */}
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="absolute top-[-16px] left-5 h-4 border-l-2 border-dashed border-accent/60 md:top-5 md:left-[-50%] md:h-0 md:w-full md:border-t-2 md:border-l-0"
                    />
                  )}
                  <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-brand-deep">
                    <Icon name={icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm text-white/75">{detail}</span>
                    <a href={`#${STEPS[step][0]}`} className="mt-1 inline-block text-xs text-accent hover:underline">
                      ধাপ {step} দেখুন →
                    </a>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Pick a path */}
          <section className="mt-10">
            <h2 className="text-xl font-bold">কোথা থেকে শুরু করবেন?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['শুধু জানতে চাই', '৫ মিনিট', 'কোড ছাড়া পুরো ধারণাটা বুঝুন।', '#big-picture'],
                ['JavaScript জানি', '৩০ মিনিট', '১২টি ধাপ পড়ুন, কোড খুলে দেখুন।', '#chunking'],
                ['নিজে বানাতে চাই', 'এক বিকেল', 'ধাপে ধাপে নিজের RAG চ্যাটবট।', '#build'],
              ].map(([title, time, desc, href]) => (
                <a key={href} href={href} className="group rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand">
                  <span className="text-xs text-muted">{time}</span>
                  <span className="mt-1 block font-semibold group-hover:text-brand">{title}</span>
                  <span className="mt-1 block text-sm text-muted">{desc}</span>
                </a>
              ))}
            </div>
          </section>

          {/* 0. Big picture */}
          <section id="big-picture" className="scroll-mt-28 pt-14 pb-4">
            <h2 className="font-display text-2xl font-bold md:text-3xl">পুরো ছবিটা</h2>
            <p className="mt-1 text-muted">The big picture</p>
            <div className="mt-4 space-y-4 text-[16px] leading-relaxed">
              <p>
                An AI model (an <b>LLM</b>, like ChatGPT) only knows what it learned during training. It has never seen your
                shop&apos;s delivery prices or your company&apos;s rules. If you ask, it will guess.
              </p>
              <p>
                <b>RAG</b> (Retrieval-Augmented Generation) fixes this with a simple idea: <b>before asking the AI, find the
                right part of your documents and paste it into the question.</b>
              </p>
              <div className="rounded-2xl border-l-4 border-accent bg-surface p-4">
                <p className="font-semibold">খোলা বইয়ের পরীক্ষা 📖</p>
                <p className="mt-1 text-ink/80">
                  ছাত্র (AI) বুদ্ধিমান, কিন্তু পাঠাওয়ের নিয়ম মুখস্থ নেই। তাই পরীক্ষার আগে আমরা বইয়ের ঠিক পাতাটা খুলে তার সামনে
                  রাখি। সে সেই পাতা পড়ে উত্তর লেখে, আর বলে দেয় কোন পাতা থেকে নিল ([1], [2])।
                </p>
              </div>
              <p>The app does two separate jobs:</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Flow
                  title="কাজ ১: ডকুমেন্ট যোগ করা"
                  note="প্রতিটি ডকুমেন্টে একবারই"
                  steps={['Your text', 'Cut into chunks', 'Turn each chunk into numbers', 'Save to store.json']}
                />
                <Flow
                  title="কাজ ২: প্রশ্নের উত্তর দেওয়া"
                  note="প্রতিটি প্রশ্নে"
                  steps={['Question', 'Turn into numbers', 'Find closest chunks', 'Put chunks in prompt', 'AI writes answer in Bangla']}
                />
              </div>

              <Label>Where each part lives</Label>
              <Code>{`
lib/rag.ts              chunking, embeddings, similarity, store, search  (steps 1-5)
app/api/docs/route.ts   add and list documents                          (step 10)
app/api/chat/route.ts   build the prompt, call the LLM, stream          (steps 6-8)
app/page.tsx            the chat screen                                 (steps 8, 9, 12)
.env.local              your secret API key                             (step 11)
              `}</Code>
            </div>
          </section>

          {/* Words */}
          <section id="words" className="scroll-mt-28 pt-10 pb-4">
            <h2 className="font-display text-2xl font-bold md:text-3xl">নতুন শব্দগুলো</h2>
            <p className="mt-1 text-muted">Six words you will see on every step.</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['LLM', 'যে AI লেখা তৈরি করে', 'Large Language Model: Qwen, Llama, GPT, Claude.'],
                ['Chunk', 'ডকুমেন্টের একটা টুকরো', 'About one paragraph or section of a document.'],
                ['Embedding', 'অর্থের সংখ্যা-রূপ', 'A list of numbers that represents what a text means.'],
                ['Vector', 'সংখ্যার তালিকা', 'Another word for that list of numbers.'],
                ['Prompt', 'AI-কে পাঠানো পুরো লেখা', 'Instructions + sources + the question.'],
                ['Token', 'শব্দের টুকরো', 'LLMs read and write in tokens. You can ignore this for now.'],
              ].map(([term, bnDef, def]) => (
                <div key={term} className="rounded-xl border border-line bg-surface p-3">
                  <dt className="font-mono font-semibold text-brand">{term}</dt>
                  <dd className="mt-0.5 font-medium">{bnDef}</dd>
                  <dd className="text-sm text-muted">{def}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* JavaScript prerequisites */}
          <section id="js" className="scroll-mt-28 pt-10 pb-4">
            <h2 className="font-display text-2xl font-bold md:text-3xl">যতটুকু JavaScript লাগবে</h2>
            <p className="mt-2 text-muted">
              প্রতিটি ধাপের শুরুতে লেখা থাকে কোনগুলো লাগবে। কোনোটা নতুন মনে হলে এখানকার ছোট উদাহরণটা আগে দেখে নিন।
            </p>
            <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
              {Object.entries(JS).map(([key, [name, example]]) => (
                <div key={key} id={`js-${key}`} className="grid scroll-mt-28 gap-1 p-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="font-semibold">{name}</dt>
                  <dd className="font-mono text-[13px] break-words whitespace-pre-wrap text-muted">{example}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 1. Chunking */}
          <Section id="chunking" n={1} title="Chunking" oneLine="Cut a long document into small pieces so we can find the exact piece that answers a question." links={{ js: ['strings', 'loops'], after: [], next: [[2, 'each chunk is turned into numbers'], [4, 'chunks are what we save']] }}>
            <Label>Real-life example</Label>
            <p>
              Imagine the Pathao help center: 120 articles about rides, food, parcels, Pay Later and more. A customer asks &quot;What is the Pay Later late fee?&quot;. You would not read all 120
              articles to them. You would find the <b>one section</b> about late fees. Chunks are those paragraphs.
            </p>
            <Label>Why not send the whole document?</Label>
            <p>
              Small documents could be sent whole. But big ones cost more, are slower, and the AI gets confused by too much
              unrelated text. Small, focused pieces give better answers.
            </p>
            <Label>How it works</Label>
            <ol className="list-decimal space-y-1 pl-6">
              <li>Split the text wherever there is an empty line (that is a paragraph break).</li>
              <li>Join paragraphs together until the piece is about 800 characters.</li>
              <li>A markdown heading (<code className="font-mono text-brand">## Delivery</code>) always starts a new chunk, so each section stays together.</li>
            </ol>
            <Code file="Simple version (plain JavaScript)">{`
function chunkText(text, maxChars = 800) {
  const paragraphs = text.split(/\\n\\s*\\n/);   // split on empty lines
  const chunks = [];
  let current = '';

  for (const p of paragraphs) {
    const startsSection = p.startsWith('#');
    const tooBig = current.length + p.length > maxChars;

    if (current && (startsSection || tooBig)) {
      chunks.push(current);   // save the finished chunk
      current = '';           // start a new one
    }
    current = current ? current + ' ' + p : p;
  }
  if (current) chunks.push(current);
  return chunks;
}

chunkText('## Delivery\\n60 BDT in Dhaka.\\n\\n## Payment\\nbKash or cash.');
// → ['## Delivery 60 BDT in Dhaka.', '## Payment bKash or cash.']
            `}</Code>
            <Try>open the Test panel. Next to each document you can see how many chunks it was cut into (user-help-center.md has 49).</Try>
            <Mistake>chunks that are too small (one sentence) lose context; chunks that are too big (whole pages) mix many topics. A few hundred to ~1000 characters is a good start.</Mistake>
          </Section>

          {/* 2. Embeddings */}
          <Section id="embeddings" n={2} title="Embeddings" oneLine="Turn text into a list of numbers that captures its meaning, so a computer can compare meanings." links={{ js: ['async', 'modules', 'arrays'], after: [[1, 'we embed chunks, so we need chunks first']], next: [[3, 'we compare these numbers'], [4, 'the numbers are saved with each chunk'], [5, 'the question is embedded the same way']] }}>
            <Label>Real-life example</Label>
            <p>
              Think of a map. Dhaka and Narayanganj are close on the map; Dhaka and London are far. An embedding puts every
              sentence on a &quot;map of meaning&quot;. Sentences with similar meaning land close together, even if they use
              different words.
            </p>
            <p>
              &quot;How much is delivery?&quot; and &quot;ডেলিভারি চার্জ কত?&quot; use completely different words (even
              different languages) but land in almost the same spot.
            </p>
            <Label>How it works</Label>
            <ol className="list-decimal space-y-1 pl-6">
              <li>A small AI model (called an <b>embedding model</b>) reads the text.</li>
              <li>It outputs 384 numbers, like <code className="font-mono text-brand">[0.012, -0.044, 0.31, ...]</code>.</li>
              <li>We use <b>multilingual-e5-small</b>. It runs on your own computer, for free, and understands Bangla.</li>
              <li>The first time, it downloads (~120 MB). After that it works offline.</li>
            </ol>
            <Code file="lib/rag.ts (simplified)">{`
import { pipeline } from '@huggingface/transformers';

// Load the model once (slow the first time, fast after)
const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');

async function embed(texts, kind) {
  // This model wants "query: " for questions and "passage: " for documents
  const withPrefix = texts.map((t) => kind + ': ' + t);
  const output = await extractor(withPrefix, { pooling: 'mean', normalize: true });
  return output.tolist();   // → [[0.012, -0.044, ...384 numbers], ...]
}

const [vector] = await embed(['Delivery inside Dhaka costs 60 BDT'], 'passage');
console.log(vector.length);  // 384
            `}</Code>
            <Try>ask a question in Bangla. The answer is found in an English document, because meanings match, not words.</Try>
            <Mistake>using a different embedding model for questions and for documents. Both must use the same model, or the numbers are on different &quot;maps&quot;.</Mistake>
          </Section>

          {/* 3. Similarity */}
          <Section id="similarity" n={3} title="Similarity" oneLine="Measure how close two meanings are by comparing their numbers. Closer to 1 means more similar." links={{ js: ['loops', 'arrays'], after: [[2, 'similarity compares two embeddings']], next: [[5, 'search ranks chunks by this score']] }}>
            <Label>A tiny example with 2 numbers instead of 384</Label>
            <Code>{`
cat    = [0.9, 0.1]
kitten = [0.85, 0.2]
car    = [0.1, 0.95]

similarity(cat, kitten) = 0.9*0.85 + 0.1*0.2  = 0.785   ← close
similarity(cat, car)    = 0.9*0.1  + 0.1*0.95 = 0.185   ← far
            `}</Code>
            <p>
              Multiply matching positions and add them up. This is called the <b>dot product</b>. Because our model
              &quot;normalizes&quot; its vectors, the dot product equals <b>cosine similarity</b>, the standard way to compare
              embeddings.
            </p>
            <Code file="lib/rag.ts">{`
function similarity(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;   // between -1 and 1. Higher = more similar.
}
            `}</Code>
            <Try>under an answer, open &quot;sources used&quot;. The number next to each green bar (like 0.851) is this similarity score.</Try>
            <Mistake>
              treating the score as a percentage. With this model even unrelated text scores around 0.75. Compare scores
              with each other (which is highest?), not against a fixed number.
            </Mistake>
          </Section>

          {/* 4. Vector store */}
          <Section id="vector-store" n={4} title="Vector store" oneLine="A place to save every chunk together with its numbers, so we do not recompute them for every question." links={{ js: ['objects', 'fs', 'async'], after: [[1, 'we store chunks'], [2, 'and their embeddings']], next: [[5, 'search reads the saved chunks'], [10, 'the docs API adds and deletes from the store']] }}>
            <p>
              Real projects use a database such as <b>Postgres with pgvector</b>, Pinecone or Chroma. To keep things simple,
              this app saves everything in one JSON file: <code className="font-mono text-brand">data/store.json</code>.
            </p>
            <Code file="What one saved chunk looks like">{`
{
  "id": "a1b2...",
  "docName": "pathao/user-help-center.md",
  "text": "### Pay Later – Frequently Asked Questions 6. What happens if I pay late?...",
  "embedding": [0.012, -0.044, 0.31, ... 384 numbers]
}
            `}</Code>
            <Code file="Adding a document (simplified)">{`
import fs from 'fs';

const store = { docs: [], chunks: [] };

async function addDoc(name, text) {
  const pieces = chunkText(text);                  // step 1
  const vectors = await embed(pieces, 'passage');  // step 2

  pieces.forEach((piece, i) => {
    store.chunks.push({ docName: name, text: piece, embedding: vectors[i] });
  });
  fs.writeFileSync('data/store.json', JSON.stringify(store));
}
            `}</Code>
            <Try>add a document, then open data/store.json in your editor to see the chunks and their numbers.</Try>
            <Mistake>re-embedding every document on every question. Embed once when adding, save, and reuse.</Mistake>
          </Section>

          {/* 5. Retrieval */}
          <Section id="retrieval" n={5} title="Retrieval (search)" oneLine="Turn the question into numbers, compare it with every chunk, and keep the closest few." links={{ js: ['arrays', 'async'], after: [[2, 'the question becomes numbers'], [3, 'to score each chunk'], [4, 'the chunks to search through']], next: [[6, 'the best chunks go into the prompt']] }}>
            <ol className="list-decimal space-y-1 pl-6">
              <li>Embed the question (with the &quot;query&quot; prefix).</li>
              <li>Calculate similarity between the question and every saved chunk.</li>
              <li>Sort from highest to lowest.</li>
              <li>Keep the top K (&quot;Sources per question&quot; in the Test panel, default 5).</li>
            </ol>
            <Code file="lib/rag.ts (simplified)">{`
async function search(question, topK = 4) {
  const [q] = await embed([question], 'query');

  return store.chunks
    .map((chunk) => ({ text: chunk.text, score: similarity(q, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)   // highest first
    .slice(0, topK);                     // keep the best few
}

await search('What is the Pay Later late fee?');
// → [{ text: '... a flat one-time fee of 10% on your due ... capped at a maximum of ৳250 ...', score: 0.84 }, ...]
            `}</Code>
            <p>
              This is just <code className="font-mono text-brand">map</code>, <code className="font-mono text-brand">sort</code>{' '}
              and <code className="font-mono text-brand">slice</code>: array methods you already know.
            </p>
            <Try>in the Test panel set Sources per question to 1 and ask &quot;What is the Pay Later late fee, and how do I top up my phone?&quot;. Only one chunk is found, so half the answer is missing. Set it back to 5 and ask again.</Try>
            <Mistake>blaming the AI for a wrong answer. Open the retrieved chunks first: if the right chunk is not there, the AI never saw it. Most RAG bugs are search bugs.</Mistake>
          </Section>

          {/* 6. Prompt */}
          <Section id="prompt" n={6} title="The prompt" oneLine="Put the found chunks into the instructions and tell the AI to answer only from them." links={{ js: ['template', 'arrays'], after: [[5, 'the found chunks are the sources']], next: [[7, 'the prompt is what we send to the LLM']] }}>
            <p>
              The AI receives a <b>system message</b> (rules it must follow) and the user&apos;s question. We put the chunks
              inside the system message, numbered, so the AI can cite them.
            </p>
            <Code file="app/api/chat/route.ts (simplified)">{`
const sources = hits
  .map((hit, i) => '[' + (i + 1) + '] ' + hit.text)
  .join('\\n\\n');

const system = \`You are the customer support assistant for the business in the SOURCES.

Decide which kind of message this is, then reply:
1. Greeting or small talk: reply warmly, offer help. No citations.
2. Question the SOURCES answer: answer ONLY from the SOURCES, cite like [1].
3. Question about the business the SOURCES do not answer:
   don't guess; say you don't know and give the support contact from the SOURCES.
4. Not about the business (general knowledge, coding...): do NOT answer;
   politely say you only help with this business.

Never invent prices, policies or phone numbers.
Always reply in Bangla, even if the customer writes in English.

SOURCES:
\${sources}\`;
            `}</Code>
            <p>Each rule has a job:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li><b>Four kinds of message</b>: a real customer says &quot;hi&quot;, asks real questions, asks things the help center does not cover, and asks random things. Each needs a different reply, so the prompt names all four.</li>
              <li><b>&quot;ONLY from the SOURCES&quot;</b> for business questions stops the AI from inventing prices or policies.</li>
              <li><b>&quot;Cite [1]&quot;</b> lets the user check where the answer came from. The app turns these into small green numbers you can click.</li>
              <li><b>&quot;Do NOT answer&quot; off-topic questions</b> keeps the bot a support agent, not a free general chatbot anyone can use for homework or code.</li>
              <li><b>&quot;Say you don&apos;t know and give the contact&quot;</b> stops the AI from inventing an answer, and still helps the customer. This is the most important rule.</li>
              <li><b>&quot;Always reply in Bangla&quot;</b>: the help center is written in English, but every customer gets a Bangla answer. The AI translates the facts; phone numbers and coupon codes stay exactly as written.</li>
              <li><b>The contact section is always attached</b> to the sources (one extra search in <code className="font-mono text-brand">retrieve()</code>), so case 3 always has a phone number to give.</li>
            </ul>
            <Try>ask &quot;What is the Pay Later late fee?&quot;, then something that is not in the help center at all, like &quot;I left my phone in a ride, what do I do?&quot;. It should say it does not know and give the helpline.</Try>
          </Section>

          {/* 7. LLM */}
          <Section id="llm" n={7} title="Calling the LLM" oneLine="Send the prompt to an AI model over the internet and get the answer back." links={{ js: ['async', 'modules', 'env'], after: [[6, 'we need a prompt to send'], [11, 'the call needs your API key']], next: [[8, 'stream the reply word by word'], [9, 'send the whole conversation']] }}>
            <p>
              We use <b>OpenRouter</b>: one website that gives access to hundreds of models, including free ones. It uses the
              same format as OpenAI, so we can use the official <code className="font-mono text-brand">openai</code> package
              and just change the address.
            </p>
            <Code file="Simplest possible call">{`
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',    // OpenRouter instead of OpenAI
  apiKey: process.env.OPENROUTER_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'qwen/qwen3.8-27b:free',
  messages: [
    { role: 'system', content: system },       // rules + sources
    { role: 'user', content: 'What is the Pay Later late fee?' },
  ],
});

console.log(response.choices[0].message.content);
// → "দেরিতে পেমেন্ট করলে বকেয়ার ১০% ফি লাগে, সর্বোচ্চ ৳২৫০ [1]।"
            `}</Code>
            <Label>Free models and the fallback list</Label>
            <p>
              Free models are shared by many people and sometimes say &quot;busy&quot; (error <b>429</b>). OpenRouter lets you
              send a list of models; if the first is busy it tries the next. The list lives in{' '}
              <code className="font-mono text-brand">CHAT_MODELS</code> in <code className="font-mono text-brand">.env.local</code>.
            </p>
            <Try>the model name under each answer shows which model actually replied.</Try>
          </Section>

          {/* 8. Streaming */}
          <Section id="streaming" n={8} title="Streaming" oneLine="Show the answer word by word as it is written, instead of waiting for the whole thing." links={{ js: ['fetch', 'objects', 'loops'], after: [[7, 'we stream the LLM reply'], [10, 'the stream comes from an API route']], next: [[12, 'Stop cancels a running stream']] }}>
            <p>
              Without streaming the user stares at nothing for 5 to 10 seconds. With streaming, words appear right away, like
              ChatGPT. The server sends small messages, one per line. Each line is a JSON object (this format is called{' '}
              <b>NDJSON</b>):
            </p>
            <Code file="What the server sends, line by line">{`
{"type":"sources","sources":[...the 5 chunks...]}
{"type":"model","model":"qwen/qwen3.8-27b:free"}
{"type":"text","delta":"দেরিতে পেমেন্ট করলে"}
{"type":"text","delta":" বকেয়ার ১০% ফি,"}
{"type":"text","delta":" সর্বোচ্চ ৳২৫০ [1]।"}
            `}</Code>
            <Code file="Server: send each piece as soon as it arrives">{`
const stream = new ReadableStream({
  async start(controller) {
    const send = (obj) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\\n'));

    send({ type: 'sources', sources: hits });
    const completion = await client.chat.completions.create({ ...options, stream: true });
    for await (const part of completion) {
      const text = part.choices[0]?.delta?.content;
      if (text) send({ type: 'text', delta: text });
    }
    controller.close();
  },
});
return new Response(stream);
            `}</Code>
            <Code file="Browser: read the lines as they arrive">{`
const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages }) });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value);
  const lines = buffer.split('\\n');
  buffer = lines.pop();                 // last line may be incomplete, keep it for later
  for (const line of lines) {
    const event = JSON.parse(line);
    if (event.type === 'text') answer += event.delta;   // show it on screen
  }
}
            `}</Code>
            <Mistake>calling <code className="font-mono">JSON.parse</code> on a half-received line. Network chunks can cut a line in the middle, which is why we keep the last piece in <code className="font-mono">buffer</code>.</Mistake>
          </Section>

          {/* 9. Memory */}
          <Section id="memory" n={9} title="Chat memory" oneLine="The AI remembers nothing. The app resends the whole conversation every time." links={{ js: ['react', 'arrays'], after: [[7, 'the LLM is the part that forgets'], [8, 'each streamed reply is added to the history']], next: [[12, 'Retry resends from the history']] }}>
            <p>
              This surprises most beginners. Every call to the LLM starts from zero. So how does it understand a follow-up
              like &quot;and how many days will it take?&quot;? We keep all messages in an array and send <b>all of them</b>{' '}
              each time:
            </p>
            <Code>{`
// Second question: we send the full history
messages = [
  { role: 'user',      content: 'I live in Sylhet. How much is delivery?' },
  { role: 'assistant', content: 'ঢাকার বাইরে ডেলিভারি চার্জ ১২০ টাকা [1]।' },
  { role: 'user',      content: 'and how many days will it take?' },   // new
];
            `}</Code>
            <p>
              The AI reads the whole conversation and understands &quot;it&quot; means delivery to Sylhet. In React this is
              simply a <code className="font-mono text-brand">useState</code> array.
            </p>
            <Mistake>
              searching with only the <b>last</b> message. &quot;and how much extra for that?&quot; alone does not mention
              delivery, so search would miss. But searching with only the last two questions joined is wrong too: after a
              Pay Later question, a new question about top-up still finds Pay Later chunks. This app does both: the
              <b> last question alone</b> picks most chunks, and the <b>last two joined</b> add 2 more. A stronger fix is to
              ask the AI to rewrite the follow-up into a full question before searching.
            </Mistake>
          </Section>

          {/* 10. API routes */}
          <Section id="api-routes" n={10} title="API routes" oneLine="Next.js lets the frontend and the backend live in the same project." links={{ js: ['http', 'fetch', 'async'], after: [], next: [[4, 'add and delete documents'], [7, 'the LLM is called inside a route, where the key is safe'], [8, 'the chat route streams back']] }}>
            <p>
              A file named <code className="font-mono text-brand">route.ts</code> inside <code className="font-mono text-brand">app/api/</code>{' '}
              becomes a backend URL. It runs on the server, never in the browser. The folder path is the URL:
            </p>
            <Code>{`
app/api/docs/route.ts        → GET /api/docs          list documents
                             → POST /api/docs         add a document
app/api/docs/[id]/route.ts   → DELETE /api/docs/123   remove a document
app/api/chat/route.ts        → POST /api/chat         ask a question
            `}</Code>
            <Code file="app/api/docs/route.ts (simplified)">{`
export async function GET() {
  return Response.json(await listDocs());
}

export async function POST(req) {
  const { name, text } = await req.json();
  if (!name || !text) {
    return Response.json({ error: 'name and text are required' }, { status: 400 });
  }
  return Response.json(await addDoc(name, text), { status: 201 });
}
            `}</Code>
            <Code file="Calling it from the page">{`
await fetch('/api/docs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'faq.md', text: 'We deliver every day from 8 AM to 10 PM.' }),
});
            `}</Code>
            <p>If you know Express, this is the same idea as <code className="font-mono text-brand">app.get()</code> and <code className="font-mono text-brand">app.post()</code>, just organised by folders.</p>
          </Section>

          {/* 11. Secrets */}
          <Section id="secrets" n={11} title="Secrets (the API key)" oneLine="Your API key is a password. It must stay on the server and never reach the browser or GitHub." links={{ js: ['env'], after: [], next: [[7, 'the LLM client reads the key']] }}>
            <Code file=".env.local">{`
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
CHAT_MODELS=qwen/qwen3.8-27b:free,nvidia/nemotron-3-super-120b-a12b:free
            `}</Code>
            <ul className="list-disc space-y-1 pl-6">
              <li>Read it on the server with <code className="font-mono text-brand">process.env.OPENROUTER_API_KEY</code>.</li>
              <li><code className="font-mono text-brand">.env.local</code> is in <code className="font-mono text-brand">.gitignore</code>, so git never uploads it.</li>
              <li>After changing it, restart <code className="font-mono text-brand">pnpm dev</code>.</li>
            </ul>
            <Mistake>
              naming it <code className="font-mono">NEXT_PUBLIC_OPENROUTER_API_KEY</code>. Anything starting with{' '}
              <code className="font-mono">NEXT_PUBLIC_</code> is sent to the browser, where anyone can see it and use your
              account.
            </Mistake>
          </Section>

          {/* 12. Errors */}
          <Section id="errors" n={12} title="Stop, retry and errors" oneLine="Real apps fail. Let users cancel, retry, and understand what went wrong." links={{ js: ['trycatch', 'fetch', 'http'], after: [[8, 'Stop cancels the stream'], [9, 'Retry reuses the history']], next: [] }}>
            <Label>Stop button</Label>
            <p>
              <code className="font-mono text-brand">AbortController</code> is built into JavaScript. Pass its signal to{' '}
              <code className="font-mono text-brand">fetch</code>; calling <code className="font-mono text-brand">abort()</code>{' '}
              cancels the request.
            </p>
            <Code>{`
const controller = new AbortController();
fetch('/api/chat', { method: 'POST', body, signal: controller.signal });

// when the user clicks Stop:
controller.abort();   // fetch throws an error named 'AbortError'
            `}</Code>
            <Label>Friendly errors</Label>
            <Code>{`
try {
  await askQuestion();
} catch (e) {
  if (e.name === 'AbortError') showMessage('থামানো হয়েছে।');
  else showMessage('সার্ভারে পৌঁছানো যাচ্ছে না। pnpm dev চালু আছে কি?');
}

// A 429 from OpenRouter becomes:
// "সহকারী এখন ব্যস্ত। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।"
            `}</Code>
            <p>
              Retry simply removes the failed question and answer from the list and sends the question again. A good error
              message says what happened and what to do next.
            </p>
          </Section>

          {/* Build it yourself */}
          <section id="build" className="scroll-mt-28 border-t border-line pt-14 pb-4">
            <h2 className="font-display text-2xl font-bold md:text-3xl">নিজে বানান</h2>
            <p className="mt-2 text-lg text-muted">এই ক্রমে বানান। পরের ধাপে যাওয়ার আগে console.log দিয়ে প্রতিটি ধাপ পরীক্ষা করুন।</p>
            <ol className="mt-6 space-y-4">
              {[
                ['Create the project', 'pnpm create next-app@latest my-rag  →  pnpm add openai @huggingface/transformers'],
                ['Call the LLM', 'Get a free key at openrouter.ai, put it in .env.local, make one call from an API route (step 7). No RAG yet.'],
                ['Paste a document into the prompt', 'Hard-code a short FAQ into the system message (step 6). This already works for small documents.'],
                ['Chunk and embed', 'Write chunkText and embed (steps 1-2). console.log the chunks and vector.length.'],
                ['Save and search', 'Save chunks to a JSON file, write search() and print the top 3 for a test question (steps 4-5).'],
                ['Connect search to the prompt', 'Put the search results into the system message instead of the hard-coded FAQ.'],
                ['Build the chat screen', 'A messages array in useState, send the full history every time (step 9).'],
                ['Add streaming, stop and errors', 'Steps 8 and 12. This is polish; the app works without it.'],
              ].map(([title, detail], i) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-deep font-mono text-xs text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Next */}
          <section id="next" className="scroll-mt-28 border-t border-line pt-14 pb-10">
            <h2 className="font-display text-2xl font-bold md:text-3xl">এরপর কী শিখবেন</h2>
            <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-[180px_1fr]">
              {[
                ['Evals', 'A list of test questions with known answers, checked automatically. Tells you if a change made the bot better or worse.'],
                ['Query rewriting', 'Turn "and how many days?" into "How many days does delivery to Sylhet take?" before searching.'],
                ['Hybrid search', 'Combine meaning search with normal keyword search, so exact words like "Section 76" are never missed.'],
                ['PDF upload', 'Extract text from PDFs before chunking. Real documents are usually PDFs.'],
                ['pgvector', 'Store vectors in Postgres instead of a JSON file once you have thousands of chunks.'],
                ['Tool calling', 'Let the AI call your own functions, for example a delivery-cost calculator.'],
              ].map(([term, def]) => (
                <div key={term} className="contents">
                  <dt className="font-semibold text-brand">{term}</dt>
                  <dd className="text-muted">{def}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Link
            href="/"
            className="mb-20 flex items-center justify-between gap-4 rounded-3xl bg-brand-deep p-6 text-white transition-transform hover:-translate-y-0.5"
          >
            <span>
              <span className="block text-xl font-bold">এবার চ্যাটে গিয়ে নিজে পরীক্ষা করুন</span>
              <span className="mt-1 block text-white/75">প্রশ্ন করুন, তারপর উত্তরের নিচে সূত্রগুলো খুলে দেখুন কোন টুকরো খুঁজে পাওয়া গেছে।</span>
            </span>
            <span className="shrink-0 rounded-full bg-accent px-4 py-2 font-semibold text-brand-deep">চ্যাট খুলুন →</span>
          </Link>
        </main>
      </div>
    </div>
  );
}

function Flow({ title, note, steps }: { title: string; note: string; steps: string[] }) {
  return (
    <figure className="rounded-2xl border border-line bg-surface p-4">
      <figcaption className="mb-3">
        <span className="block font-semibold">{title}</span>
        <span className="text-xs text-muted">{note}</span>
      </figcaption>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2.5 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </figure>
  );
}
