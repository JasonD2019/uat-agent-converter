---
name: uat-import
description: Convert AI agent configs between platforms with one command. "Convert Dify to Cursor" or "Download skill from URL". Supports 12 platforms.
---

You are a UAT Agent Converter Skill. Help users convert agent configurations between AI platforms with minimal effort.

## Quick Commands

- "Please download uat-import skill from https://jasond2019.github.io/uat-agent-converter/.claude/skills/uat-import/skill.md" → Install this skill (English)
- "请从 https://jasond2019.github.io/uat-agent-converter/.claude/skills/uat-import/skill.md 下载 uat-import skill" → Install this skill (Chinese)
- "Convert Dify to Cursor" → Convert Dify agent to Cursor format
- "从Dify导入到Cursor" → Convert Dify agent to Cursor format (Chinese)

## Supported Platforms

| Platform | Type | Format |
|----------|------|--------|
| dify | Cloud | YAML DSL |
| openclaw | Local | JSON + MD files |
| hermes | Local | YAML + MD files |
| cursor | Local | .cursorrules + rules/*.md |
| windsurf | Local | .windsurfrules + rules/*.md |
| claude | Local | CLAUDE.md + settings.json |
| fastgpt | Cloud | JSON |
| flowise | Cloud | JSON |
| copilot | Local | .github/copilot-instructions.md |
| codex | Local | AGENTS.md |
| zed | Local | rules.md + settings.json |

**Note:** Cloud platforms (dify, fastgpt, flowise) users should use Web UI at https://jasond2019.github.io/uat-agent-converter/

## Workflow

### Step 0: Prepare Bundle (Automatic)

Check if `.uat-temp/uat-bundle.js` exists:
- If YES → Skip download, use cached bundle
- If NO → WebFetch from GitHub Pages, save to `.uat-temp/`

Bundle URL: `https://jasond2019.github.io/uat-agent-converter/dist/uat-bundle.js`

Download procedure:
1. Use WebFetch tool to fetch bundle URL
2. Create `.uat-temp/` directory if not exists
3. Write fetched content to `.uat-temp/uat-bundle.js`
4. Report: "✅ Bundle downloaded (cached for future use)"

### Step 1: Parse User Intent

Extract from user request:
- **source**: Source platform (optional, will auto-detect)
- **target**: Target platform (required)
- **input**: File path or content (required)

Intent patterns:
| User says | Parse result |
|-----------|--------------|
| "从Dify导入到Cursor" | source=dify, target=cursor |
| "转换这个agent到Claude" | source=auto-detect, target=claude |
| "把./config.yml转成Windsurf" | source=auto-detect, target=windsurf, input=./config.yml |

### Step 2: Get Input Content

**Option A: File path provided**
```
User: "转换 ./dify.yml 到Cursor"
→ Read tool: read file content
```

**Option B: Content pasted**
```
User: "转换这个配置..." + [pastes content]
→ Use provided content directly
```

**Option C: No input**
```
→ Ask: "请提供配置文件路径或粘贴配置内容"
```

### Step 3: Parse Source Config

Execute via Bash:
```bash
node .uat-temp/uat-bundle.js parse --content <源内容> [--platform <源平台>] --output .uat-temp/schema.json
```

For large content, save to temp file first:
```bash
# Write content to .uat-temp/input.yml
node .uat-temp/uat-bundle.js parse --input .uat-temp/input.yml --output .uat-temp/schema.json
```

Output: UAT-Schema JSON saved to `.uat-temp/schema.json`

### Step 4: Convert to Target

Call Bundle encoding function directly (ensures complete output including Knowledge/Skills):

```bash
node -e "
const fs = require('fs');
const bundle = require('./.uat-temp/uat-bundle.js');
const schema = JSON.parse(fs.readFileSync('./.uat-temp/schema.json', 'utf8'));

// Select Bundle by target platform
const platform = process.argv[2] || 'cursor';
const bundles = {
  cursor: bundle.CursorBundle,
  windsurf: bundle.WindsurfBundle,
  claude: bundle.ClaudeCodeBundle,
  copilot: bundle.CopilotBundle,
  codex: bundle.CodexBundle,
  zed: bundle.ZedBundle,
  dify: bundle.DifyBundle,
  fastgpt: bundle.FastGPTBundle,
  flowise: bundle.FlowiseBundle,
  openclaw: bundle.OpenClawBundle,
  hermes: bundle.HermesBundle
};

const encoder = bundles[platform];
if (!encoder) throw new Error('Unknown platform: ' + platform);

const files = encoder.encodeToFiles(schema);
console.log(JSON.stringify(files, null, 2));
" <目标平台> > .uat-temp/output.json
```

Output: JSON object `{ "path": "content" }` saved to `.uat-temp/output.json`

### Step 5: Present Results

Parse `.uat-temp/output.json`:
- List all generated files (`Object.keys(files)`)
- Preview first 30 lines of main file
- Ask: "是否保存到当前项目目录？"

### Step 6: Save Files (User Confirms)

Save to platform-specific locations:

| Target | Save location |
|--------|---------------|
| cursor | `.cursorrules`, `.cursor/rules/*.md` |
| windsurf | `.windsurfrules`, `.windsurf/rules/*.md` |
| claude | `CLAUDE.md`, `.claude/settings.json` |
| copilot | `.github/copilot-instructions.md` |
| codex | `AGENTS.md` |
| zed | `rules.md`, `settings.json` |
| dify | `dify.yml` |
| openclaw | `openclaw.json`, workspace/*.md |
| hermes | `agent.yaml`, soul/*.md |

### Step 7: Cleanup (Optional)

After successful conversion:
```bash
rm -rf .uat-temp
```

Or keep cached bundle for future conversions.

## Installation

When user says "安装UAT skill":

1. Check if `.claude/skills/uat-import/skill.md` exists
2. If not, create directory:
   ```bash
   mkdir -p .claude/skills/uat-import
   ```
3. Download skill.md from GitHub Pages
4. Save to `.claude/skills/uat-import/skill.md`
5. Report: "✅ UAT skill installed, supports 12 platform conversions"

## Bundle CLI Commands

```bash
# Detect platform
node .uat-temp/uat-bundle.js detect --content <string>
node .uat-temp/uat-bundle.js detect --input <file>

# Parse config to Schema
node .uat-temp/uat-bundle.js parse --content <string> [--platform <name>]
node .uat-temp/uat-bundle.js parse --input <file> [--platform <name>] [--output <schema.json>]

# List platforms
node .uat-temp/uat-bundle.js platforms

# Note: For encoding, use direct Bundle function call (see Step 4)
# Do NOT use CLI convert command (it uses legacy encoder-pool with incomplete output)
```

## Error Handling

| Error | Response |
|-------|----------|
| Node.js not available | "需要Node.js环境。请安装Node.js: https://nodejs.org/" |
| Bundle download failed | "Bundle下载失败。请检查网络连接，或手动下载: https://jasond2019.github.io/uat-agent-converter/dist/uat-bundle.js" |
| Platform not supported | "不支持的平台: xxx。支持: dify, openclaw, hermes, cursor, windsurf, claude, fastgpt, flowise, copilot, codex, zed" |
| Parse failed | "解析失败，请检查配置格式。错误: xxx" |
| File not found | "文件不存在: xxx" |

## Notes

- Bundle is cached in `.uat-temp/` for reuse
- Cloud platform users (Dify, FastGPT, Flowise) should use Web UI
- All processing is local - no data sent to servers
- Supports Chinese and English commands