/**
 * 从种子列表的一行 <tr> 中提取豆瓣分、IMDb 分和影片年份。
 *
 * 角标的 class 里带 emotion 哈希（css-ypkju9），站点重新构建就会变，
 * 所以用两个不会变的锚点：Tailwind 任意值背景色类，和角标自身的文本格式。
 */
(function (root) {
  'use strict';

  // 豆瓣角标绿底、IMDb 角标黄底，站点写死在 class 里
  var DOUBAN_BG = 'bg-[#007711]';
  var IMDB_BG = 'bg-[#F5C518]';

  // 语言切换后角标前缀可能变，作为兜底而非主判据
  var DOUBAN_TEXT = /^豆\s/;
  var IMDB_TEXT = /^IMDB\s/i;

  /** 取字符串结尾的数字。"豆  7.8" -> 7.8，"豆  N/A" -> null */
  function trailingNumber(text) {
    if (!text) return null;
    var m = /(\d+(?:\.\d+)?)\s*$/.exec(String(text).trim());
    if (!m) return null;
    var n = parseFloat(m[1]);
    return isNaN(n) ? null : n;
  }

  /** 在单元格里找指定角标并取分数，找不到或非数字都返回 null */
  function badgeValue(cell, bgClass, textRe) {
    var el = cell.querySelector('span[class*="' + bgClass + '"]');
    if (!el) {
      var spans = cell.querySelectorAll('span.ant-typography');
      for (var i = 0; i < spans.length; i++) {
        if (textRe.test(spans[i].textContent || '')) {
          el = spans[i];
          break;
        }
      }
    }
    return el ? trailingNumber(el.textContent) : null;
  }

  /**
   * 从发布名里取影片年份。发布名形如
   * "Change pas de main AKA Don't Change Hands 1975 Blu-ray 1080p AVC ..."
   * 取落在 1900..(今年+1) 区间的最后一个四位数，避开 1080/2160 这类分辨率。
   */
  function parseYear(title) {
    if (!title) return null;
    var re = /(?:^|\D)((?:19|20)\d{2})(?!\d)/g;
    var max = new Date().getFullYear() + 1;
    var found = null;
    var m;
    while ((m = re.exec(title)) !== null) {
      var y = parseInt(m[1], 10);
      if (y >= 1900 && y <= max) found = y;
    }
    return found;
  }

  /** @returns {{title:string, douban:number|null, imdb:number|null, year:number|null}|null} */
  function parseRow(tr) {
    var cell = tr && tr.cells && tr.cells[0];
    if (!cell) return null;

    // 标题在 <strong> 里，角标没有 <strong>，所以这个选择器不会误命中角标
    var titleEl = cell.querySelector('.ant-typography strong') || cell.querySelector('.ant-typography');
    var title = titleEl ? (titleEl.textContent || '').trim() : '';

    return {
      title: title,
      douban: badgeValue(cell, DOUBAN_BG, DOUBAN_TEXT),
      imdb: badgeValue(cell, IMDB_BG, IMDB_TEXT),
      year: parseYear(title)
    };
  }

  root.MTF = root.MTF || {};
  root.MTF.parseRow = parseRow;
  root.MTF.parseYear = parseYear;
  root.MTF.trailingNumber = trailingNumber;
})(typeof globalThis !== 'undefined' ? globalThis : this);
