import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const portArgIndex = process.argv.indexOf('--port');
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 8080);

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json'
};

function resolveRequestPath(url) {
    const parsed = new URL(url, `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
    const target = normalize(join(root, pathname));
    if (!target.startsWith(root)) return '';
    return target;
}

const server = createServer((req, res) => {
    const target = resolveRequestPath(req.url || '/');
    if (!target) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const stats = statSync(target);
        if (!stats.isFile()) throw new Error('Not a file');
        res.writeHead(200, {
            'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        createReadStream(target).pipe(res);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Baseball scoring app: http://127.0.0.1:${port}/`);
});
