import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ORIGIN = 'https://miamipiagency.com/';
const BASELINE = {"pages":{"asset-searches/index.html":{"h1":4},"attorney-hostile-workplace-terminations/index.html":{"h1":4},"boca-raton-florida/index.html":{"h1":2},"child-custody/index.html":{"h1":4},"civil-and-criminal-investigations/index.html":{"h1":4},"computer-voice-stress-analysis/index.html":{"h1":4},"corporate-hostile-workplace-terminations/index.html":{"h1":4},"crypto-currency-investigations/index.html":{"h1":4},"cyber-investigations/index.html":{"h1":4},"disclaimer/index.html":{"h1":0},"due-diligence/index.html":{"h1":4},"executive-protection/index.html":{"h1":4},"faq-items/index.html":{"h1":0},"forensic-accounting/index.html":{"h1":2},"fort-lauderdale-florida/index.html":{"h1":2},"fraud-investigations/index.html":{"h1":4},"maritime-investigations/index.html":{"h1":4},"miami-florida/index.html":{"h1":2},"missing-persons/index.html":{"h1":4},"naples-florida/index.html":{"h1":2},"orlando-florida/index.html":{"h1":2},"skip-tracing/index.html":{"h1":4},"surveillance/index.html":{"h1":4},"tampa-florida/index.html":{"h1":2},"trademark-infringement/index.html":{"h1":4},"travel-security/index.html":{"h1":4},"tscm-bugsweeps/index.html":{"h1":4}},"indexable":["about/index.html","accident-scene-investigation-services/index.html","asset-searches/index.html","attorney-hostile-workplace-terminations/index.html","attorneys-can-benefit-from-private-investigators-to-help-win-court-cases/index.html","background-checks-the-role-of-private-investigators-in-background-screenings/index.html","blackmail-and-extortion/index.html","blog/index.html","blog/page/2/index.html","boca-raton-florida/attorney-services/index.html","boca-raton-florida/child-custody/index.html","boca-raton-florida/due-diligence/index.html","boca-raton-florida/fraud-investigations/index.html","boca-raton-florida/index.html","boca-raton-florida/missing-persons/index.html","boca-raton-florida/surveillance/index.html","borra-tu-rastro-digital/index.html","child-custody/index.html","civil-and-criminal-investigations/index.html","computer-voice-stress-analysis/index.html","contact-us/index.html","corporate-hostile-workplace-terminations/index.html","crypto-currency-investigations/index.html","cyber-investigations/index.html","disclaimer/index.html","due-diligence-investigation-services/index.html","due-diligence/index.html","elder-financial-abuse-investigation-services/index.html","employee-theft-investigation-services/index.html","erase-your-digital-footprint/index.html","essential-p2p-fraud-prevention-tips-for-secure-payments/index.html","executive-protection/index.html","faq-items/do-you-handle-infidelity-or-basic-surveillance-cases/index.html","faq-items/do-you-offer-private-investigator-services-near-me/index.html","faq-items/how-long-does-an-investigation-take/index.html","faq-items/how-much-does-a-private-investigator-cost/index.html","faq-items/index.html","faq-items/is-hiring-a-private-investigator-legal/index.html","faq-items/what-should-i-look-for-when-hiring-a-private-investigator/index.html","faq-items/what-types-of-cases-do-you-accept/index.html","forensic-accounting/index.html","fort-lauderdale-florida/attorney-services/index.html","fort-lauderdale-florida/child-custody/index.html","fort-lauderdale-florida/due-diligence/index.html","fort-lauderdale-florida/fraud-investigations/index.html","fort-lauderdale-florida/index.html","fort-lauderdale-florida/missing-persons/index.html","fort-lauderdale-florida/surveillance/index.html","fraud-investigations/index.html","grandparent-visitation-rights/index.html","heir-search-services/index.html","hire-private-investigator-across-state-lines/index.html","how-effective-is-skip-tracing/index.html","how-private-investigators-can-uncover-hidden-assets-in-divorce-cases/index.html","how-to-become-a-personal-bodyguard-in-florida-with-effective-skills/index.html","how-to-find-a-dedicated-personal-bodyguard-when-you-need-one/index.html","how-to-find-and-hire-the-right-private-investigator-for-your-needs/index.html","how-to-hire-a-florida-private-investigator-when-you-suspect-cheating/index.html","how-to-shield-your-finances-from-south-floridas-top-investment-scams/index.html","index.html","insurance-fraud-investigation-services/index.html","intellectual-property-investigation-services/index.html","investigating-white-collar-crimes-how-private-investigators-help-attorneys-build-strong-cases/index.html","litigation-support/index.html","make-your-online-accounts-impenetrable-with-security-key-technology/index.html","maritime-investigations/index.html","miami-florida/attorney-services/index.html","miami-florida/child-custody/index.html","miami-florida/corporate-investigations/index.html","miami-florida/due-diligence/index.html","miami-florida/index.html","miami-florida/missing-persons/index.html","miami-florida/surveillance/index.html","missing-persons/index.html","naples-florida/attorney-services/index.html","naples-florida/child-custody/index.html","naples-florida/corporate-investigations/index.html","naples-florida/due-diligence/index.html","naples-florida/index.html","naples-florida/missing-persons/index.html","naples-florida/surveillance/index.html","orlando-florida/attorney-services/index.html","orlando-florida/child-custody/index.html","orlando-florida/corporate-fraud/index.html","orlando-florida/due-diligence/index.html","orlando-florida/index.html","orlando-florida/missing-persons/index.html","orlando-florida/surveillance/index.html","privacy-policy/index.html","private-investigation-and-the-law-understanding-the-legal-implications-of-private-investigation-services-for-attorneys/index.html","private-investigator-fort-lauderdale/index.html","private-investigator-miami-evidence-that-holds-up/index.html","romance-scam-investigation-services/index.html","service-area/index.html","skip-tracing/index.html","social-media-investigation-services/index.html","surveillance/index.html","tampa-florida/attorney-services/index.html","tampa-florida/child-custody/index.html","tampa-florida/corporate-fraud/index.html","tampa-florida/due-diligence/index.html","tampa-florida/index.html","tampa-florida/missing-persons/index.html","tampa-florida/surveillance/index.html","terms-conditions/index.html","thank-you/index.html","trademark-infringement/index.html","travel-security/index.html","tscm-bugsweeps/index.html","what-can-a-private-investigator-do-and-not-do/index.html","what-is-an-infidelity-investigation-and-how-to-request-one/index.html","when-the-inside-man-wears-a-badge-why-terminated-employees-are-a-ticking-security-time-bomb/index.html","wilton-manors/index.html","witness-location-services/index.html","workplace-misconduct-investigation-services/index.html"],"sitemapMissing":[],"sitemapExtra":[]};

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--baseline') || args.length > 1) {
  console.error('Usage: node scripts/verify-static-seo.mjs [--baseline]');
  process.exit(2);
}
const baselineMode = args[0] === '--baseline';

function tags(html, name) {
  const found = [];
  const wanted = name.toLowerCase();
  for (let start = 0; (start = html.indexOf('<', start)) !== -1;) {
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4);
      start = end === -1 ? html.length : end + 3;
      continue;
    }
    const afterName = start + 1 + wanted.length;
    if (html.slice(start + 1, afterName).toLowerCase() !== wanted || !/[\s/>]/.test(html[afterName] ?? '')) {
      start += 1;
      continue;
    }
    let quote;
    let end = afterName;
    for (; end < html.length; end += 1) {
      const character = html[end];
      if (quote && character === quote) quote = undefined;
      else if (!quote && (character === '"' || character === "'")) quote = character;
      else if (!quote && character === '>') break;
    }
    if (end < html.length) found.push(html.slice(start, end + 1));
    start = end + 1;
  }
  return found;
}

function attribute(tag, name) {
  const match = tag.slice(1, -1).match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function isIndexable(metas) {
  return !metas.filter((tag) => attribute(tag, 'name')?.toLowerCase() === 'robots')
    .some((tag) => /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(attribute(tag, 'content') ?? ''));
}

function expectedCanonical(path) {
  const route = path === 'index.html' ? '' : path.slice(0, -'index.html'.length).replaceAll('\\', '/');
  return new URL(route, ORIGIN).href;
}

function analyzePage(path) {
  const html = readFileSync(path, 'utf8');
  const metas = tags(html, 'meta');
  const descriptions = metas.filter((tag) => attribute(tag, 'name')?.toLowerCase() === 'description');
  const nonemptyDescriptions = descriptions.filter((tag) => attribute(tag, 'content')?.trim()).length;
  const indexable = isIndexable(metas);
  const canonicals = tags(html, 'link')
    .filter((tag) => (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'))
    .map((tag) => attribute(tag, 'href') ?? '');
  const expected = expectedCanonical(path);
  const h1Count = tags(html, 'h1').length;
  const debt = {};
  if (indexable && (descriptions.length !== 1 || nonemptyDescriptions !== 1)) debt.description = [descriptions.length, nonemptyDescriptions];
  if (indexable && (canonicals.length !== 1 || canonicals[0] !== expected)) debt.canonical = { hrefs: canonicals, expected };
  if (indexable && h1Count !== 1) debt.h1 = h1Count;
  return { path, indexable, canonical: canonicals[0], debt };
}

function sitemapUrls() {
  const xml = readFileSync('sitemap.xml', 'utf8');
  return new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].replaceAll('&amp;', '&')));
}

function expectedSitemapUrls(pages) {
  return new Set(pages.filter((page) => page.indexable).map((page) => expectedCanonical(page.path)));
}

function analyze() {
  const paths = execFileSync('git', ['ls-files', '-z', '*index.html'], { encoding: 'utf8' })
    .split('\0').filter(Boolean).sort();
  const pages = paths.map(analyzePage);
  const pageDebt = Object.fromEntries(pages.filter((page) => Object.keys(page.debt).length).map((page) => [page.path, page.debt]));
  const indexableCanonicals = expectedSitemapUrls(pages);
  const sitemap = sitemapUrls();
  return {
    pages,
    pageDebt,
    sitemapMissing: [...indexableCanonicals].filter((url) => !sitemap.has(url)).sort(),
    sitemapExtra: [...sitemap].filter((url) => !indexableCanonicals.has(url)).sort(),
  };
}

function printReport(result) {
  for (const field of ['description', 'canonical', 'h1']) {
    const entries = Object.entries(result.pageDebt).filter(([, debt]) => field in debt);
    if (!entries.length) continue;
    console.error(`\n[${field}] ${entries.length} path(s)`);
    for (const [path, debt] of entries) console.error(`  ${path}: ${JSON.stringify(debt[field])}`);
  }
  for (const [label, urls] of [['sitemap missing', result.sitemapMissing], ['sitemap extra', result.sitemapExtra]]) {
    if (!urls.length) continue;
    console.error(`\n[${label}] ${urls.length} URL(s)`);
    for (const url of urls) console.error(`  ${url}`);
  }
  const debts = Object.values(result.pageDebt);
  console.error(`\nSummary: pages=${result.pages.length} indexable=${result.pages.filter((page) => page.indexable).length} violation_paths=${debts.length} description=${debts.filter((debt) => debt.description).length} canonical=${debts.filter((debt) => debt.canonical).length} h1=${debts.filter((debt) => debt.h1 !== undefined).length} sitemap_missing=${result.sitemapMissing.length} sitemap_extra=${result.sitemapExtra.length}`);
}

function noWorseCount(current, baseline) {
  if (baseline === 1) return current === 1;
  return baseline < 1 ? current >= baseline && current <= 1 : current <= baseline && current >= 1;
}

function baselineFailures(result, baseline = BASELINE) {
  const failures = [];
  const currentIndexable = result.pages.filter((page) => page.indexable).map((page) => page.path).sort();
  if (!baseline.indexable || currentIndexable.length !== baseline.indexable.length || currentIndexable.some((path, index) => path !== baseline.indexable[index])) {
    failures.push('indexable path set changed; update the baseline intentionally');
  }
  for (const [path, debt] of Object.entries(result.pageDebt)) {
    const allowed = baseline.pages[path];
    if (!allowed) {
      failures.push(`new violation path: ${path}`);
      continue;
    }
    if (debt.description && (!allowed.description || !debt.description.every((count, index) => noWorseCount(count, allowed.description[index])))) failures.push(`description debt increased: ${path}`);
    if (debt.h1 !== undefined && (allowed.h1 === undefined || !noWorseCount(debt.h1, allowed.h1))) failures.push(`H1 debt increased: ${path}`);
    if (debt.canonical) {
      const old = allowed.canonical;
      if (!old || !noWorseCount(debt.canonical.hrefs.length, old.hrefs.length) || debt.canonical.hrefs.some((href) => !old.hrefs.includes(href))) failures.push(`canonical debt increased: ${path}`);
    }
  }
  for (const [label, current, allowed] of [['missing', result.sitemapMissing, baseline.sitemapMissing], ['extra', result.sitemapExtra, baseline.sitemapExtra]]) {
    const newUrls = current.filter((url) => !allowed.includes(url));
    if (newUrls.length) failures.push(`new sitemap ${label}: ${newUrls.join(', ')}`);
  }
  return failures;
}

assert.equal(noWorseCount(1, 2), true);
assert.equal(noWorseCount(3, 2), false);
assert.equal(noWorseCount(0, 2), false);
const scannerFixture = `<!-- <meta name="description"> --><meta data-name="description" data-content="fake" data-href="fake"><meta name="robots" content="none > all">`;
const fixtureMetas = tags(scannerFixture, 'meta');
assert.equal(fixtureMetas.length, 2);
assert.deepEqual(['name', 'content', 'href'].map((name) => attribute(fixtureMetas[0], name)), [undefined, undefined, undefined]);
assert.equal(attribute(fixtureMetas[1], 'content'), 'none > all');
assert.equal(isIndexable(fixtureMetas), false);
assert.deepEqual([...expectedSitemapUrls([{ path: 'declared/index.html', indexable: true, canonical: 'https://wrong.invalid/' }])], [`${ORIGIN}declared/`]);
const selfBaseline = { pages: { 'a/index.html': { h1: 2 } }, indexable: ['a/index.html'], sitemapMissing: ['old'], sitemapExtra: [] };
assert.deepEqual(baselineFailures({ pages: [{ path: 'a/index.html', indexable: true }], pageDebt: { 'a/index.html': { h1: 1 } }, sitemapMissing: [], sitemapExtra: [] }, selfBaseline), []);
assert.equal(baselineFailures({ pages: [{ path: 'a/index.html', indexable: true }], pageDebt: { 'b/index.html': { h1: 0 } }, sitemapMissing: ['new'], sitemapExtra: [] }, selfBaseline).length, 2);
assert.equal(baselineFailures({ pages: [{ path: 'a/index.html', indexable: false }], pageDebt: {}, sitemapMissing: [], sitemapExtra: [] }, selfBaseline).length, 1);

const result = analyze();
const strictFailures = Object.keys(result.pageDebt).length + result.sitemapMissing.length + result.sitemapExtra.length;
if (!baselineMode) {
  if (strictFailures) {
    printReport(result);
    process.exit(1);
  }
  console.log(`Static SEO verification passed: ${result.pages.length} pages.`);
} else {
  const failures = baselineFailures(result);
  if (failures.length) {
    printReport(result);
    console.error(`\nBaseline rejected:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Static SEO baseline passed: ${result.pages.length} pages, ${Object.keys(result.pageDebt).length} existing violation path(s).`);
}
