/**
 * 列表行的 HTML 夹具。
 * 所有 class 串都是 2026-09-06 从 kp.m-team.cc/browse/movie 实际抓取后
 * 去掉 src/href 得到的，不是手写臆测的结构。
 */
'use strict';

const TITLE_SPAN = (title) =>
  `<span class="ant-typography block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap mr-1 css-ypkju9 css-var-rk"><strong>${title}</strong></span>`;

const DOUBAN_BADGE = (value, trailing) =>
  `<a><span class="ant-typography inline-block font-medium h-[20px] text-white px-[0.33em] bg-[#007711] text-[12px] leading-[20px] rounded-[2px] ${trailing ? ' mr-2' : '  '} css-ypkju9 css-var-rk"><span class="align-middle">豆</span> <span class="align-middle"> ${value}</span></span></a>`;

const IMDB_BADGE = (value) =>
  `<a><span class="ant-typography inline-block font-medium h-[20px] text-black px-[0.33em] bg-[#F5C518] text-[12px] leading-[20px] rounded-[2px]   css-ypkju9 css-var-rk"><span class="align-middle">IMDB</span> <span class="align-middle"> ${value}</span></span></a>`;

/**
 * @param {{title: string, douban?: string, imdb?: string, desc?: string}} opts
 *   douban / imdb 传字符串，因为站点可能渲染成 "N/A"
 */
function rowHtml(opts) {
  const badges =
    (opts.douban !== undefined ? DOUBAN_BADGE(opts.douban, opts.imdb !== undefined) : '') +
    (opts.imdb !== undefined ? IMDB_BADGE(opts.imdb) : '');
  const desc = opts.desc === undefined ? '不要换手 / Don\'t Change Hands | 类别：剧情  喜剧  惊悚' : opts.desc;

  return `<tr class="bg-sticky_normal"><td class="border-0 border-b border-solid border-[--mt-line-color] p-0 "><div class="flex flex-nowrap items-center"><div class="ant-image css-ypkju9 css-var-rk ant-image-css-var"><div class="ant-image-cover ant-image-cover-center"><div class="ant-image-mask-info"><span class="anticon anticon-eye !mr-0"></span></div></div></div><div class="w-2 flex-grow pl-[12px]"><div><a><div class="inline-flex max-w-full items-center pr-3 whitespace-nowrap">${TITLE_SPAN(opts.title)}<a class="mr-[6px]"></a><span class="ant-tag ant-tag-solid mt-default font-semibold mr-0 css-ypkju9 css-var-rk"><span class="uppercase">Free</span> 2d 18h</span></div></a><br><div class="inline-flex max-w-full items-center pr-3 whitespace-nowrap"><a><span class="ant-tag ant-tag-filled cat-parent-100 cat-421 font-semibold css-ypkju9 css-var-rk">電影/BluRay</span></a><span class="ant-typography whitespace-normal css-ypkju9 css-var-rk">${desc}</span></div></div></div><div><div class="flex rows-center justify-end flex-nowrap"><div></div></div><div class="flex items-center justify-end flex-nowrap"><div>${badges}</div></div></div></div></td><td>0</td><td>2 天</td><td>21.96 GB</td><td>314</td><td>5</td><td></td></tr>`;
}

module.exports = { rowHtml };
