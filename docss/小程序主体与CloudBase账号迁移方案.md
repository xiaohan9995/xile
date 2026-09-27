# 小程序主体与 CloudBase 账号迁移方案

> 目标：将小程序、管理后台、CloudBase 云托管 API、MySQL、COS 从当前主体/账号，平滑迁移到另一个小程序主体（新微信账号）与另一个 CloudBase 账号（新微信账号）。
>
> 原则：以「可回滚、可验证、openid 无损」为前提。不要把 Key、密码、Token 写入仓库或本文件。

## 1. 现状与关键标识

| 项 | 当前值 | 迁移后 |
| --- | --- | --- |
| 小程序 AppID | `wxf34d7e608bc79d85` | 新主体 AppID |
| CloudBase 环境 | `xile-yoga-d4g2za8xi82a16810` | 新账号新 envId |
| 云托管域名 | `https://xile-yoga-297941-11-1305573525.sh.run.tcloudbase.com` | 新环境新域名 |
| 云托管服务名 | `xile-yoga` | 可沿用或改名 |
| 云函数 | `mp-auth-bridge` | 重新部署到新环境 |
| 管理后台 | Vue，同 CloudRun `/admin` 路径 | 随云托管一起迁移 |
| 数据库 | MySQL | 导出导入 |
| 对象存储 | COS | 跨账号复制 |

## 2. 两个必须先理解的风险

1. **换主体 → AppID 变 → openid 全变（最致命）**：微信小程序 `openid` 是 `AppID + 微信用户` 的哈希。换 AppID 后同一用户的 openid 完全不同，`users.openid` 与「教师↔微信」绑定关系全部失效。
2. **CloudBase 环境不能跨账号「迁移」，只能重建**：新账号下新建环境，重新部署云函数/云托管/数据库/存储，数据靠导出导入搬运。

## 3. 关键决策：小程序换主体方式

| 路径 | 说明 | openid 影响 | 结论 |
| --- | --- | --- | --- |
| A. 微信官方「主体迁移」 | 旧小程序后台发起迁到新主体 | AppID 变，但提供 openid 新旧转换接口，可批量映射 | ✅ 采用 |
| B. 重新注册新小程序 | 新主体直接注册 | openid 全新、无法转换，老用户需重授权+重绑教师 | 仅老用户极少时 |

采用 A：拿「旧 openid → 新 openid」映射表，数据层替换，用户基本无感。

## 4. 分步执行清单

### 4.0 冻结与备份

- [ ] 全量备份 MySQL，并验证可恢复到独立实例。
- [ ] 导出 COS 文件清单（bucket、region、对象列表）。
- [ ] 记录当前全部配置值：envId、appid、secret、云托管域名、各密钥。

### 4.1 新微信账号下建 CloudBase 环境

- [ ] 新账号创建 CloudBase 环境，记录新 envId。
- [ ] 迁 MySQL：旧库导出 → 新库导入，校验表结构与行数一致。
- [ ] 迁 COS：跨账号复制文件，校验完整性。
- [ ] 在新环境云托管配置环境变量：
  - [ ] `WECHAT_APPID` / `WECHAT_SECRET`（新小程序凭证）
  - [ ] `CLOUDBASE_AUTH_BRIDGE_SECRET`（云函数与云托管必须一致）
  - [ ] `JWT_SECRET_KEY` / `SECRET_KEY`（建议换新）
  - [ ] `MYSQL_DATABASE_URI`（新库连接）
  - [ ] COS 相关（bucket/region/凭据）
  - [ ] `TENCENT_MAP_KEY` / `TENCENT_MAP_WEB_SERVICE_KEY`
- [ ] 部署云函数 `mp-auth-bridge` 到新环境。
- [ ] 部署云托管服务，`GET /api/health` 返回 200。

### 4.2 小程序主体迁移（路径 A）

- [ ] 旧小程序后台发起主体迁移到新主体。
- [ ] 拿到新 AppID 与 openid 新旧转换接口。
- [ ] 新 CloudBase 环境绑定新小程序（控制台「小程序认证」）。

### 4.3 修改代码（见第 5 节清单）

### 4.4 openid 数据修复（核心，切换流量前完成）

- [ ] 用转换接口取「旧 openid → 新 openid」映射表。
- [ ] 批量 `UPDATE users SET openid = 新值`，并按需处理关联表。
- [ ] 校验替换前后用户数与教师绑定关系不丢失。

### 4.5 切换与验证

- [ ] 小程序后台更新 request/uploadFile/downloadFile 合法域名为新域名。
- [ ] 腾讯地图 Key 的 Referer 白名单加入新域名。
- [ ] 提交小程序审核 → 发布正式版，记录版本号与时间。
- [ ] 管理后台冒烟测试；真实微信号小程序冒烟测试。
- [ ] 旧环境保留几天作为回滚点。

## 5. 代码中需要改的位置

已硬编码，必须改：

```
miniprogram/app.js:28                     envId
miniprogram/app.js:38                     apiBaseUrl（云托管域名）
miniprogram/utils/request.js:5            prod.env
project.config.json:14                    appid
backend/cloudbaserc.json:2                envId
cloudfunctions/cloudbaserc.auth-bridge.json:3   envId
.env.local                                ENV_ID
cloudbaserc.json                          {{env.ENV_ID}}（模板，改 .env.local）
```

环境变量/控制台（不在代码里，但必须同步）：

```
WECHAT_APPID / WECHAT_SECRET              新小程序凭证
CLOUDBASE_AUTH_BRIDGE_SECRET              云函数与云托管一致（可沿用旧值）
JWT_SECRET_KEY / SECRET_KEY               建议换新
MYSQL / COS / TENCENT_MAP_KEY             新环境连接 + 地图 Referer 白名单
```

管理后台（`admin-src`）不含微信身份，随云托管一起迁移；管理员账号随 MySQL 迁移，无需额外处理。

## 6. 回滚方案

触发条件：核心登录/查询/证书/年审不可用、持续 5xx、openid 替换导致数据错误。

1. [ ] 停止继续发布与数据写入。
2. [ ] 若新环境已切流量，切回旧环境与旧小程序版本。
3. [ ] 验证 `/api/health`、管理员登录、小程序首页。
4. [ ] 若涉及 openid 替换，按已验证的备份恢复方案执行，不手工删数据。
5. [ ] 导出 `requestId` 与日志，完成分析后再安排修复。

## 7. 迁移完成记录

| 项目 | 结果 |
| --- | --- |
| 新 AppID | |
| 新 envId | |
| 新云托管域名 | |
| openid 替换用户数 | |
| 健康检查 | |
| 冒烟测试负责人 / 时间 | |
| 已知风险与后续事项 | |
