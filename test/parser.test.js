'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const { rowHtml } = require('./fixtures');

require('../src/parser.js');
const { parseRow, parseYear, trailingNumber } = globalThis.MTF;

function row(opts) {
  const dom = new JSDOM(`<table><tbody>${rowHtml(opts)}</tbody></table>`);
  return dom.window.document.querySelector('tr');
}

test('两个评分都有时都能解析出来', () => {
  const r = parseRow(row({
    title: "Change pas de main AKA Don't Change Hands 1975 Blu-ray 1080p AVC DTS-HD MA 2.0-MKu",
    douban: '5.6',
    imdb: '5.4'
  }));
  assert.strictEqual(r.douban, 5.6);
  assert.strictEqual(r.imdb, 5.4);
  assert.strictEqual(r.year, 1975);
});

test('只有豆瓣角标时 imdb 为 null', () => {
  const r = parseRow(row({
    title: 'The Secret Agent 2025 BluRay 1080p AVC DTS-HD MA5.1-MTeam',
    douban: '7.8'
  }));
  assert.strictEqual(r.douban, 7.8);
  assert.strictEqual(r.imdb, null);
});

test('只有 IMDb 角标时 douban 为 null，且能解析整数分', () => {
  const r = parseRow(row({
    title: 'Leatherface Texas Chainsaw Massacre III 1990 1080p Theatrical GER BluRay AVC DTS-HD MA 5.1-DIY',
    imdb: '5'
  }));
  assert.strictEqual(r.douban, null);
  assert.strictEqual(r.imdb, 5);
  assert.strictEqual(r.year, 1990);
});

test('豆 N/A 解析为 null 而不是 NaN', () => {
  const r = parseRow(row({
    title: 'Devil in the Flesh 1986 FRA BluRay 1080p x265 DTS-HD MA 2.0-LK@UBits',
    douban: 'N/A',
    imdb: '6.2'
  }));
  assert.strictEqual(r.douban, null);
  assert.strictEqual(r.imdb, 6.2);
});

test('豆 0 是真实分数，不是缺失', () => {
  const r = parseRow(row({ title: 'Corruption 1963 BluRay 1080p AVC LPCM1.0-MTeam', douban: '0' }));
  assert.strictEqual(r.douban, 0);
});

test('完全没有角标时两个分数都是 null', () => {
  const r = parseRow(row({ title: 'Some Release 2024 1080p WEB-DL' }));
  assert.strictEqual(r.douban, null);
  assert.strictEqual(r.imdb, null);
});

test('标题取的是发布名，不会串到简介或角标', () => {
  const r = parseRow(row({ title: 'Nouvelle Vague 2025 BluRay 1080p AVC DTS-HD MA5.1-MTeam', douban: '7' }));
  assert.strictEqual(r.title, 'Nouvelle Vague 2025 BluRay 1080p AVC DTS-HD MA5.1-MTeam');
});

test.describe('parseYear', () => {
  test('分辨率不会被当成年份', () => {
    assert.strictEqual(parseYear('Forbidden Planet 1956 UHD BluRay 2160p HEVC LPCM1.0-MTeam'), 1956);
    assert.strictEqual(parseYear('Go 1999 UHD BluRay 2160p HEVC DTS-HD MA5.1-MTeam'), 1999);
  });

  test('片名里的未来年份被区间挡掉，取真实年份', () => {
    assert.strictEqual(parseYear('Blade Runner 2049 2017 UHD BluRay 2160p'), 2017);
  });

  test('片名和发布年都合法时取靠后的那个', () => {
    assert.strictEqual(parseYear('2001 A Space Odyssey 1968 BluRay 1080p'), 1968);
  });

  test('开头就是年份也能取到', () => {
    assert.strictEqual(parseYear('1917 2019 BluRay 1080p'), 2019);
  });

  test('没有年份时返回 null', () => {
    assert.strictEqual(parseYear('Some Release 1080p WEB-DL'), null);
    assert.strictEqual(parseYear(''), null);
  });
});

test.describe('trailingNumber', () => {
  test('容忍角标内部的多余空白', () => {
    assert.strictEqual(trailingNumber('豆  7.8'), 7.8);
    assert.strictEqual(trailingNumber('IMDB  5'), 5);
  });
  test('非数字返回 null', () => {
    assert.strictEqual(trailingNumber('豆  N/A'), null);
    assert.strictEqual(trailingNumber(''), null);
    assert.strictEqual(trailingNumber(null), null);
  });
});
