/**
 * UAT Windsurf Bundle 管理器 - Windsurf Bundle Manager
 * 专门处理 Windsurf IDE Agent 的多文件配置包导入导出
 *
 * Windsurf 配置结构（与Cursor几乎相同）：
 * 项目根目录/
 * ├── .windsurfrules            # 主规则文件（最高优先级）
 * ├── .windsurfignore           # 文件索引排除
 * ├── .windsurf/
 * │   ├── rules/                # 多规则文件目录
 * │   │   ├── general.md        # 通用规则
 * │   │   ├── code-style.md     # 代码风格
 * │   │   ├── frontend.md       # 前端规则
 * │   │   ├── backend.md        # 后端规则
 * │   │   ├── tests.md          # 测试规则
 * │   │   ├── tools.md          # 工具说明
 * │   │   └── workflow.md       # 工作流
 * │   ├── mcp.json              # MCP服务器配置
 * │   ├── settings.json         # Windsurf项目设置
 * │   └── context/
 * │       └── files.json        # 始终包含的文件列表
 * └── mcp-tools/                # MCP工具包装脚本（可选）
 */

// ============================================
// Windsurf Bundle 创建（导出）
// ============================================

/**
 * 创建 Windsurf Bundle ZIP 包
 * @param {Object} schema - UAT-Schema v2.0
 * @param {Object} options - 可选配置
 * @returns {Promise<Blob>} ZIP 文件
 */
async function createWindsurfBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json - Bundle 清单
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Windsurf-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainRules: ".windsurfrules",
      windsurfDir: ".windsurf/",
      rulesDir: ".windsurf/rules/",
      mcpConfig: ".windsurf/mcp.json",
      settings: ".windsurf/settings.json",
      ignore: ".windsurfignore",
      envTemplate: ".env.example"
    },
    rulesFiles: [
      "general.md",
      "code-style.md",
      "frontend.md",
      "backend.md",
      "tests.md",
      "tools.md",
      "workflow.md"
    ],
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Windsurf Bundle"
    },
    notes: {
      cascadeFlow: "Windsurf特有的Cascade Flow多步骤推理模式",
      mcpServers: "MCP工具配置已保留，需安装对应MCP服务器",
      secrets: "密钥已移除，请填写 .env 文件"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. .windsurfrules - 主规则文件（最高优先级）
  const windsurfRules = encodeWindsurfRulesMain(schema);
  zip.file(".windsurfrules", windsurfRules);

  // 3. .windsurfignore - 文件排除规则
  const windsurfIgnore = encodeWindsurfIgnore(schema);
  zip.file(".windsurfignore", windsurfIgnore);

  // 4. .windsurf/ 目录
  const windsurfFolder = zip.folder(".windsurf");

  // 4.1 rules/ 多规则文件目录
  const rulesFolder = windsurfFolder.folder("rules");
  rulesFolder.file("general.md", encodeWindsurfRulesGeneral(schema));
  rulesFolder.file("code-style.md", encodeWindsurfRulesCodeStyle(schema));
  rulesFolder.file("frontend.md", encodeWindsurfRulesFrontend(schema));
  rulesFolder.file("backend.md", encodeWindsurfRulesBackend(schema));
  rulesFolder.file("tests.md", encodeWindsurfRulesTests(schema));
  rulesFolder.file("tools.md", encodeWindsurfRulesTools(schema));
  rulesFolder.file("workflow.md", encodeWindsurfRulesWorkflow(schema));

  // 4.2 mcp.json - MCP服务器配置
  const mcpJSON = encodeWindsurfMCPJSON(schema);
  windsurfFolder.file("mcp.json", mcpJSON);

  // 4.3 settings.json - Windsurf项目设置
  const settingsJSON = encodeWindsurfSettingsJSON(schema);
  windsurfFolder.file("settings.json", settingsJSON);

  // 4.4 context/files.json - 始终包含的文件
  const contextFolder = windsurfFolder.folder("context");
  const filesJSON = encodeWindsurfContextFiles(schema);
  contextFolder.file("files.json", filesJSON);

  // 5. mcp-tools/ 目录（如果有MCP工具）
  if (schema.tools.mcpServers?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    const mcpToolsFolder = zip.folder("mcp-tools");
    mcpToolsFolder.file("mcp_wrapper.js", generateWindsurfMCPWrapper(schema));
    mcpToolsFolder.file("api_tools.js", generateWindsurfAPITools(schema));
    mcpToolsFolder.file("README.md", generateWindsurfMCPToolsReadme(schema));
  }

  // 6. .env.example - 密钥模板
  const envExample = encodeWindsurfEnvExample(schema);
  zip.file(".env.example", envExample);

  // 7. README.md - 使用说明
  const readmeMD = encodeWindsurfReadme(schema);
  zip.file("README.md", readmeMD);

  // 8. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Windsurf 规则编码器（复用Cursor逻辑）
// ============================================

function encodeWindsurfRulesMain(schema) {
  const sections = [];

  sections.push('# Windsurf Rules - Main Configuration');
  sections.push('');
  sections.push('> This file is loaded with highest priority for all Windsurf AI interactions.');
  sections.push('> Powered by Codeium Cascade Flow engine.');
  sections.push('');

  // 项目信息
  sections.push('## Project');
  sections.push('');
  sections.push(`- **Name**: ${schema.meta.name || 'Windsurf Agent'}`);
  sections.push(`- **Description**: ${schema.meta.description || 'AI Assistant'}`);
  sections.push('');

  // Cascade Flow 说明
  sections.push('## Cascade Flow');
  sections.push('');
  sections.push('Windsurf uses Cascade Flow for multi-step reasoning:');
  sections.push('1. **Understand** → Analyze request and context');
  sections.push('2. **Plan** → Identify files and changes needed');
  sections.push('3. **Execute** → Make changes incrementally');
  sections.push('4. **Verify** → Test and validate changes');
  sections.push('');

  // 核心行为规则
  sections.push('## Core Behavior');
  sections.push('');

  if (schema.identity.systemPrompt) {
    sections.push(schema.identity.systemPrompt);
    sections.push('');
  }

  // 约束规则
  if (schema.identity.constraints?.length > 0) {
    sections.push('## Hard Constraints');
    sections.push('');
    sections.push('> These rules must NEVER be violated:');
    sections.push('');
    for (const c of schema.identity.constraints) {
      sections.push(`- ${c}`);
    }
    sections.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    sections.push('## Output Format');
    sections.push('');
    for (const r of schema.identity.outputRules) {
      sections.push(`- ${r}`);
    }
    sections.push('');
  }

  // 引用其他规则文件
  sections.push('## Additional Rules');
  sections.push('');
  sections.push('> See `.windsurf/rules/` directory for detailed rules:');
  sections.push('- `general.md` - General guidelines');
  sections.push('- `code-style.md` - Code formatting');
  sections.push('- `frontend.md` - Frontend rules (src/frontend/**)');
  sections.push('- `backend.md` - Backend rules');
  sections.push('- `tests.md` - Testing rules');
  sections.push('');

  // MCP工具引用
  if (schema.tools.mcpServers?.length > 0) {
    sections.push('## MCP Tools Available');
    sections.push('');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`- **${mcp.name}**: ${mcp.tools?.map(t => t.name).join(', ') || 'MCP Server'}`);
    }
    sections.push('');
  }

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

function encodeWindsurfIgnore(schema) {
  const lines = [];

  lines.push('# Windsurf Ignore File');
  lines.push('# Excludes files from Windsurf AI context');
  lines.push('');

  lines.push('# Dependencies');
  lines.push('node_modules/');
  lines.push('package-lock.json');
  lines.push('');

  lines.push('# Build outputs');
  lines.push('dist/');
  lines.push('build/');
  lines.push('');

  lines.push('# Secrets (IMPORTANT)');
  lines.push('.env');
  lines.push('.env.local');
  lines.push('.env.*.local');
  lines.push('');

  lines.push('# Cache');
  lines.push('.cache/');
  lines.push('*.log');
  lines.push('');

  return lines.join('\n');
}

// 复用Cursor的规则编码器，仅改标题
function encodeWindsurfRulesGeneral(schema) {
  let output = window.CursorBundle?.encodeCursorRulesGeneral(schema) || '';
  // 替换标题
  output = output.replace('# General Rules', '# General Rules\n> Windsurf AI Guidelines');
  return output;
}

function encodeWindsurfRulesCodeStyle(schema) {
  let output = window.CursorBundle?.encodeCursorRulesCodeStyle(schema) || '';
  output = output.replace('# Code Style Rules', '# Code Style Rules\n> Windsurf Code Formatting');
  return output;
}

function encodeWindsurfRulesFrontend(schema) {
  let output = window.CursorBundle?.encodeCursorRulesFrontend(schema) || '';
  output = output.replace('# Frontend Rules', '# Frontend Rules\n> Windsurf Frontend Guidelines');
  return output;
}

function encodeWindsurfRulesBackend(schema) {
  let output = window.CursorBundle?.encodeCursorRulesBackend(schema) || '';
  output = output.replace('# Backend Rules', '# Backend Rules\n> Windsurf Backend Guidelines');
  return output;
}

function encodeWindsurfRulesTests(schema) {
  let output = window.CursorBundle?.encodeCursorRulesTests(schema) || '';
  output = output.replace('# Testing Rules', '# Testing Rules\n> Windsurf Testing Guidelines');
  return output;
}

function encodeWindsurfRulesTools(schema) {
  let output = window.CursorBundle?.encodeCursorRulesTools(schema) || '';
  output = output.replace('# Tool Usage Rules', '# Tool Usage Rules\n> Windsurf MCP Tool Guidelines');
  return output;
}

function encodeWindsurfRulesWorkflow(schema) {
  let output = window.CursorBundle?.encodeCursorRulesWorkflow(schema) || '';
  output = output.replace('# Workflow Rules', '# Workflow Rules\n> Windsurf Cascade Flow Steps');
  return output;
}

function encodeWindsurfMCPJSON(schema) {
  // 完全复用Cursor的MCP配置
  return window.CursorBundle?.encodeCursorMCPJSON(schema) || '{}';
}

function encodeWindsurfSettingsJSON(schema) {
  const settings = {
    "windsurf.ai": {
      "model": "cascade",  // Windsurf特有的Cascade模型
      "cascadeFlow": true,
      "contextWindow": 100000
    },
    "windsurf.context": {
      "includePattern": ["**/*.ts", "**/*.js", "**/*.py"],
      "excludePattern": ["node_modules/**", "dist/**"]
    },
    "windsurf.rules": {
      "projectRules": true,
      "userRules": false
    },
    "editor": {
      "formatOnSave": true,
      "tabSize": 4
    }
  };

  return JSON.stringify(settings, null, 2);
}

function encodeWindsurfContextFiles(schema) {
  const contextFiles = {
    description: "Files always included in Windsurf context",
    files: ["README.md", ".windsurfrules", "package.json"],
    watchFiles: [".windsurf/rules/*.md"]
  };

  return JSON.stringify(contextFiles, null, 2);
}

function encodeWindsurfEnvExample(schema) {
  // 复用Cursor的环境变量模板
  let output = window.CursorBundle?.encodeCursorEnvExample(schema) || '';
  output = output.replace('Cursor', 'Windsurf');
  return output;
}

function generateWindsurfMCPWrapper(schema) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Windsurf MCP Tools Wrapper');
  lines.push(' * Generated by UAT Converter');
  lines.push(' */');
  lines.push('');
  lines.push('const MCP_SERVERS = {');

  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      lines.push(`  "${mcp.name}": {`);
      lines.push(`    url: "${mcp.url || ''}",`);
      lines.push(`    enabled: ${mcp.enabled !== false}`);
      lines.push(`  },`);
    }
  }

  lines.push('};');
  lines.push('');
  lines.push('module.exports = { MCP_SERVERS };');

  return lines.join('\n');
}

function generateWindsurfAPITools(schema) {
  // 复用Cursor的API工具
  return window.CursorBundle?.generateCursorAPITools(schema) || '';
}

function generateWindsurfMCPToolsReadme(schema) {
  const sections = [];

  sections.push('# Windsurf MCP Tools');
  sections.push('');
  sections.push('MCP server wrapper scripts for Windsurf.');
  sections.push('');

  return sections.join('\n');
}

function encodeWindsurfReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Windsurf Agent'} - Bundle`);
  sections.push('');
  sections.push('Windsurf Agent Bundle with Cascade Flow support.');
  sections.push('');

  sections.push('## Contents');
  sections.push('');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `.windsurfrules` | Main rules (highest priority) |');
  sections.push('| `.windsurf/rules/*.md` | Category-specific rules |');
  sections.push('| `.windsurf/mcp.json` | MCP server config |');
  sections.push('| `.windsurf/settings.json` | Windsurf settings |');
  sections.push('');

  sections.push('## Cascade Flow');
  sections.push('');
  sections.push('Windsurf uses multi-step Cascade Flow:');
  sections.push('1. Understand → 2. Plan → 3. Execute → 4. Verify');
  sections.push('');

  sections.push('## Installation');
  sections.push('');
  sections.push('1. Extract to project root');
  sections.push('2. Open in Windsurf IDE');
  sections.push('3. Rules auto-loaded');
  sections.push('');

  sections.push('---');
  sections.push('');
  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Windsurf Bundle 解析（导入）
// ============================================

async function parseWindsurfBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  // 1. 解析 manifest
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  // 2. 解析 .windsurfrules
  const windsurfRulesFile = zip.file(".windsurfrules");
  let windsurfRules = '';
  if (windsurfRulesFile) {
    windsurfRules = await windsurfRulesFile.async("string");
  }

  // 3. 解析 .windsurf/rules/
  const rulesDir = zip.folder(".windsurf").folder("rules");
  const rulesFiles = {};
  for (const filename of ['general.md', 'code-style.md', 'frontend.md', 'backend.md', 'tests.md', 'tools.md', 'workflow.md']) {
    const file = rulesDir.file(filename);
    if (file) {
      rulesFiles[filename] = await file.async("string");
    }
  }

  // 4. 解析 mcp.json
  const mcpFile = zip.folder(".windsurf").file("mcp.json");
  let mcpJSON = '';
  if (mcpFile) {
    mcpJSON = await mcpFile.async("string");
  }

  // 5. 构建 Schema
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'windsurf';
  schema.meta.name = manifest.agent?.name || 'Windsurf Agent';
  schema.meta.description = manifest.agent?.description || '';

  // 解析规则
  parseWindsurfRulesMain(windsurfRules, schema);
  parseWindsurfRulesFiles(rulesFiles, schema);
  parseWindsurfMCPJSON(mcpJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  const rawFiles = { windsurfRules, rulesFiles, mcpJSON };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 Windsurf 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseWindsurfBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'windsurf';

  // 查找并解析 .windsurfrules 主规则文件
  const windsurfRules = findFileByPattern(extractedFiles, ['.windsurfrules', 'windsurfrules']);
  if (windsurfRules) {
    parseWindsurfRulesMain(windsurfRules, schema);
  }

  // 查找并解析 .windsurf/rules/*.md 规则文件
  const rulesFiles = {};
  const ruleNames = ['general.md', 'code-style.md', 'frontend.md', 'backend.md', 'tests.md', 'tools.md', 'workflow.md'];
  for (const ruleName of ruleNames) {
    const content = findFileByPattern(extractedFiles, [
      '.windsurf/rules/' + ruleName,
      'windsurf/rules/' + ruleName,
      ruleName
    ]);
    if (content) {
      rulesFiles[ruleName] = content;
    }
  }
  parseWindsurfRulesFiles(rulesFiles, schema);

  // 查找并解析 mcp.json
  const mcpJSON = findFileByPattern(extractedFiles, [
    '.windsurf/mcp.json',
    'windsurf/mcp.json',
    'mcp.json'
  ]);
  if (mcpJSON) {
    parseWindsurfMCPJSON(mcpJSON, schema);
  }

  // 查找并解析 settings.json
  const settingsJSON = findFileByPattern(extractedFiles, [
    '.windsurf/settings.json',
    'windsurf/settings.json',
    'settings.json'
  ]);
  if (settingsJSON) {
    try {
      const settings = JSON.parse(settingsJSON);
      if (settings['windsurf.ai']?.model) {
        schema.modelConfig.model = settings['windsurf.ai'].model;
      }
      if (settings['windsurf.ai']?.temperature) {
        schema.modelConfig.temperature = settings['windsurf.ai'].temperature;
      }
    } catch (e) {
      console.warn('Windsurf settings JSON parse warning:', e.message);
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseWindsurfRulesMain(mdText, schema) {
  if (!mdText) return;

  // 提取项目名称
  const nameMatch = mdText.match(/\*Name\*: (.+)/i);
  if (nameMatch) {
    schema.meta.name = nameMatch[1].trim();
  }

  // 提取核心行为
  const coreMatch = mdText.match(/## Core Behavior\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (coreMatch) {
    schema.identity.systemPrompt = coreMatch[1].trim();
  }

  // 提取约束
  const constraintsMatch = mdText.match(/## Hard Constraints\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (constraintsMatch) {
    const lines = constraintsMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.constraints.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }
}

function parseWindsurfRulesFiles(rulesFiles, schema) {
  // 复用Cursor的解析逻辑
  if (rulesFiles['general.md']) {
    const guidelinesMatch = rulesFiles['general.md'].match(/## Guidelines\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (guidelinesMatch) {
      const guidelines = guidelinesMatch[1].split('\n')
        .filter(l => l.trim().startsWith('-'))
        .map(l => l.replace(/^-\s*/, '').trim())
        .join('\n');
      schema.identity.systemPrompt += '\n\n' + guidelines;
    }
  }
}

function parseWindsurfMCPJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const mcpConfig = JSON.parse(jsonText);

    if (mcpConfig.mcpServers) {
      for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
        const mcp = UATCore.createEmptyMCPServer();
        mcp.id = name;
        mcp.name = name;
        mcp.config = {
          command: config.command || '',
          args: config.args || [],
          env: config.env || {}
        };
        mcp.enabled = !config.disabled;
        schema.tools.mcpServers.push(mcp);
      }
    }
  } catch (e) {
    console.warn('mcp.json parse warning:', e.message);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Windsurf 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeWindsurfToFiles(schema) {
  return {
    '.windsurfrules': encodeWindsurfRulesMain(schema),
    '.windsurfignore': encodeWindsurfIgnore(schema),
    '.windsurf/rules/general.md': encodeWindsurfRulesGeneral(schema),
    '.windsurf/rules/code-style.md': encodeWindsurfRulesCodeStyle(schema),
    '.windsurf/rules/frontend.md': encodeWindsurfRulesFrontend(schema),
    '.windsurf/rules/backend.md': encodeWindsurfRulesBackend(schema),
    '.windsurf/rules/tests.md': encodeWindsurfRulesTests(schema),
    '.windsurf/rules/tools.md': encodeWindsurfRulesTools(schema),
    '.windsurf/rules/workflow.md': encodeWindsurfRulesWorkflow(schema),
    '.windsurf/mcp.json': encodeWindsurfMCPJSON(schema),
    '.windsurf/settings.json': encodeWindsurfSettingsJSON(schema),
    '.env.example': encodeWindsurfEnvExample(schema),
    'README.md': encodeWindsurfReadme(schema)
  };
}

window.WindsurfBundle = {
  createWindsurfBundle,
  parseWindsurfBundle,
  parseWindsurfBundleFromFiles,
  encodeWindsurfRulesMain,
  encodeWindsurfIgnore,
  encodeWindsurfRulesGeneral,
  encodeWindsurfRulesCodeStyle,
  encodeWindsurfRulesFrontend,
  encodeWindsurfRulesBackend,
  encodeWindsurfRulesTests,
  encodeWindsurfRulesTools,
  encodeWindsurfRulesWorkflow,
  encodeWindsurfMCPJSON,
  encodeWindsurfSettingsJSON,
  encodeWindsurfContextFiles,
  encodeWindsurfEnvExample,
  encodeWindsurfReadme,
  encodeWindsurfToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.WindsurfBundle;
}