import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared with /learn so both pages feel like one site. The striped awning is the market-stall signature.
export function SiteHeader({ active, children }: { active: 'chat' | 'learn'; children?: ReactNode }) {
  const tab = (on: boolean) =>
    `flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
      on ? 'bg-white text-brand' : 'text-white/85 hover:bg-white/10 hover:text-white'
    }`;
  return (
    <header className="sticky top-0 z-20 shrink-0">
      <div className="bg-brand-deep text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo light />
            <span className="leading-tight">
              <span className="block font-bold">পাঠাও সহায়তা</span>
              <span className="block text-xs text-white/70">আনঅফিসিয়াল ডেমো</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1" aria-label="Main">
            <Link href="/" className={tab(active === 'chat')} aria-current={active === 'chat' ? 'page' : undefined}>
              <Icon name="chat" />
              <span className="hidden sm:inline">চ্যাট</span>
            </Link>
            <Link href="/learn" className={tab(active === 'learn')} aria-current={active === 'learn' ? 'page' : undefined}>
              <Icon name="book" />
              শিখুন
            </Link>
            {children}
          </nav>
        </div>
      </div>
      <div className="awning" aria-hidden />
    </header>
  );
}

export function Logo({ small, light }: { small?: boolean; light?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${light ? 'bg-accent text-brand-deep' : 'bg-brand text-white'} ${small ? 'h-9 w-9 text-sm' : 'h-10 w-10'}`}
      aria-hidden
    >
      তা
    </span>
  );
}

// ponytail: a handful of hand-drawn 24px stroke icons; reach for an icon package if this list keeps growing.
const ICONS: Record<string, string> = {
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  return: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1',
  chat: 'M4 5h16v11H9l-5 4z',
  book: 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z',
  send: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
};

export function Icon({ name }: { name: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

