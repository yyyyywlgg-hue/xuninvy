<div align="center">

**赛博朋克风格 AI 虚拟伴侣 · Live2D 虚拟形象 · 流式对话**

[在线体验](https://yyyyywlgg-hue.github.io/xuninvy/) · [功能特性](#-功能特性) · [快速开始](#-快速开始) · [技术栈](#-技术栈)

</div>

---

## ✨ 功能特性

### 🎭 虚拟形象
- **Live2D Cubism 4** 实时渲染虚拟角色，支持表情参数驱动
- 支持上传自定义 Live2D 模型（ZIP / URL 导入）
- 预设 HiYori 模型，开箱即用
- 基于 PixiJS v6 WebGL 渲染引擎

### 💬 智能对话
- **流式输出**：SSE 实时生成回复，打字机效果
- **情感识别**：AI 回复自动提取情感标签，驱动角色表情
- **对话持久化**：IndexedDB 本地存储，刷新不丢失
- **上下文记忆**：自动恢复对话历史，保持聊天连贯性

### 🧠 人格定制（五层人格架构）
- **Layer 0 硬规则**：不可违背的核心规则
- **Layer 1 身份**：年龄、职业、MBTI、星座等
- **Layer 2 说话风格**：口头禅、语气词、标点习惯
- **Layer 3 情感模式**：依恋类型、爱的语言、情绪触发器
- **Layer 4 关系行为**：争吵模式、联系频率、边界底线
- 18 种性格标签（话痨/闷骚/嘴硬心软/粘人等）自动生成行为规则

### 🧪 聊天记录蒸馏
- 上传微信/QQ/文本格式聊天记录
- AI 自动分析提取人格特征
- 一键填充到五层人格架构

### 🔊 语音交互
- **TTS**：OpenAI 兼容语音合成 API，10 种音色可选
- **STT**：Web Speech API 语音识别，支持多语言
- 连续识别 / 识别后自动发送

### 🎨 赛博朋克 UI
- 全息投影风格界面，不遮挡虚拟形象
- 切角多边形（clip-path）设计语言
- 霓虹光效 / 扫描线 / 故障动画
- Orbitron + Share Tech Mono + Noto Sans SC 字体组合

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/yyyyywlgg-hue/xuninvy.git
cd xuninvy

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:5173`

### 配置 API

首次使用需要在设置中配置 LLM API：

1. 点击右上角 ⚙️ 设置按钮
2. 切换到 **API** 标签
3. 填入 API Base URL 和 API Key
4. 支持的快捷配置：
   - 智谱 GLM-4-Flash / GLM-4-Plus
   - DeepSeek Chat / DeepSeek R1
   - MiniMax M1
   - Kimi (Moonshot)
   - 小米 MiMo
   - OpenAI

### 构建部署

```bash
npm run build
```

构建产物在 `dist/` 目录，可部署到任意静态托管服务。

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS 3 |
| 状态管理 | Zustand 5 |
| 渲染引擎 | PixiJS v6 (WebGL) |
| 虚拟形象 | pixi-live2d-display / Cubism 4 |
| 本地存储 | IndexedDB (对话 + 模型持久化) |
| 模型导入 | JSZip (前端 ZIP 解压) |
| LLM 接口 | OpenAI 兼容 API (SSE 流式) |
| TTS | OpenAI 兼容 /audio/speech |
| STT | Web Speech API |

---

## 📁 项目结构

```
src/
├── App.tsx                  # 主界面
├── components/
│   ├── ChatBubble.tsx       # 聊天气泡
│   ├── CyberButton.tsx      # 赛博朋克按钮
│   ├── InputBar.tsx         # 输入栏
│   ├── ModelSelector.tsx    # 模型选择器
│   ├── PerfMonitor.tsx      # 性能监控
│   ├── PixiCanvas.tsx       # Live2D 画布
│   └── SettingsPanel.tsx    # 设置面板
├── services/
│   ├── chatStorage.ts       # 对话持久化 (IndexedDB)
│   ├── distillService.ts    # 聊天记录蒸馏
│   ├── llmService.ts        # LLM 服务 + 人格架构
│   ├── modelService.ts      # Live2D 模型管理
│   ├── sttService.ts        # 语音识别
│   └── ttsService.ts        # 语音合成
├── store/
│   └── useChatStore.ts      # Zustand 状态管理
├── pixi/
│   ├── ParticleSystem.ts    # 粒子系统
│   ├── SceneController.ts   # 场景控制
│   └── WeatherEffects.ts    # 天气特效
└── types/
    ├── index.ts             # 类型定义
    ├── model.ts             # 模型类型
    └── live2d.d.ts          # Live2D 类型声明
```

---

## 📝 致谢

- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) - PixiJS Live2D 渲染库
- [Live2D Cubism SDK](https://www.live2d.com/download/cubism-sdk/) - Live2D 核心 SDK
- [HiYori](https://www.live2d.com/download/sample-data/) - Live2D 官方示例模型
- [AIRI](https://github.com/moeru-ai/airi) - 灵感来源
- [ex-skill](https://github.com/ex-skill) - 五层人格架构参考

---

## 📄 许可证

MIT License
