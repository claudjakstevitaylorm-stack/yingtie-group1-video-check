# 验证记录

日期：2026-10-23（北京时间）。

- 8 项 Node 逻辑测试通过：70% 边界、缺项、单维度高度重复、全部启用模板、同文件、文本归一化、模板输入校验、画面指纹确定性。
- 本地 HTTP 预览返回 200；浏览器中确认工作台、规则页和移动宽度排版。
- 浏览器实际初始化 Whisper tiny.en（q8/WASM）与 Tesseract 英文 OCR 成功。
- 真实集成测试：将公开 JFK WAV 音频与英文字幕画面录制为 11.2366 秒视频，执行完整 extract。
- 提取 12 帧；英文转写为 `And so, my fellow Americans ask not what your country can do for you, ask what you can do for your country.`
- OCR 成功提取四行英文文字，与画面文案一致；speechStatus / subtitleStatus 均为 ok；errors 为空。
- 与该视频自身的指纹对比：100%，fail。

测试音频来源：[Hugging Face Transformers.js 官方示例数据集](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav)。`browser-qa.html` 可临时置于静态服务根目录，并把该音频以 `qa-jfk.wav` 放在根目录后重现。测试页面与音频不包含于部署的 dist/。

没有用户真实视频或模板，尚未验证实际误判率、100 条批量吞吐、手机兼容性和大陆各网络环境模型下载成功率。没有声称通过平台官方查重或避免限流。
