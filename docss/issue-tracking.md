# Issue 跟踪记录

> 本文档记录项目开发过程中发现的问题、修复状态和遗留事项。

---

## 已修复 Issues

### #001 [SECURITY] JWT Token Type 混淆 — 权限提升

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/admin/__init__.py` |

**问题描述：** `require_admin_token` 装饰器解码 JWT 后只检查 `AdminUser` 表是否存在对应 ID，但未校验 token 中的 `type` 声明。小程序用户的 JWT 和管理端 JWT 共用同一签名密钥（flask-jwt-extended），如果 `User.id == AdminUser.id`（两表都从 1 自增），小程序用户的 token 可通过管理端认证。

**修复方案：** 在 `require_admin_token` 中添加 `if decoded.get("type") != "admin": return 401` 校验。

---

### #002 [BUG] pageSize=0 导致无限加载循环

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 分页参数 `pageSize` 只设了上限（50）没设下限。传入 `pageSize=0` 时 `LIMIT 0` 返回空列表但 `hasMore = (page * 0 < total)` 永远为 true，前端 `onReachBottom` 无限触发。

**修复方案：** `page_size = max(min(int(...), 50), 1)`，确保最小为 1。

---

### #003 [BUG] 分页参数非数字导致 500 错误

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 低 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** `int(request.args.get("page", 1))` 在收到 `?page=abc` 时抛出 `ValueError`，返回未处理的 500 错误。

**修复方案：** 包裹 try/except，异常时回退为默认值。

---

### #004 [BUG] 生产环境 4xx 错误静默返回 Mock 数据

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/utils/request.js` |

**问题描述：** `request.js` 的 `fallback()` 函数在任何非 401/非 5xx 错误时都尝试用 mock 数据 resolve Promise。在生产环境下（云托管模式），如果服务器返回 403/404，用户会看到虚假的演示数据渲染在界面上。

**修复方案：** `fallback()` 中增加判断：如果 `config.useCloudContainer` 为 true（生产模式），直接 reject，不使用 mock 数据。

---

### #005 [BUG] 工作室页面客户端过滤与服务端分页不兼容

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/pages/studios/studios.js`, `backend/app/api/mp/__init__.py` |

**问题描述：** 工作室页面从服务器获取分页数据（每页 20 条），然后在客户端对已加载数据应用城市/关键词过滤。第 2 页及之后的匹配结果对用户不可见。

**修复方案：**
1. 后端 `/api/mp/studios` 添加 `city` 和 `q` 查询参数支持服务端过滤
2. 前端改为将过滤参数传给服务器，移除客户端 `applyFilters` 逻辑
3. 搜索输入增加 400ms 防抖

---

### #006 [BUG] handleAuthError 多次触发导致导航竞争

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 低 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/utils/request.js` |

**问题描述：** 多个并发请求同时收到 401 时，`handleAuthError` 被调用多次，触发多个 `wx.reLaunch` 调用，可能产生导航竞争条件。

**修复方案：** 添加模块级 `_authHandling` 标志位，确保只处理一次。

---

### #007 [MINOR] Mock 数据缺少分页字段

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 低 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/utils/mock-data.js` |

**问题描述：** 教师搜索和工作室列表的 mock 响应缺少 `hasMore`、`page`、`pageSize` 字段，导致开发模式下无限滚动永远不生效。

**修复方案：** 补充分页字段。

---

### #008 [CRITICAL] 年审批准不延期 — next_valid_until 等于 valid_until

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 严重 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py`, `backend/app/api/admin/__init__.py` |

**问题描述：** 提交年审时 `next_valid_until` 被设为当前 `valid_until`（即相同值），admin 批准后写回原值，年审流程无实际延期效果。

**修复方案：** 提交时根据 `teacher.tier.review_cycle_years` 计算 `next_valid_until = valid_until + cycle_years`。

---

### #009 [CRITICAL] 已批准年审可被重新提交覆盖

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 严重 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 教师重新提交同年审核时，代码删除已批准的文件并重置状态为 submitted，相当于撤销了审批结果。

**修复方案：** 增加 `if review.status == "approved": return 409` 守卫。

---

### #010 [HIGH] 教师状态无自动过期机制

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 无定时任务或惰性检查将教师从 active→expiring→expired 转变。过期教师永远显示"认证有效"。

**修复方案：** 添加 `_refresh_teacher_status()` 惰性刷新函数，在读取教师状态时根据 `valid_until` 自动更新（90天内→expiring，过期→expired）。

---

### #011 [HIGH] handleAuthError 清除错误的存储键

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/utils/request.js` |

**问题描述：** `handleAuthError` 中 `wx.removeStorageSync('teacher_id')` 但实际存储键为 `'currentTeacherId'`（定义在 auth.js），导致 401 后教师身份状态残留。

**修复方案：** 改为 `wx.removeStorageSync('currentTeacherId')`。

---

### #012 [HIGH] daysLeft=0 被 || 运算符误判为 falsy

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/packageTeacher/home/home.js` |

**问题描述：** `t.daysLeft || 286` 在 daysLeft 为 0（当天到期）时显示 286 天，教师不知已过期。

**修复方案：** 改为 `t.daysLeft != null ? t.daysLeft : 0`。

---

### #013 [HIGH] teacher_id 无唯一性检查 — 多用户可绑定同一教师

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/admin/__init__.py` |

**问题描述：** `PUT /api/admin/users/<id>/role` 绑定 teacher_id 时不检查是否已被其他用户占用，可导致第二人操作他人年审。

**修复方案：** 添加 `User.query.filter(teacher_id == X, id != current).first()` 唯一性检查。

---

### #014 [HIGH] review_year 无范围校验

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 可提交 2040 年或负数年份的审核记录，造成数据污染。

**修复方案：** 限制 `review_year` 只能为当前年或前一年。

---

### #015 [HIGH] L5 教师豁免未在提交端强制执行

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 高 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** L5（荣誉导师）应豁免年审，但提交端不检查 `tier.review_required`。

**修复方案：** 添加 `if not teacher.tier.review_required: return 400` 校验。

---

### #016 [MEDIUM] 提交按钮双击竞态

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/packageTeacher/review-apply/review-apply.js` |

**问题描述：** `setData({ submitting: true })` 到 render 线程生效存在延迟，双击可触发两次提交。

**修复方案：** 在函数开头添加 `if (this.data.submitting) return` JS 侧守卫。

---

### #017 [MEDIUM] admin invite 无角色白名单

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/admin/__init__.py` |

**问题描述：** `role` 参数接受任意字符串，可创建非法角色的管理员账号。

**修复方案：** 添加白名单校验 `if role not in ("admin", "super_admin"): return 400`。

---

### #018 [MEDIUM] 隐藏教师名通过工作室列表泄露

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 教师被 hidden 后其工作室仍显示其姓名，违反隐藏意图。

**修复方案：** `_studio_summary` 中增加 `owner.status != "hidden"` 判断。

---

### #019 [MEDIUM] 并发提交同年审核 → 500 错误

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 并发请求 TOCTOU 导致 IntegrityError 未被捕获，返回 500。

**修复方案：** 捕获 `IntegrityError` 返回 409 Conflict。

---

### #020 [MEDIUM] 重提交不刷新 next_valid_until

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**问题描述：** 重新提交（rejected 后再提交）时不更新 previous/next_valid_until，可能导致审批后缩短有效期。

**修复方案：** resubmit 分支中同步刷新 `previous_valid_until` 和 `next_valid_until`。

---

### #021 [MEDIUM] 上传部分失败后 fileKey 过期

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 中 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/packageTeacher/review-apply/review-apply.js` |

**问题描述：** 首次上传失败后 retry 时跳过已上传文件（基于缓存 fileKey），但该 key 对应的 presign URL 可能已过期。

**修复方案：** 每次提交前清空所有 fileKey，强制重新上传。

---

### #022 [LOW] PullDownRefresh 不取消搜索 debounce

| 字段 | 内容 |
|------|------|
| 发现日期 | 2026-06-22 |
| 严重等级 | 低 |
| 状态 | ✅ 已修复 |
| 影响文件 | `miniprogram/pages/studios/studios.js` |

**问题描述：** 下拉刷新和搜索 debounce 同时触发导致双请求。

**修复方案：** `onPullDownRefresh` 中清除 `_searchTimer`。

---

## 已知遗留事项

### WeChat Access Token 缓存为进程级别

| 字段 | 内容 |
|------|------|
| 严重等级 | 低 |
| 状态 | 📋 已知，暂不处理 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**描述：** `_wx_token_cache` 为模块级字典，Gunicorn 多 worker 模式下每个 worker 独立缓存。冷启动时可能产生多次 WeChat token API 调用。当前规模（2-4 worker）下影响可忽略，大规模时可切换为 Redis 共享缓存。

---

### 分页查询双次 SQL（COUNT + SELECT）

| 字段 | 内容 |
|------|------|
| 严重等级 | 低 |
| 状态 | 📋 已知，暂不处理 |
| 影响文件 | `backend/app/api/mp/__init__.py` |

**描述：** 分页实现使用 `query.count()` + `query.offset().limit()` 两次查询。当前数据量级（百到千级教师/工作室）下性能影响可忽略。如需优化可改为 `fetch pageSize+1` 的方式推断 hasMore。

---

### 测试覆盖：分页字段未断言

| 字段 | 内容 |
|------|------|
| 严重等级 | 低 |
| 状态 | 📋 待补充 |
| 影响文件 | `backend/tests/test_api_contract.py` |

**描述：** 现有测试只断言 `total` 和 `items`，未覆盖 `hasMore`/`page`/`pageSize` 字段。后续重构可能误删这些字段而测试仍然通过。

---

## 变更日志

| 日期 | 操作 |
|------|------|
| 2026-06-22 | 初始创建，记录 code review 发现的 7 个问题并修复 |
| 2026-06-22 | 全面逻辑漏洞审查，修复 14 个逻辑漏洞（详见下方 #008-#021） |
