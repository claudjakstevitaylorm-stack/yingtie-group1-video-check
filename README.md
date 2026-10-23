# 英铁1组批量查重网站 共享版

GitHub Pages前端和独立共享后台。所有同事均可上传、播放原视频、查看姓名和审核报告。用户已选择视频与结果公开可见；任何拿到链接的人均可查看。

## 访问

- GitHub网站：https://claudjakstevitaylorm-stack.github.io/yingtie-group1-video-check/
- 共享后台及同版本网站：https://clipguard-team-video.claudjakstevitaylorm.chatgpt.site/

## 实现

index.html / style.css / app.js 为前端；engine.js 和 recognizer.js 在浏览器中抽帧、转写英文、识别字幕。server/index.js 提供共享API；Cloudflare D1保存模板与报告，R2保存原视频。shared-config.js配置API地址，本地localhost默认请求本地后台。

视频先上传，再在上传者浏览器中识别；服务器根据共享模板重新计算最终分数。低于70%且识别完整通过，达到或超过70%不通过，缺项待复核。姓名是自行填写标签，不是账号认证。

所有人可读。原浏览器保存随机设备凭据，仅该设备可删除自己的视频和启停自己的模板。凭据不提交到仓库，后台仅保存哈希。清除本机存储会丢失管理凭据，共享视频仍保留。

## 本地修改与测试

需要Node.js 24或更新兼容版本（本地预览使用node:sqlite）和pnpm。原Python静态预览方式不再包含共享后台。

```sh
pnpm install
pnpm run build
pnpm test
node scripts/preview-shared.mjs
```

打开 http://127.0.0.1:4173/ 。本地预览使用临时内存数据库和文件存储，重启即清空，不写入线上共享区。

```sh
node scripts/smoke-shared.mjs http://127.0.0.1:4173 /path/to/disposable-test.mp4
```

测试覆盖跨设备读取、视频Range播放、模板共享、服务器判定、上传者权限、错误状态和参数化搜索。API冒烟测试会删除自己创建的测试数据。

## 发布

GitHub Pages继续从main分支根目录发布前端。后端必须独立部署，不能由GitHub Pages执行；当前由现有查重Sites项目托管，与英铁数据面板无关。

.openai/hosting.json声明现有Sites身份以及DB、BUCKET绑定；凭据通过Sites原生流程获取，不能写进源码。数据库变更修改db/schema.ts后执行pnpm run db:generate，检查生成的drizzle迁移后按Sites流程构建、保存、发布。已经应用的迁移不能改写。

## 现有限制

每批100条、单条100 MiB且90秒以内，每浏览器每小时最多登记200条。识别运行在浏览器，处理时不要关闭或刷新。没有启用共享模板时结果待复核。首次模型下载依赖jsDelivr / Hugging Face。

旧版本的本机记录保留在本机旧记录入口；原视频未被浏览器保留，需重新选择并上传才能共享。旧模板也需上传原片。不是全网检索或平台官方查重，不保证避免限流；每日100条耗时与业务准确率尚未实测。
