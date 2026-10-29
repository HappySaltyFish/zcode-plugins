// Plugin-specific isolated smoke source; never changes the official root catalogue.
import { cp, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pluginRoot, readJSON, reserveOutput, writeJSON } from './evidence.mjs';

async function assertRegularTree(directory) {
  for (const name of await readdir(directory)) {
    const file = path.join(directory, name);
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) throw new Error('Do not stage a plugin containing symlinks.');
    if (stat.isDirectory()) await assertRegularTree(file);
  }
}

try {
  const { values } = parseArgs({ options: { out: { type: 'string' } } });
  const manifest = await readJSON(path.join(pluginRoot, '.zcode-plugin/plugin.json'));
  await assertRegularTree(pluginRoot);
  const output = await reserveOutput(pluginRoot, values.out);
  const source = `./external_plugins/${manifest.name}`;
  await cp(pluginRoot, path.join(output, source), { recursive: true });
  await writeJSON(output, 'marketplace.json', {
    name: `${manifest.name}-demo-local`, description: manifest.description,
    description_i18n: manifest.description_i18n,
    plugins: [{ ...manifest, source, category: 'developer-tools' }],
  });
  console.log(JSON.stringify({ output, source: `${manifest.name}-demo-local`, plugin: manifest.name,
    note: 'Isolated plugin smoke source only; this does not replace repository build/CI validation.' }, null, 2));
} catch (error) {
  console.error(`RepoGuide staging: ${error.message}`);
  process.exitCode = 1;
}
