# 灯塔项目（Save Our Souls）
作为我们灵魂的最后拯救，灯塔项目是我们自己面临现实风险时的最后保险。
你可以在这里记录你的预定风险日程，并设置最后安全期限，如果在期限前没有收到来自你自己的确认信号/您主动确认自身并不安全时，系统将自动向你指定的紧急联系人发送警报信息。

## 功能特点
- **风险日程记录**：用户可以记录预定的风险日程，如登山、潜水、会见陌生人等高风险活动。
- **最后安全期限设置**：用户可以为每个风险日程设置一个最后安全期限。
- **自动警报发送**：如果在最后安全期限前没有收到用户的确认信号，系统将自动向紧急联系人发送预先设置的警报信息。

**警报信息中推荐的内容**
- 能够明确证明您自身身份的信息：如自己的本音录音、带有本人签名/印章/指纹的文件（照片/PDF），以向紧急联络人证明灯塔系统发送的警报信息确实来自您本人的授权
- 预先知晓您可能遇到的危险的相关信息（时间、地点、可能会见的人物……）：以便紧急联系人能够更好地理解您的处境
- 法律授权：必要时允许紧急联系人采取更多行动的法律依据
- 希望的行动方案：如联系当地警方、联系使领馆、联系家人朋友、网络曝光等
- 不希望的行动方案：避免某些可能引发更大风险的行动，或者您认为不可靠的行动方案
默认设置在危险状态时，您的风险日程信息将会一并发送给紧急联系人（这样您便不需要手动在警报信息中指定），您也可以出于隐私考虑关闭该选项，并手动设置警报信息的内容。

**当前支持的紧急联系人通知方式包括：**
- Email

**确认自己安全的信号方式：**
- 输入预先指定的安全代码
- 输入系统分配的动态密码

**确认自己不安全的信号方式：**
- 输入预先指定的危险代码
- （在事先选择【我相信我安全时不会输入错误代码】时）输入任意非安全代码
不论以何种方式表示自己不安全，系统都会立即向紧急联系人发送警报信息，且页面不会产生任何与表示安全时不同的反馈。


## 未来计划
支持更多的紧急联系人通知方式：
- QQ
- 微信

支持更多的确认信号方式：
- 发送特定格式的Email至系统邮箱
- 发送特定格式的QQ消息至系统QQ号
- 发送特定格式的微信消息至系统微信号

允许用户自定义【确认安全页面】的样式和内容，以免被他人发现您正在使用灯塔项目。

## 前端原型（本仓库）
本前端原型基于 Vite + Vue3 实现了两个页面：
- 风险日程页（路径 `/`）：新增/编辑/删除风险日程；管理紧急联系人（Email）；设置警报消息与开关；设置安全/危险代码与“信任不误输”。数据保存在浏览器本地存储。
- 确认安全页（路径 `/confirm`）：输入代码进行确认。输入危险代码或（在“信任不误输”开启时）输入任意非安全代码，会触发模拟的警报发送；输入安全代码会仅记录“最近一次安全确认时间”。

注意：目前 Email 发送为前端模拟（控制台打印），真正的自动邮件发送需要后端服务支持。
- CORS 支持；可选 Bearer Token 认证

步骤：
1. 在 Cloudflare 创建 Pages 项目，选择本仓库。
2. Build 命令：`npm run build`，Build 输出目录：`dist`
3. 确保仓库根目录存在 `functions/`，Cloudflare 会自动识别并部署为 Pages Functions。
4. 在 Pages 的环境变量中配置（Production/Preview 同步设置）：
	- `RELAY_TOKEN`：可选，后端校验用的 Bearer Token（若配置，前端需在 `.env` 中设置 `VITE_RELAY_TOKEN` 同值）
	- `MAIL_FROM`：发件人邮箱，例如 `noreply@yourdomain.com`
	- `MAIL_FROM_NAME`：发件人名称，例如 `Save Our Souls`
	- `MAIL_SUBJECT`：邮件主题（可选）
	- `SENDER_DOMAIN`：备用构造发件域名用（可选）
	- `DKIM_DOMAIN` / `DKIM_SELECTOR` / `DKIM_PRIVATE_KEY`：如需 DKIM 签名（可选）
5. 前端环境变量（部署时可在 Pages > Environment variables > Build variables 设置）：
	- `VITE_RELAY_TOKEN`：与后端 `RELAY_TOKEN` 一致（若后端启用鉴权）

部署完成后，前端会向 `/api/alert` 发送告警请求，后端通过 Resend API 向联系人 Email 投递警报。
1. 安装依赖
2. 启动开发服务

### 生产构建
1. 运行打包
2. 预览构建结果

如果要实现真实的邮件发送，请为前端提供后端接口（如 `/api/alert`），由服务器完成邮件发送并做好鉴权与速率限制。

### 使用 Wrangler 本地联调（Pages Functions）
为了在本地同时调试前端与 Pages Functions（`/api/alert`），推荐使用 Cloudflare 的 Wrangler：

准备：
- 全局安装 Wrangler（可选）或项目内已安装（本项目已在 devDependencies 中加入 wrangler）

两种常见方式：
1) 两个终端分别启动（推荐简单做法）
	 - 终端 A：启动 Vite 前端
		 ```powershell
		 npm run dev
		 ```
	 - 终端 B：启动 Pages Functions 模拟（会在本地暴露 /api/*）
		 ```powershell
		 npm run dev:api
		 ```
	 - 前端访问 `/api/alert` 会请求到 Wrangler 的本地函数。若端口冲突，可在 `dev:api` 命令后追加 `--port` 来修改。使用此方式时，前端热更新正常工作。

2) 仅跑 `wrangler pages dev`（让 Wrangler 代管静态资源与函数）
	 - 先构建：
		 ```powershell
		 npm run build
		 ```
	 - 运行：
		 ```powershell
		 npm run dev:api
		 ```
	 - 这种方式由 Wrangler 提供静态资源（`dist`）与 `/api/*`，不走 Vite 热更新。

本地变量设置：
- 你可以在 `wrangler.toml` 的 `[vars]` 中临时填一些开发用变量（请避免提交真实密钥到仓库）。
- 前端如使用鉴权，请在本地 `.env` 设置 `VITE_RELAY_TOKEN`，与 `wrangler.toml` 的 `RELAY_TOKEN` 保持一致。

### 远程存储（Cloudflare KV）
- 已提供 `/api/data` 接口，使用 KV 命名空间 `SOS_KV`（key：`sos_data_v1`）读写全量数据。
- 在 Cloudflare Pages 绑定一个 KV（Settings > Functions > KV bindings），名称填 `SOS_KV`。
- 前端开启远程存储：在构建/运行环境添加 `VITE_REMOTE_STORAGE=1`。
- 本地联调时，如果没有 KV 绑定，会使用进程内存 Map 兜底（仅当前进程有效）。