/**
 * UAT Cursor Bundle 管理器 - Cursor Bundle Manager
 * 专门处理 Cursor IDE Agent 的多文件配置包导入导出
 *
 * Cursor 配置结构：
 * 项目根目录/
 * ├── .cursorrules              # 主规则文件（最高优先级）
 * ├── .cursorignore             # 文件索引排除
 * ├── .cursor/
 * │   ├── rules/                # 多规则文件目录（按文件类型匹配）
 * │   │   ├── general.md        # 通用规则
 * │   │   ├── code-style.md     # 代码风格
 * │   │   ├── frontend.md       # 前端规则（自动匹配 src/frontend/**）
 * │   │   ├── backend.md        # 后端规则
 * │   │   ├── tests.md          # 测试规则
 * │   │   └── tools.md          # 工具说明
 * │   ├── mcp.json              # MCP服务器配置
 * │   └── settings.json         # Cursor项目设置
 * │   └── context/              # 上下文文件（可选）
 * │       └── files.json        # 始终包含的文件列表
 * └── mcp-tools/                # MCP工具包装脚本（可选）
 */

// ============================================
// Cursor Bundle 创建（导出）
// ============================================

/**
 * 创建 Cursor Bundle ZIP 包
 * @param {Object} schema - UAT-Schema v2.0
 * @param {Object} options - 可选配置
 * @returns {Promise<Blob>} ZIP 文件
 */
async function createCursorBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json - Bundle 清单
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Cursor-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainRules: ".cursorrules",
      cursorDir: ".cursor/",
      rulesDir: ".cursor/rules/",
      mcpConfig: ".cursor/mcp.json",
      settings: ".cursor/settings.json",
      ignore: ".cursorignore",
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
      exportedBy: "UAT v2.0 - Cursor Bundle"
    },
    notes: {
      mcpServers: "MCP工具配置已保留，需安装对应MCP服务器",
      secrets: "密钥已移除，请填写 .env 文件",
      contextFiles: "项目上下文文件请在Cursor中重新索引"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. .cursorrules - 主规则文件（最高优先级）
  const cursorRules = encodeCursorRulesMain(schema);
  zip.file(".cursorrules", cursorRules);

  // 3. .cursorignore - 文件排除规则
  const cursorIgnore = encodeCursorIgnore(schema);
  zip.file(".cursorignore", cursorIgnore);

  // 4. .cursor/ 目录
  const cursorFolder = zip.folder(".cursor");

  // 4.1 rules/ 多规则文件目录
  const rulesFolder = cursorFolder.folder("rules");
  rulesFolder.file("general.md", encodeCursorRulesGeneral(schema));
  rulesFolder.file("code-style.md", encodeCursorRulesCodeStyle(schema));
  rulesFolder.file("frontend.md", encodeCursorRulesFrontend(schema));
  rulesFolder.file("backend.md", encodeCursorRulesBackend(schema));
  rulesFolder.file("tests.md", encodeCursorRulesTests(schema));
  rulesFolder.file("tools.md", encodeCursorRulesTools(schema));
  rulesFolder.file("workflow.md", encodeCursorRulesWorkflow(schema));

  // 4.2 mcp.json - MCP服务器配置
  const mcpJSON = encodeCursorMCPJSON(schema);
  cursorFolder.file("mcp.json", mcpJSON);

  // 4.3 settings.json - Cursor项目设置
  const settingsJSON = encodeCursorSettingsJSON(schema);
  cursorFolder.file("settings.json", settingsJSON);

  // 4.4 context/files.json - 始终包含的文件（可选）
  const contextFolder = cursorFolder.folder("context");
  const filesJSON = encodeCursorContextFiles(schema);
  contextFolder.file("files.json", filesJSON);

  // 5. mcp-tools/ 目录（如果有MCP工具）
  if (schema.tools.mcpServers?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    const mcpToolsFolder = zip.folder("mcp-tools");
    mcpToolsFolder.file("mcp_wrapper.js", generateCursorMCPWrapper(schema));
    mcpToolsFolder.file("api_tools.js", generateCursorAPITools(schema));
    mcpToolsFolder.file("README.md", generateCursorMCPToolsReadme(schema));
  }

  // 6. .env.example - 密钥模板
  const envExample = encodeCursorEnvExample(schema);
  zip.file(".env.example", envExample);

  // 7. README.md - 使用说明
  const readmeMD = encodeCursorReadme(schema);
  zip.file("README.md", readmeMD);

  // 8. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// .cursorrules 主规则文件编码器
// ============================================

function encodeCursorRulesMain(schema) {
  const sections = [];

  sections.push('# Cursor Rules - Main Configuration');
  sections.push('');
  sections.push('> This file is loaded with highest priority for all Cursor AI interactions.');
  sections.push('> Place this file in your project root directory.');
  sections.push('');

  // 项目信息
  sections.push('## Project');
  sections.push('');
  sections.push(`- **Name**: ${schema.meta.name || 'Cursor Agent'}`);
  sections.push(`- **Description**: ${schema.meta.description || 'AI Assistant'}`);
  sections.push('');

  // 核心行为规则（最高优先级）
  sections.push('## Core Behavior');
  sections.push('');

  if (schema.identity.systemPrompt) {
    sections.push(schema.identity.systemPrompt);
    sections.push('');
  }

  // 约束规则（最重要）
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
  sections.push('> See `.cursor/rules/` directory for detailed rules by category:');
  sections.push('- `general.md` - General guidelines');
  sections.push('- `code-style.md` - Code formatting and style');
  sections.push('- `frontend.md` - Frontend-specific rules (applies to `src/frontend/**`)');
  sections.push('- `backend.md` - Backend-specific rules (applies to `src/backend/**`)');
  sections.push('- `tests.md` - Testing rules (applies to `**/*.test.*`)');
  sections.push('- `tools.md` - Tool usage guidelines');
  sections.push('- `workflow.md` - Task workflow steps');
  sections.push('');

  // MCP工具引用
  if (schema.tools.mcpServers?.length > 0) {
    sections.push('## MCP Tools Available');
    sections.push('');
    sections.push('> MCP servers configured in `.cursor/mcp.json`:');
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

// ============================================
// .cursorignore 编码器
// ============================================

function encodeCursorIgnore(schema) {
  const lines = [];

  lines.push('# Cursor Ignore File');
  lines.push('# Similar to .gitignore - excludes files from Cursor AI context');
  lines.push('');

  // 标准排除项
  lines.push('# Dependencies');
  lines.push('node_modules/');
  lines.push('package-lock.json');
  lines.push('yarn.lock');
  lines.push('pnpm-lock.yaml');
  lines.push('');

  lines.push('# Build outputs');
  lines.push('dist/');
  lines.push('build/');
  lines.push('.next/');
  lines.push('out/');
  lines.push('');

  lines.push('# Cache and temp');
  lines.push('.cache/');
  lines.push('.tmp/');
  lines.push('*.log');
  lines.push('');

  lines.push('# Secrets (IMPORTANT)');
  lines.push('.env');
  lines.push('.env.local');
  lines.push('.env.*.local');
  lines.push('**/secrets/');
  lines.push('**/credentials/');
  lines.push('');

  lines.push('# IDE and system');
  lines.push('.vscode/');
  lines.push('.idea/');
  lines.push('.DS_Store');
  lines.push('Thumbs.db');
  lines.push('');

  lines.push('# Generated files');
  lines.push('*.min.js');
  lines.push('*.min.css');
  lines.push('coverage/');
  lines.push('');

  // 项目特定排除（如果有知识库）
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    lines.push('# Knowledge base (external)');
    lines.push('# Knowledge base files are stored externally, not indexed');
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// .cursor/rules/*.md 多规则文件编码器
// ============================================

function encodeCursorRulesGeneral(schema) {
  const sections = [];

  sections.push('# General Rules');
  sections.push('');
  sections.push('> Applies to: All files');
  sections.push('> Priority: High');
  sections.push('');

  sections.push('## Guidelines');
  sections.push('');

  // 从系统提示词提取通用规则
  if (schema.identity.systemPrompt) {
    const sentences = schema.identity.systemPrompt.split(/[。\n]/).filter(s => s.trim());
    for (const sentence of sentences) {
      if (sentence.trim() && sentence.length < 200) {
        sections.push(`- ${sentence.trim()}`);
      }
    }
    sections.push('');
  }

  sections.push('## Best Practices');
  sections.push('');
  sections.push('- Write clean, readable code');
  sections.push('- Document complex logic');
  sections.push('- Follow project conventions');
  sections.push('- Keep functions small and focused');
  sections.push('');

  sections.push('## Communication Style');
  sections.push('');
  if (schema.identity.responseStyle) {
    sections.push(schema.identity.responseStyle);
  } else {
    sections.push('- Be clear and concise');
    sections.push('- Explain reasoning when helpful');
    sections.push('- Ask clarifying questions when needed');
  }
  sections.push('');

  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    sections.push(`- Primary: ${schema.identity.language}`);
    sections.push('');
  }

  return sections.join('\n');
}

function encodeCursorRulesCodeStyle(schema) {
  const sections = [];

  sections.push('# Code Style Rules');
  sections.push('');
  sections.push('> Applies to: All code files (`**/*.js`, `**/*.ts`, `**/*.py`, etc.)');
  sections.push('> Priority: Medium');
  sections.push('');

  sections.push('## General Style');
  sections.push('');
  sections.push('- Use consistent naming conventions');
  sections.push('- Prefer meaningful variable names');
  sections.push('- Keep lines under 120 characters');
  sections.push('- Use proper indentation');
  sections.push('');

  sections.push('## Comments');
  sections.push('');
  sections.push('- Document public APIs');
  sections.push('- Explain non-obvious logic');
  sections.push('- Avoid redundant comments');
  sections.push('');

  sections.push('## Functions');
  sections.push('');
  sections.push('- Single responsibility principle');
  sections.push('- Pure functions preferred');
  sections.push('- Early returns for clarity');
  sections.push('- Limit parameters to 3-4');
  sections.push('');

  sections.push('## Error Handling');
  sections.push('');
  sections.push('- Handle errors gracefully');
  sections.push('- Provide meaningful error messages');
  sections.push('- Log errors appropriately');
  sections.push('');

  return sections.join('\n');
}

function encodeCursorRulesFrontend(schema) {
  const sections = [];

  sections.push('# Frontend Rules');
  sections.push('');
  sections.push('> Applies to: `src/frontend/**`, `src/components/**`, `src/pages/**`');
  sections.push('> File pattern: `**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.css`');
  sections.push('> Priority: Medium');
  sections.push('');

  sections.push('## Component Guidelines');
  sections.push('');
  sections.push('- Prefer functional components');
  sections.push('- Use hooks for state management');
  sections.push('- Keep components small and reusable');
  sections.push('- Props should be typed');
  sections.push('');

  sections.push('## Styling');
  sections.push('');
  sections.push('- Use consistent styling approach');
  sections.push('- Avoid inline styles for complex styling');
  sections.push('- Use CSS variables for theme values');
  sections.push('');

  sections.push('## Performance');
  sections.push('');
  sections.push('- Avoid unnecessary re-renders');
  sections.push('- Lazy load large components');
  sections.push('- Optimize images');
  sections.push('');

  sections.push('## Accessibility');
  sections.push('');
  sections.push('- Use semantic HTML');
  sections.push('- Include ARIA attributes when needed');
  sections.push('- Ensure keyboard navigation');
  sections.push('');

  return sections.join('\n');
}

function encodeCursorRulesBackend(schema) {
  const sections = [];

  sections.push('# Backend Rules');
  sections.push('');
  sections.push('> Applies to: `src/backend/**`, `src/api/**`, `src/services/**`');
  sections.push('> File pattern: `**/*.ts`, `**/*.js`, `**/*.py`');
  sections.push('> Priority: Medium');
  sections.push('');

  sections.push('## API Design');
  sections.push('');
  sections.push('- RESTful conventions');
  sections.push('- Consistent response format');
  sections.push('- Proper HTTP status codes');
  sections.push('- Validate all inputs');
  sections.push('');

  sections.push('## Security');
  sections.push('');
  sections.push('- Never trust user input');
  sections.push('- Use parameterized queries');
  sections.push('- Implement rate limiting');
  sections.push('- Log security events');
  sections.push('');

  sections.push('## Database');
  sections.push('');
  sections.push('- Use transactions for critical operations');
  sections.push('- Index frequently queried fields');
  sections.push('- Avoid N+1 queries');
  sections.push('');

  sections.push('## Error Handling');
  sections.push('');
  sections.push('- Catch all errors');
  sections.push('- Return meaningful error messages');
  sections.push('- Don\'t expose internal details');
  sections.push('');

  return sections.join('\n');
}

function encodeCursorRulesTests(schema) {
  const sections = [];

  sections.push('# Testing Rules');
  sections.push('');
  sections.push('> Applies to: `**/*.test.*`, `**/*.spec.*`, `tests/**`, `__tests__/**`');
  sections.push('> Priority: Medium');
  sections.push('');

  sections.push('## Test Structure');
  sections.push('');
  sections.push('- Clear test names describing what is tested');
  sections.push('- One assertion per test (when possible)');
  sections.push('- Use describe blocks for grouping');
  sections.push('');

  sections.push('## Coverage');
  sections.push('');
  sections.push('- Test edge cases');
  sections.push('- Test error conditions');
  sections.push('- Test happy paths');
  sections.push('');

  sections.push('## Mocking');
  sections.push('');
  sections.push('- Mock external dependencies');
  sections.push('- Keep mocks simple');
  sections.push('- Reset mocks between tests');
  sections.push('');

  sections.push('## Assertions');
  sections.push('');
  sections.push('- Use specific assertions');
  sections.push('- Avoid deep equality when shallow works');
  sections.push('- Assert on meaningful values');
  sections.push('');

  return sections.join('\n');
}

function encodeCursorRulesTools(schema) {
  const sections = [];

  sections.push('# Tool Usage Rules');
  sections.push('');
  sections.push('> Guidelines for using Cursor AI tools and MCP servers');
  sections.push('> Priority: High');
  sections.push('');

  sections.push('## File Operations');
  sections.push('');
  sections.push('- Always read before modifying');
  sections.push('- Preserve file structure');
  sections.push('- Check for existing code');
  sections.push('');

  sections.push('## MCP Tools');
  sections.push('');
  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`### ${mcp.name}`);
      sections.push('');
      sections.push(`- **Type**: MCP Server`);
      sections.push(`- **URL**: ${mcp.url || 'local'}`);
      if (mcp.tools?.length > 0) {
        sections.push(`- **Capabilities**: ${mcp.tools.map(t => t.name).join(', ')}`);
      }
      sections.push('');
    }
  } else {
    sections.push('- MCP servers configured in `.cursor/mcp.json`');
    sections.push('- Check MCP tools availability before using');
    sections.push('');
  }

  sections.push('## API Tools');
  sections.push('');
  if (schema.tools.apiEndpoints?.length > 0) {
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`- **${api.name}**: ${api.method} ${api.url}`);
    }
    sections.push('');
  } else {
    sections.push('- External APIs available per project configuration');
    sections.push('');
  }

  sections.push('## Safety Rules');
  sections.push('');
  sections.push('- Never modify files without confirmation');
  sections.push('- Validate all inputs to tools');
  sections.push('- Log tool usage for debugging');
  sections.push('');

  return sections.join('\n');
}

function encodeCursorRulesWorkflow(schema) {
  const sections = [];

  sections.push('# Workflow Rules');
  sections.push('');
  sections.push('> Task processing workflow steps');
  sections.push('> Priority: Medium');
  sections.push('');

  sections.push('## Task Flow');
  sections.push('');
  sections.push('1. **Understand**: Read and analyze the request');
  sections.push('2. **Plan**: Identify files and changes needed');
  sections.push('3. **Execute**: Make changes incrementally');
  sections.push('4. **Verify**: Test and validate changes');
  sections.push('5. **Document**: Update comments and docs');
  sections.push('');

  if (schema.workflow.steps?.length > 0) {
    sections.push('## Custom Workflow Steps');
    sections.push('');
    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      sections.push(`${i + 1}. **${step.name}** (${step.type})`);
      if (step.content) {
        sections.push(`   - ${step.content.substring(0, 100)}${step.content.length > 100 ? '...' : ''}`);
      }
    }
    sections.push('');
  }

  sections.push('## Change Guidelines');
  sections.push('');
  sections.push('- Make minimal, focused changes');
  sections.push('- Preserve existing functionality');
  sections.push('- Add tests for new features');
  sections.push('- Update documentation');
  sections.push('');

  return sections.join('\n');
}

// ============================================
// .cursor/mcp.json 编码器
// ============================================

function encodeCursorMCPJSON(schema) {
  const mcpConfig = {
    mcpServers: {}
  };

  // MCP服务器配置
  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      const serverConfig = {};

      if (mcp.config?.command) {
        serverConfig.command = mcp.config.command;
      } else if (mcp.url) {
        // 远程MCP服务器使用特殊命令
        serverConfig.command = 'npx';
        serverConfig.args = ['-y', '@anthropic/mcp-client', mcp.url];
      }

      if (mcp.config?.args?.length) {
        serverConfig.args = mcp.config.args;
      }

      if (mcp.config?.env) {
        serverConfig.env = {};
        for (const [key, value] of Object.entries(mcp.config.env)) {
          // 密钥用环境变量引用
          if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
            serverConfig.env[key] = `$${key}`;
          } else {
            serverConfig.env[key] = value;
          }
        }
      }

      serverConfig.disabled = mcp.enabled === false;

      mcpConfig.mcpServers[mcp.name] = serverConfig;
    }
  }

  return JSON.stringify(mcpConfig, null, 2);
}

// ============================================
// .cursor/settings.json 编码器
// ============================================

function encodeCursorSettingsJSON(schema) {
  const settings = {
    // Cursor AI 设置
    "cursor.ai": {
      "model": schema.modelConfig.model || "claude-sonnet-4",
      "temperature": schema.modelConfig.temperature || 0.7,
      "maxTokens": schema.modelConfig.maxTokens || 4096
    },

    // 上下文设置
    "cursor.context": {
      "includePattern": ["**/*.ts", "**/*.js", "**/*.py", "**/*.md"],
      "excludePattern": ["node_modules/**", "dist/**", ".env*"]
    },

    // 规则设置
    "cursor.rules": {
      "projectRules": true,
      "userRules": false,
      "priorityOrder": [
        ".cursorrules",
        ".cursor/rules/*.md"
      ]
    },

    // 编辑器设置
    "editor": {
      "formatOnSave": true,
      "tabSize": 2,
      "insertSpaces": true
    }
  };

  return JSON.stringify(settings, null, 2);
}

// ============================================
// .cursor/context/files.json 编码器
// ============================================

function encodeCursorContextFiles(schema) {
  const contextFiles = {
    description: "Files that should always be included in Cursor context",
    files: [
      "README.md",
      ".cursorrules",
      ".cursor/mcp.json",
      "package.json"
    ],
    watchFiles: [
      ".cursor/rules/*.md"
    ],
    notes: [
      "These files are always indexed by Cursor AI",
      "Add project-specific files as needed"
    ]
  };

  return JSON.stringify(contextFiles, null, 2);
}

// ============================================
// .env.example 编码器
// ============================================

function encodeCursorEnvExample(schema) {
  const lines = [];

  lines.push('# Cursor Environment Variables');
  lines.push('# Copy to .env and fill in your API keys');
  lines.push('# NEVER commit .env to Git!');
  lines.push('');

  // MCP服务器密钥
  if (schema.tools.mcpServers?.length > 0) {
    lines.push('# MCP Server Credentials');
    lines.push('');
    for (const mcp of schema.tools.mcpServers) {
      if (mcp.config?.env) {
        for (const [key, _] of Object.entries(mcp.config.env)) {
          if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
            lines.push(`${key}=your-${mcp.name}-${key.toLowerCase()}-here`);
          }
        }
      }
    }
    lines.push('');
  }

  // API密钥
  if (schema.tools.apiEndpoints?.length > 0) {
    lines.push('# API Credentials');
    lines.push('');
    for (const api of schema.tools.apiEndpoints) {
      if (api.auth?.type === 'bearer') {
        lines.push(`${api.name.toUpperCase()}_API_TOKEN=your-token-here`);
      } else if (api.auth?.type === 'basic') {
        lines.push(`${api.name.toUpperCase()}_USERNAME=your-username`);
        lines.push(`${api.name.toUpperCase()}_PASSWORD=your-password`);
      } else if (api.auth?.type === 'api_key') {
        lines.push(`${api.name.toUpperCase()}_API_KEY=your-api-key`);
      }
    }
    lines.push('');
  }

  // 默认AI模型密钥
  lines.push('# AI Model API Keys (if using external models)');
  lines.push('');
  lines.push('#ANTHROPIC_API_KEY=sk-ant-your-key');
  lines.push('#OPENAI_API_KEY=sk-your-key');
  lines.push('');

  return lines.join('\n');
}

// ============================================
// mcp-tools/ 脚本生成器
// ============================================

function generateCursorMCPWrapper(schema) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Cursor MCP Tools Wrapper');
  lines.push(' * Generated by UAT Converter');
  lines.push(' * ');
  lines.push(' * This script provides a wrapper for MCP tools');
  lines.push(' * when using Cursor\'s custom tool integration.');
  lines.push(' */');
  lines.push('');
  lines.push('// MCP Server Registry');
  lines.push('const MCP_SERVERS = {');

  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      lines.push(`  "${mcp.name}": {`);
      lines.push(`    url: "${mcp.url || ''}",`);
      lines.push(`    command: "${mcp.config?.command || ''}",`);
      lines.push(`    enabled: ${mcp.enabled !== false}`);
      lines.push(`  },`);
    }
  }

  lines.push('};');
  lines.push('');
  lines.push('');
  lines.push('// Get MCP tool definitions');
  lines.push('function getMCPTools() {');
  lines.push('  return Object.entries(MCP_SERVERS)');
  lines.push('    .filter(([name, config]) => config.enabled)');
  lines.push('    .map(([name, config]) => ({ name, ...config }));');
  lines.push('}');
  lines.push('');
  lines.push('');
  lines.push('module.exports = { MCP_SERVERS, getMCPTools };');

  return lines.join('\n');
}

function generateCursorAPITools(schema) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Cursor API Tools');
  lines.push(' * Generated by UAT Converter');
  lines.push(' */');
  lines.push('');

  if (schema.tools.apiEndpoints?.length > 0) {
    lines.push('const API_ENDPOINTS = {');
    for (const api of schema.tools.apiEndpoints) {
      lines.push(`  "${api.name}": {`);
      lines.push(`    method: "${api.method || 'GET'}",`);
      lines.push(`    url: "${api.url}",`);
      lines.push(`    authType: "${api.auth?.type || 'none'}"`);
      lines.push(`  },`);
    }
    lines.push('};');
    lines.push('');
    lines.push('');
    lines.push('async function callAPI(name, params) {');
    lines.push('  const endpoint = API_ENDPOINTS[name];');
    lines.push('  if (!endpoint) throw new Error(`Unknown API: ${name}`);');
    lines.push('');
    lines.push('  const response = await fetch(endpoint.url, {');
    lines.push('    method: endpoint.method,');
    lines.push('    headers: {}, // Add auth headers as needed');
    lines.push('    body: params ? JSON.stringify(params) : undefined');
    lines.push('  });');
    lines.push('');
    lines.push('  return response.json();');
    lines.push('}');
    lines.push('');
    lines.push('');
    lines.push('module.exports = { API_ENDPOINTS, callAPI };');
  } else {
    lines.push('// No API endpoints configured');
    lines.push('');
    lines.push('module.exports = { API_ENDPOINTS: {} };');
  }

  return lines.join('\n');
}

function generateCursorMCPToolsReadme(schema) {
  const sections = [];

  sections.push('# MCP Tools Directory');
  sections.push('');
  sections.push('This directory contains wrapper scripts for MCP tools.');
  sections.push('');

  sections.push('## Files');
  sections.push('');
  sections.push('- `mcp_wrapper.js` - MCP server configuration wrapper');
  sections.push('- `api_tools.js` - API endpoint wrappers');
  sections.push('');

  if (schema.tools.mcpServers?.length > 0) {
    sections.push('## MCP Servers');
    sections.push('');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`- **${mcp.name}**: ${mcp.url || 'local'}`);
    }
    sections.push('');
  }

  sections.push('## Usage');
  sections.push('');
  sections.push('1. Configure MCP servers in `.cursor/mcp.json`');
  sections.push('2. Install required MCP packages: `npm install @anthropic/mcp-client`');
  sections.push('3. Set environment variables in `.env`');
  sections.push('');

  return sections.join('\n');
}

// ============================================
// README.md 编码器
// ============================================

function encodeCursorReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Cursor Agent'} - Bundle`);
  sections.push('');
  sections.push('This bundle contains the complete configuration for a Cursor AI Agent.');
  sections.push('');

  sections.push('## Bundle Contents');
  sections.push('');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `.cursorrules` | Main rules file (highest priority) |');
  sections.push('| `.cursorignore` | Files to exclude from AI context |');
  sections.push('| `.cursor/rules/*.md` | Detailed rules by category |');
  sections.push('| `.cursor/mcp.json` | MCP server configuration |');
  sections.push('| `.cursor/settings.json` | Cursor project settings |');
  sections.push('| `.cursor/context/files.json` | Always-indexed files |');
  sections.push('| `mcp-tools/` | MCP wrapper scripts (if applicable) |');
  sections.push('| `.env.example` | Environment variables template |');
  sections.push('');

  sections.push('## Installation');
  sections.push('');
  sections.push('1. Extract files to your project root:');
  sections.push('   ```bash');
  sections.push('   unzip cursor_bundle.zip');
  sections.push('   ```');
  sections.push('');
  sections.push('2. Configure environment (if using MCP):');
  sections.push('   ```bash');
  sections.push('   cp .env.example .env');
  sections.push('   # Edit .env with your credentials');
  sections.push('   ```');
  sections.push('');
  sections.push('3. Open project in Cursor IDE');
  sections.push('   - Rules will be automatically loaded');
  sections.push('   - MCP servers will connect if configured');
  sections.push('');

  sections.push('## Rules Architecture');
  sections.push('');
  sections.push('Cursor uses a layered rules system:');
  sections.push('');
  sections.push('1. **`.cursorrules`** - Highest priority, applies globally');
  sections.push('2. **`.cursor/rules/*.md`** - File-specific rules with pattern matching:');
  sections.push('   - `general.md` → All files');
  sections.push('   - `frontend.md` → `src/frontend/**`');
  sections.push('   - `backend.md` → `src/backend/**`');
  sections.push('   - `tests.md` → `**/*.test.*`');
  sections.push('');

  if (schema.tools.mcpServers?.length) {
    sections.push('## MCP Servers');
    sections.push('');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`- ${mcp.name}: ${mcp.url || 'local'}`);
    }
    sections.push('');
  }

  sections.push('## Notes');
  sections.push('');
  sections.push('- `.cursorignore` prevents files from being indexed');
  sections.push('- MCP servers require installation in `.cursor/mcp.json`');
  sections.push('- Never commit `.env` to version control');
  sections.push('');

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Cursor Bundle 解析（导入）
// ============================================

/**
 * 解析 Cursor Bundle ZIP 包
 * @param {File|Blob} zipFile - ZIP 文件
 * @returns {Promise<Object>} { schema, manifest, rawFiles }
 */
async function parseCursorBundle(zipFile) {
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

  // 2. 解析 .cursorrules
  const cursorRulesFile = zip.file(".cursorrules");
  let cursorRules = '';
  if (cursorRulesFile) {
    cursorRules = await cursorRulesFile.async("string");
  }

  // 3. 解析 .cursor/rules/ 目录
  const rulesDir = zip.folder(".cursor").folder("rules");
  const rulesFiles = {};
  for (const filename of ['general.md', 'code-style.md', 'frontend.md', 'backend.md', 'tests.md', 'tools.md', 'workflow.md']) {
    const file = rulesDir.file(filename);
    if (file) {
      rulesFiles[filename] = await file.async("string");
    }
  }

  // 4. 解析 mcp.json
  const mcpFile = zip.folder(".cursor").file("mcp.json");
  let mcpJSON = '';
  if (mcpFile) {
    mcpJSON = await mcpFile.async("string");
  }

  // 5. 构建 UAT-Schema
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'cursor';
  schema.meta.name = manifest.agent?.name || 'Cursor Agent';
  schema.meta.description = manifest.agent?.description || '';

  // 从 .cursorrules 解析
  parseCursorRulesMain(cursorRules, schema);

  // 从 rules/*.md 解析
  parseCursorRulesFiles(rulesFiles, schema);

  // 从 mcp.json 解析
  parseCursorMCPJSON(mcpJSON, schema);

  // 补全默认值
  UATCore.fillSchemaDefaultValues(schema);

  // 原始文件内容
  const rawFiles = {
    cursorRules,
    rulesFiles,
    mcpJSON
  };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 Cursor 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseCursorBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'cursor';

  // 查找并解析 .cursorrules 主规则文件
  const cursorRules = findFileByPattern(extractedFiles, ['.cursorrules', 'cursorrules']);
  if (cursorRules) {
    parseCursorRulesMain(cursorRules, schema);
  }

  // 查找并解析 .cursor/rules/*.md 规则文件
  const rulesFiles = {};
  const ruleNames = ['general.md', 'code-style.md', 'frontend.md', 'backend.md', 'tests.md', 'tools.md', 'workflow.md'];
  for (const ruleName of ruleNames) {
    const content = findFileByPattern(extractedFiles, [
      '.cursor/rules/' + ruleName,
      'cursor/rules/' + ruleName,
      ruleName
    ]);
    if (content) {
      rulesFiles[ruleName] = content;
    }
  }
  parseCursorRulesFiles(rulesFiles, schema);

  // 查找并解析 mcp.json
  const mcpJSON = findFileByPattern(extractedFiles, [
    '.cursor/mcp.json',
    'cursor/mcp.json',
    'mcp.json'
  ]);
  if (mcpJSON) {
    parseCursorMCPJSON(mcpJSON, schema);
  }

  // 查找并解析 settings.json
  const settingsJSON = findFileByPattern(extractedFiles, [
    '.cursor/settings.json',
    'cursor/settings.json',
    'settings.json'
  ]);
  if (settingsJSON) {
    try {
      const settings = JSON.parse(settingsJSON);
      if (settings['cursor.ai']?.model) {
        schema.modelConfig.model = settings['cursor.ai'].model;
      }
      if (settings['cursor.ai']?.temperature) {
        schema.modelConfig.temperature = settings['cursor.ai'].temperature;
      }
      if (settings['cursor.ai']?.maxTokens) {
        schema.modelConfig.maxTokens = settings['cursor.ai'].maxTokens;
      }
    } catch (e) {
      console.warn('Cursor settings JSON parse warning:', e.message);
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

// ============================================
// 解析辅助函数
// ============================================

function parseCursorRulesMain(mdText, schema) {
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

  // 提取输出规则
  const outputMatch = mdText.match(/## Output Format\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (outputMatch) {
    const lines = outputMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.outputRules.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }
}

function parseCursorRulesFiles(rulesFiles, schema) {
  // 从 general.md 提取通用规则
  if (rulesFiles['general.md']) {
    const general = rulesFiles['general.md'];
    const guidelinesMatch = general.match(/## Guidelines\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (guidelinesMatch) {
      const existingPrompt = schema.identity.systemPrompt;
      const guidelines = guidelinesMatch[1].split('\n')
        .filter(l => l.trim().startsWith('-'))
        .map(l => l.replace(/^-\s*/, '').trim())
        .join('\n');

      schema.identity.systemPrompt = existingPrompt + '\n\n' + guidelines;
    }
  }

  // 从 workflow.md 提取工作流
  if (rulesFiles['workflow.md']) {
    const workflow = rulesFiles['workflow.md'];
    const stepsMatch = workflow.match(/## Custom Workflow Steps\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (stepsMatch) {
      const stepLines = stepsMatch[1].split('\n');
      for (const line of stepLines) {
        const stepMatch = line.match(/^\d+\.\s+\*([^*]+)\*\s+\((\w+)\)/);
        if (stepMatch) {
          const step = UATCore.createEmptyWorkflowStep();
          step.stepId = `step_${schema.workflow.steps.length}`;
          step.name = stepMatch[1];
          step.type = stepMatch[2];
          schema.workflow.steps.push(step);
        }
      }
    }
  }
}

function parseCursorMCPJSON(jsonText, schema) {
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
          env: config.env || {},
          transport: config.url ? 'http' : 'stdio'
        };
        mcp.enabled = !config.disabled;
        schema.tools.mcpServers.push(mcp);
      }
    }
  } catch (e) {
    console.warn('mcp.json 解析警告:', e.message);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Cursor 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeCursorToFiles(schema) {
  return {
    '.cursorrules': encodeCursorRulesMain(schema),
    '.cursorignore': encodeCursorIgnore(schema),
    '.cursor/rules/general.md': encodeCursorRulesGeneral(schema),
    '.cursor/rules/code-style.md': encodeCursorRulesCodeStyle(schema),
    '.cursor/rules/frontend.md': encodeCursorRulesFrontend(schema),
    '.cursor/rules/backend.md': encodeCursorRulesBackend(schema),
    '.cursor/rules/tests.md': encodeCursorRulesTests(schema),
    '.cursor/rules/tools.md': encodeCursorRulesTools(schema),
    '.cursor/rules/workflow.md': encodeCursorRulesWorkflow(schema),
    '.cursor/mcp.json': encodeCursorMCPJSON(schema),
    '.cursor/settings.json': encodeCursorSettingsJSON(schema),
    '.env.example': encodeCursorEnvExample(schema),
    'README.md': encodeCursorReadme(schema)
  };
}

window.CursorBundle = {
  createCursorBundle,
  parseCursorBundle,
  parseCursorBundleFromFiles,
  encodeCursorRulesMain,
  encodeCursorIgnore,
  encodeCursorRulesGeneral,
  encodeCursorRulesCodeStyle,
  encodeCursorRulesFrontend,
  encodeCursorRulesBackend,
  encodeCursorRulesTests,
  encodeCursorRulesTools,
  encodeCursorRulesWorkflow,
  encodeCursorMCPJSON,
  encodeCursorSettingsJSON,
  encodeCursorContextFiles,
  encodeCursorEnvExample,
  encodeCursorReadme,
  generateCursorMCPWrapper,
  generateCursorAPITools,
  encodeCursorToFiles
};