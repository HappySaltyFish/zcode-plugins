import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, lstat, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { attachVerification, collectTour, inspectRepository, pluginRoot, reserveOutput, sourceFile, verifyScript } from '../scripts/evidence.mjs';
import { renderHTML, renderMarkdown } from '../scripts/render-report.mjs';

async function fixture(t) {
  const tempRoot = await realpath(tmpdir());
  const base = await mkdtemp(path.join(tempRoot, 'repo-guide-test-'));
  t.after(async () => {
    // Only remove the fresh temporary test directory, never a computed repo path.
    assert.equal(path.dirname(base), tempRoot);
    assert.ok(path.basename(base).startsWith('repo-guide-test-'));
    assert.equal((await lstat(base)).isSymbolicLink(), false);
    await rm(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });
  const repo = path.join(base, 'sample repo with spaces');
  await cp(path.join(pluginRoot, 'examples/demo-repo'), repo, { recursive: true });
  // Keep a possible orphan short-lived when sandboxed Windows denies taskkill /T.
  const packagePath = path.join(repo, 'package.json');
  await writeFile(packagePath, (await readFile(packagePath, 'utf8')).replace('30000', '2000'));
  const plan = JSON.parse(await readFile(path.join(pluginRoot, 'examples/tour-plan.json'), 'utf8'));
  return { base, repo, plan };
}

test('source excerpts are collected from disk, inspect/build are read-only, scripts remain unrun', async t => {
  const { repo, plan, base } = await fixture(t);
  const before = await readFile(path.join(repo, 'src/validate.mjs'), 'utf8');
  plan.steps[2].excerpt = 'fake model excerpt';
  const info = await inspectRepository(repo);
  assert.equal(info.manager, 'npm');
  assert.equal(info.scripts.test, 'node --test test/validate.test.mjs');
  const tour = await collectTour(repo, plan);
  assert.equal(tour.steps[2].excerpt, before.trimEnd());
  assert.equal(tour.verification.status, 'not_run');
  assert.equal(await readFile(path.join(repo, 'src/validate.mjs'), 'utf8'), before);
  await assert.rejects(reserveOutput(repo, path.join(repo, 'report')), /outside/);
  const output = path.join(base, 'output');
  await reserveOutput(repo, output);
  await assert.rejects(reserveOutput(repo, output), { code: 'EEXIST' });
});

test('rejects invalid paths, sensitive files, symlinks, oversized files and invented ranges', async t => {
  const { repo, plan, base } = await fixture(t);
  for (const file of ['../outside', '/etc/passwd', 'C:/secret', 'src\\validate.mjs', '.git/config', '.env', 'node_modules/a.js']) {
    await assert.rejects(sourceFile(repo, file));
  }
  plan.steps[0].endLine = 200;
  await assert.rejects(collectTour(repo, plan), /1–60/);
  plan.steps[0].endLine = 30;
  await assert.rejects(collectTour(repo, plan), /exceeds/);
  await writeFile(path.join(repo, 'large.txt'), 'x'.repeat(512 * 1024 + 1));
  await assert.rejects(sourceFile(repo, 'large.txt'), /512 KiB/);
  await writeFile(path.join(base, 'outside.txt'), 'outside');
  try {
    await symlink(base, path.join(repo, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(sourceFile(repo, 'linked/outside.txt'), /links/);
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.diagnostic('Host denied link creation; path traversal cases still exercised.');
  }
});

test('verification requires consent and safe script names; missing scripts are blocked', async t => {
  const { repo, plan } = await fixture(t);
  await assert.rejects(verifyScript(repo, plan, 'test'), /confirm/);
  await assert.rejects(verifyScript(repo, plan, 'test & echo unsafe', { confirm: true }), /script name/);
  const missing = await verifyScript(repo, plan, 'missing', { confirm: true });
  assert.equal(missing.status, 'blocked');
  assert.equal(missing.exitCode, null);
  assert.equal(missing.stdout, '');
});

test('real commands produce success/failure/timeout records; source and plan edits invalidate success', { timeout: 60000 }, async t => {
  const { repo, plan } = await fixture(t);
  const good = await verifyScript(repo, plan, 'test', { confirm: true, timeout: 15000 });
  assert.equal(good.status, 'passed', good.stderr);
  assert.equal(good.exitCode, 0);
  assert.match(good.stdout, /accepts a trimmed task name/);
  assert.equal(attachVerification(await collectTour(repo, plan), good).verification.status, 'passed');
  const bad = await verifyScript(repo, plan, 'test:failure', { confirm: true, timeout: 15000 });
  assert.equal(bad.status, 'failed');
  assert.notEqual(bad.exitCode, 0);
  const slow = await verifyScript(repo, plan, 'test:slow', { confirm: true, timeout: 500 });
  assert.equal(slow.status, 'timed_out');
  plan.task += ' Changed task';
  assert.equal(attachVerification(await collectTour(repo, plan), good).verification.status, 'stale');
  plan.task = plan.task.replace(' Changed task', '');
  await writeFile(path.join(repo, 'src/validate.mjs'), `${await readFile(path.join(repo, 'src/validate.mjs'), 'utf8')}\n// edited\n`);
  assert.equal(attachVerification(await collectTour(repo, plan), good).verification.status, 'stale');
});

test('HTML renders hostile model/source/log text as text, with no external resources', async t => {
  const { repo, plan } = await fixture(t);
  const hostile = '</script><img src=x onerror="alert(1)"> & 中文 ```';
  plan.title = hostile;
  plan.steps[0].explanation = hostile;
  await writeFile(path.join(repo, 'src/validate.mjs'), `${hostile}\na\nb\nc\nd\ne\nf\ng\n`);
  const tour = await collectTour(repo, plan);
  tour.verification = { ...tour.verification, stdout: hostile, stderr: hostile, command: ['npm', hostile] };
  const html = renderHTML(tour);
  assert.equal(html.includes('<img'), false);
  assert.equal((html.match(/<script>/g) ?? []).length, 1);
  assert.match(html, /&lt;\/script&gt;&lt;img/);
  assert.match(html, /connect-src 'none'/);
  assert.equal(html.includes('innerHTML'), false);
  assert.match(renderMarkdown(tour), /````/);
});

test('ambiguous package managers block execution; explicit pnpm uses its real script runner when available', async t => {
  const { repo, plan } = await fixture(t);
  const packagePath = path.join(repo, 'package.json');
  await writeFile(path.join(repo, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  await writeFile(path.join(repo, 'package-lock.json'), '{}\n');
  assert.equal((await inspectRepository(repo)).manager, null);
  assert.equal((await verifyScript(repo, plan, 'test', { confirm: true })).status, 'blocked');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  pkg.packageManager = 'pnpm@10.33.2';
  await writeFile(packagePath, JSON.stringify(pkg, null, 2));
  assert.equal((await inspectRepository(repo)).manager, 'pnpm');
  try {
    if (process.platform === 'win32') execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'pnpm.cmd --version'], { stdio: 'pipe' });
    else execFileSync('pnpm', ['--version'], { stdio: 'pipe' });
  } catch {
    t.diagnostic('pnpm is unavailable; ambiguity handling exercised, runner smoke requires pnpm.');
    return;
  }
  const result = await verifyScript(repo, plan, 'test', { confirm: true, timeout: 15000 });
  assert.equal(result.status, 'passed', result.stderr);
  assert.deepEqual(result.command, ['pnpm', 'run', 'test']);
  assert.match(result.stdout, /accepts a trimmed task name/);
});

test('isolated staging copies discoverable components with matching catalogue metadata', async t => {
  const { base } = await fixture(t);
  const output = path.join(base, 'marketplace');
  execFileSync(process.execPath, [path.join(pluginRoot, 'scripts/stage-demo.mjs'), '--out', output], { stdio: 'pipe' });
  const catalogue = JSON.parse(await readFile(path.join(output, 'marketplace.json'), 'utf8'));
  const entry = catalogue.plugins[0];
  const installed = path.join(output, entry.source);
  const manifest = JSON.parse(await readFile(path.join(installed, '.zcode-plugin/plugin.json'), 'utf8'));
  assert.equal(entry.name, manifest.name);
  assert.equal(entry.version, manifest.version);
  assert.deepEqual(entry.description_i18n, manifest.description_i18n);
  await readFile(path.join(installed, 'commands/onboard.md'));
  await readFile(path.join(installed, 'skills/repo-guide/SKILL.md'));
  await assert.rejects(lstat(path.join(installed, 'hooks/hooks.json')));
});

test('CLI exports a complete report without executing scripts and refuses overwrite', async t => {
  const { repo, base } = await fixture(t);
  const cli = path.join(pluginRoot, 'scripts/repo-guide.mjs');
  const output = path.join(base, 'cli-report');
  const args = [cli, 'build', '--repo', repo, '--plan', path.join(pluginRoot, 'examples/tour-plan.json'), '--out', output];
  execFileSync(process.execPath, args, { encoding: 'utf8' });
  const json = JSON.parse(await readFile(path.join(output, 'tour.json'), 'utf8'));
  assert.equal(json.verification.status, 'not_run');
  assert.match(await readFile(path.join(output, 'report.html'), 'utf8'), /REPOGUIDE/);
  assert.match(await readFile(path.join(output, 'report.md'), 'utf8'), /Source:/);
  assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }));
});
