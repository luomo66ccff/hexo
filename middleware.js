import { rewrite, next } from '@vercel/functions';

export const config = {
  matcher: ['/', '/robots.txt', '/sitemap.xml', '/llms.txt']
};

const march7thPaths = new Map([
  ['/', '/march7th/index.html'],
  ['/robots.txt', '/march7th/robots.txt'],
  ['/sitemap.xml', '/march7th/sitemap.xml'],
  ['/llms.txt', '/march7th/llms.txt']
]);

export function resolveMarch7thPath(hostname, pathname) {
  const host = hostname.toLowerCase().replace(/:\d+$/, '');
  if (host !== 'march7th.cn') return null;
  return march7thPaths.get(pathname) ?? null;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const target = resolveMarch7thPath(url.hostname, url.pathname);
  if (!target) return next();
  url.pathname = target;
  return rewrite(url);
}
