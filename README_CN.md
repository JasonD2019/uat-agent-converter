# UAT Agent 转换器

> 跨平台 AI Agent 配置转换器 | Cross-Platform AI Agent Config Converter

**中文文档** | **[English](README.md)**

![许可证](https://img.shields.io/badge/license-MIT-blue.svg)
![平台支持](https://img.shields.io/badge/platforms-12-green.svg)
![版本](https://img.shields.io/badge/version-2.0-purple.svg)

**本地 · 离线 · 安全** — 所有处理在浏览器中完成，不上传任何数据到服务器。

---

## 功能特性

- **12 平台支持** — 在 Dify、OpenClaw、Hermes、Cursor、Windsurf、Claude Code、FastGPT、Flowise、Copilot、Codex、Zed 等平台间自由转换
- **双向转换** — 解析任意平台的 Agent Bundle 并转换到其他平台
- **Bundle ZIP 支持** — 上传/下载包含所有文件的完整 Agent Bundle
- **UAT-Schema v2.0** — 统一的中间层 Schema 实现跨平台映射
- **自动平台检测** — 根据上传文件自动识别源平台
- **实时预览** — 即时查看解析文件和生成的 Schema
- **多语言支持** — 英文/中文界面

## 支持平台

| 平台 | 格式 | 解析 | 编码 | Bundle |
|------|------|------|------|--------|
| **Dify** | YAML DSL | ✅ | ✅ | ✅ |
| **OpenClaw** | JSON + MD | ✅ | ✅ | ✅ |
| **Hermes** | YAML + MD | ✅ | ✅ | ✅ |
| **Cursor** | .cursorrules | ✅ | ✅ | ✅ |
| **Windsurf** | .windsurfrules | ✅ | ✅ | ✅ |
| **Claude Code** | CLAUDE.md + settings | ✅ | ✅ | ✅ |
| **FastGPT** | JSON | ✅ | ✅ | ✅ |
| **Flowise** | JSON | ✅ | ✅ | ✅ |
| **Copilot** | .github/copilot-instructions.md | ✅ | ✅ | ✅ |
| **Codex** | AGENTS.md | ✅ | ✅ | ✅ |
| **Zed** | rules.md + settings.json | ✅ | ✅ | ✅ |

## 快速开始

### 在线使用

1. 在浏览器中打开 `index.html`
2. 上传 Agent Bundle ZIP 文件（支持 Hermes、OpenClaw、Cursor 等）
3. 查看解析文件和自动生成的 UAT-Schema
4. 选择目标平台进行转换
5. 下载转换后的配置或 Bundle ZIP

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/uat-agent-converter.git
cd uat-agent-converter

# 在浏览器中打开（无需构建）
# 直接打开 index.html 即可使用

# 运行测试（需要 Node.js）
node test-node.js
```

## UAT-Schema v2.0

连接所有平台的统一中间层 Schema：

```json
{
  "meta": {
    "name": "Agent 名称",
    "description": "Agent 描述",
    "version": "1.0.0",
    "author": "作者",
    "tags": ["标签1", "标签2"],
    "license": "MIT"
  },
  "core": {
    "identity": "Agent 身份描述",
    "soul": "Agent 灵魂/使命声明",
    "persona": {
      "name": "角色名称",
      "role": "角色描述",
      "style": "沟通风格",
      "traits": ["特质1", "特质2"]
    },
    "knowledgeBaseRef": ["kb1.md", "kb2.md"],
    "longTermMemory": "记忆内容字符串",
    "userPreferences": "用户偏好设置"
  },
  "behavior": {
    "workflow": [
      { "step": "步骤名称", "type": "action", "content": "步骤内容" }
    ],
    "triggers": ["触发器1", "触发器2"],
    "heartbeat": { "interval": "1h", "actions": ["动作1"] }
  },
  "tools": [
    { "name": "工具名称", "type": "function", "description": "工具描述", "schema": {} }
  ],
  "communication": {
    "style": "专业",
    "tone": "友好",
    "formats": ["markdown", "json"]
  },
  "runtime": {
    "model": "gpt-4",
    "provider": "openai",
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

## 项目架构

```
UAT/
├── index.html              # 主入口
├── styles.css              # UI 样式
├── test-node.js            # Node.js 测试套件
│
├── src/
│   ├── core/
│   │   └── schema.js       # UAT-Schema v2.0 定义
│   │
│   ├── input/
│   │   └── input-utils.js  # 文件上传/ZIP 处理
│   │
│   ├── detector/
│   │   └── platform-detector.js  # 自动平台检测
│   │
│   ├── parser/
│   │   └── parser-pool.js  # 解析器调度
│   │
│   ├── encoder/
│   │   ├── encoder-pool.js      # 遗留编码函数
│   │   └── encoder-registry.js  # 编码器调度 (UATEncoder)
│   │
│   ├── bundle/                  # 平台特定模块
│   │   ├── bundle-base.js       # 共用工具函数
│   │   ├── openclaw-bundle.js   # OpenClaw: 解析 + 编码 + 创建
│   │   ├── hermes-bundle.js     # Hermes: 解析 + 编码 + 创建
│   │   ├── cursor-bundle.js     # Cursor: 解析 + 编码 + 创建
│   │   ├── windsurf-bundle.js   # Windsurf: 解析 + 编码 + 创建
│   │   ├── claude-code-bundle.js # Claude Code: 解析 + 编码 + 创建
│   │   ├── dify-bundle.js       # Dify: 解析 + 编码 + 创建
│   │   ├── fastgpt-bundle.js    # FastGPT: 解析 + 编码 + 创建
│   │   ├── flowise-bundle.js    # Flowise: 解析 + 编码 + 创建
│   │   ├── copilot-bundle.js    # Copilot: 解析 + 编码 + 创建
│   │   ├── codex-bundle.js      # Codex: 解析 + 编码 + 创建
│   │   └── zed-bundle.js        # Zed: 解析 + 编码 + 创建
│   │
│   ├── export/
│   │   └── export-utils.js # ZIP 导出工具
│   │
│   ├── ui/
│   │   ├── i18n.js         # 国际化 (EN/ZH)
│   │   └── ui-controller.js # UI 交互控制器
│   │
│   └── guard/
│       └── guard.js        # 验证防护
│
└── README.md               # 英文文档
└── README_CN.md            # 中文文档
```

### 模块职责

| 模块 | 职责 |
|------|------|
| `schema.js` | UAT-Schema v2.0 定义和验证 |
| `platform-detector.js` | 根据文件签名检测平台 |
| `parser-pool.js` | 根据平台调度到正确的解析器 |
| `encoder-registry.js` | 通过 `UATEncoder.encodeToFiles()` 调度编码器 |
| `bundle/*.js` | 完整的平台实现：解析 + 编码 + Bundle |
| `bundle-base.js` | 共用工具：`extractModelProvider()`, `mapStepToXxxType()` |
| `ui-controller.js` | 处理 UI 事件，协调解析/转换流程 |

## 测试

运行完整的测试套件：

```bash
node test-node.js
```

测试覆盖范围：
- Schema 验证
- 平台检测
- 12 个平台的解析函数
- 12 个平台的编码函数
- Bundle 创建/解压
- 边缘情况和错误处理

**当前状态：157 个测试通过**

## 技术栈

- **前端**：原生 JavaScript（无框架依赖）
- **UI**：CSS3 现代布局（flexbox, grid）
- **图标**：Lucide Icons
- **ZIP 处理**：JSZip（浏览器）/ Node.js fs（测试）
- **字体**：Inter, JetBrains Mono
- **测试**：Node.js 原生测试运行器

## 添加新平台

添加新平台支持：

1. 创建 `src/bundle/newplatform-bundle.js`：
   ```javascript
   // 解析函数
   function parseNewPlatformConfig(content) { ... }
   
   // 编码函数
   function encodeNewPlatformMain(schema) { ... }
   
   // Bundle 入口
   function encodeNewPlatformToFiles(schema) {
     return {
       'config.json': encodeNewPlatformMain(schema),
       // ... 其他文件
     };
   }
   
   // 导出
   window.NewPlatformBundle = {
     parseNewPlatformConfig,
     encodeNewPlatformMain,
     encodeNewPlatformToFiles,
     createNewPlatformBundle
   };
   ```

2. 在 `platform-detector.js` 添加检测规则

3. 在 `parser-pool.js` 添加解析器映射

4. 在 `encoder-registry.js` 添加编码器映射

5. 在 `index.html` 添加 UI 按钮

6. 在 `src/ui/i18n.js` 添加翻译

7. 在 `test-node.js` 添加测试

## 部署方式

### 本地使用
直接在浏览器打开 `index.html` — 无需服务器。

### GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
# 在仓库 Settings 中启用 Pages
```

### Vercel / Netlify
```bash
vercel deploy
# 或
netlify deploy
```

## 安全特性

- **网络防护**：生产模式下阻止所有外部请求（fetch/XHR/WebSocket）
- **敏感信息过滤**：自动检测并过滤 API Key、Token、密码等敏感信息
- **内存清理**：页面关闭时自动清理所有缓存数据
- **错误处理**：全局异常捕获，友好的错误提示

## 参与贡献

欢迎贡献代码！请：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 许可证

MIT 许可证 — 详情见 [LICENSE](LICENSE) 文件。

## 致谢

- 受 AI Agent 跨平台互通需求启发
- 本地优先、隐私保护的设计理念
- 感谢各平台开发者的开放格式

---

**用 ❤️ 为 AI Agent 社区打造**