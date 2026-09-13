# 教师公开资料与服务记录｜设计

## 数据模型

`teachers` 增加：`alias`、`current_tier_certified_on`、`residences`（逗号分隔）、`public_profile_settings`（JSON）。

`service_records` 新表：教师 ID、服务日期、类型、地点/对象、内容、附件引用、状态、创建/更新时间。状态仅包含 `draft` 和 `submitted`。

## 接口

- `GET/POST /api/mp/teachers/me/service-records`
- `PUT /api/mp/teachers/me/service-records/:id`
- `GET/PUT /api/mp/teachers/me/public-profile`
- 教师公开详情接口在序列化时应用公开设置。

## 展示与权限

- 教师仅能读取和更新自己的服务记录及公开设置。
- 教师自身在“我的信息”预览中可看到完整资料；公众详情只返回公开字段。
- 默认公开：显示名、认证等级、首次认证时间、当前等级有效期；默认隐藏：常住地、简介、别名。

## 兼容策略

现有教师数据中新增字段均允许为空；显示名回退顺序为喜乐名、别名、本名。旧记录不需要数据回填。
