# Playtest 监控设置（Google 表格）

所有玩家行为都会写进你自己的一张 Google 表格。整套东西没有第三方服务、不花钱、
数据只在你的 Google 账号里。配置一次大约 5 分钟。

**这套东西已经配好了。** 表格是 `ETCWeatherObservation_DATA`，接收端已部署，
网址也已经填进 `analytics.js`。下面第一、二节留着，是万一要换账号或换表时重做用的。

## 一、建表并部署接收端

1. 新建一张 Google 表格，名字随意，例如 `ARG Playtest Log`。
2. 在表格里点 **扩展程序 → Apps Script**，会打开一个绑定到这张表的脚本项目。
3. 把 `tools/analytics-appscript.gs` 的全部内容粘贴进去，覆盖原有的 `myFunction`，保存。
4. 在编辑器顶部的函数下拉框里选 **setUpSheets**，点运行。第一次运行会弹出授权，
   选你的账号 →「高级」→「转到（不安全）」→ 允许。这是 Google 对未发布脚本的
   标准提示，脚本只会访问它自己绑定的这张表。
   运行完表格里会出现五个工作表：`DASHBOARD`、`ANSWERS`、`EVENTS`、`ANDREW IDS`、
   `QUESTIONNAIRE`。
5. 点右上角 **部署 → 新建部署 → 类型选「网页应用」**，设置成：
   - 执行身份：**我**
   - 有权访问的人员：**任何人**（必须是这项，否则网站发来的数据会被拒绝）
6. 部署后复制那个以 `/exec` 结尾的网址。

## 二、把网址填进网站

打开 `src/analytics.js`，把网址填进第一行常量：

```js
const ENDPOINT = 'https://script.google.com/macros/s/AKfyc.../exec';
```

留空时整套监控是关闭状态：不发任何请求，网站行为完全不变。本地开发想关掉监控，
把它改回空字符串即可。

改完提交推送即可，GitHub Pages 会自动发布。

## 三、看数据

打开那张表格：

- **DASHBOARD**：主要看这一页。顶部是核心指标（独立访客、提交 Andrew ID、
  进入 Aquarium、完成问卷、下载票），下面是转化漏斗、每日活跃曲线、设备和语言分布，
  右边配了四张图。全部是公式，有人来就自动更新，不需要手动刷新或重跑脚本。
- **ANSWERS**：问卷答案分布。年龄分成五档，11 道选择题每题一个小表加一张饼图。
- **ANDREW IDS**：所有提交过的 Andrew ID 名单，带时间。
- **QUESTIONNAIRE**：每个完成问卷的人一行，姓名和 13 道题的答案各占一列。
  以后问卷加题也不用改脚本，新列会自动出现；但要想在 ANSWERS 里看到这道新题的图，
  得在脚本的 `CHOICE_QUESTIONS` 里补一行，再跑一次 `setUpSheets`。
- **EVENTS**：原始事件流，一行一个事件，用来追查具体某个人的完整路径
  （按 `VISITOR ID` 筛选即可）。

导出给组员就用表格自带的 **文件 → 下载 → CSV**。

两个维护用的函数，都在 Apps Script 编辑器里选中函数名点运行即可：

- `setUpSheets`：重建 `DASHBOARD` 和 `ANSWERS` 两页（含所有图）。可以反复跑，
  不会动已收集的数据。它没改 `doPost`，所以跑完不需要重新部署。
- `clearCollectedData`：清空 `EVENTS`、`ANDREW IDS`、`QUESTIONNAIRE` 里的所有数据行，
  表头、公式和图都保留。正式 playtest 开始前跑一次，把测试期间的数据清掉。

## 四、记录了哪些事件

| 事件名 | 触发时机 |
| --- | --- |
| `site_view` | 每次打开 Weather 站 |
| `first_contact_complete` | 看完开场通信并关闭弹窗 |
| `andrew_id_submitted` | 在 About 页验证 Andrew ID（附带 ID 本身） |
| `archive_unlocked` | 用 Access Key 解锁 Packet 0001/0002 |
| `aquarium_view` | 每次打开 Aquarium 站 |
| `registration_started` | 点 GET TICKET 开始填问卷 |
| `questionnaire_completed` | 提交最后一题（附带姓名和全部答案） |
| `ticket_downloaded` | 点 SAVE TICKET 导出 PNG |
| `ticket_reopened` | 已有票的人再次打开票 |

每个事件都带一个存在 localStorage 里的匿名 `VISITOR ID`。Aquarium 和 Weather 站
同域，所以同一个人在两个站的行为会串成同一条记录，漏斗才成立。

## 五、需要知道的几件事

- **清缓存或换设备会算成新访客。** 浏览器隐私模式同理。独立人数是下限，不是精确值。
- **`?reset=true` 不会重置访客 ID。** 它只清游戏进度，所以你自己反复测试不会把
  人数刷上去太多——但同一台机器重复走流程还是会重复记事件，正式统计前跑一次
  `clearCollectedData` 把测试数据清掉。
- **接收端是公开网址。** 网址本身写在网站 JS 里，理论上有人能照着往表里灌垃圾数据。
  Playtest 这种量级风险极低；真出问题就在 Apps Script 里重新部署换一个网址。
- **别把表格设成公开可见**，里面有 Andrew ID 和姓名，按需分享给组员就好。
