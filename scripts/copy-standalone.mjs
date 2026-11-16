import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const dist = resolve(process.env.CS2_BUILD_DIR || '.next');
const target = resolve(dist, 'standalone');
if (!existsSync(target)) throw new Error('Standalone output is missing. Run next build first.');
mkdirSync(resolve(target, '.next'), { recursive: true });
cpSync(resolve(dist, 'static'), resolve(target, '.next/static'), { recursive: true });
cpSync(resolve('public'), resolve(target, 'public'), { recursive: true });
console.log('Standalone assets copied.');
