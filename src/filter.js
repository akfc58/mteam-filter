/** 判定一行是否达标，以及默认阈值。纯函数，无 DOM 依赖。 */
(function (root) {
  'use strict';

  /** 默认：IMDb 7 分、豆瓣 7 分、近五年（今年 - 5，含当年） */
  function defaults() {
    return {
      enabled: true,
      minImdb: 7,
      minDouban: 7,
      minYear: new Date().getFullYear() - 5
    };
  }

  /**
   * 年份达标 且 分数达标。
   * 分数达标 = 两个评分源任一达标（OR）；两个都没有分数则视为不达标。
   * 年份取不到也视为不达标，和「都没评分就不高亮」保持一致。
   */
  function matches(row, cfg) {
    if (!row) return false;
    if (row.year === null || row.year < cfg.minYear) return false;

    var hasDouban = row.douban !== null;
    var hasImdb = row.imdb !== null;
    if (!hasDouban && !hasImdb) return false;

    return (hasDouban && row.douban >= cfg.minDouban) ||
           (hasImdb && row.imdb >= cfg.minImdb);
  }

  /** 把任意来源的设置收敛成合法值，避免空输入或越界写进存储 */
  function normalize(raw) {
    var d = defaults();
    var src = raw || {};
    return {
      enabled: src.enabled !== false,
      minImdb: clamp(src.minImdb, 0, 10, d.minImdb),
      minDouban: clamp(src.minDouban, 0, 10, d.minDouban),
      minYear: clamp(src.minYear, 1900, new Date().getFullYear() + 1, d.minYear)
    };
  }

  function clamp(value, min, max, fallback) {
    var n = typeof value === 'number' ? value : parseFloat(value);
    if (n === null || isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  root.MTF = root.MTF || {};
  root.MTF.matches = matches;
  root.MTF.defaults = defaults;
  root.MTF.normalize = normalize;
})(typeof globalThis !== 'undefined' ? globalThis : this);
