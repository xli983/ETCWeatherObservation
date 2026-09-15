# ETC Weather Observation

一个 ARG 的网站部分：海报 → 气象观测站（`etcweatherobservation.com`）→ 水族馆
（`/aquarium`）→ 拿到门票。纯静态，没有框架，没有构建步骤。

## 目录

```
src/            ← 线上就是这个目录，改它就是改网站
  index.html    气象站：CURRENT / ARCHIVE / ABOUT 三个视图
  script.js     气象站逻辑（倒计时、档案、Andrew ID 验证、开场通信）
  style.css
  analytics.js  监控埋点，两个站共用
  aquarium/     水族馆：首页 + 问卷 + 门票
  packets/      档案里展示的成品图（由 tools/prepare-packets.py 生成）
  assets/       站点用到的图片
  CNAME, robots.txt, sitemap.xml

art-source/     原始设计稿和 Figma 参考，不上线
tools/          脚本和文档，不上线
.github/        Pages 自动发布
```

## 本地预览

```bash
cd src
python -m http.server 8000
```

然后打开 <http://localhost:8000>。改完刷新即可，没有编译。

调试用的两个开关：任意页面加 `?reset=true` 清空本地进度重新体验；水族馆同理。

## 部署

推到 `main` 就自动发布，`.github/workflows/deploy.yml` 会把 `src/` 原样传给
GitHub Pages。Pages 的 Source 必须设成 **GitHub Actions**（Settings → Pages）。

## 关键常量

游戏里的固定值都在两个文件顶部的 `CONFIG` 里，改完 push 即可：

| 值 | 位置 |
| --- | --- |
| 开放时间 / 倒计时目标 `2026-09-26T00:00:00-04:00` | `src/script.js`、`src/aquarium/script.js` |
| 档案解锁密钥 | `src/script.js` |
| 门票编号 | `src/aquarium/script.js` |

密钥和票号是所有玩家共用的同一个值，这是 playtest 阶段有意简化的。

## 监控

玩家行为写进 Google 表格 `ETCWeatherObservation_DATA`，接收端是一个 Apps Script
网页应用，地址填在 `src/analytics.js` 顶部。埋点是"发了就忘"的，失败不会影响玩家。
配置和排查见 [tools/ANALYTICS-SETUP.md](tools/ANALYTICS-SETUP.md)。

## 重新生成 packet 图

原始稿放进 `art-source/`，然后：

```bash
python tools/prepare-packets.py
```

会把它们压到 1400px 宽输出到 `src/packets/`。
