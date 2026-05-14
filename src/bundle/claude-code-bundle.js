/**
 * UAT Claude Code Bundle 管理器 - Claude Code Bundle Manager
 * 专门处理 Claude Code CLI 的多文件配置包导入导出
 *
 * Claude Code 配置结构：
 * 项目根目录/
 * ├── CLAUDE.md                 # 主Skill文件（YAML头 + Instructions）
 * ├── .claude/
 * │   ├── settings.json         # Claude设置
 * │   ├── mcp_servers.json      # MCP服务器配置
 * │   ├── skills/               # 自定义Skills目录
 * │   │   ├── review.md         # 代码审查Skill
 * │   │   ├── test.md           # 测试Skill
 * │   │   └── deploy.md         # 部署Skill
 * │   ├── commands/             # Slash命令定义
 * │   │   ├── test.md           # /test 命令
 * │   │   ├── review.md         # /review 命令
 * │   │   └── fix.md            # /fix 命令
 * │   └── context/
 * │       └── always_include.json
 * ├── scripts/
 * │   └── setup.sh
 * └── .env.example
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATMemoryEncoder() {
  return typeof UATMemoryEncoder !== 'undefined' ? UATMemoryEncoder : window.UATMemoryEncoder;
}

function getUATKnowledgeEncoder() {
  return typeof UATKnowledgeEncoder !== 'undefined' ? UATKnowledgeEncoder : window.UATKnowledgeEncoder;
}

function getUATSkillsEncoder() {
  return typeof UATSkillsEncoder !== 'undefined' ? UATSkillsEncoder : window.UATSkillsEncoder;
}

function getUATMCPEncoder() {
  return typeof UATMCPEncoder !== 'undefined' ? UATMCPEncoder : window.UATMCPEncoder;
}

// ============================================
// Claude Code Bundle 创建（导出）
// ============================================

/**
 * 创建 Claude Code Bundle ZIP 包
 * @param {Object} schema - UAT-Schema v2.0
 * @param {Object} options - 可选配置
 * @returns {Promise<Blob>} ZIP 文件
 */
async function createClaudeCodeBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json - Bundle 清单
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Claude-Code-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainSkill: "CLAUDE.md",
      claudeDir: ".claude/",
      skillsDir: ".claude/skills/",
      commandsDir: ".claude/commands/",
      mcpConfig: ".claude/mcp_servers.json",
      settings: ".claude/settings.json"
    },
    skillsFiles: [
      "review.md",
      "test.md",
      "deploy.md",
      "debug.md"
    ],
    commandsFiles: [
      "test.md",
      "review.md",
      "fix.md",
      "commit.md"
    ],
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Claude Code Bundle"
    },
    notes: {
      mcpServers: "MCP工具配置已保留，需安装对应MCP服务器",
      secrets: "密钥已移除，请填写 .env 文件",
      slashCommands: "Slash命令可通过 claude /<command> 使用"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. CLAUDE.md - 主Skill文件（YAML头 + Markdown）
  const claudeMD = encodeClaudeMDMain(schema);
  zip.file("CLAUDE.md", claudeMD);

  // 3. .claude/ 目录
  const claudeFolder = zip.folder(".claude");

  // 3.1 settings.json
  const settingsJSON = encodeClaudeSettingsJSON(schema);
  claudeFolder.file("settings.json", settingsJSON);

  // 3.2 mcp_servers.json
  const mcpJSON = encodeClaudeMCPJSON(schema);
  claudeFolder.file("mcp_servers.json", mcpJSON);

  // 3.3 skills/ 目录
  const skillsFolder = claudeFolder.folder("skills");
  skillsFolder.file("review.md", encodeClaudeSkillReview(schema));
  skillsFolder.file("test.md", encodeClaudeSkillTest(schema));
  skillsFolder.file("deploy.md", encodeClaudeSkillDeploy(schema));
  skillsFolder.file("debug.md", encodeClaudeSkillDebug(schema));

  // 3.4 commands/ 目录
  const commandsFolder = claudeFolder.folder("commands");
  commandsFolder.file("test.md", encodeClaudeCommandTest(schema));
  commandsFolder.file("review.md", encodeClaudeCommandReview(schema));
  commandsFolder.file("fix.md", encodeClaudeCommandFix(schema));
  commandsFolder.file("commit.md", encodeClaudeCommandCommit(schema));

  // 3.5 context/ 目录
  const contextFolder = claudeFolder.folder("context");
  const alwaysIncludeJSON = encodeClaudeAlwaysIncludeJSON(schema);
  contextFolder.file("always_include.json", alwaysIncludeJSON);

  // 4. scripts/ 目录
  const scriptsFolder = zip.folder("scripts");
  scriptsFolder.file("setup.sh", generateClaudeSetupScript(schema));

  // 5. .env.example
  const envExample = encodeClaudeEnvExample(schema);
  zip.file(".env.example", envExample);

  // 6. README.md
  const readmeMD = encodeClaudeReadme(schema);
  zip.file("README.md", readmeMD);

  // 7. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// CLAUDE.md 主Skill文件编码器
// ============================================

function encodeClaudeMDMain(schema) {
  const sections = [];

  // YAML Frontmatter
  sections.push('---');
  sections.push(`name: "${schema.meta.name || 'Claude Agent'}"`);
  sections.push(`description: "${schema.meta.description || 'AI Assistant'}"`);
  sections.push(`model: "${schema.modelConfig.model || 'claude-sonnet-4-20250514'}"`);

  // Identity扩展字段
  if (schema.identity.role) {
    sections.push(`role: "${schema.identity.role}"`);
  }
  if (schema.identity.personality) {
    sections.push(`personality: "${schema.identity.personality}"`);
  }
  if (schema.identity.language) {
    sections.push(`language: "${schema.identity.language}"`);
  }

  // Tools 配置
  sections.push('tools:');
  sections.push('  - filesystem_read');
  sections.push('  - filesystem_write');
  sections.push('  - terminal_execute');
  sections.push('  - web_search');

  // MCP Servers
  if (schema.tools.mcpServers?.length > 0) {
    sections.push('mcpServers:');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`  - name: "${mcp.name}"`);
      sections.push(`    url: "${mcp.url || 'local'}"`);
    }
  }

  // Skills 引用
  sections.push('skills:');
  sections.push('  - "./skills/review.md"');
  sections.push('  - "./skills/test.md"');
  sections.push('  - "./skills/debug.md"');

  // 允许路径
  sections.push('allowedPaths:');
  sections.push('  - "./src"');
  sections.push('  - "./tests"');

  // 其他参数
  sections.push(`maxTokens: ${schema.modelConfig.maxTokens || 4096}`);
  sections.push(`temperature: ${schema.modelConfig.temperature || 0.7}`);
  sections.push('---');
  sections.push('');

  // Instructions 正文
  sections.push('# Instructions');
  sections.push('');
  sections.push('You are an AI coding assistant for this project.');
  sections.push('');

  // 项目上下文
  sections.push('## Project Context');
  sections.push('');
  sections.push(`- Name: ${schema.meta.name}`);
  sections.push(`- Description: ${schema.meta.description}`);
  sections.push('');

  // 核心行为
  if (schema.identity.systemPrompt) {
    sections.push('## Core Behavior');
    sections.push('');
    sections.push(schema.identity.systemPrompt);
    sections.push('');
  }

  // 约束规则
  if (schema.identity.constraints?.length > 0) {
    sections.push('## Constraints');
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

  // Memory encoding（使用JSON代码块格式）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push(memoryEncoder.encodeMemoryEntriesToClaudeMD(schema.memory.memoryEntries));
  }

  // 知识库编码（使用JSON代码块格式）
  const kbEncoder = getUATKnowledgeEncoder();
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      sections.push('## Knowledge Base');
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify({
        datasets: kbContent.datasets?.map(ds => ({
          id: ds.id,
          name: ds.name,
          type: ds.type
        })) || [],
        documents: kbContent.documents?.map(doc => ({
          id: doc.id,
          title: doc.title,
          source: doc.source
        })) || []
      }, null, 2));
      sections.push('```');
      sections.push('');
    }
  }

  // 技能编码（使用JSON代码块格式）
  const skillsEncoder = getUATSkillsEncoder();
  if (schema.skills?.skills?.length > 0 && skillsEncoder) {
    sections.push(skillsEncoder.encodeSkillsToJSONBlock(schema.skills));
  }

  // 工作流
  sections.push('## Workflow');
  sections.push('');
  sections.push('When implementing a feature:');
  sections.push('1. Read relevant files first');
  sections.push('2. Plan the implementation approach');
  sections.push('3. Write code incrementally');
  sections.push('4. Add tests for new functionality');
  sections.push('5. Verify everything works');
  sections.push('');

  // 可用Skills说明
  sections.push('## Available Skills');
  sections.push('');
  sections.push('Use these skills for specific tasks:');
  sections.push('- `review` - Code review and feedback');
  sections.push('- `test` - Write and run tests');
  sections.push('- `debug` - Debug issues');
  sections.push('- `deploy` - Deployment preparation');
  sections.push('');

  // Slash命令说明
  sections.push('## Slash Commands');
  sections.push('');
  sections.push('Available commands:');
  sections.push('- `/test` - Run test command');
  sections.push('- `/review` - Review recent changes');
  sections.push('- `/fix` - Fix detected issues');
  sections.push('- `/commit` - Prepare commit');
  sections.push('');

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Settings 配置编码器
// ============================================

function encodeClaudeSettingsJSON(schema) {
  const settings = {
    "model": {
      "default": schema.modelConfig.model || "claude-sonnet-4-20250514",
      "fallback": "claude-3-5-haiku"
    },
    "tools": {
      "autoApprove": [
        "filesystem_read",
        "terminal_safe",
        "web_search"
      ],
      "requireApproval": [
        "filesystem_write",
        "filesystem_delete",
        "terminal_execute"
      ]
    },
    "context": {
      "alwaysInclude": [
        "README.md",
        "CLAUDE.md",
        "package.json"
      ],
      "maxFiles": 20,
      "maxTokens": 50000
    },
    "output": {
      "format": "markdown",
      "showThinking": false,
      "codeBlocks": true
    },
    "terminal": {
      "timeout": 30000,
      "sandbox": true,
      "allowedCommands": ["npm", "node", "git", "cargo", "pytest"]
    }
  };

  return JSON.stringify(settings, null, 2);
}

function encodeClaudeMCPJSON(schema) {
  const mcpConfig = {
    "mcpServers": {}
  };

  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      const serverConfig = {
        "command": mcp.config?.command || "npx",
        "args": mcp.config?.args || ["-y", "@anthropic/mcp-server-" + mcp.name],
        "env": {}
      };

      if (mcp.config?.env) {
        for (const [key, value] of Object.entries(mcp.config.env)) {
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
// Skills 文件编码器
// ============================================

function encodeClaudeSkillReview(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "Code Review"');
  sections.push('description: "Review code for quality and issues"');
  sections.push('tools:');
  sections.push('  - filesystem_read');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Perform thorough code review:');
  sections.push('');
  sections.push('## Review Checklist');
  sections.push('');
  sections.push('- Code quality and readability');
  sections.push('- Type safety and correctness');
  sections.push('- Error handling completeness');
  sections.push('- Performance considerations');
  sections.push('- Security vulnerabilities');
  sections.push('- Test coverage');
  sections.push('');
  sections.push('## Output Format');
  sections.push('');
  sections.push('```');
  sections.push('File: [filename]');
  sections.push('Issues:');
  sections.push('  - [Critical]: [description]');
  sections.push('  - [Suggested]: [description]');
  sections.push('Suggestions:');
  sections.push('  - [how to fix]');
  sections.push('```');

  return sections.join('\n');
}

function encodeClaudeSkillTest(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "Write Tests"');
  sections.push('description: "Generate unit tests for code"');
  sections.push('tools:');
  sections.push('  - filesystem_read');
  sections.push('  - filesystem_write');
  sections.push('  - terminal_execute');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Generate comprehensive tests:');
  sections.push('');
  sections.push('## Test Structure');
  sections.push('');
  sections.push('- Clear test names');
  sections.push('- Test edge cases');
  sections.push('- Test error conditions');
  sections.push('- Use mocking for dependencies');
  sections.push('');
  sections.push('## Framework');
  sections.push('');
  sections.push('- Use Jest for JavaScript/TypeScript');
  sections.push('- Use pytest for Python');
  sections.push('- Use cargo test for Rust');

  return sections.join('\n');
}

function encodeClaudeSkillDeploy(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "Deploy Preparation"');
  sections.push('description: "Prepare code for deployment"');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Prepare deployment checklist:');
  sections.push('');
  sections.push('## Checklist');
  sections.push('');
  sections.push('- Environment variables configured');
  sections.push('- Secrets not hardcoded');
  sections.push('- Build passes');
  sections.push('- Tests pass');
  sections.push('- Documentation updated');

  return sections.join('\n');
}

function encodeClaudeSkillDebug(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "Debug Issues"');
  sections.push('description: "Debug and fix code issues"');
  sections.push('tools:');
  sections.push('  - filesystem_read');
  sections.push('  - terminal_execute');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Debug workflow:');
  sections.push('');
  sections.push('## Steps');
  sections.push('');
  sections.push('1. Identify the error');
  sections.push('2. Locate relevant code');
  sections.push('3. Analyze the cause');
  sections.push('4. Propose fix');
  sections.push('5. Verify fix works');

  return sections.join('\n');
}

// ============================================
// Slash Commands 编码器
// ============================================

function encodeClaudeCommandTest(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "test"');
  sections.push('description: "Run tests for the project"');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Execute project tests:');
  sections.push('');
  sections.push('1. Run test command (npm test / pytest / cargo test)');
  sections.push('2. Report test results');
  sections.push('3. Suggest fixes for failing tests');

  return sections.join('\n');
}

function encodeClaudeCommandReview(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "review"');
  sections.push('description: "Review recent code changes"');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Review recent changes:');
  sections.push('');
  sections.push('1. Check git diff for changes');
  sections.push('2. Analyze code quality');
  sections.push('3. Provide feedback');

  return sections.join('\n');
}

function encodeClaudeCommandFix(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "fix"');
  sections.push('description: "Fix detected issues"');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Fix issues in code:');
  sections.push('');
  sections.push('1. Identify issues (lint errors, test failures)');
  sections.push('2. Propose fixes');
  sections.push('3. Apply fixes with approval');

  return sections.join('\n');
}

function encodeClaudeCommandCommit(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "commit"');
  sections.push('description: "Prepare git commit"');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Prepare commit:');
  sections.push('');
  sections.push('1. Review staged changes');
  sections.push('2. Generate commit message');
  sections.push('3. Ensure proper format');

  return sections.join('\n');
}

// ============================================
// Context 配置编码器
// ============================================

function encodeClaudeAlwaysIncludeJSON(schema) {
  const config = {
    description: "Files always included in Claude Code context",
    files: [
      "README.md",
      "CLAUDE.md",
      "package.json",
      "tsconfig.json"
    ],
    watchFiles: [
      ".claude/skills/*.md",
      ".claude/commands/*.md"
    ],
    maxContextFiles: 20
  };

  return JSON.stringify(config, null, 2);
}

// ============================================
// 环境变量和脚本
// ============================================

function encodeClaudeEnvExample(schema) {
  const lines = [];

  lines.push('# Claude Code Environment Variables');
  lines.push('');
  lines.push('# Anthropic API Key (required)');
  lines.push('ANTHROPIC_API_KEY=sk-ant-your-key-here');
  lines.push('');

  if (schema.tools.mcpServers?.length > 0) {
    lines.push('# MCP Server Credentials');
    lines.push('');
    for (const mcp of schema.tools.mcpServers) {
      if (mcp.config?.env) {
        for (const [key, _] of Object.entries(mcp.config.env)) {
          if (key.includes('KEY') || key.includes('TOKEN')) {
            lines.push(`MCP_${mcp.name.toUpperCase()}_${key}=your-value-here`);
          }
        }
      }
    }
    lines.push('');
  }

  lines.push('# Optional Settings');
  lines.push('#CLAUDE_MODEL=claude-sonnet-4');
  lines.push('#CLAUDE_MAX_TOKENS=4096');

  return lines.join('\n');
}

function generateClaudeSetupScript(schema) {
  const lines = [];

  lines.push('#!/bin/bash');
  lines.push('');
  lines.push('# Claude Code Setup Script');
  lines.push('# Generated by UAT Converter');
  lines.push('');
  lines.push('echo "Setting up Claude Code..."');
  lines.push('');
  lines.push('# Copy environment template');
  lines.push('if [ ! -f .env ]; then');
  lines.push('  cp .env.example .env');
  lines.push('  echo "Created .env file - please add your API keys"');
  lines.push('fi');
  lines.push('');
  lines.push('# Verify CLAUDE.md exists');
  lines.push('if [ -f CLAUDE.md ]; then');
  lines.push('  echo "CLAUDE.md found"');
  lines.push('else');
  lines.push('  echo "Warning: CLAUDE.md not found"');
  lines.push('fi');
  lines.push('');
  lines.push('echo "Setup complete!"');

  return lines.join('\n');
}

// ============================================
// README 编码器
// ============================================

function encodeClaudeReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Claude Code Agent'} - Bundle`);
  sections.push('');
  sections.push('Claude Code Agent Bundle with Skills and Commands.');
  sections.push('');

  sections.push('## Contents');
  sections.push('');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `CLAUDE.md` | Main Skill file (YAML + Instructions) |');
  sections.push('| `.claude/settings.json` | Claude settings |');
  sections.push('| `.claude/mcp_servers.json` | MCP server config |');
  sections.push('| `.claude/skills/*.md` | Reusable Skills |');
  sections.push('| `.claude/commands/*.md` | Slash Commands |');
  sections.push('');

  sections.push('## Usage');
  sections.push('');
  sections.push('```bash');
  sections.push('# Start Claude Code');
  sections.push('claude');
  sections.push('');
  sections.push('# Use slash commands');
  sections.push('claude /test');
  sections.push('claude /review');
  sections.push('claude /fix');
  sections.push('```');
  sections.push('');

  sections.push('## Skills');
  sections.push('');
  sections.push('- `review` - Code review');
  sections.push('- `test` - Write tests');
  sections.push('- `debug` - Debug issues');
  sections.push('- `deploy` - Deploy preparation');
  sections.push('');

  sections.push('---');
  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Claude Code Bundle 解析（导入）
// ============================================

async function parseClaudeCodeBundle(zipFile) {
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

  // 2. 解析 CLAUDE.md
  const claudeMDFile = zip.file("CLAUDE.md");
  let claudeMD = '';
  if (claudeMDFile) {
    claudeMD = await claudeMDFile.async("string");
  }

  // 3. 解析 .claude/ 目录
  const claudeFolder = zip.folder(".claude");

  const settingsFile = claudeFolder.file("settings.json");
  let settingsJSON = '';
  if (settingsFile) {
    settingsJSON = await settingsFile.async("string");
  }

  const mcpFile = claudeFolder.file("mcp_servers.json");
  let mcpJSON = '';
  if (mcpFile) {
    mcpJSON = await mcpFile.async("string");
  }

  // 4. 解析 skills/
  const skillsFolder = claudeFolder.folder("skills");
  const skillsFiles = {};
  for (const filename of ['review.md', 'test.md', 'deploy.md', 'debug.md']) {
    const file = skillsFolder.file(filename);
    if (file) {
      skillsFiles[filename] = await file.async("string");
    }
  }

  // 5. 构建 Schema
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'claude';
  schema.meta.name = manifest.agent?.name || 'Claude Code Agent';
  schema.meta.description = manifest.agent?.description || '';

  // 解析 CLAUDE.md
  parseClaudeMDMain(claudeMD, schema);
  parseClaudeSettingsJSON(settingsJSON, schema);
  parseClaudeMCPJSON(mcpJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  const rawFiles = { claudeMD, settingsJSON, mcpJSON, skillsFiles };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 Claude Code 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseClaudeCodeBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'claude';

  // 查找并解析 CLAUDE.md 主 Skill 文件
  const claudeMD = findFileByPattern(extractedFiles, ['CLAUDE.md', 'claude.md']);
  if (claudeMD) {
    parseClaudeMDMain(claudeMD, schema);
  }

  // 查找并解析 .claude/settings.json
  const settingsJSON = findFileByPattern(extractedFiles, [
    '.claude/settings.json',
    'claude/settings.json',
    'settings.json'
  ]);
  if (settingsJSON) {
    parseClaudeSettingsJSON(settingsJSON, schema);
  }

  // 查找并解析 .claude/mcp_servers.json
  const mcpJSON = findFileByPattern(extractedFiles, [
    '.claude/mcp_servers.json',
    'claude/mcp_servers.json',
    'mcp_servers.json',
    'mcp.json'
  ]);
  if (mcpJSON) {
    parseClaudeMCPJSON(mcpJSON, schema);
  }

  // 查找并解析 skills/*.md
  const skillsFiles = {};
  const skillNames = ['review.md', 'test.md', 'deploy.md', 'debug.md'];
  for (const skillName of skillNames) {
    const content = findFileByPattern(extractedFiles, [
      '.claude/skills/' + skillName,
      'claude/skills/' + skillName,
      'skills/' + skillName,
      skillName
    ]);
    if (content) {
      skillsFiles[skillName] = content;
    }
  }

  // 从 skills 文件提取额外内容
  for (const [skillName, content] of Object.entries(skillsFiles)) {
    if (content) {
      const skillMatch = content.match(/---\s*\n([\s\S]*?)\n---/);
      if (skillMatch) {
        // 可提取 skill 元数据，但暂不扩展 Schema
      }
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseClaudeMDMain(mdText, schema) {
  if (!mdText) return;

  // 解析 YAML Frontmatter
  const yamlMatch = mdText.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const yamlHeader = yamlMatch[1];

    // 提取 name
    const nameMatch = yamlHeader.match(/name:\s*"([^"]+)"/);
    if (nameMatch) {
      schema.meta.name = nameMatch[1];
    }

    // 提取 model
    const modelMatch = yamlHeader.match(/model:\s*"([^"]+)"/);
    if (modelMatch) {
      schema.modelConfig.model = modelMatch[1];
    }

    // 提取 maxTokens
    const tokensMatch = yamlHeader.match(/maxTokens:\s*(\d+)/);
    if (tokensMatch) {
      schema.modelConfig.maxTokens = parseInt(tokensMatch[1]);
    }

    // 提取 temperature
    const tempMatch = yamlHeader.match(/temperature:\s*([\d.]+)/);
    if (tempMatch) {
      schema.modelConfig.temperature = parseFloat(tempMatch[1]);
    }
  }

  // 解析 Instructions
  const instructionsMatch = mdText.match(/# Instructions\s*\n([\s\S]*?)(?=\n---|$)/i);
  if (instructionsMatch) {
    const instructions = instructionsMatch[1];

    // 提取 Core Behavior
    const coreMatch = instructions.match(/## Core Behavior\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (coreMatch) {
      schema.identity.systemPrompt = coreMatch[1].trim();
    }

    // 提取 Constraints
    const constraintsMatch = instructions.match(/## Constraints\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (constraintsMatch) {
      const lines = constraintsMatch[1].split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('-')) {
          schema.identity.constraints.push(line.replace(/^-\s*/, '').trim());
        }
      }
    }
  }
}

function parseClaudeSettingsJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const settings = JSON.parse(jsonText);

    if (settings.model?.default) {
      schema.modelConfig.model = settings.model.default;
    }

    if (settings.context?.maxTokens) {
      schema.modelConfig.maxTokens = settings.context.maxTokens;
    }

  } catch (e) {
    console.warn('settings.json parse warning:', e.message);
  }
}

function parseClaudeMCPJSON(jsonText, schema) {
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
    console.warn('mcp_servers.json parse warning:', e.message);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Claude Code 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeClaudeToFiles(schema) {
  return {
    'CLAUDE.md': encodeClaudeMDMain(schema),
    '.claude/settings.json': encodeClaudeSettingsJSON(schema),
    '.claude/mcp_servers.json': encodeClaudeMCPJSON(schema),
    '.claude/skills/review.md': encodeClaudeSkillReview(schema),
    '.claude/skills/test.md': encodeClaudeSkillTest(schema),
    '.claude/skills/deploy.md': encodeClaudeSkillDeploy(schema),
    '.claude/skills/debug.md': encodeClaudeSkillDebug(schema),
    '.claude/commands/test.md': encodeClaudeCommandTest(schema),
    '.claude/commands/review.md': encodeClaudeCommandReview(schema),
    '.claude/commands/fix.md': encodeClaudeCommandFix(schema),
    '.claude/commands/commit.md': encodeClaudeCommandCommit(schema),
    '.claude/always_include.json': encodeClaudeAlwaysIncludeJSON(schema),
    '.env.example': encodeClaudeEnvExample(schema),
    'README.md': encodeClaudeReadme(schema)
  };
}

window.ClaudeCodeBundle = {
  createClaudeCodeBundle,
  parseClaudeCodeBundle,
  parseClaudeCodeBundleFromFiles,
  encodeClaudeMDMain,
  encodeClaudeSettingsJSON,
  encodeClaudeMCPJSON,
  encodeClaudeSkillReview,
  encodeClaudeSkillTest,
  encodeClaudeSkillDeploy,
  encodeClaudeSkillDebug,
  encodeClaudeCommandTest,
  encodeClaudeCommandReview,
  encodeClaudeCommandFix,
  encodeClaudeCommandCommit,
  encodeClaudeAlwaysIncludeJSON,
  encodeClaudeEnvExample,
  encodeClaudeReadme,
  encodeClaudeToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ClaudeCodeBundle;
}