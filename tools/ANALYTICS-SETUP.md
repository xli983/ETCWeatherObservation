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
   运行完表格里会出现四个工作表：`SUMMARY`、`EVENTS`、`ANDREW IDS`、`QUESTIONNAIRE`。
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

- **SUMMARY**：漏斗总览，每一步的独立人数、事件次数、相对第一步的转化率，
  公式是实时的，不需要手动刷新。
- **ANDREW IDS**：所有提交过的 Andrew ID 名单，带时间。
- **QUESTIONNAIRE**：每个完成问卷的人一行，姓名和 13 道题的答案各占一列。
  以后问卷加题也不用改脚本，新列会自动出现。
- **EVENTS**：原始事件流，一行一个事件，用来追查具体某个人的完整路径
  （按 `VISITOR ID` 筛选即可）。

导出给组员就用表格自带的 **文件 → 下载 → CSV**。

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
  人数刷上去太多——但同一台机器重复走流程还是会重复记事件，正式统计前建议
  先把 `EVENTS` 里测试期间的行删掉。
- **接收端是公开网址。** 网址本身写在网站 JS 里，理论上有人能照着往表里灌垃圾数据。
  Playtest 这种量级风险极低；真出问题就在 Apps Script 里重新部署换一个网址。
- **别把表格设成公开可见**，里面有 Andrew ID 和姓名，按需分享给组员就好。
