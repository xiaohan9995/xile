# CloudBase 原生微信认证部署说明

小程序教师登录采用以下链路：

1. 小程序调用 `wx.cloud.callFunction('mp-auth-bridge')`。
2. CloudBase 在云函数中自动注入可信的 `OPENID` 与 `APPID`。
3. 云函数返回一份 5 分钟有效的 HMAC 签名断言。
4. 云托管 Flask 服务验证签名后，为既有教师系统签发业务 JWT。

该流程不再把 `wx.login` 的临时 code 交由客户端登录接口校验；手机号授权与教师档案匹配流程保持不变。

## 部署前提

- 小程序 AppID `wxf34d7e608bc79d85` 已在 CloudBase 环境 `xile-yoga-d4g2za8xi82a16810` 中完成绑定与认证。
- 已在云托管环境变量配置 `WECHAT_APPID=wxf34d7e608bc79d85`。
- 为云函数和云托管生成并配置同一随机密钥 `CLOUDBASE_AUTH_BRIDGE_SECRET`（至少 32 字符）。该值不能提交到 Git，也不能在客户端使用。

## 部署云函数

在已登录且已选择对应 CloudBase 环境的终端执行：

```bash
tcb fn deploy mp-auth-bridge --force --envId xile-yoga-d4g2za8xi82a16810
```

然后在 CloudBase 控制台的云函数配置中添加环境变量：

```text
CLOUDBASE_AUTH_BRIDGE_SECRET=<与云托管完全相同的随机密钥>
```

云托管服务的同名环境变量配置完成后，重新部署服务版本。

## 验收

1. 在真机打开教师工作台，点击“微信一键登录”。
2. 不应再请求 `/api/mp/auth/login`；应依次调用云函数 `mp-auth-bridge` 和 `/api/mp/auth/cloudbase-login`。
3. 首次登录进入资料/手机号绑定步骤；已绑定用户直接进入教师工作台。
4. 云函数日志中仅确认调用成功，不记录 OPENID、签名或密钥。

## 常见问题

- `INVALID_HOST` 或 85088：小程序与 CloudBase 环境尚未正确绑定/认证，先在 CloudBase 控制台完成小程序认证。
- “微信身份校验暂不可用”：检查云函数是否已部署，以及函数名是否为 `mp-auth-bridge`。
- “微信登录服务尚未配置”：检查云函数和云托管是否都设置了相同的 `CLOUDBASE_AUTH_BRIDGE_SECRET`，以及云托管中的 `WECHAT_APPID` 是否正确。
