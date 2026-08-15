import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('_headers', 'utf8');
assert.ok(!source.startsWith('\uFEFF'), '_headers must not contain a byte-order mark');

const lines = source.replaceAll('\r\n', '\n').split('\n');
assert.ok(lines.every((line) => line.length <= 2000), 'Cloudflare limits each _headers line to 2,000 characters');

const blocks = new Map();
let route;

for (const [index, line] of lines.entries()) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue;

  if (!/^\s/.test(line)) {
    assert.match(line, /^(?:\/|https:\/\/)[^\s]*$/, `Invalid route on line ${index + 1}`);
    assert.ok(!blocks.has(line), `Duplicate route block: ${line}`);
    route = line;
    blocks.set(route, []);
    continue;
  }

  assert.ok(route, `Header on line ${index + 1} has no route block`);
  assert.match(line, /^\s+[!A-Za-z0-9-]+:\s+\S.*$/, `Invalid header syntax on line ${index + 1}`);
  blocks.get(route).push(line.trim());
}

assert.ok(blocks.size <= 100, 'Cloudflare permits at most 100 _headers rules');

function assertHeaders(actual, expected, label) {
  assert.ok(actual, `Missing route block: ${label}`);
  const names = actual.map((header) => header.slice(0, header.indexOf(':')).toLowerCase());
  assert.equal(new Set(names).size, names.length, `Duplicate header in ${label}`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} must match the approved policy`);
}

const globalPolicy = [
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: SAMEORIGIN',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Strict-Transport-Security: max-age=31536000',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
];
assertHeaders(blocks.get('/*'), globalPolicy, 'The global security header block');
assertHeaders([...globalPolicy].reverse(), globalPolicy, 'Reordered policy self-check');
assert.throws(() => assertHeaders(globalPolicy.slice(1), globalPolicy, 'Missing policy self-check'));
assert.throws(() => assertHeaders([...globalPolicy, globalPolicy[0]], globalPolicy, 'Duplicate policy self-check'));

const hsts = blocks.get('/*').find((header) => header.startsWith('Strict-Transport-Security:'));
assert.ok(!/includeSubDomains|preload/i.test(hsts), 'HSTS must not opt into includeSubDomains or preload');

for (const routeName of ['/wp-content/*', '/wp-includes/*']) {
  assertHeaders(
    blocks.get(routeName),
    ['Cache-Control: public, max-age=31536000, immutable'],
    `The immutable cache rule for ${routeName}`,
  );
}

assert.deepEqual([...blocks.keys()].sort(), ['/*', '/wp-content/*', '/wp-includes/*'].sort(), 'Missing or unexpected _headers route blocks');

console.log('Security headers verification passed.');
