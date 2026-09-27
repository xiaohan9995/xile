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

1. **换主体 → AppID 变 → openid 全变**：微信小程序 `openid` 是 `AppID + 微信用户` 的哈希，换 AppID 后同一用户的 openid 完全不同，`users.openid` 记录失效。

   本项目影响面很小：用户身份**不依赖微信**，`users` 表里只有少数用户存了 openid，其余本来就用「身份证号 + 密码」登录。因此采用「用户自助重新关联教师」即可，不强制做 openid 批量映射。

2. **CloudBase 环境不能跨账号「迁移」，只能重建**：新账号下新建环境，重新部署云函数/云托管/数据库/存储，数据靠导出导入搬运。
3. **对象存储引用必须与账号解耦**：COS 桶名里带腾讯云账号 APPID，换账号后桶名必然变化。历史数据若存绝对 URL 会全部失效，因此库里统一存**对象键**（见第 5 节）。

## 3. 关键决策：小程序换主体方式

| 路径 | 说明 | openid 处理 | 结论 |
| --- | --- | --- | --- |
| A. 用户自助重新关联（推荐） | 用户在新小程序里用「身份证号 + 密码」重新登录并关联教师 | 无需映射，旧 openid 记录作废 | ✅ 采用 |
| B. 官方「主体迁移」+ openid 映射 | 旧小程序后台发起主体迁移，拿旧→新 openid 映射表批量替换 | 用户无感，但依赖官方接口与迁移窗口 | 可选，作为 A 的加速手段 |

采用 A：`POST /api/mp/auth/link-teacher-by-password` 与小程序 `packageTeacher/link-teacher` 页面已经支持，不需要新开发。openid 变化只表现为这些用户首次进入时重新关联一次。

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

### 4.2 小程序主体迁移

- [ ] 旧小程序后台发起主体迁移到新主体（或在主体下重新注册小程序）。
- [ ] 拿到新 AppID，更新 `project.config.json`。
- [ ] 新 CloudBase 环境绑定新小程序（控制台「小程序认证」）。
- [ ] 可选：若要走「用户无感」，在迁移窗口内获取「旧 openid → 新 openid」映射表。

### 4.3 修改代码（见第 5 节清单）

### 4.4 用户重新关联教师（核心，切换流量前完成）

- [ ] 迁移前导出 `users`（id / openid / username / teacher_id）作为对照表。
- [ ] 迁移后通知教师用「身份证号 + 密码」重新登录并关联教师（流程已有，无需新开发）。
- [ ] 可选（路径 B）：批量 `UPDATE users SET openid = 新值`，再校验绑定关系。
- [ ] 校验：`teacher_id` 非空的用户数、教师端可见数据与迁移前一致。

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
MYSQL_DATABASE_URI                        新环境数据库连接
COS_BUCKET / COS_REGION / COS_SECRET_ID / COS_SECRET_KEY   新账号对象存储（桶名会随账号变化）
TENCENT_MAP_KEY                           地图 Referer 白名单加入新域名
```

管理后台（`admin-src`）不含微信身份，随云托管一起迁移；管理员账号随 MySQL 迁移，无需额外处理。

### 存储引用（已改造，迁移前再核对一次）

历史数据里曾把头像/证书/横幅存成**绝对 COS 地址**，域名包含当前账号 APPID，换账号后必然失效。现已统一改为存**对象键**：

- 代码：`backend/app/utils/storage.py` 的 `storage_reference()` 入库前归一成对象键（COS 绝对地址→键；微信头像等外部地址原样保留）。
- 数据：历史绝对地址已批量归一（teachers / users / studios / system_configs）。迁移前若又有新增绝对地址，用同样的 SQL 再跑一次：

```
UPDATE <表> SET <列> = REPLACE(<列>, 'https://<旧桶>.cos.<region>.myqcloud.com/', '')
WHERE <列> LIKE '%<旧桶>.cos%';
```

涉及列：`teachers.avatar_url` / `teachers.certificate_url` / `users.avatar_url` /
`studios.cover_url` / `studios.images` / `studios.contact_image` / `system_configs.value`（`home_banner_url`、`studio_banner_url`）。

迁移后核对（结果应为 0；`thirdwx.qlogo.cn` 的微信头像保留属正常）：

```
SELECT COUNT(*) FROM teachers WHERE COALESCE(avatar_url,'') LIKE '%myqcloud.com%'
  OR COALESCE(certificate_url,'') LIKE '%myqcloud.com%';
```

改完之后，换 COS 桶或换腾讯云账号只需要改 `COS_BUCKET` / `COS_REGION` 环境变量，历史数据不需要动。

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
