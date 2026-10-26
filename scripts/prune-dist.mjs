import { rm } from 'node:fs/promises';

// 8K planet maps live outside git and are never used by the runtime; keep them
// out of the uploaded snapshot so the IPFS deploy stays small.
await rm('dist/planets/8k', { recursive: true, force: true });
