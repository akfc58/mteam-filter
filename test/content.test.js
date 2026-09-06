'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { rowHtml } = require('./fixtures');

const SCRIPTS = ['parser.js', 'filter.js', 'panel.js', 'content.js']
  .map((f) => path.join(__dirname, '..', 'src', f));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 按 manifest 里的顺序把内容脚本加载进一个 jsdom 页面 */
function loadExtension(rows, options) {
  const opts = options || {};
  const dom = new JSDOM(
    `<body><div id="app"><div class="mt-4 rounded-t-[8px] overflow-hidden">
       <table><thead><tr><th>標題</th></tr></thead><tbody>${rows.join('')}</tbody></table>
     </div></div></body>`,
    { url: opts.url || 'https://kp.m-team.cc/browse/movie' }
  );

  const stored = opts.stored || {};
  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.MutationObserver = dom.window.MutationObserver;
  global.chrome = {
    runtime: { lastError: null },
    storage: {
      sync: {
        get: (key, cb) => cb({ [key]: stored[key] }),
        set: (obj, cb) => { Object.assign(stored, obj); if (cb) cb(); }
      }
    }
  };
  delete global.MTF;
  SCRIPTS.forEach((f) => { delete require.cache[require.resolve(f)]; require(f); });

  return { dom, document: dom.window.document, stored };
}

const hitTitles = (doc) =>
  [...doc.querySelectorAll('tr.mtf-hit')].map((tr) => tr.querySelector('strong').textContent);

const MIXED = [
  rowHtml({ title: 'Recent Great 2025 BluRay 1080p', douban: '8.6' }),           // 命中
  rowHtml({ title: 'Recent Weak 2025 BluRay 1080p', douban: '6.1', imdb: '5' }), // 分数不够
  rowHtml({ title: 'Old Classic 1994 BluRay 1080p', douban: '9.7', imdb: '9.3' }), // 年份不够
  rowHtml({ title: 'Recent Unrated 2026 BluRay 1080p' }),                        // 无评分
  rowHtml({ title: 'Recent Imdb Only 2026 BluRay 1080p', imdb: '8.4' })          // 命中
];

test('面板挂在表格容器前面，且只挂一个', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  const panels = document.querySelectorAll('.mtf-panel');
  assert.strictEqual(panels.length, 1);
  assert.strictEqual(panels[0].nextElementSibling, document.querySelector('table').parentElement);
});

test('默认阈值下命中行加 mtf-hit，其余加 mtf-miss', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  assert.deepStrictEqual(hitTitles(document), [
    'Recent Great 2025 BluRay 1080p',
    'Recent Imdb Only 2026 BluRay 1080p'
  ]);
  assert.strictEqual(document.querySelectorAll('tr.mtf-miss').length, 3);
});

test('计数显示本页总数和命中数', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  assert.strictEqual(document.querySelector('.mtf-count').textContent, '本页 5 条，符合 2 条');
});

test('关掉总开关后两个标记都摘掉，页面回到原样', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  const toggle = document.querySelector('.mtf-toggle input');
  toggle.checked = false;
  toggle.dispatchEvent(new document.defaultView.Event('change'));
  await wait(300);
  assert.strictEqual(document.querySelectorAll('tr.mtf-hit, tr.mtf-miss').length, 0);
});

test('调低阈值后重新计算命中', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  const input = document.querySelector('.mtf-douban');
  input.value = '6';
  input.dispatchEvent(new document.defaultView.Event('input'));
  await wait(600);
  assert.deepStrictEqual(hitTitles(document), [
    'Recent Great 2025 BluRay 1080p',
    'Recent Weak 2025 BluRay 1080p',
    'Recent Imdb Only 2026 BluRay 1080p'
  ]);
});

test('阈值变更写回存储', async () => {
  const { document, stored } = loadExtension(MIXED);
  await wait(300);
  const input = document.querySelector('.mtf-year');
  input.value = '1990';
  input.dispatchEvent(new document.defaultView.Event('input'));
  await wait(600);
  assert.strictEqual(stored.mtfConfig.minYear, 1990);
});

test('读取已存的设置而不是默认值', async () => {
  const { document } = loadExtension(MIXED, {
    stored: { mtfConfig: { enabled: true, minImdb: 8, minDouban: 8, minYear: 1990 } }
  });
  await wait(300);
  assert.strictEqual(document.querySelector('.mtf-year').value, '1990');
  // 年份放宽到 1990 后，老片也进来了
  assert.ok(hitTitles(document).includes('Old Classic 1994 BluRay 1080p'));
});

test('翻页重渲染后自动重新标记', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = rowHtml({ title: 'Page Two Hit 2026 BluRay 1080p', douban: '9.1' });
  await wait(400);
  assert.deepStrictEqual(hitTitles(document), ['Page Two Hit 2026 BluRay 1080p']);
  assert.strictEqual(document.querySelectorAll('.mtf-panel').length, 1);
});

test('计数更新不会把 MutationObserver 自己激活成死循环', async () => {
  const { document } = loadExtension(MIXED);
  await wait(300);
  const before = document.querySelector('.mtf-count').textContent;
  await wait(700);
  assert.strictEqual(document.querySelector('.mtf-count').textContent, before);
  assert.strictEqual(document.querySelectorAll('.mtf-panel').length, 1);
});

test('整页一条评分都认不出来时给出改版警告', async () => {
  const rows = [];
  for (let i = 0; i < 12; i++) rows.push(rowHtml({ title: `No Badge ${2025} Release ${i} 1080p` }));
  const { document } = loadExtension(rows);
  await wait(300);
  const warn = document.querySelector('.mtf-warn');
  assert.strictEqual(warn.hidden, false);
  assert.match(warn.textContent, /站点结构可能已变更/);
});

test('非 browse 页面不挂面板', async () => {
  const { document } = loadExtension(MIXED, { url: 'https://kp.m-team.cc/detail/12345' });
  await wait(300);
  assert.strictEqual(document.querySelector('.mtf-panel'), null);
  assert.strictEqual(document.querySelectorAll('tr.mtf-hit, tr.mtf-miss').length, 0);
});

test('storage 不可用时回落到默认值且不抛错', async () => {
  const rows = MIXED;
  const dom = new JSDOM(
    `<body><div class="mt-4"><table><tbody>${rows.join('')}</tbody></table></div></body>`,
    { url: 'https://kp.m-team.cc/browse/movie' }
  );
  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.MutationObserver = dom.window.MutationObserver;
  global.chrome = undefined;
  delete global.MTF;
  SCRIPTS.forEach((f) => { delete require.cache[require.resolve(f)]; require(f); });
  await wait(300);
  assert.strictEqual(dom.window.document.querySelectorAll('.mtf-panel').length, 1);
  assert.strictEqual(dom.window.document.querySelectorAll('tr.mtf-hit').length, 2);
});
