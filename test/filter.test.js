'use strict';
const test = require('node:test');
const assert = require('node:assert');

require('../src/filter.js');
const { matches, defaults, normalize } = globalThis.MTF;

const CFG = { minImdb: 8, minDouban: 8, minYear: 2024 };
const row = (o) => Object.assign({ title: '', douban: null, imdb: null, year: 2025 }, o);

test('豆瓣达标即保留，即便 IMDb 不达标', () => {
  assert.strictEqual(matches(row({ douban: 8.2, imdb: 6.1 }), CFG), true);
});

test('IMDb 达标即保留，即便豆瓣不达标', () => {
  assert.strictEqual(matches(row({ douban: 6.1, imdb: 8.5 }), CFG), true);
});

test('缺一个评分源不影响另一个的判定', () => {
  assert.strictEqual(matches(row({ douban: 8.1, imdb: null }), CFG), true);
  assert.strictEqual(matches(row({ douban: null, imdb: 8.1 }), CFG), true);
});

test('两个评分都不达标则不保留', () => {
  assert.strictEqual(matches(row({ douban: 7.9, imdb: 7.9 }), CFG), false);
});

test('两个评分都缺失则不保留', () => {
  assert.strictEqual(matches(row({ douban: null, imdb: null }), CFG), false);
});

test('阈值是闭区间，正好等于阈值算达标', () => {
  assert.strictEqual(matches(row({ douban: 8 }), CFG), true);
  assert.strictEqual(matches(row({ imdb: 8 }), CFG), true);
});

test('年份不达标时分数再高也不保留', () => {
  assert.strictEqual(matches(row({ douban: 9.5, imdb: 9.5, year: 2023 }), CFG), false);
});

test('年份正好等于阈值算达标', () => {
  assert.strictEqual(matches(row({ douban: 8.5, year: 2024 }), CFG), true);
});

test('年份解析不出来时不保留', () => {
  assert.strictEqual(matches(row({ douban: 9.9, year: null }), CFG), false);
});

test('豆 0 参与比较，不会被当成缺失而放行', () => {
  assert.strictEqual(matches(row({ douban: 0, imdb: null }), CFG), false);
});

test('传入 null 行不抛错', () => {
  assert.strictEqual(matches(null, CFG), false);
});

test.describe('defaults', () => {
  test('年份默认是今年减五', () => {
    assert.strictEqual(defaults().minYear, new Date().getFullYear() - 5);
  });
  test('分数默认都是 7', () => {
    assert.strictEqual(defaults().minImdb, 7);
    assert.strictEqual(defaults().minDouban, 7);
  });
});

test.describe('normalize', () => {
  test('空输入回落到默认值', () => {
    assert.deepStrictEqual(normalize(undefined), defaults());
    assert.deepStrictEqual(normalize({}), defaults());
  });
  test('非法分数回落，不写入 NaN', () => {
    assert.strictEqual(normalize({ minImdb: '' }).minImdb, 7);
    assert.strictEqual(normalize({ minDouban: 'abc' }).minDouban, 7);
  });
  test('越界分数被夹到 0..10', () => {
    assert.strictEqual(normalize({ minImdb: 99 }).minImdb, 10);
    assert.strictEqual(normalize({ minDouban: -5 }).minDouban, 0);
  });
  test('字符串数字被接受', () => {
    assert.strictEqual(normalize({ minImdb: '7.5' }).minImdb, 7.5);
    assert.strictEqual(normalize({ minYear: '2010' }).minYear, 2010);
  });
  test('enabled 只有显式 false 才关闭', () => {
    assert.strictEqual(normalize({ enabled: false }).enabled, false);
    assert.strictEqual(normalize({}).enabled, true);
  });
});
