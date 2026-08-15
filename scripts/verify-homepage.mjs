import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync('index.html', 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function count(pattern) {
  return [...html.matchAll(pattern)].length;
}

expect(count(/<meta\s+name=["']description["'][^>]*>/gi) === 1, 'homepage must contain exactly one meta description');
expect(count(/<h1\b/gi) === 1, 'homepage must contain exactly one h1');
expect(/<h1\b[^>]*class="mpa-home-heading"[^>]*>Nationwide Solutions, Unmatched Expertise<\/h1>/i.test(html), 'the single h1 must remain exposed outside breakpoint-hidden hero rows');
expect(!/SearchAction|\/?\?s=\{search_term_string\}/i.test(html), 'static homepage must not advertise a dead search action');
expect(/<a\b[^>]*aria-label="Miami Private Investigator Agency home"[^>]*>[\s\S]*?<img\b[^>]*alt="Miami Private Investigator Agency"/i.test(html), 'linked logo needs a meaningful accessible name');
expect(count(/<video\b[^>]*data-video-src="AdobeStock_274316016\.mp4"[^>]*preload="none"/gi) === 1, 'desktop hero must expose one deferred video source');
expect(!/<(?:video|source)\s[^>]*\ssrc=["'][^"']*AdobeStock_274316016\.mp4/gi.test(html), 'hero video source must not load eagerly');
expect(/id="deferred-hero-video"/i.test(html), 'deferred hero loader is missing');
expect(/prefers-reduced-motion:\s*reduce/i.test(html), 'reduced-motion poster fallback is missing');

const mobileStart = html.indexOf('<div class="fusion-fullwidth fullwidth-box fusion-builder-row-3');
const mobileEnd = html.indexOf('<div class="fusion-fullwidth fullwidth-box fusion-builder-row-4', mobileStart);
expect(mobileStart >= 0 && mobileEnd > mobileStart, 'mobile hero boundaries were not found');
if (mobileStart >= 0 && mobileEnd > mobileStart) {
  expect(!/<video\b/i.test(html.slice(mobileStart, mobileEnd)), 'mobile hero must use the static poster, not video');
}

const missing = new Set();
for (const match of html.matchAll(/(?:src|href|poster|data-video-src)=["']([^"'#?]+)["']/gi)) {
  const reference = match[1];
  if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
  const localPath = reference.startsWith('/') ? reference.slice(1) : reference;
  if (!localPath || localPath.endsWith('/')) continue;
  if (!existsSync(resolve(localPath))) missing.add(reference);
}
expect(missing.size === 0, `missing local homepage references: ${[...missing].join(', ')}`);

if (failures.length) {
  console.error(`Homepage verification failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Homepage verification passed: metadata, semantics, deferred media, accessibility, and local references.');
