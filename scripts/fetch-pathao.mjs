// One-off: dump help.pathao.com (WordPress REST API) into markdown, one file per help center.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2];
const API = 'https://help.pathao.com/wp-json/wp/v2';
const get = (p) => fetch(`${API}/${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => r.json());

const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&[a-z]+;/g, '');
const text = (html) =>
  decode(
    html
      .replace(/<li[^>]*>/g, '\n• ')
      .replace(/<\/(p|h\d|tr|div|ul|ol)>|<br\s*\/?>/g, '\n')
      .replace(/<\/t[dh]>/g, ' | ')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n').map((l) => l.trim()).filter(Boolean)
    // Long FAQ posts number their questions ("6. What happens if I pay late?"): make them headings so each Q&A is its own chunk.
    .map((l) => l.replace(/^\d+\.\s*(.{5,150}\?)$/, '\n#### $1\n'))
    .join('\n');

const cats = await get('categories?per_page=100&_fields=id,name,parent');
const posts = [];
for (let page = 1; ; page++) {
  const batch = await get(`posts?per_page=100&page=${page}&_fields=title,content,categories,link`);
  if (!Array.isArray(batch) || !batch.length) break;
  posts.push(...batch);
}

// English help centers only (Bangla ones are translations of the same articles).
const FILES = { 2: 'user-help-center', 174: 'merchant-help-center', 29: 'rider-help-center', 317: 'instapay-plus-merchants' };
const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
const root = (id) => (byId[id]?.parent ? root(byId[id].parent) : id);

const groups = {};
for (const p of posts) {
  const top = p.categories.map(root).find((id) => FILES[id]);
  if (!top) continue;
  const sub = p.categories.find((id) => byId[id]?.parent) ?? top;
  const body = text(p.content.rendered);
  if (!body) continue;
  ((groups[top] ??= {})[decode(byId[sub].name)] ??= []).push(`### ${decode(p.title.rendered).replace(/^\d+\.\s*/, '')}\n\n${body}\n\nSource: ${p.link}`);
}

mkdirSync(OUT, { recursive: true });
for (const [id, subs] of Object.entries(groups)) {
  const title = decode(byId[id].name);
  let md = `# Pathao — ${title}\n\nCopied from ${'https://help.pathao.com'} for a personal learning project. Unofficial; content belongs to Pathao.\n`;
  // Gathered from several articles into one place, so the chat route's fixed contact search always finds it.
  if (FILES[id] === 'user-help-center')
    md += `\n## Contact Pathao customer support\n\nCustomer support helpline (hotline phone): 09678100800, open 24/7.\nCustomer support email: cx@pathao.com\nMerchant (courier) support phone: 09610003030 (9 am to 11 pm, press 9). Merchant support email: ecomsupport@pathao.com\n`;
  for (const [sub, items] of Object.entries(subs)) md += `\n## ${sub}\n\n${items.join('\n\n')}\n`;
  writeFileSync(`${OUT}/${FILES[id]}.md`, md);
  console.log(FILES[id], Object.values(subs).flat().length, 'articles', md.length, 'chars');
}
console.log('total posts', posts.length);
