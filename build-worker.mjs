import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const staticAssets = [
  'index.html',
  'style.css',
  'script.js',
  'robots.txt',
  'sitemap.xml',
  'CNAME',
  'icon_black.ico',
  'icon_white.ico',
  'fish_black.png',
  'og.png',
];

mkdirSync('dist/server', { recursive: true });
mkdirSync('dist/static', { recursive: true });
mkdirSync('dist/.openai', { recursive: true });
staticAssets.forEach((asset) => copyFileSync(asset, `dist/static/${asset}`));
copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json');

const textAssets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/script.js': ['script.js', 'text/javascript; charset=utf-8'],
  '/robots.txt': ['robots.txt', 'text/plain; charset=utf-8'],
  '/sitemap.xml': ['sitemap.xml', 'application/xml; charset=utf-8'],
};

const binaryAssets = {
  '/icon_black.ico': ['icon_black.ico', 'image/x-icon'],
  '/icon_white.ico': ['icon_white.ico', 'image/x-icon'],
  '/fish_black.png': ['fish_black.png', 'image/png'],
};

const encodedText = Object.fromEntries(
  Object.entries(textAssets).map(([route, [file, type]]) => [route, { body: readFileSync(file, 'utf8'), type }]),
);
const encodedBinary = Object.fromEntries(
  Object.entries(binaryAssets).map(([route, [file, type]]) => [route, { body: readFileSync(file).toString('base64'), type }]),
);

const worker = `const textAssets = ${JSON.stringify(encodedText)};
const binaryAssets = ${JSON.stringify(encodedBinary)};

function decodeBase64(value) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.endsWith('/') && url.pathname !== '/' ? '/' : url.pathname;
    const textAsset = textAssets[path];
    if (textAsset) {
      return new Response(request.method === 'HEAD' ? null : textAsset.body, {
        status: 200,
        headers: { 'content-type': textAsset.type, 'cache-control': path === '/' ? 'no-cache' : 'public, max-age=3600' },
      });
    }
    const binaryAsset = binaryAssets[path];
    if (binaryAsset) {
      return new Response(request.method === 'HEAD' ? null : decodeBase64(binaryAsset.body), {
        status: 200,
        headers: { 'content-type': binaryAsset.type, 'cache-control': 'public, max-age=86400' },
      });
    }
    if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
      return new Response(textAssets['/'].body, { status: 200, headers: { 'content-type': textAssets['/'].type, 'cache-control': 'no-cache' } });
    }
    return new Response('NOT FOUND', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
`;

writeFileSync('dist/server/index.js', worker);
