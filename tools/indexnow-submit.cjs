'use strict';

const fs = require('node:fs');
const path = require('node:path');
const KEY = '75a69cf4a84876a314f8d3108ab52655';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  const submit = process.argv.includes('--submit');
  const sitemap = fs.readFileSync(path.resolve(__dirname, '../public/sitemap.xml'), 'utf8');
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const urls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match =>
    match[1].replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (_, entity) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
      return entities[entity];
    }));
  if (!urls.length) throw new Error('public/sitemap.xml contains no URLs. Run pnpm run build first.');
  urls.push('https://march7th.cn/');
  const groups = new Map();
  for (const value of urls) {
    const url = new URL(value);
    if (!groups.has(url.host)) groups.set(url.host, new Set());
    groups.get(url.host).add(url.href);
  }
  console.log(`${submit ? 'Submit' : 'Dry-run'}: ${urls.length} sitemap/entrance entries, ${groups.size} hosts.`);
  for (const [host, values] of groups) {
    const urlList = [...values].sort();
    for (let offset = 0; offset < urlList.length; offset += 10000) {
      const payload = {
        host,
        key: KEY,
        keyLocation: `https://${host}/${KEY}.txt`,
        urlList: urlList.slice(offset, offset + 10000)
      };
      console.log(`${host}: ${payload.urlList.length} URLs → ${ENDPOINT}`);
      if (!submit) {
        console.log(JSON.stringify(payload, null, 2));
        continue;
      }
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        console.log(`${host}: HTTP ${response.status}`);
        if (!response.ok) process.exitCode = 1;
      } catch (error) {
        console.error(`${host}: ${error.message}`);
        process.exitCode = 1;
      }
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
