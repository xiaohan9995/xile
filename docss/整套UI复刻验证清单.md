# 喜乐瑜伽整套 UI 复刻验证清单

更新时间：2026-06-18

## 管理端

- 数据看板：已按 Stitch 后台原型重构，已生成截图 `docss/visual-qa/admin-dashboard-after.png`。
- 数据看板：已按 Stitch 后台原型重构，并接入 `/api/admin/stats/dashboard`，接口不可用时保留本地演示数据；截图 `docss/visual-qa/admin-dashboard-after.png`。
- 教师管理 roster：已按原型重构教师名录、搜索条、证书编号表格和吊销操作，接入 `/api/admin/teachers`，并补本地新增导师弹窗/删除确认；截图 `docss/visual-qa/admin-teachers-after.png`、`docss/visual-qa/admin-teachers-20260618.png`、`docss/visual-qa/admin-teacher-create-modal-20260618.png`。
- 年审管理：已从空态升级为待审队列、审核详情、材料预览，接入 `/api/admin/reviews` 和 `/api/admin/reviews/<id>/decision`，通过/驳回会优先提交后端，接口不可用时保留本地演示状态；截图 `docss/visual-qa/admin-reviews-20260618.png`、`docss/visual-qa/admin-review-detail-20260618.png`。
- 工作室管理：已按原型重构合作工作室表格，接入 `/api/admin/studios`，并补搜索、新增工作室弹窗、删除确认；截图 `docss/visual-qa/admin-studios-after.png`、`docss/visual-qa/admin-studios-20260618.png`、`docss/visual-qa/admin-studio-create-modal-20260618.png`。
- 数据分析：已补原型侧栏对应页面，截图 `docss/visual-qa/admin-analytics-20260618.png`。
- 权限管理：已补原型侧栏对应页面，截图 `docss/visual-qa/admin-permissions-20260618.png`。
- 系统设置：已补原型侧栏对应页面，截图 `docss/visual-qa/admin-settings-20260618.png`。
- 登录页：已改为独立路由渲染，并接入后端开发登录接口，截图 `docss/visual-qa/admin-login-after.png`。
- 管理端映射测试：已新增 `npm.cmd test`，覆盖 dashboard、教师、工作室、年审接口数据到页面状态的映射，以及年审审核决策请求载荷；同一命令会继续执行 `src/verifyAdminStatic.js`，检查后台 9 个路由页面、侧栏入口、核心文案、API 接入点、旧品牌文案和疑似乱码。
- 构建验证：`npm.cmd run build` 通过；已移除未使用的 Element Plus 全量注册和依赖，并通过 Vite `manualChunks` 拆分 Vue/vendor，当前无大 chunk 警告。
- 项目级静态验证：已新增 `scripts/verify_project_static.js`，集中检查后端/小程序/管理端疑似乱码、管理端未使用大依赖、vendor 拆包配置和验证清单关键状态。
- 统一验证入口：已新增 `scripts/verify_all.js`，按顺序执行项目级静态验证、小程序静态验证、后端 API 合约、管理端测试和管理端生产构建。
- 后端运行时冒烟：已新增 `scripts/verify_backend_http.py`，使用临时 sqlite 数据库和独立端口启动真实 Flask HTTP 服务，检查小程序公开接口、教师自查、工作室列表、管理端登录和看板接口。
- 管理端运行时冒烟：已新增 `scripts/verify_admin_preview.js`，构建后启动 Vite preview，检查 `/admin/`、主要后台路由和静态 JS/CSS 资源可访问。
- 管理端浏览器视觉验证：已新增 `scripts/verify_admin_visual.py`，使用本机 Chrome headless 截取登录页、看板、教师管理、年审管理、工作室管理、数据分析、系统设置，并检查 1440x1000 截图尺寸、非空像素和基本对比度；截图位于 `docss/visual-qa/admin-browser/`，索引页为 `docss/visual-qa/admin-browser/index.html`。

## 微信小程序

- 首页：已恢复中文文案，入口已接入教师查询、认证申请 Step1、工作室发现；已按主流手机比例调整为全宽 hero，不再把时间或微信顶部导航做进 hero。
- 导师查询：已接入关键词搜索和 L2/L3/全部筛选，并调整为更接近 Stitch 原型的搜索面板、等级筛选和教师卡片比例。
- 导师详情：已补资料字段、年审记录、证书查看、客服提示等菜单交互，且未保留“联系他”按钮。
- 工作室发现：已接入关键词搜索、城市筛选、数据图片和标签，并补视觉横幅与结果统计。
- 工作室详情：已重构为自定义头部、沉浸封面、场馆信息卡、数据驱动标签、有赞学堂预约提示。
- 数据兜底：已新增小程序本地 mock 数据，后端未启动时教师/工作室列表与详情仍可预览。
- 我的认证：已调整为认证中心结构，接入 `/api/mp/teachers/<id>/certification` 展示教师自己的认证状态、有效期、剩余天数，并补有赞学堂占位交互。
- 认证申请 Step1：已新增。
- 上传材料 Step2：已补文件选择、文件名回显、提交中状态，并接入 `/api/mp/reviews` 创建年审材料提交；后端未启动时使用本地 mock 兜底。
- 提交成功：已新增。
- 数字证书：已修复 WXML 标签兼容，接入教师认证接口展示姓名、等级、头像和核准登记日，补下载、分享、纸质证书反馈。
- 年审记录：已修复 WXML 标签兼容和等级样式，接入教师认证接口展示当前等级、有效期和历史年审记录，补全部记录反馈。
- 静态验证：已新增 `scripts/verify_miniprogram_static.js`，检查 11 个页面的 JS/JSON、WXML 标签、路由、sitemap 覆盖、陈旧品牌文案、疑似乱码、高风险 WXSS 规则、核心页面关键中文文案契约，以及教师端自查/年审提交 JS 接口契约；2026-06-18 当前通过。
- 运行时冒烟：已新增 `scripts/verify_miniprogram_runtime.js`，使用模拟 `Page`/`wx` 环境和本地 mock 数据验证教师查询、教师详情、工作室列表、工作室详情、我的认证、年审记录、材料上传提交等页面 JS 主流程。
- 导航验证：所有自绘顶部栏页面已统一 `navigationStyle: custom`，避免微信原生导航与页面头部重叠。
- sitemap：已补齐主包与教师分包全部页面。

## 后端

- 管理端登录：已新增 `/api/admin/login` 开发登录接口。
- 管理端数据接口：已新增 `/api/admin/teachers`、`/api/admin/studios`、`/api/admin/reviews` 和 `/api/admin/reviews/<id>/decision`，支持管理端读取教师/工作室/年审队列并提交年审通过或驳回。
- 小程序年审提交接口：已新增 `/api/mp/reviews`，教师端可提交年审材料元数据，后端创建/更新 `AnnualReview` 与 `ReviewFile`，管理端年审列表可继续审核。
- 小程序教师自查接口：已新增 `/api/mp/teachers/<id>/certification`，教师端可读取自己的认证概况、剩余天数、年审周期和年审记录。
- 年审材料种子：已补 demo 年审附件数据，管理端审核队列接口可返回材料列表。
- 接口合同测试：`python -m pytest backend/tests/test_api_contract.py -q` 通过，当前 16 个测试通过。

## 本轮验证命令

- `node scripts\verify_miniprogram_static.js`：通过，11 个小程序页面。
- `node scripts\verify_miniprogram_runtime.js`：通过，小程序关键页面 JS 主流程冒烟验证。
- `node scripts\verify_prototype_contract.js`：通过，原型源码覆盖小程序、管理端、工作室、认证、年审核心页面契约。
- `node scripts\verify_project_static.js`：通过，118 个源文件。
- `python -m pytest backend/tests/test_api_contract.py -q`：通过，16 个测试。
- `python scripts\verify_backend_http.py`：通过，真实 HTTP 服务核心接口冒烟验证。
- `npm.cmd test`（`admin-src`）：通过，5 个管理端映射/请求测试，并通过管理端路由/页面/文案/API 静态契约校验。
- `npm.cmd run build`（`admin-src`）：通过；当前无大 chunk 警告。
- `node scripts\verify_admin_preview.js`：通过，管理端生产预览服务和主要路由可访问。
- `python scripts\verify_admin_visual.py`：通过，生成并校验 7 张管理端浏览器截图。
- `node scripts\verify_all.js`：通过，一次性执行上述全部自动化验证。

## 阶段验收边界

- 小程序真实渲染由项目方在微信开发者工具中进行阶段验收；建议逐页检查首页、导师查询、导师详情、工作室发现、工作室详情、我的认证、认证申请、材料上传、提交成功、数字证书、年审记录。
- 自动化交付侧不再把微信开发者工具 CLI 截图作为阻塞门槛，避免继续消耗时间在本机 IDE HTTP 服务初始化问题上。
- 本机已发现微信开发者工具 CLI：`C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`；`--help` 可用。
- 2026-06-18 进一步诊断：`open --project D:\work\xile --port 9434 --lang zh --debug` 能拉起微信开发者工具 Stable v2.01.2510290 主进程，且本地 `.cli=3799`、`.ide-status=On`，但未生成 `.ide=9434` 端口文件，`9434/3799` 均无监听；CLI stderr 为 `#initialize-error: wait IDE port timeout`。这说明当前失败点在微信开发者工具 IDE HTTP 服务未完成初始化，尚未进入项目编译阶段。
- 2026-06-18 16:46 复测：`powershell -ExecutionPolicy Bypass -File scripts\diagnose_wechat_cli.ps1 -Port 9437 -DisableGpu -Cleanup` 仍显示 `.ide=<missing>`、`.cli=3799`、`.ide-status=On`，9437/3799 均无监听；脚本已自动清理残留开发者工具进程。
- 2026-06-18 19:59 复测：`powershell -ExecutionPolicy Bypass -File scripts\diagnose_wechat_cli.ps1 -Port 9438 -Command auto -DisableGpu -Cleanup` 同样显示 `.ide=<missing>`、`.cli=3799`、`.ide-status=On`，9438/3799 均无监听；说明 `open` 与 `auto --trust-project` 两条 CLI 路径都未进入项目编译/渲染阶段。
- 本轮微信工具证据文件：`docss/visual-qa/wechat-open-9434-20260618.log`、`docss/visual-qa/wechat-open-9434-20260618.err.log`、`docss/visual-qa/wechat-cli-timeout-desktop-20260618.png`。
- 管理端仍有少量视觉细节可继续微调，例如操作图标和原型 lucide 图标风格完全一致、顶部/侧栏图标体系统一。
