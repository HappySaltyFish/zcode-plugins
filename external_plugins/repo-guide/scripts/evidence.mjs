import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
const maxBytes = 512 * 1024;
const excluded = /^(?:\.git|\.ssh|\.aws|\.azure|\.serena|node_modules|dist|build|coverage)$|^\.env(?:\.|$)|^\.(?:npmrc|pypirc|netrc)$|\.(?:pem|key|p12|pfx)$|^(?:credentials|secrets?)(?:\.|$)/i;
export const hash = value => createHash('sha256').update(value).digest('hex');
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

// Source excerpts come from files, never from model-provided text.
export async function sourceFile(root, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || name.includes(':') || name.includes('\0') || path.isAbsolute(name)) {
    throw new Error('Source paths must be repository-relative with forward slashes.');
  }
  const segments = name.split('/');
  if (segments.some(part => !part || part === '.' || part === '..' || excluded.test(part))) throw new Error(`Excluded or unsafe source path: ${name}`);
  let location = root;
  for (const segment of segments) {
    location = path.join(location, segment);
    if ((await lstat(location)).isSymbolicLink()) throw new Error(`Source links are not supported: ${name}`);
  }
  const stat = await lstat(location);
  if (!stat.isFile() || stat.size > maxBytes) throw new Error(`Source must be a text file no larger than 512 KiB: ${name}`);
  const buffer = await readFile(location);
  if (buffer.length > maxBytes || buffer.includes(0)) throw new Error(`Invalid text source: ${name}`);
  return { text: new TextDecoder('utf-8', { fatal: true }).decode(buffer), sha256: hash(buffer) };
}

export function snapshot(root) {
  try {
    const git = args => execFileSync('git', ['-c', 'core.fsmonitor=false', ...args], {
      cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { commit: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain=v1', '--untracked-files=normal']) !== '', available: true };
  } catch {
    return { commit: null, dirty: null, available: false };
  }
}

export async function inspectRepository(repo) {
  const root = await realpath(path.resolve(repo));
  let pkg = null, packageHash = null;
  const warnings = [];
  try {
    const file = await sourceFile(root, 'package.json');
    pkg = JSON.parse(file.text);
    packageHash = file.sha256;
  } catch (error) { warnings.push(`package.json unavailable: ${error.message}`); }
  const scripts = pkg?.scripts && typeof pkg.scripts === 'object' && !Array.isArray(pkg.scripts)
    ? Object.fromEntries(Object.entries(pkg.scripts).filter(([, value]) => typeof value === 'string')) : {};
  let manager = 'npm';
  if (pkg?.packageManager) {
    manager = /^(npm|pnpm)@/.exec(pkg.packageManager)?.[1] ?? null;
  } else {
    const exists = async file => { try { await lstat(path.join(root, file)); return true; } catch { return false; } };
    if (await exists('yarn.lock') || await exists('bun.lock') || await exists('bun.lockb')) manager = null;
    else if (await exists('pnpm-lock.yaml')) manager = 'pnpm';
    if (await exists('pnpm-lock.yaml') && await exists('package-lock.json')) manager = null;
  }
  if (!manager) warnings.push('Package manager is unsupported or ambiguous; ask the user.');
  return { root, name: path.basename(root), snapshot: snapshot(root), packageHash, manager, scripts, engines: pkg?.engines ?? {}, warnings };
}

function nonempty(value, label, limit = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`${label} must be non-empty text (max ${limit} characters).`);
}

export async function collectTour(repo, plan) {
  if (!plan || plan.schemaVersion !== 1) throw new Error('Plan schemaVersion must be 1.');
  nonempty(plan.title, 'title', 200);
  nonempty(plan.task, 'task');
  if (!Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > 12) throw new Error('Provide 1–12 tour steps.');
  const repository = await inspectRepository(repo);
  const steps = [], sources = new Map();
  for (const [index, step] of plan.steps.entries()) {
    nonempty(step.title, 'step title', 200);
    nonempty(step.explanation, 'step explanation');
    if (!Number.isInteger(step.startLine) || !Number.isInteger(step.endLine) || step.startLine < 1 || step.endLine < step.startLine || step.endLine - step.startLine >= 60) throw new Error('Each source range must contain 1–60 lines.');
    const file = await sourceFile(repository.root, step.file);
    const lines = file.text.replace(/\r\n/g, '\n').split('\n');
    if (lines.at(-1) === '') lines.pop();
    if (step.endLine > lines.length) throw new Error(`Source range exceeds file length: ${step.file}`);
    sources.set(step.file, file.sha256);
    steps.push({ id: `step-${index + 1}`, title: step.title, explanation: step.explanation,
      file: step.file, startLine: step.startLine, endLine: step.endLine, sha256: file.sha256,
      excerpt: lines.slice(step.startLine - 1, step.endLine).join('\n') });
  }
  const identity = { title: plan.title, task: plan.task, steps, packageHash: repository.packageHash, snapshot: repository.snapshot };
  return { schemaVersion: 1, title: plan.title, task: plan.task, generatedAt: new Date().toISOString(),
    repository: { name: repository.name, ...repository.snapshot }, sources: Object.fromEntries(sources),
    fingerprint: hash(JSON.stringify(identity)), environment: { platform: process.platform, node: process.version },
    checks: { manager: repository.manager, source: 'package.json#scripts', scripts: repository.scripts },
    warnings: repository.warnings, steps, verification: { status: 'not_run', message: 'No command execution record attached.' } };
}

export function attachVerification(tour, result) {
  if (!result || result.schemaVersion !== 1 || result.kind !== 'repo-guide-verification' ||
      !['passed', 'failed', 'timed_out', 'blocked'].includes(result.status) ||
      typeof result.script !== 'string' || !Array.isArray(result.command) || !result.command.every(part => typeof part === 'string') ||
      typeof result.stdout !== 'string' || typeof result.stderr !== 'string' ||
      typeof result.startedAt !== 'string' || typeof result.finishedAt !== 'string' ||
      (result.status === 'passed' && (result.exitCode !== 0 || result.signal))) throw new Error('Invalid verification record. Use run to create a record.');
  tour.verification = result.beforeFingerprint !== tour.fingerprint || result.afterFingerprint !== tour.fingerprint
    ? { ...result, status: 'stale', message: 'Task, sources, package configuration, or Git state changed. Rerun the check.' } : result;
  return tour;
}

// Fresh, explicitly chosen directories outside the repo preserve files and Git state.
export async function reserveOutput(repo, output) {
  if (!output) throw new Error('An explicit --out directory is required.');
  const absolute = path.resolve(output);
  const parent = await realpath(path.dirname(absolute));
  const target = path.join(parent, path.basename(absolute));
  if (inside(await realpath(path.resolve(repo)), target) || inside(await realpath(pluginRoot), target) || target.split(path.sep).some(part => excluded.test(part))) throw new Error('Output must be outside the analyzed repository, plugin installation, and excluded directories.');
  await mkdir(target); // EEXIST prevents overwriting an earlier run.
  return target;
}

export async function readJSON(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new Error('JSON input must be a regular file no larger than 1 MiB.');
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function writeJSON(directory, name, value) {
  await writeFile(path.join(directory, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

async function execute(manager, script, cwd, timeout) {
  const windows = process.platform === 'win32';
  // Only fixed manager names and validated script names enter the Windows command line.
  const executable = windows ? (process.env.ComSpec || 'cmd.exe') : manager;
  const args = windows ? ['/d', '/s', '/c', `${manager}.cmd run ${script}`] : ['run', script];
  return new Promise(resolve => {
    let stdout = '', stderr = '', truncated = false, timedOut = false, spawnError = null;
    let settled = false, cleanupWarning = null, timer, cleanupTimer;
    const environment = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}` };
    // A nested node --test must not inherit this helper's parent test harness protocol.
    delete environment.NODE_TEST_CONTEXT;
    const child = spawn(executable, args, { cwd, windowsHide: true, detached: !windows,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'] });
    const capture = (old, chunk) => {
      const joined = old + chunk.toString('utf8');
      if (joined.length > 32000) truncated = true;
      return joined.slice(0, 32000);
    };
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout = capture(stdout, chunk); });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr = capture(stderr, chunk); });
    child.on('error', error => { spawnError = error.message; });
    const finish = (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      resolve({ exitCode, signal, stdout, stderr, truncated, cleanupWarning,
        status: timedOut ? 'timed_out' : spawnError ? 'blocked' : exitCode === 0 ? 'passed' : 'failed',
        message: spawnError ?? (timedOut ? `Command exceeded ${timeout} ms.${cleanupWarning ? ` ${cleanupWarning}` : ''}` : 'Status records the process exit, not test coverage or application correctness.') });
    };
    timer = setTimeout(() => {
      timedOut = true;
      if (!child.pid) return;
      const fallback = () => {
        if (settled) return;
        cleanupWarning = 'Process-tree termination could not be confirmed. Only the direct child was signalled; inspect and stop leftover services manually.';
        child.kill();
        // Descendants may inherit pipe handles when Windows denies taskkill /T.
        // Bound the helper wait without claiming those descendants were stopped.
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        finish(child.exitCode, child.signalCode);
      };
      if (windows) {
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        cleanupTimer = setTimeout(() => { killer.kill(); fallback(); }, 2000);
        killer.on('error', fallback);
        killer.on('close', code => {
          if (settled) return;
          if (code !== 0) fallback();
          else {
            child.stdout.destroy();
            child.stderr.destroy();
            child.unref();
            finish(child.exitCode, child.signalCode);
          }
        });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { fallback(); }
        if (!settled) cleanupTimer = setTimeout(fallback, 2000);
      }
    }, timeout);
    child.on('close', finish);
  });
}

export async function verifyScript(repo, plan, script, { confirm = false, timeout = 60000 } = {}) {
  if (!confirm) throw new Error('Execution requires --confirm after the user approves the exact command and side effects.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(script ?? '')) throw new Error('Invalid script name.');
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 300000) throw new Error('Timeout must be 100–300000 ms.');
  const before = await collectTour(repo, plan);
  const info = await inspectRepository(repo);
  const startedAt = new Date().toISOString();
  const base = { schemaVersion: 1, kind: 'repo-guide-verification', script,
    command: info.manager ? [info.manager, 'run', script] : [],
    source: { file: 'package.json', key: `scripts.${script}`, value: info.scripts[script] ?? null },
    environment: { platform: process.platform, node: process.version },
    startedAt, beforeFingerprint: before.fingerprint, timeout };
  const execution = !info.manager || !Object.hasOwn(info.scripts, script)
    ? { status: 'blocked', exitCode: null, signal: null, stdout: '', stderr: '', truncated: false,
      message: !info.manager ? 'Package manager is unsupported or ambiguous.' : `Script ${script} is not declared in package.json.` }
    : await execute(info.manager, script, info.root, timeout);
  let afterFingerprint = null;
  try { afterFingerprint = (await collectTour(repo, plan)).fingerprint; } catch { /* Changed sources invalidate the record. */ }
  return { ...base, ...execution, finishedAt: new Date().toISOString(), afterFingerprint };
}
