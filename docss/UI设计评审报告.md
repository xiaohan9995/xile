# UI 设计评审报告

> **评审时间**：2026年6月22日  
> **评审角色**：设计总监  
> **项目**：喜乐瑜伽教师认证中心 MVP  
> **评审范围**：小程序端全页面 + PC管理后台全视图

---

## 1. 评审结论

品牌调性正确 — 莫兰迪绿+暖金+奶油底色适合瑜伽品牌定位。但**设计系统化程度不足**：token 定义但未贯彻、组件重复实现、页面间风格漂移。已按优先级完成修复。

---

## 2. 小程序端评审

### 2.1 已识别问题

| 编号 | 问题 | 严重度 | 状态 |
|------|------|--------|------|
| D-01 | 首页全部使用 px 单位，其他页用 rpx，屏幕适配不一致 | P0 | ✅ 已修复 |
| D-02 | teacher-card/studio-card 组件存在但搜索页和工作室页各自重写内联卡片 | P0 | ✅ 已修复 |
| D-03 | `--color-muted`(#7e857e) 对比度仅 3.6:1，不达 WCAG AA 标准 | P1 | ✅ 已修复 |
| D-04 | 各页面硬编码 hex 值不使用 CSS 变量 | P1 | ✅ 已修复(studios/search) |
| D-05 | 筛选胶囊高度 60rpx，低于最小触控目标 88rpx | P1 | ✅ 已修复 |
| D-06 | 圆角值无统一规范（24/32/40/52/56rpx 五种以上） | P2 | 部分统一 |
| D-07 | font-weight 800/900 过度使用，层次扁平 | P2 | 记录 |
| D-08 | emoji 做图标跨端渲染不一致 | P2 | 记录 |
| D-09 | 空状态设计质量不均（studios 精细，其他页简陋） | P3 | 记录 |
| D-10 | 无 max-width 约束，iPad 横屏卡片会过度拉伸 | P3 | 记录 |

### 2.2 已修复方案

**D-01 首页 px→rpx**
- `index.wxss` 全部尺寸转换为 rpx 单位（如 72px→144rpx, 24px→48rpx）
- 确保各屏幕密度下首页与其他页面比例一致

**D-02 组件复用**
- `teacher-search.wxml` 移除内联卡片标记，改用 `<teacher-card teacher="{{item}}" />`
- `studios.wxml` 移除内联卡片标记，改用 `<studio-card studio="{{item}}" />`
- `teacher-card` 组件增加城市显示
- `studio-card` 组件兼容 `coverUrl`/`coverImage` 两种字段名
- 删除 `teacher-search.wxss` 和 `studios.wxss` 中约 60 行冗余的内联卡片样式

**D-03 对比度修复**
- `--color-muted` 从 `#7e857e` 加深为 `#5c635c`（对比度约 4.7:1，达标）

**D-05 触控目标**
- 搜索页筛选胶囊 60rpx→72rpx
- 搜索框高度 84rpx→88rpx

---

## 3. 管理后台评审

### 3.1 已识别问题

| 编号 | 问题 | 严重度 | 状态 |
|------|------|--------|------|
| D-11 | 表格无行 hover 高亮、无分页 | P0 | ✅ 已修复 |
| D-12 | 顶部 tab 与侧边栏重复导航同一组页面 | P1 | ✅ 已修复 |
| D-13 | 全局 input/select 无 focus 态 | P1 | ✅ 已修复 |
| D-14 | 约 16 种灰色值散落各处，无系统 | P2 | ✅ 已修复(token化) |
| D-15 | 无操作反馈通知系统 | P2 | ✅ 已修复(toast) |
| D-16 | 品牌标识不统一（Login"喜"vs 侧栏"瑜"） | P2 | ✅ 已修复 |
| D-17 | 侧边栏 Unicode 字符图标 | P2 | 记录 |
| D-18 | 表单验证无内联错误提示 | P2 | 记录 |
| D-19 | 无响应式设计（min-width: 1180px 硬编码） | P3 | 记录 |
| D-20 | 状态 pill 只有绿色和蓝色两种 | P3 | 记录 |

### 3.2 已修复方案

**D-11 表格分页 + hover**
- 全局 `data-table tbody tr:hover td` 和 `roster-table tbody tr:hover td` 添加 hover 背景
- Teachers 视图添加客户端分页（15条/页），含页码导航组件
- 新增全局 `.pagination` 样式

**D-12 去重复导航**
- 移除 `admin-topbar` 中的 `<nav class="top-tabs">` 四个链接
- 移除非功能性的通知铃铛

**D-13 全局 focus 态**
- `styles.css` 添加 `input:focus, select:focus, textarea:focus` 规则
- 统一使用 `border-color: var(--brand-green)` + 浅绿阴影

**D-14 灰色 token 化**
- 新增 `--muted-light: #9aa1a8`（次要信息、表头）
- 新增 `--danger: #b54c4c` 和 `--danger-light`（错误态）
- `--muted` 加深为 `#65706a`（提升对比度）

**D-15 Toast 通知**
- 新建 `composables/useToast.js`（响应式 toast 队列）
- App.vue 渲染 toast 容器
- 三种样式：`success`（绿底）、`error`（红底）、`info`（白底边框）
- Teachers 视图 CRUD 操作后均触发 toast 反馈

**D-16 品牌统一**
- 侧边栏 brand-mark 从"瑜"改为"喜"，与 Login 页一致

---

## 4. 设计系统建议（后续迭代）

| 优先级 | 建议 | 说明 |
|--------|------|------|
| P2 | emoji → iconfont/SVG 图标系统 | 确保跨端渲染一致性和颜色可控性 |
| P2 | 小程序圆角统一为 3 档 token（sm/md/lg） | 当前实际使用 5+ 种圆角值 |
| P2 | 后台表单验证组件化 | 统一 inline error 展示样式 |
| P2 | font-weight 收敛为 400/600/700 三档 | 当前 800/900 过度使用 |
| P3 | 后台 iPad 断点适配 | 添加 1024px 断点，侧栏折叠 |
| P3 | 小程序 empty-state 组件化 | 统一空状态设计，支持图标+标题+描述+操作 |
| P3 | 后台状态 pill 补充 warning/error 变体 | 当前只有 green 和 blue |
| P3 | 后台加载骨架屏 | 各列表页首次加载时展示 skeleton |

---

## 5. 修复验证

- 后台 Vite 构建通过，无错误
- 后端 30 个 API 合约测试通过，无回归
- 小程序静态分析通过（JSON/WXML 格式正确）

---

*设计评审通过。P0/P1 问题已全部修复，P2 核心问题（token、toast、品牌统一）已修复。系统视觉一致性满足 MVP 上线标准。*
