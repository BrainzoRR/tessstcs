import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const tests = readdirSync(new URL('../tests/', import.meta.url)).filter(name => name.endsWith('.test.mjs')).map(name => fileURLToPath(new URL('../tests/' + name, import.meta.url)));
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
