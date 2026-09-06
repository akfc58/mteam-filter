/** 筛选面板：三个阈值输入 + 总开关 + 命中计数。设置存 chrome.storage.sync。 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'mtfConfig';
  var SAVE_DEBOUNCE_MS = 300;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function numberField(labelText, className, attrs) {
    var label = el('label');
    label.appendChild(document.createTextNode(labelText));
    var input = el('input', className);
    input.type = 'number';
    Object.keys(attrs).forEach(function (k) { input.setAttribute(k, attrs[k]); });
    label.appendChild(input);
    return { label: label, input: input };
  }

  /**
   * @param {(cfg: object) => void} onChange 阈值变化时回调，已 debounce
   * @returns {{root: HTMLElement, setConfig: Function, setCount: Function, setWarning: Function}}
   */
  function createPanel(onChange) {
    var panel = el('div', 'mtf-panel');

    var toggleLabel = el('label', 'mtf-toggle');
    var toggle = el('input');
    toggle.type = 'checkbox';
    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(el('span', null, '高亮筛选'));

    var fields = el('div', 'mtf-fields');
    var imdb = numberField('IMDb ≥', 'mtf-imdb', { min: '0', max: '10', step: '0.1' });
    var douban = numberField('豆瓣 ≥', 'mtf-douban', { min: '0', max: '10', step: '0.1' });
    var year = numberField('年份 ≥', 'mtf-year', { min: '1900', max: '2100', step: '1' });
    fields.appendChild(imdb.label);
    fields.appendChild(douban.label);
    fields.appendChild(year.label);

    var count = el('span', 'mtf-count');
    var warn = el('div', 'mtf-warn');
    warn.hidden = true;

    panel.appendChild(toggleLabel);
    panel.appendChild(fields);
    panel.appendChild(count);
    panel.appendChild(warn);

    function read() {
      return root.MTF.normalize({
        enabled: toggle.checked,
        minImdb: imdb.input.value,
        minDouban: douban.input.value,
        minYear: year.input.value
      });
    }

    var timer = null;
    function scheduleChange() {
      panel.classList.toggle('mtf-off', !toggle.checked);
      clearTimeout(timer);
      timer = setTimeout(function () { onChange(read()); }, SAVE_DEBOUNCE_MS);
    }

    // 开关立刻生效，输入框 debounce，避免打字过程中反复刷新一百行
    toggle.addEventListener('change', function () {
      panel.classList.toggle('mtf-off', !toggle.checked);
      clearTimeout(timer);
      onChange(read());
    });
    [imdb.input, douban.input, year.input].forEach(function (input) {
      input.addEventListener('input', scheduleChange);
    });

    return {
      root: panel,
      setConfig: function (cfg) {
        toggle.checked = cfg.enabled;
        imdb.input.value = cfg.minImdb;
        douban.input.value = cfg.minDouban;
        year.input.value = cfg.minYear;
        panel.classList.toggle('mtf-off', !cfg.enabled);
      },
      setCount: function (total, hit) {
        count.textContent = '';
        count.appendChild(document.createTextNode('本页 ' + total + ' 条，符合 '));
        count.appendChild(el('b', null, String(hit)));
        count.appendChild(document.createTextNode(' 条'));
      },
      setWarning: function (message) {
        warn.textContent = message || '';
        warn.hidden = !message;
      }
    };
  }

  function loadConfig(callback) {
    var fallback = root.MTF.defaults();
    try {
      chrome.storage.sync.get(STORAGE_KEY, function (result) {
        if (chrome.runtime.lastError) return callback(fallback);
        callback(root.MTF.normalize((result && result[STORAGE_KEY]) || fallback));
      });
    } catch (e) {
      callback(fallback);
    }
  }

  function saveConfig(cfg) {
    try {
      var payload = {};
      payload[STORAGE_KEY] = cfg;
      chrome.storage.sync.set(payload, function () {
        // 读一下清掉 lastError，避免 Chrome 在控制台报未处理错误
        void chrome.runtime.lastError;
      });
    } catch (e) {
      /* 存储不可用时不影响本页筛选 */
    }
  }

  root.MTF = root.MTF || {};
  root.MTF.createPanel = createPanel;
  root.MTF.loadConfig = loadConfig;
  root.MTF.saveConfig = saveConfig;
})(typeof globalThis !== 'undefined' ? globalThis : this);
