# UAT Skill 安装指南

## 快速开始

### 方式一：一句话安装（推荐）

在支持 Skill 的 Agent 中直接输入：

```
安装 UAT skill
```

Agent 会自动：
1. 下载 Skill 定义文件
2. 保存到 `.claude/skills/uat-import/skill.md`
3. Skill 即可使用

### 方式二：手动安装

1. 创建 Skill 目录：
   ```bash
   mkdir -p .claude/skills/uat-import
   ```

2. 下载 Skill 文件：
   ```bash
   curl -o .claude/skills/uat-import/skill.md \
     https://jasond2019.github.io/uat-agent-converter/.claude/skills/uat-import/skill.md
   ```

3. 验证安装：
   ```bash
   ls .claude/skills/uat-import/skill.md
   ```

## 使用方式

### 基础转换

```
从 Dify 导入到 Cursor
把这个 agent 转换成 Claude 格式
转换 ./dify.yml 到 Windsurf
```

### 自动检测源平台

```
转换这个配置到 Claude  [提供文件或内容]
导入 agent 到 Windsurf  [提供文件]
```

### 平台检测

```
检测这个配置的平台类型
```

## 支持的平台

| 平台 | 类型 | 输入格式 | 输出格式 |
|------|------|----------|----------|
| Dify | 云端 | YAML DSL | YAML DSL |
| OpenClaw | 本地 | JSON + MD | JSON + MD |
| Hermes | 本地 | YAML + MD | YAML + MD |
| Cursor | 本地 | .cursorrules | .cursorrules |
| Windsurf | 本地 | .windsurfrules | .windsurfrules |
| Claude Code | 本地 | CLAUDE.md | CLAUDE.md |
| FastGPT | 云端 | JSON | JSON |
| Flowise | 云端 | JSON | JSON |
| Copilot | 本地 | copilot-instructions.md | copilot-instructions.md |
| Codex | 本地 | AGENTS.md | AGENTS.md |
| Zed | 本地 | rules.md | rules.md |

**注意：** 云端平台（Dify、FastGPT、Flowise）用户建议使用 Web UI：https://jasond2019.github.io/uat-agent-converter/

## 工作原理

1. **Bundle 下载**：首次使用时，Skill 自动从 GitHub Pages 下载 UAT Bundle (~200KB)
2. **缓存机制**：Bundle 保存在 `.uat-temp/`，后续使用无需重复下载
3. **本地执行**：所有转换在本地完成，数据不上传服务器

## 系统要求

- Node.js 环境（建议 v18+）
- 支持的 Agent 平台：
  - Claude Code
  - Cursor
  - Windsurf
  - Codex CLI
  - GitHub Copilot CLI

## 常见问题

### Q: Bundle 下载失败怎么办？

手动下载：
```bash
mkdir -p .uat-temp
curl -o .uat-temp/uat-bundle.js \
  https://jasond2019.github.io/uat-agent-converter/dist/uat-bundle.js
```

### Q: 没有 Node.js 环境？

安装 Node.js：https://nodejs.org/

或使用 Web UI：https://jasond2019.github.io/uat-agent-converter/

### Q: 转换结果不完整？

检查源配置格式是否正确，使用 `检测` 命令验证平台识别。

## 更新 Skill

删除旧版本重新安装：
```bash
rm -rf .claude/skills/uat-import
安装 UAT skill
```

---

**更多文档**：https://github.com/JasonD2019/uat-agent-converter