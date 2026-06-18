# 喜乐瑜伽教师认证中心

这是喜乐瑜伽教师认证中心第一期可验证版本，包含微信小程序、管理端后台和 Flask API 后端。

## 工作区

- `miniprogram/`：微信小程序，覆盖首页、教师查询、教师详情、工作室列表、工作室详情、我的认证、认证申请、材料上传、提交成功、数字证书、年审记录。
- `admin-src/`：管理端 Vue 3 应用，覆盖数据看板、教师管理、年审管理、工作室管理、批量导入、数据分析、权限管理、系统设置、登录页。
- `backend/`：Flask API 服务，提供小程序公开查询、教师自查、年审材料提交，以及管理端教师、工作室、年审和看板接口。
- `docss/`：需求、技术方案、视觉 QA 证据和整套 UI 复刻验证清单。
- `prototype/product-design/喜乐瑜伽UI设计/`：产品设计原型参考代码。

## 本地启动

后端：

```bash
python -m pip install -r requirements.txt
python backend/run_dev.py
```

默认 API 地址为 `http://127.0.0.1:5000`。小程序 `miniprogram/app.js` 当前也指向这个本地地址；后端未启动时，小程序会使用本地 mock 数据兜底预览。

管理端：

```bash
cd admin-src
npm install
npm run dev
```

管理端开发登录：

```text
username: admin
password: password
Authorization: Bearer dev-admin-token
```

## 核心接口

小程序：

- `GET /api/mp/teachers/search?q=张`
- `GET /api/mp/teachers/<id>/summary`
- `GET /api/mp/teachers/<id>/certification`
- `POST /api/mp/reviews`
- `GET /api/mp/studios`
- `GET /api/mp/studios/<id>`

管理端：

- `POST /api/admin/login`
- `GET /api/admin/stats/dashboard`
- `GET /api/admin/teachers`
- `GET /api/admin/studios`
- `GET /api/admin/reviews`
- `POST /api/admin/reviews/<id>/decision`

## 验证

统一验证入口：

```bash
node scripts\verify_all.js
```

该命令会依次执行：

- 项目级静态验证：`node scripts\verify_project_static.js`
- 小程序静态验证：`node scripts\verify_miniprogram_static.js`
- 原型源码契约验证：`node scripts\verify_prototype_contract.js`
- 小程序运行时冒烟验证：`node scripts\verify_miniprogram_runtime.js`
- 后端 API 合约测试：`python -m pytest backend/tests/test_api_contract.py -q`
- 后端 HTTP 冒烟验证：`python scripts\verify_backend_http.py`
- 管理端测试与静态契约：`npm.cmd test`
- 管理端生产构建：`npm.cmd run build`
- 管理端预览冒烟验证：`node scripts\verify_admin_preview.js`

独立视觉验证：

```bash
python scripts\verify_admin_visual.py
```

该命令会启动管理端生产预览服务，使用本机 Chrome headless 截取登录页、看板、教师管理、年审管理、工作室管理、数据分析、系统设置，并检查截图尺寸和非空像素。截图输出在 `docss/visual-qa/admin-browser/`，可通过 `docss/visual-qa/admin-browser/index.html` 集中查看。该命令因本机 Chrome headless 退出较慢，没有放入默认 `verify_all`。

当前人工阶段验收项：在微信开发者工具中逐页确认小程序真实渲染。已有 CLI 诊断记录保留在 `docss/visual-qa/`，此前阻塞点是微信开发者工具 IDE HTTP 服务未完成初始化，不是项目编译错误；该项不再作为自动化交付阻塞门槛。

微信开发者工具 CLI 诊断：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\diagnose_wechat_cli.ps1 -Port 9437 -Command open -DisableGpu -Cleanup
```

该脚本会尝试打开当前项目，记录 stdout/stderr 到 `docss/visual-qa/`，汇总 `.ide/.cli/.ide-status`、端口监听和开发者工具进程，并可在诊断后清理残留进程。`-Command` 支持 `open` 或 `auto`；若输出 `.ide=<missing>`，说明失败仍发生在 IDE HTTP 服务初始化阶段，尚未进入小程序项目编译。
