#!/usr/bin/env node
// Verification gate for site/ pages. Used as the per-iteration check for
// autonomous runs, but fine to run by hand:
//
//   node _build/check-pages.mjs                        # fact-lint all pages
//   node _build/check-pages.mjs site/some-page.html    # full check on one page
//
// Two layers:
//   1. Fact lint  — runs over every page, always. Catches the invented
//      cook temps / times / quantities / packaging claims described in
//      CLAUDE.md and WIKI.md "Cooking directions: no numbers".
//   2. Page check — structural + head + link checks, only for pages named
//      on the command line.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';

const SITE = 'site';
const ORIGIN = 'https://riccisausage.com';
const errors = [];
const warnings = [];

const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

// ---------------------------------------------------------------- fact lint

// Each rule is [name, regex, note]. Regexes run against visible-ish HTML.
// These encode claims that have actually gone wrong on this site before.
const FACT_RULES = [
  ['cook temperature', /\b\d{2,3}\s*(?:°\s*F|degrees?\b|&deg;\s*F)/i,
    'no temperatures anywhere on the site — see WIKI.md "Cooking directions: no numbers"'],
  ['cook time', /\b\d+\s*(?:–|-|to\s)?\s*\d*\s*(?:min(?:ute)?s?|hours?|hrs?)\b(?=[^<]{0,80}\b(?:cook|bake|brown|simmer|grill|roast|fry|heat|oven|pan|gravy|sauce)\b)/i,
    'no cook times'],
  ['cook time (trailing)', /\b(?:cook|bake|brown|simmer|grill|roast|fry|heat)[^<.]{0,60}?\b\d+\s*(?:–|-|to\s)?\s*\d*\s*(?:min(?:ute)?s?|hours?|hrs?)\b/i,
    'no cook times'],
  ['recipe quantity', /\b\d+\s*(?:quarts?|qt|cups?|tbsp|tablespoons?|tsp|teaspoons?)\b/i,
    'no invented quantities'],
  ['vacuum seal', /vacuum[-\s]?seal/i,
    'products are NOT vacuum-sealed — this exact claim was wrong in 15 places'],
  ['link count', /\b\d+\s*links\b/i,
    'the 5 lb box is one continuous rope, not N links'],
  ['no sugar', /no\s+sugar/i,
    'never write "no sugar" — dextrose is in the sweet blend'],
  ['internal temp', /internal\s+temp/i,
    'no doneness temperature anywhere, by instruction'],
];

function factLint(file, html) {
  // strip script/style, then check remaining markup + text
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const [name, re, note] of FACT_RULES) {
    const m = body.match(re);
    if (m) {
      const at = body.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60)
        .replace(/\s+/g, ' ').trim();
      fail(file, `FACT LINT [${name}] — ${note}\n      match: …${at}…`);
    }
  }
}

// --------------------------------------------------------------- page check

const HEAD_REQUIRED = [
  [/<title>[^<]{20,}<\/title>/i, '<title> (at least 20 chars)'],
  [/<meta\s+name="description"\s+content="[^"]{60,}"/i, 'meta description (at least 60 chars)'],
  [/<link\s+rel="canonical"\s+href="[^"]+"/i, 'canonical link'],
  [/<meta\s+property="og:title"/i, 'og:title'],
  [/<meta\s+property="og:description"/i, 'og:description'],
  [/<meta\s+property="og:url"/i, 'og:url'],
  [/<meta\s+property="og:image"/i, 'og:image'],
  [/<meta\s+name="twitter:card"/i, 'twitter:card'],
  [/<script\s+async\s+src="\/js\/analytics\.js">/i, 'analytics script'],
];

function checkPage(file) {
  if (!existsSync(file)) return fail(file, 'file does not exist');
  const html = readFileSync(file, 'utf8');
  const isRoot = dirname(file) === SITE;

  if (html.length < 4000) fail(file, `suspiciously short (${html.length} bytes) — page looks like a stub`);
  if (!/^<!DOCTYPE html>/i.test(html.trim())) fail(file, 'missing <!DOCTYPE html>');
  if (!/<html lang="en">/i.test(html)) fail(file, 'missing <html lang="en">');

  for (const [re, label] of HEAD_REQUIRED) {
    if (!re.test(html)) fail(file, `missing ${label}`);
  }

  // canonical must be extensionless and match the filename slug
  const slug = basename(file, '.html');
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (canonical) {
    const expected = isRoot ? `${ORIGIN}/${slug}` : `${ORIGIN}/${relative(SITE, file).replace(/\.html$/, '')}`;
    if (canonical !== expected) fail(file, `canonical is "${canonical}", expected "${expected}"`);
  }

  // asset paths: root pages bare-relative, subpages ../
  const prefix = isRoot ? '' : '../';
  if (!html.includes(`href="${prefix}css/styles.css"`)) {
    fail(file, `stylesheet should be href="${prefix}css/styles.css"`);
  }

  // tag balance on the containers most likely to be left open
  for (const tag of ['div', 'section', 'main', 'article']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (open !== close) fail(file, `unbalanced <${tag}>: ${open} open, ${close} close`);
  }

  // internal links must resolve
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  for (const href of hrefs) {
    if (/^(https?:|mailto:|tel:|#|data:)/i.test(href)) continue;
    const clean = href.split(/[?#]/)[0];
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? join(SITE, clean)
      : resolve(dirname(file), clean);
    const rel = relative(process.cwd(), target);
    if (existsSync(target) || existsSync(`${target}.html`)) continue;
    fail(file, `dead internal link: ${href} → ${rel}`);
  }

  // must funnel somewhere buyable
  if (!/href="[^"]*(?:shop|products|menu)(?:\.html|\/|")/.test(html)) {
    fail(file, 'no internal link to shop / products / menu — every content page should funnel');
  }

  // registration in sitemap + redirects
  const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  const cleanUrl = `${ORIGIN}/${relative(SITE, file).replace(/\.html$/, '')}`;
  if (!sitemap.includes(`<loc>${cleanUrl}</loc>`)) {
    fail(file, `not registered in sitemap.xml — add <url><loc>${cleanUrl}</loc></url>`);
  }
  const redirects = readFileSync(join(SITE, '_redirects'), 'utf8');
  const path = `/${relative(SITE, file)}`;
  if (!redirects.includes(path)) {
    fail(file, `no .html→clean rule in _redirects — add: ${path}  ${path.replace(/\.html$/, '')}  301!`);
  }
}

// -------------------------------------------------------------------- main

function allPages(dir = SITE) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return allPages(full);
    return full.endsWith('.html') ? [full] : [];
  });
}

const targets = process.argv.slice(2);
for (const page of allPages()) factLint(page, readFileSync(page, 'utf8'));
for (const page of targets) checkPage(page);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.error(`\nFAILED — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`OK — fact lint clean across ${allPages().length} pages` +
  (targets.length ? `, full check passed on ${targets.join(', ')}` : ''));
