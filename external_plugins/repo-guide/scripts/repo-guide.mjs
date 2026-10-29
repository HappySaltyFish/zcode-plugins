import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { attachVerification, collectTour, inspectRepository, readJSON, reserveOutput, verifyScript, writeJSON } from './evidence.mjs';
import { renderHTML, renderMarkdown } from './render-report.mjs';

const help = `RepoGuide 0.1.0 — Node.js 24+, no third-party dependencies
  inspect --repo <repository>                         Read-only metadata and scripts
  build --repo <repository> --plan <plan.json> --out <new-directory> [--result <verification.json>]
  run --repo <repository> --plan <plan.json> --script <name> --out <new-directory> --confirm [--timeout <milliseconds>]

Output parent must exist. Output must be outside the repository and plugin.
build writes tour.json, report.md, report.html; run writes verification.json.
run executes a declared npm/pnpm script, including its lifecycle scripts and side effects.
Get user approval for the exact command before supplying --confirm.
Exit codes: 0 success; 1 invalid input; 2 failed, timed-out, or blocked check.
`;

export async function main(args) {
  if (!args.length || args.includes('--help')) { console.log(help); return 0; }
  const [operation, ...remaining] = args;
  const { values } = parseArgs({ args: remaining, options: {
    repo: { type: 'string' }, plan: { type: 'string' }, out: { type: 'string' }, result: { type: 'string' },
    script: { type: 'string' }, confirm: { type: 'boolean', default: false }, timeout: { type: 'string' },
  } });
  if (!values.repo) throw new Error('--repo is required.');
  if (operation === 'inspect') { console.log(JSON.stringify(await inspectRepository(values.repo), null, 2)); return 0; }
  if (!['build', 'run'].includes(operation)) throw new Error(`Unknown operation: ${operation}`);
  if (!values.plan) throw new Error('--plan is required.');
  const plan = await readJSON(values.plan);
  let tour = await collectTour(values.repo, plan);
  if (operation === 'build') {
    if (values.result) tour = attachVerification(tour, await readJSON(values.result));
    const output = await reserveOutput(values.repo, values.out);
    await writeJSON(output, 'tour.json', tour);
    await writeFile(path.join(output, 'report.html'), renderHTML(tour), { flag: 'wx' });
    await writeFile(path.join(output, 'report.md'), renderMarkdown(tour), { flag: 'wx' });
    console.log(JSON.stringify({ output, status: tour.verification.status, files: ['tour.json', 'report.html', 'report.md'] }, null, 2));
    return 0;
  }
  if (!values.confirm) throw new Error('Get user approval for the command, then supply --confirm.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(values.script ?? '')) throw new Error('--script must be a declared, simple script name.');
  const timeout = values.timeout === undefined ? 60000 : Number(values.timeout);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 300000) throw new Error('--timeout must be 100–300000 ms.');
  const output = await reserveOutput(values.repo, values.out);
  const record = await verifyScript(values.repo, plan, values.script, { confirm: true, timeout });
  await writeJSON(output, 'verification.json', record);
  console.log(JSON.stringify({ output, status: record.status, exitCode: record.exitCode, message: record.message }, null, 2));
  return record.status === 'passed' ? 0 : 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error(`RepoGuide: ${error.message}`);
    process.exitCode = 1;
  });
}
