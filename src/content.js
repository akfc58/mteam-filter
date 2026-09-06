/**
 * 编排：找到列表表格 -> 挂面板 -> 给达标行加 .mtf-hit。
 *
 * 站点是 SPA，翻页、排序、切换分区都是原地重渲染而不是整页导航，
 * 所以统一靠一个 body 上的 MutationObserver 触发幂等的 sync()，
 * 不去 patch history（内容脚本在隔离世界，patch 不到页面自己的调用）。
 */
(function (root) {
  'use strict';

  var MTF = root.MTF;
  var HIT_CLASS = 'mtf-hit';
  var MISS_CLASS = 'mtf-miss';
  var SYNC_DEBOUNCE_MS = 120;

  var config = MTF.defaults();
  var panel = null;
  var syncTimer = null;

  function isBrowsePage() {
    return /^\/browse(\/|$)/.test(location.pathname);
  }

  function findTable() {
    var tables = document.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      if (tables[i].querySelector('tbody tr td .ant-typography')) return tables[i];
    }
    return null;
  }

  function clearHighlights() {
    var marked = document.querySelectorAll('tr.' + HIT_CLASS + ', tr.' + MISS_CLASS);
    for (var i = 0; i < marked.length; i++) {
      marked[i].classList.remove(HIT_CLASS, MISS_CLASS);
    }
  }

  function teardown() {
    clearHighlights();
    if (panel && panel.root.parentNode) panel.root.parentNode.removeChild(panel.root);
    panel = null;
  }

  function apply(table) {
    var rows = table.querySelectorAll('tbody tr');
    var total = 0;
    var hits = 0;
    var rated = 0;

    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var data = MTF.parseRow(tr);
      if (!data) continue;
      total++;
      if (data.douban !== null || data.imdb !== null) rated++;

      var hit = MTF.matches(data, config);
      if (hit) hits++;
      // 关掉总开关时两个标记都摘掉，页面回到原样
      tr.classList.toggle(HIT_CLASS, config.enabled && hit);
      tr.classList.toggle(MISS_CLASS, config.enabled && !hit);
    }

    panel.setCount(total, hits);
    // 一行评分都认不出来，多半是站点改了角标结构，而不是真的都没评分
    panel.setWarning(total >= 10 && rated === 0
      ? '未在本页识别到任何评分角标，站点结构可能已变更，插件需要更新。'
      : '');
  }

  function sync() {
    if (!isBrowsePage()) {
      if (panel) teardown();
      return;
    }

    var table = findTable();
    if (!table) return;

    if (!panel || !panel.root.isConnected) {
      panel = MTF.createPanel(function (next) {
        config = next;
        MTF.saveConfig(next);
        var t = findTable();
        if (t) apply(t);
      });
      panel.setConfig(config);
      var anchor = table.parentNode;
      anchor.parentNode.insertBefore(panel.root, anchor);
    }

    apply(table);
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, SYNC_DEBOUNCE_MS);
  }

  function insidePanel(node) {
    return !!(node && node.nodeType === 1 && node.closest && node.closest('.mtf-panel'));
  }

  MTF.loadConfig(function (cfg) {
    config = cfg;
    if (panel) panel.setConfig(cfg);
    sync();

    // 只看 childList：加 .mtf-hit 是属性变更，不会把自己再触发一遍。
    // 面板内部的文本更新（命中计数）要排掉，否则 setCount 会自激成死循环。
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (!insidePanel(mutations[i].target)) {
          scheduleSync();
          return;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
