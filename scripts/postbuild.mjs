import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// GitHub Pages runs Jekyll unless this file is present in the published root.
const outDir = join(process.cwd(), 'out');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, '.nojekyll'), '');
console.log('postbuild: wrote out/.nojekyll');
