# M-Team 评分筛选高亮

在 M-Team 种子列表页按 **IMDb 分 / 豆瓣分 / 影片年份** 高亮达标条目，不达标的压暗。
站点自带的高级搜索没有评分和影片年份两个维度，这个扩展补上。

## 安装

1. 打开 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」，选中本目录（含 `manifest.json` 的那一层）
4. 刷新 <https://kp.m-team.cc/browse/movie>

改完代码后在扩展页点一下刷新图标，再刷新站点页面即可，不需要重新加载。

## 用法

面板出现在高级搜索栏和列表之间：

```
[✓] 高亮筛选    IMDb ≥ [8]  豆瓣 ≥ [8]  年份 ≥ [2024]      本页 100 条，符合 12 条
```

- **命中**：左侧蓝紫色条 + 淡蓝紫底
- **未命中**：整行半透明压暗
- 取消勾选「高亮筛选」，页面立刻回到原样

判定规则：

```
年份 ≥ 年份阈值
且（豆瓣 ≥ 豆瓣阈值 或 IMDb ≥ IMDb阈值）
```

- 两个评分源是 **或** 的关系，只有一个分数的条目不会因为缺另一个被漏掉
- 两个分数都没有（含站点显示 `豆 N/A`）→ 不命中
- 年份解析不出来 → 不命中

阈值存在 `chrome.storage.sync`，跨设备同步。默认年份阈值是「今年 − 2」，动态计算。

## 作用范围

所有 `kp.m-team.cc/browse/*` 列表页（电影、电视、综合等共用同一套表格）。
**只处理当前页的 100 条** —— 分页在服务端，扩展不会替你翻页。

## 开发

```bash
pnpm install
pnpm test        # node:test + jsdom，含解析、判定和 jsdom 集成测试
```

| 文件 | 职责 |
|---|---|
| `src/parser.js` | 从 `<tr>` 提取豆瓣分、IMDb 分、年份（纯函数 + DOM 读取） |
| `src/filter.js` | 达标判定、默认值、设置归一化（纯函数） |
| `src/panel.js` | 筛选面板 UI 与 `chrome.storage` 读写 |
| `src/content.js` | 编排：挂载、MutationObserver、打标记 |
| `src/panel.css` | 高亮样式与面板样式，含 `data-theme="dark"` 变体 |

设计说明见 [`docs/design.md`](docs/design.md)，已知问题见 [`docs/known-issues-and-follow-ups.md`](docs/known-issues-and-follow-ups.md)。
