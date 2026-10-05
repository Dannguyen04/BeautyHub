import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/public', { recursive: true });
await cp('public', 'dist/public', { recursive: true });
await cp('data', 'dist/data', { recursive: true });
await cp('server.js', 'dist/server.js');
console.log('Built runnable MVP to dist/. Start it with `npm run preview`.');
