const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const labels = { not_run: '未执行 / Not run', passed: '命令通过 / Command passed', failed: '失败 / Failed',
  timed_out: '超时 / Timed out', blocked: '环境阻塞 / Blocked', stale: '待复核 / Stale' };
const badge = state => `<span class="badge ${Object.hasOwn(labels, state) ? state : 'not_run'}">${labels[state] ?? labels.not_run}</span>`;

export function renderHTML(tour) {
  const verification = tour.verification;
  const navigation = tour.steps.map((step, i) => `<button class="step-link" data-index="${i}" type="button"><span class="number">${String(i + 1).padStart(2, '0')}</span><span>${escape(step.title)}<small>${escape(step.file)}</small></span></button>`).join('');
  const steps = tour.steps.map((step, i) => `<article class="step" data-step="${i}">
    <p class="eyebrow">STEP ${String(i + 1).padStart(2, '0')} / ${tour.steps.length}</p>
    <h2 tabindex="-1">${escape(step.title)}</h2><p class="explanation">${escape(step.explanation)}</p>
    <div class="source"><strong>来源 / Source</strong><span>${escape(step.file)} : ${step.startLine}–${step.endLine}</span></div>
    <pre class="code"><code>${step.excerpt.split('\n').map((line, n) => `<span class="code-line"><span class="line-number" aria-hidden="true">${step.startLine + n}</span><span>${escape(line)}</span></span>`).join('')}</code></pre>
    <details><summary>文件指纹 / File fingerprint</summary><code>${escape(step.sha256)}</code></details>
  </article>`).join('');
  const commands = Object.entries(tour.checks.scripts).map(([name, value]) => `<li><code>${escape(tour.checks.manager ?? '?')} run ${escape(name)}</code><span>${escape(value)}</span></li>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escape(tour.title)} · RepoGuide</title>
<style>
:root{color-scheme:light;--paper:#f7f6f2;--ink:#192e31;--muted:#5a6b6d;--line:#d8dfda;--accent:#17685d}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,"Microsoft YaHei",sans-serif}button{font:inherit}header{padding:30px 5vw 25px;border-bottom:1px solid var(--line);background:#fff}.brand{font-weight:750;letter-spacing:.08em}.brand span{color:var(--accent);font-weight:400;margin-left:12px;font-size:13px}.eyebrow{font-size:12px;letter-spacing:.13em;color:var(--accent);font-weight:700}h1{font-size:clamp(26px,4vw,40px);line-height:1.25;margin:14px 0}header p{margin:8px 0;color:var(--muted);max-width:900px}.meta{display:flex;flex-wrap:wrap;gap:8px 24px;font-size:12px}.layout{display:grid;grid-template-columns:280px minmax(0,1fr);max-width:1440px;margin:auto}aside{padding:28px 20px;border-right:1px solid var(--line)}nav{display:grid;gap:8px;position:sticky;top:20px}.step-link{border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;padding:12px;display:flex;gap:12px;color:var(--ink);cursor:pointer}.step-link:hover{background:#e9eeea}.step-link[aria-current=step]{background:#fff;border-color:var(--accent);box-shadow:0 3px 12px #192e3109}.number{color:var(--accent);font-size:12px;padding-top:3px}.step-link small{display:block;color:var(--muted);font-size:11px;overflow-wrap:anywhere}main{padding:28px clamp(20px,4vw,60px);min-width:0}h2{font-size:27px;line-height:1.35;margin:8px 0 18px}h2:focus{outline:none}.explanation{max-width:850px;color:var(--muted);white-space:pre-wrap}.source{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;background:#e8efea;padding:12px 16px;border-radius:7px 7px 0 0;overflow-wrap:anywhere}.source strong{color:var(--accent)}.code{background:#162a2e;color:#d8e6df;padding:18px 0;margin:0 0 12px;border-radius:0 0 7px 7px;overflow:auto;font:13px/1.9 ui-monospace,Consolas,monospace}.code-line{display:flex;min-height:1.9em;padding-right:20px}.line-number{color:#87a49e;min-width:50px;text-align:right;margin-right:22px;user-select:none}details{font-size:12px;color:var(--muted);overflow-wrap:anywhere}summary{cursor:pointer}.controls{display:flex;justify-content:space-between;align-items:center;gap:14px;margin:24px 0 34px}.controls button{background:#fff;border:1px solid var(--line);border-radius:7px;padding:9px 16px;cursor:pointer}.controls button:disabled{opacity:.4;cursor:default}.controls span{font-size:13px;color:var(--muted)}section{border-top:1px solid var(--line);padding:25px 0}h3{font-size:18px;margin:0 0 14px}.badge{display:inline-block;padding:4px 12px;border-radius:20px;background:#e6e8e6;color:#475857;font-size:12px}.passed{background:#d9eee3;color:#155f3e}.failed,.timed_out{background:#f7e0dc;color:#963b2b}.blocked,.stale{background:#f4ead0;color:#765a12}section p{font-size:14px;color:var(--muted)}section pre{padding:15px;background:#fff;border:1px solid var(--line);overflow:auto;white-space:pre-wrap;max-height:300px}ul{padding:0;list-style:none}li{display:flex;flex-direction:column;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px}li span{color:var(--muted);overflow-wrap:anywhere}footer{font-size:12px;color:var(--muted);padding:20px 0}button:focus-visible,summary:focus-visible{outline:3px solid #729dce;outline-offset:3px}[hidden]{display:none!important}@media(max-width:760px){.layout{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid var(--line);padding:15px}nav{position:static;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}main{padding:22px 16px}.brand span{display:block;margin-left:0}h2{font-size:23px}}@media print{aside,.controls{display:none}.layout{display:block}.step[hidden]{display:block!important}.step{break-inside:avoid}.code{white-space:pre-wrap}}
</style></head><body>
<header><div class="brand">REPOGUIDE <span>代码导览 / SOURCE-BACKED TOUR</span></div>
<h1>${escape(tour.title)}</h1><p>${escape(tour.task)}</p>
<div class="meta"><span>仓库 / Repository: ${escape(tour.repository.name)}</span><span>Commit: ${escape(tour.repository.commit ?? 'unavailable')}</span><span>工作区 / Dirty: ${escape(tour.repository.dirty ?? 'unknown')}</span><span>${escape(tour.generatedAt)}</span></div></header>
<div class="layout"><aside><p class="eyebrow">阅读路线 / READING PATH</p><nav aria-label="导览步骤 / Tour steps">${navigation}</nav></aside>
<main>${steps}<div class="controls" hidden><button id="prev" type="button">← 上一步 / Previous</button><span id="progress" aria-live="polite"></span><button id="next" type="button">下一步 / Next →</button></div>
<section aria-labelledby="verification-title"><h3 id="verification-title">运行核验 / Command verification ${badge(verification.status)}</h3>
<p>${escape(verification.message)}</p>${verification.command ? `<pre>${escape(verification.command.join(' '))}</pre><p>Exit: ${escape(verification.exitCode ?? '—')} · ${escape(verification.startedAt)} → ${escape(verification.finishedAt)}</p><p>Node ${escape(verification.environment?.node)} · ${escape(verification.environment?.platform)} · 输出截断 / Truncated: ${escape(verification.truncated)}</p><details><summary>执行日志 / Execution log</summary><pre>${escape(verification.stdout)}\n${escape(verification.stderr)}</pre></details>` : ''}
</section><section><h3>发现的命令 / Declared scripts</h3><p>来源 / Source: package.json#scripts。下列声明不代表已经执行。Declarations are not execution results.</p><ul>${commands || '<li>没有找到脚本 / No scripts found.</li>'}</ul></section>
${tour.warnings.length ? `<section><h3>提示 / Warnings</h3><ul>${tour.warnings.map(warning => `<li>${escape(warning)}</li>`).join('')}</ul></section>` : ''}
<footer>这是生成时的快照；修改源码后请重新导出。Snapshot only; rebuild after source changes. Local execution records are not signed attestations. No commands run in this page.</footer>
</main></div><script>
(() => {
  const steps = [...document.querySelectorAll('[data-step]')];
  const links = [...document.querySelectorAll('[data-index]')];
  const previous = document.getElementById('prev');
  const next = document.getElementById('next');
  let index = 0;
  function show(value, focus) {
    index = Math.max(0, Math.min(value, steps.length - 1));
    steps.forEach((step, i) => { step.hidden = i !== index; });
    links.forEach((link, i) => { if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current'); });
    previous.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    document.getElementById('progress').textContent = (index + 1) + ' / ' + steps.length;
    if (focus) steps[index].querySelector('h2').focus();
  }
  links.forEach((link, i) => link.addEventListener('click', () => show(i, true)));
  previous.addEventListener('click', () => show(index - 1, true));
  next.addEventListener('click', () => show(index + 1, true));
  document.querySelector('.controls').hidden = false;
  show(0, false);
})();
</script></body></html>`;
}

export function renderMarkdown(tour) {
  const text = value => String(value).replace(/[<>]/g, char => char === '<' ? '&lt;' : '&gt;');
  const fenced = value => {
    const fence = '`'.repeat(Math.max(3, ...[...String(value).matchAll(/`+/g)].map(match => match[0].length + 1)));
    return `${fence}\n${value}\n${fence}`;
  };
  return [`# ${text(tour.title)}`, text(tour.task),
    `Repository: ${text(tour.repository.name)} | Commit: ${tour.repository.commit ?? 'unavailable'} | Dirty: ${tour.repository.dirty ?? 'unknown'}`,
    `Generated: ${tour.generatedAt}`,
    ...tour.steps.flatMap((step, i) => [`## ${i + 1}. ${text(step.title)}`, text(step.explanation),
      `Source: ${text(step.file)}:${step.startLine}–${step.endLine} | SHA-256: ${step.sha256}`, fenced(step.excerpt)]),
    '## Command verification', `Status: ${tour.verification.status}`, text(tour.verification.message),
    ...(tour.verification.command ? [fenced(tour.verification.command.join(' ')),
      `Exit: ${tour.verification.exitCode ?? '—'} | ${tour.verification.startedAt} → ${tour.verification.finishedAt}`,
      fenced(`${tour.verification.stdout}\n${tour.verification.stderr}`)] : []),
    '## Declared scripts (not execution results)', fenced(JSON.stringify(tour.checks, null, 2)),
    'Source excerpts are checked; explanations remain model-authored and require review. Local records are not signed attestations.',
    ...tour.warnings.map(text), ''].join('\n\n');
}
