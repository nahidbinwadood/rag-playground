'use client';

import Link from 'next/link';
import { Icon, Logo, SiteHeader } from './ui';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Doc = { id: string; name: string; chunks: number };
type Hit = { docName: string; text: string; score: number };
type Msg = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Hit[];
  model?: string;
  error?: string;
  rag?: boolean;
  at: number;
};

// Starter questions, grouped the way a customer thinks about a grocery order.
const TOPICS = [
  { icon: 'truck', title: 'পার্সেল ডেলিভারি', q: 'পার্সেল পাঠাতে কী কী লাগে?' },
  { icon: 'bolt', title: 'রাইড', q: 'রাইডে কিছু ফেলে গেলে কী করব?' },
  { icon: 'card', title: 'পে লেটার', q: 'পে লেটারে দেরিতে পেমেন্ট করলে কত ফি?' },
  { icon: 'return', title: 'ফুড অর্ডার', q: 'খাবার অর্ডারে সমস্যা হলে রিফান্ড পাব?' },
  { icon: 'tag', title: 'মার্চেন্ট', q: 'নতুন মার্চেন্ট হিসেবে কীভাবে যোগ দেব?' },
  { icon: 'globe', title: 'ইংরেজিতে জিজ্ঞেস করুন', q: 'How do I top up my Pathao account?' },
] as const;

// ponytail: copied from data/pathao/*.md (user + merchant support); move to config if it changes often.
const CONTACT = [
  ['হেল্পলাইন', '09678100800', 'tel:09678100800'],
  ['ইমেইল', 'cx@pathao.com', 'mailto:cx@pathao.com'],
  ['মার্চেন্ট', 'ecomsupport@pathao.com', 'mailto:ecomsupport@pathao.com'],
] as const;

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const bn = (n: number) => n.toLocaleString('bn-BD');
const time = (at: number) => new Date(at).toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' });
// Models cite as [1]; some use the full-width 【1】. Accept both.
const CITE = /(\[\d+\]|【\d+】)/g;
const citeNum = (part: string) => part.match(/^[[【](\d+)[\]】]$/)?.[1];

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [topK, setTopK] = useState(5);
  const [panelOpen, setPanelOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadDocs = () =>
    fetch('/api/docs')
      .then((r) => r.json())
      .then(setDocs);
  useEffect(() => {
    loadDocs();
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(raw = input, base = messages) {
    const question = raw.trim();
    if (!question || busy) return;
    const history: Msg[] = [...base, { role: 'user', content: question, at: Date.now() }];
    setMessages([...history, { role: 'assistant', content: '', rag: useRag, at: Date.now() }]);
    setInput('');
    setBusy(true);
    const patch = (fn: (m: Msg) => Msg) => setMessages((all) => [...all.slice(0, -1), fn(all.at(-1)!)]);

    abort.current = new AbortController();
    try {
      // Only role + content go to the API; everything else is UI-only.
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          useRag,
          topK,
        }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const error = await res.json().then(
          (j) => j.error,
          () => `HTTP ${res.status}`,
        );
        return patch((m) => ({ ...m, error }));
      }

      // Read the NDJSON stream line by line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;
        for (const line of lines.filter(Boolean)) {
          const ev = JSON.parse(line);
          if (ev.type === 'sources') patch((m) => ({ ...m, sources: ev.sources }));
          if (ev.type === 'model') patch((m) => ({ ...m, model: ev.model }));
          if (ev.type === 'text') patch((m) => ({ ...m, content: m.content + ev.delta }));
          if (ev.type === 'error') patch((m) => ({ ...m, error: ev.message }));
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') patch((m) => ({ ...m, content: m.content || 'থামানো হয়েছে।' }));
      else
        patch((m) => ({
          ...m,
          error: 'সার্ভারে পৌঁছানো যাচ্ছে না। pnpm dev চালু আছে কি?',
        }));
    } finally {
      setBusy(false);
      abort.current = null;
      inputRef.current?.focus();
    }
  }

  // Retry: drop the failed answer and its question, then ask again.
  function retry() {
    const question = messages.at(-2)?.content;
    if (question) send(question, messages.slice(0, -2));
  }

  const chunkCount = docs?.reduce((n, d) => n + d.chunks, 0);

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader active="chat">
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          title="Knowledge base and search settings"
        >
          <Icon name="gear" />
          <span className="hidden sm:inline">Test panel</span>
          <span className="rounded-full bg-white/15 px-1.5 font-mono text-xs">{chunkCount ?? '…'}</span>
        </button>
      </SiteHeader>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-6 md:px-6 md:pt-6 md:pb-6 lg:grid-cols-[280px_1fr]">
        {/* Side rail: shortcuts, contact and the way into /learn. Desktop only; the chat welcome covers mobile. */}
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="mb-1.5 text-sm font-semibold">দ্রুত প্রশ্ন</p>
            <ul className="-mx-1">
              {TOPICS.map((t) => (
                <li key={t.q}>
                  <button
                    onClick={() => send(t.q)}
                    disabled={busy}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-brand-soft disabled:opacity-50"
                  >
                    <span className="text-brand">
                      <Icon name={t.icon} />
                    </span>
                    <span className="min-w-0 truncate text-sm">{t.q}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="mb-2 font-semibold">মানুষের সাথে কথা বলতে চান?</p>
            <dl className="space-y-1.5">
              {CONTACT.map(([label, value, href]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="truncate">
                    <a href={href} className="hover:text-brand hover:underline">
                      {value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted">প্রতিদিন সকাল ৮টা – রাত ১১টা</p>
          </div>

          <LearnCard />
        </aside>

        {/* Chat window */}
        <section className="pop flex min-h-0 flex-col overflow-hidden bg-surface md:rounded-3xl md:border md:border-line md:shadow-[0_12px_40px_-16px_rgb(28_35_33/0.18)]">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <div className="relative">
              <Logo small />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-brand" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold">পাঠাও সহায়তা সহকারী</p>
              <p className="text-xs text-muted">{busy ? 'লিখছে…' : 'অনলাইন · কয়েক সেকেন্ডে উত্তর দেয়'}</p>
            </div>
            {!!messages.length && (
              <button
                onClick={() => setMessages([])}
                disabled={busy}
                className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
              >
                <Icon name="plus" />
                নতুন চ্যাট
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-bg/40">
            <div className="space-y-4 px-4 py-6 md:px-6">
              {!messages.length ? (
                <Welcome onAsk={(q) => send(q)} />
              ) : (
                messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="pop flex flex-col items-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 whitespace-pre-wrap text-white">
                        {m.content}
                      </p>
                      <span className="mt-1 text-[11px] text-muted">{time(m.at)}</span>
                    </div>
                  ) : (
                    <Answer key={i} msg={m} streaming={busy && i === messages.length - 1} onRetry={retry} />
                  ),
                )
              )}
              <div ref={bottom} />
            </div>
          </div>

          <form
            className="border-t border-line p-3 md:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) abort.current?.abort();
              else send();
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg/60 p-1.5 pl-4 transition-colors focus-within:border-brand focus-within:bg-surface">
              <textarea
                ref={inputRef}
                aria-label="আপনার প্রশ্ন"
                autoFocus
                rows={1}
                className="max-h-32 flex-1 resize-none bg-transparent py-2 placeholder:text-muted focus:outline-none focus-visible:outline-none"
                placeholder="আপনার প্রশ্ন লিখুন… (বাংলা বা English)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter adds a new line.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                aria-label={busy ? 'থামান' : 'পাঠান'}
                disabled={!busy && !input.trim()}
                className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-30 ${
                  busy ? 'bg-ink text-white' : 'bg-brand text-white hover:brightness-110'
                }`}
              >
                {busy ? <span className="h-3 w-3 rounded-sm bg-white" /> : <Icon name="send" />}
                <span className="hidden sm:inline">{busy ? 'থামান' : 'পাঠান'}</span>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">
              উত্তর আসে help.pathao.com থেকে নেওয়া তথ্য থেকে · এটি পাঠাওয়ের অফিসিয়াল সেবা নয়, শেখার জন্য তৈরি ডেমো
            </p>
          </form>
        </section>
      </main>

      {panelOpen && (
        <TestPanel
          docs={docs}
          reload={loadDocs}
          useRag={useRag}
          setUseRag={setUseRag}
          topK={topK}
          setTopK={setTopK}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

function Welcome({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div className="mx-auto max-w-xl py-4 text-center md:py-8">
      <div className="pop mx-auto w-fit">
        <Logo />
      </div>
      <h1 className="pop mt-4 text-2xl font-bold md:text-3xl" style={delay(60)}>
        আসসালামু আলাইকুম! 👋
      </h1>
      <p className="pop mx-auto mt-2 max-w-md text-muted" style={delay(120)}>
        আমি পাঠাও সহায়তা সহকারী। রাইড, ফুড, পার্সেল, পে লেটার, টপ-আপ বা মার্চেন্ট নিয়ে যা জানতে চান জিজ্ঞেস করুন। ইংরেজিতে লিখলেও
        আমি বাংলায় উত্তর দেব।
      </p>
      <p className="pop mt-6 mb-3 text-sm font-semibold text-muted" style={delay(180)}>
        শুরু করতে একটি প্রশ্ন বেছে নিন
      </p>
      <div className="grid gap-2 text-left sm:grid-cols-2">
        {TOPICS.map((t, i) => (
          <button
            key={t.q}
            onClick={() => onAsk(t.q)}
            style={delay(220 + i * 50)}
            className="pop group flex items-center gap-3 rounded-2xl border text-left border-line bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
              <Icon name={t.icon} />
            </span>
            <span className="min-w-0 leading-snug">
              <span className="block text-xs text-muted">{t.title}</span>
              <span className="block text-sm font-medium">{t.q}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 text-left lg:hidden">
        <LearnCard />
      </div>
    </div>
  );
}

function LearnCard() {
  return (
    <Link
      href="/learn"
      className="group block rounded-2xl bg-brand-deep p-4 text-white transition-transform hover:-translate-y-0.5"
    >
      <p className="font-semibold">এই চ্যাটবট কীভাবে কাজ করে?</p>
      <p className="mt-1 text-sm text-white/75">একদম শুরু থেকে, ছবি আর উদাহরণ দিয়ে ধাপে ধাপে শিখুন।</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-white/85" aria-hidden>
        {['প্রশ্ন', 'খোঁজা', 'উত্তর'].map((s, i) => (
          <Fragment key={s}>
            {i > 0 && <span className="text-accent">→</span>}
            <span className="rounded-full bg-white/10 px-2 py-0.5">{s}</span>
          </Fragment>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-accent">
        শেখা শুরু করুন <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
      </p>
    </Link>
  );
}

function BotBubble({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="pop flex items-end gap-2.5">
      <Logo small />
      <div
        className={`${wide ? 'max-w-[88%]' : 'max-w-[80%]'} rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 leading-relaxed`}
      >
        {children}
      </div>
    </div>
  );
}

// ponytail: bar width maps similarity 0.70–0.95 onto the bar; e5 scores rarely leave that band.
const barWidth = (score: number) => `${Math.max(6, Math.min(100, ((score - 0.7) / 0.25) * 100))}%`;

// Turn provider errors into something a person can act on. The raw error stays in the title for developers.
function friendlyError(error: string) {
  if (/per-day|per day|quota/i.test(error))
    return 'আজকের ফ্রি AI সীমা শেষ। বাংলাদেশ সময় সকাল ৬টায় আবার চালু হবে, তখন চেষ্টা করুন।';
  if (/429|timed out|timeout/i.test(error))
    return 'সহকারী এখন ব্যস্ত। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।';
  return error;
}

function Answer({ msg, streaming, onRetry }: { msg: Msg; streaming: boolean; onRetry: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const sourceList = useRef<HTMLOListElement>(null);
  const sources = msg.sources ?? [];
  // Move punctuation in front of a citation ("qualifies [4]." → "qualifies. [4]") so a lone "." never wraps to a new line.
  const text = msg.content.replace(/\s*(\[\d+\]|【\d+】)([.,;:!?।])/g, '$2 $1');
  const paragraphs = text.split(/\n{2,}/);
  const cited = new Set(
    text
      .split(CITE)
      .map(citeNum)
      .filter(Boolean)
      .map((n) => Number(n) - 1),
  );

  useEffect(() => {
    if (showSources)
      sourceList.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
  }, [showSources]);

  // Still waiting for the first words: show a typing bubble with what is happening.
  if (streaming && !msg.content && !msg.error) {
    return (
      <div className="pop flex items-end gap-2.5">
        <Logo small />
        <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
          <span className="typing flex items-center gap-1">
            <span />
            <span />
            <span />
          </span>
          <span className="text-sm text-muted">
            {msg.rag ? (msg.sources ? 'হেল্প সেন্টার পড়ছি…' : 'হেল্প সেন্টারে খুঁজছি…') : 'ভাবছি…'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BotBubble wide>
        <div className={streaming ? 'caret' : ''}>
          {paragraphs.map((para, p) => (
            <p key={p} className="whitespace-pre-wrap [&:not(:first-child)]:mt-2.5">
              {para.split(CITE).map((part, i) => {
                const n = citeNum(part);
                if (!n || !sources[Number(n) - 1]) return <Fragment key={i}>{part}</Fragment>;
                const idx = Number(n) - 1;
                return (
                  <button
                    key={i}
                    onMouseEnter={() => setActive(idx)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => {
                      setShowSources(true);
                      setActive(idx);
                    }}
                    aria-label={`সূত্র ${n}`}
                    className={`mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 align-[1px] text-[11px] font-semibold transition-all ${
                      active === idx ? 'scale-110 bg-brand text-white' : 'bg-brand-soft text-brand'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </p>
          ))}
        </div>

        {msg.error && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-danger">{friendlyError(msg.error)}</span>
            <button
              onClick={onRetry}
              className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand hover:text-brand"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        )}

        {!!sources.length && !streaming && (
          <div className="mt-3 border-t border-line pt-2">
            <button
              onClick={() => setShowSources((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-brand"
            >
              <span className={`inline-block transition-transform ${showSources ? 'rotate-90' : ''}`}>▸</span>
              {cited.size ? `${bn(cited.size)}টি সূত্র ব্যবহার হয়েছে` : 'কোনো সূত্র লাগেনি'} · {bn(sources.length)}টি খোঁজা হয়েছে
            </button>
            {showSources && (
              <ol ref={sourceList} className="pop mt-2 space-y-1.5">
                {sources.map((s, i) => (
                  <li
                    key={i}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${active === i ? 'bg-brand-soft' : ''} ${cited.has(i) ? '' : 'opacity-55'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 font-semibold ${cited.has(i) ? 'text-brand' : 'text-muted'}`}>{i + 1}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="trace-bar h-full rounded-full bg-brand"
                          style={{
                            width: barWidth(s.score),
                            animationDelay: `${i * 70}ms`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-muted">{s.score.toFixed(3)}</span>
                    </div>
                    <p className={`mt-1 pl-6 text-muted ${active === i ? 'text-ink' : 'line-clamp-2'}`}>
                      {s.text.replace(/#+ /g, '')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </BotBubble>

      {!streaming && msg.content && (
        <div className="mt-1 flex items-center gap-3 pl-12 text-[11px] text-muted">
          <span>{time(msg.at)}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(msg.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="hover:text-brand"
          >
            {copied ? 'কপি হয়েছে' : 'কপি'}
          </button>
          {!msg.rag && <span>হেল্প সেন্টার বন্ধ</span>}
          {msg.model && <span className="truncate font-mono">{msg.model}</span>}
        </div>
      )}
    </div>
  );
}

// ---------- Test panel: everything a developer needs, out of the customer's way ----------

function TestPanel({
  docs,
  reload,
  useRag,
  setUseRag,
  topK,
  setTopK,
  onClose,
}: {
  docs: Doc[] | null;
  reload: () => void;
  useRag: boolean;
  setUseRag: (v: boolean) => void;
  topK: number;
  setTopK: (v: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{
    done: number;
    total: number;
    current: string;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function addDoc() {
    setAdding(true);
    setError('');
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, text }),
    });
    setAdding(false);
    if (!res.ok) return setError((await res.json()).error);
    setJustAdded(((await res.json()) as Doc).id);
    setName('');
    setText('');
    reload();
  }

  // One file: fill the form so you can check it first. Several files or a folder: add them all straight away.
  async function takeFiles(list?: FileList | null) {
    const files = [...(list ?? [])].filter((f) => /\.(txt|md)$/i.test(f.name));
    if (!files.length) return setError('Only .txt and .md files can be added.');
    setError('');
    if (files.length === 1) {
      setName(files[0].name);
      setText(await files[0].text());
      return;
    }
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setBulk({ done: i, total: files.length, current: file.name });
      const docName = file.webkitRelativePath || file.name; // keeps folder/file.md when a folder was picked
      // Adding the same file again replaces it instead of duplicating it.
      for (const old of docs?.filter((d) => d.name === docName) ?? []) {
        await fetch(`/api/docs/${old.id}`, { method: 'DELETE' });
      }
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: docName, text: await file.text() }),
      });
      if (!res.ok) failed.push(file.name);
    }
    setBulk(null);
    if (failed.length) setError(`Could not add: ${failed.join(', ')}`);
    reload();
  }

  async function removeDoc(id: string) {
    await fetch(`/api/docs/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close test panel" onClick={onClose} className="fade-in absolute inset-0 bg-ink/30" />
      <aside
        role="dialog"
        aria-label="Test panel"
        className="slide-in absolute top-0 right-0 flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Test panel</h2>
            <p className="text-sm text-muted">What the assistant knows, and how it searches.</p>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-muted hover:bg-bg hover:text-ink">
            Close
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-3 rounded-2xl bg-bg p-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Use help center (RAG)</span>
              <span className="block text-xs text-muted">Off: the AI answers from its own knowledge only.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={useRag}
              onClick={() => setUseRag(!useRag)}
              className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${useRag ? 'bg-brand' : 'bg-line'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${useRag ? 'translate-x-5' : ''}`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Sources per question</span>
              <span className="block text-xs text-muted">How many chunks to search for. 4–6 is a good start.</span>
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-center"
            />
          </label>
        </div>

        {/* Add knowledge */}
        <div>
          <h3 className="mb-2 font-semibold">Add knowledge</h3>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              takeFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col gap-2 rounded-2xl border-2 border-dashed p-3 transition-all ${
              dragging ? 'scale-[1.02] border-brand bg-brand-soft' : 'border-line focus-within:border-brand'
            }`}
          >
            <input
              aria-label="Document name"
              className="bg-transparent text-sm placeholder:text-muted focus:outline-none focus-visible:outline-none"
              placeholder="Document name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              aria-label="Document text"
              className="h-24 resize-none bg-transparent text-sm placeholder:text-muted focus:outline-none focus-visible:outline-none"
              placeholder={dragging ? 'Drop it' : 'Paste text, or drop .md / .txt files here'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center gap-3 border-t border-line pt-2 text-xs">
              <label className="cursor-pointer text-muted hover:text-brand">
                Files
                <input
                  type="file"
                  accept=".txt,.md"
                  multiple
                  className="sr-only"
                  onChange={(e) => takeFiles(e.target.files)}
                />
              </label>
              <label className="cursor-pointer text-muted hover:text-brand">
                Folder
                {/* webkitdirectory is not in React's types yet, hence the spread. */}
                <input
                  type="file"
                  className="sr-only"
                  {...{ webkitdirectory: '' }}
                  onChange={(e) => takeFiles(e.target.files)}
                />
              </label>
              <button
                className="ml-auto rounded-full bg-brand px-3.5 py-1.5 font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-30"
                disabled={adding || !name.trim() || !text.trim()}
                onClick={addDoc}
              >
                {adding ? <span className="animate-pulse">Learning…</span> : 'Add'}
              </button>
            </div>
          </div>
          {bulk && (
            <div className="pop mt-3 space-y-1.5 text-xs" role="status">
              <div className="flex justify-between gap-2 text-muted">
                <span className="truncate">Learning {bulk.current}</span>
                <span>
                  {bulk.done}/{bulk.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-brand transition-[width] duration-300"
                  style={{ width: `${(bulk.done / bulk.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {error && <p className="pop mt-2 text-sm text-danger">{error}</p>}
        </div>

        {/* Documents */}
        <div className="min-h-0 flex-1">
          <h3 className="mb-2 font-semibold">
            Knowledge base{' '}
            <span className="font-normal text-muted">
              · {docs?.length ?? 0} {docs?.length === 1 ? 'document' : 'documents'}
            </span>
          </h3>
          {docs === null ? (
            <div className="h-12 animate-pulse rounded-xl bg-bg" />
          ) : docs.length ? (
            <ul className="space-y-1">
              {docs.map((d, i) => (
                <li
                  key={d.id}
                  style={delay(i * 40)}
                  className={`pop group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-bg ${justAdded === d.id ? 'flash' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted">{d.chunks} chunks</p>
                  </div>
                  <button
                    onClick={() => removeDoc(d.id)}
                    aria-label={`Remove ${d.name}`}
                    className="text-xs text-muted transition-opacity hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-bg p-3 text-sm text-muted">
              Empty. Run <span className="font-mono text-ink">pnpm ingest data/pathao</span> to give the assistant the
              Pathao help center.
            </p>
          )}
        </div>

        <Link href="/learn" className="rounded-xl border border-line p-3 text-sm transition-colors hover:border-brand">
          <span className="font-semibold text-brand">How does this work? →</span>
          <span className="block text-muted">Every step of RAG explained for JavaScript beginners.</span>
        </Link>
      </aside>
    </div>
  );
}
