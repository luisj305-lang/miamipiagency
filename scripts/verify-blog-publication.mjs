import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGE_SIZE = 16;
const SLUG = 'how-to-verify-private-investigator-license-florida';
const FULL_TITLE = 'How to Verify a Private Investigator License in Florida Before You Hire';
const SEO_TITLE = 'Verify a Florida PI License Before Hiring | Miami PI Agency';
const INVALID_LICENSE = 'A290026';
const NOT_POSTS = new Set([
  'blog', 'category', 'faq-items', 'wp-content', 'wp-includes', 'assets',
  'about', 'contact-us', 'disclaimer', 'privacy-policy', 'terms-conditions',
  'service-area', 'page',
]);

function read(path) {
  return readFileSync(path, 'utf8');
}

function cardSlugs(source) {
  return [...source.matchAll(/<a class="mpa-card" href="\/([^"/]+)\/">/g)]
    .map((match) => match[1]);
}

function discoverPosts() {
  const posts = [];
  for (const entry of readdirSync('.', { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || NOT_POSTS.has(entry.name)) continue;
    const path = join(entry.name, 'index.html');
    if (!existsSync(path)) continue;
    const source = read(path);
    if (!/\bpost type-post\b/.test(source)) continue;
    const date = source.match(/article:published_time" content="([\d-]{10})/)?.[1] ?? '2021-01-01';
    posts.push({ slug: entry.name, date });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

const generator = read('_tools/generar-blog.py');
const template = read('how-effective-is-skip-tracing/index.html');
const item = JSON.parse(read('_tools/daily-post-2026-08-20.json'))[0];
const article = read(`${SLUG}/index.html`);

assert.equal(item.title, FULL_TITLE, 'the JSON must retain the full article/H1 title');
assert.equal(item.seo_title, SEO_TITLE, 'the JSON must define the compact SEO title');
assert.equal(item.image_width, 1672, 'the JSON must define the real hero width');
assert.equal(item.image_height, 940, 'the JSON must define the real hero height');

assert.ok(article.includes(`<title>${SEO_TITLE}</title>`), 'article SEO title is incorrect');
assert.ok(article.includes(`>${FULL_TITLE}</h1>`), 'article H1 must retain the full title');
assert.equal((article.match(/<h1\b/gi) ?? []).length, 1, 'article must contain one H1');
assert.match(article, /class="soro-header-img"[^>]*width="1672" height="940"/,
  'article hero dimensions are incorrect');
assert.ok(article.includes('1-(786) 326-0163'), 'article must preserve the current phone number');
assert.ok(!article.includes(INVALID_LICENSE), 'article must not emit the unverified license number');
assert.ok(!generator.includes(INVALID_LICENSE), 'generator must not emit the unverified license number');
assert.ok(!template.includes(INVALID_LICENSE), 'generator template must not emit the unverified license number');
assert.ok(generator.includes('Professional private investigative services serving Miami and South Florida.'),
  'generator schema must use neutral professional-service wording');
assert.ok(article.includes('Professional private investigative services in Miami and South Florida.'),
  'article CTA must use neutral professional-service wording');

const expected = discoverPosts().map((post) => post.slug);
const pageCount = Math.ceil(expected.length / PAGE_SIZE);
const actual = [];

for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
  const path = pageNumber === 1 ? 'blog/index.html' : `blog/page/${pageNumber}/index.html`;
  assert.ok(existsSync(path), `blog page ${pageNumber} must exist`);
  const source = read(path);
  const slugs = cardSlugs(source);
  const expectedSlice = expected.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);

  assert.deepEqual(slugs, expectedSlice,
    `blog page ${pageNumber} must be the correct chronological slice`);
  assert.equal(slugs.length, expectedSlice.length,
    `blog page ${pageNumber} has the wrong card count`);
  actual.push(...slugs);

  if (pageNumber > 1) {
    const newerHref = pageNumber === 2 ? '/blog/' : `/blog/page/${pageNumber - 1}/`;
    assert.match(source, new RegExp(`<a rel="prev" href="${newerHref}">`),
      `blog page ${pageNumber} needs a link to newer articles`);
  }
  if (pageNumber < pageCount) {
    assert.match(source, new RegExp(`<a rel="next" href="/blog/page/${pageNumber + 1}/">`),
      `blog page ${pageNumber} needs a link to older articles`);
  }
}

assert.equal(new Set(actual).size, expected.length,
  'blog pages must not contain duplicate cards');
assert.deepEqual(actual, expected,
  'all blog pages together must expose every post in chronological order');

console.log(`Blog publication verification passed: metadata, neutral licensing copy, ${expected.length} unique chronological cards across ${pageCount} pages.`);
