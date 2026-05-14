/**
 * UAT Codex CLI Bundle 管理器 - Codex CLI Bundle Manager
 * 专门处理 OpenAI Codex CLI Agent 的配置包导入导出
 *
 * Codex CLI 配置结构：
 * 项目根目录/
 * ├── AGENTS.md                 # 主Agent定义（YAML头 + Instructions）
 * ├── .codex/
 * │   ├── config.json           # Codex配置
 * │   ├── tools.json            # 工具声明
 * │   ├── providers.json        # 模型Provider
 * │   └── skills/               # Skills目录
 * │       └── skill1.md
 * ├── scripts/
 * │   ├── setup.sh              # 环境设置
 * │   └── run.sh                # 运行脚本
 * ├── .codexignore              # 文件排除
 * ├── .env.example
 * └── README.md
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
// Codex CLI Bundle 创建（导出）
// ============================================

async function createCodexBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Codex-CLI-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainAgent: "AGENTS.md",
      codexDir: ".codex/",
      skillsDir: ".codex/skills/",
      scriptsDir: "scripts/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Codex CLI Bundle"
    },
    notes: {
      openaiOfficial: "OpenAI官方CLI工具",
      skills: "Skills模块可复用",
      providers: "支持OpenAI、Azure、Ollama多Provider"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. AGENTS.md - 主Agent定义
  const agentsMD = encodeCodexAgentsMD(schema);
  zip.file("AGENTS.md", agentsMD);

  // 3. .codex/ 目录
  const codexFolder = zip.folder(".codex");
  codexFolder.file("config.json", encodeCodexConfigJSON(schema));
  codexFolder.file("tools.json", encodeCodexToolsJSON(schema));
  codexFolder.file("providers.json", encodeCodexProvidersJSON(schema));

  // 3.1 .codex/skills/ 目录
  const skillsFolder = codexFolder.folder("skills");
  skillsFolder.file("code-review.md", encodeCodexSkillCodeReview(schema));
  skillsFolder.file("testing.md", encodeCodexSkillTesting(schema));

  // 4. scripts/ 目录
  const scriptsFolder = zip.folder("scripts");
  scriptsFolder.file("setup.sh", encodeCodexSetupScript(schema));
  scriptsFolder.file("run.sh", encodeCodexRunScript(schema));

  // 5. .codexignore
  const codexignore = encodeCodexIgnore(schema);
  zip.file(".codexignore", codexignore);

  // 6. .env.example
  const envExample = encodeCodexEnvExample(schema);
  zip.file(".env.example", envExample);

  // 7. README.md
  zip.file("README.md", encodeCodexReadme(schema));

  // 8. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Codex CLI 编码器
// ============================================

function encodeCodexAgentsMD(schema) {
  const sections = [];

  // YAML Frontmatter
  sections.push('---');
  sections.push(`name: "${schema.meta.name || 'Codex Agent'}"`);
  sections.push(`description: "${schema.meta.description || 'Codex CLI Assistant'}"`);
  sections.push(`model: "${schema.modelConfig.model || 'gpt-4'}"`);

  // Identity扩展字段（Codex不支持language字段）
  if (schema.identity.role) {
    sections.push(`role: "${schema.identity.role}"`);
  }
  if (schema.identity.personality) {
    sections.push(`personality: "${schema.identity.personality}"`);
  }

  sections.push('');
  sections.push('tools:');
  sections.push('  - name: "filesystem"');
  sections.push('    type: "builtin"');
  sections.push('    capabilities: ["read", "write"]');
  sections.push('  - name: "terminal"');
  sections.push('    type: "builtin"');
  sections.push('    capabilities: ["execute"]');

  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`  - name: "${mcp.name}"`);
      sections.push('    type: "http"');
      if (mcp.url) {
        sections.push('    config:');
        sections.push(`      url: "${mcp.url}"`);
      }
    }
  }

  sections.push('');
  sections.push('allowedPaths:');
  sections.push('  - "./src"');
  sections.push('  - "./tests"');
  sections.push('  - "./docs"');
  sections.push('');
  sections.push(`maxTokens: ${schema.modelConfig.maxTokens || 4096}`);
  sections.push(`temperature: ${schema.modelConfig.temperature || 0.7}`);
  sections.push('---');
  sections.push('');

  // Markdown Instructions
  sections.push('# Instructions');
  sections.push('');
  if (schema.identity.systemPrompt) {
    sections.push(schema.identity.systemPrompt);
    sections.push('');
  }

  // Project Context
  sections.push('## Project Context');
  sections.push('- Application type: General');
  sections.push('- Primary language: TypeScript');
  sections.push('');

  // Task Handling
  sections.push('## Task Handling');
  sections.push('1. Understand the user request');
  sections.push('2. Check existing code patterns');
  sections.push('3. Plan the implementation');
  sections.push('4. Execute changes safely');
  sections.push('5. Verify with tests');
  sections.push('');

  // Code Guidelines
  sections.push('## Code Guidelines');
  sections.push('- Follow TypeScript strict mode');
  sections.push('- Use async/await for async operations');
  sections.push('- Handle errors with try-catch');
  sections.push('- Add unit tests for new features');
  sections.push('');

  // Constraints
  if (schema.identity.constraints?.length > 0) {
    sections.push('## Constraints');
    for (const c of schema.identity.constraints) {
      sections.push(`- ${c}`);
    }
    sections.push('');
  }

  // Memory encoding（使用表格格式）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push(memoryEncoder.encodeMemoryEntriesToCodexMD(schema.memory.memoryEntries));
  }

  // 知识库编码（使用表格格式）
  const kbEncoder = getUATKnowledgeEncoder();
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      sections.push('## Knowledge Base');
      sections.push('');
      sections.push('| Name | Type | Source |');
      sections.push('|------|------|--------|');
      if (kbContent.datasets) {
        kbContent.datasets.forEach(ds => {
          sections.push(`| ${ds.name || 'Dataset'} | ${ds.type || 'text'} | ${ds.source || 'N/A'} |`);
        });
      }
      if (kbContent.documents) {
        kbContent.documents.forEach(doc => {
          sections.push(`| ${doc.title || 'Document'} | document | ${doc.source || 'N/A'} |`);
        });
      }
      sections.push('');
    }
  }

  // Workflow
  if (schema.workflow.steps?.length > 0) {
    sections.push('## Workflow');
    sections.push('When implementing a feature:');
    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      sections.push(`${i + 1}. ${step.name}`);
    }
    sections.push('');
  }

  // Skills encoding（使用表格格式）
  const skillsEncoder = getUATSkillsEncoder();
  if (schema.skills && skillsEncoder) {
    sections.push(skillsEncoder.encodeSkillsToCodexMD(schema.skills));
  }

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

function encodeCodexConfigJSON(schema) {
  const config = {
    version: "1.0",
    agentName: schema.meta.name || 'CodexAgent',
    model: {
      provider: "openai",
      name: schema.modelConfig.model || 'gpt-4',
      fallback: "gpt-3.5-turbo",
      parameters: {
        temperature: schema.modelConfig.temperature || 0.7,
        maxTokens: schema.modelConfig.maxTokens || 4096,
        topP: 1.0
      }
    },
    execution: {
      timeout: 60000,
      maxRetries: 3,
      approvalMode: "ask"
    },
    logging: {
      enabled: true,
      level: "info",
      redactSecrets: true
    },
    sandbox: {
      enabled: true,
      allowedCommands: ["npm", "node", "git", "npx"],
      blockedCommands: ["rm -rf", "sudo", "chmod"]
    }
  };

  return JSON.stringify(config, null, 2);
}

function encodeCodexToolsJSON(schema) {
  const tools = {
    tools: [
      {
        name: "filesystem",
        type: "builtin",
        description: "File system operations",
        capabilities: ["read", "write", "delete", "list"],
        config: {
          rootPath: "./",
          allowedExtensions: ["*.ts", "*.js", "*.json", "*.md"],
          maxFileSize: 1048576
        }
      },
      {
        name: "terminal",
        type: "builtin",
        description: "Command execution",
        config: {
          timeout: 30000,
          sandbox: true
        }
      },
      {
        name: "web_search",
        type: "builtin",
        description: "Web search capability"
      }
    ]
  };

  // Add custom tools
  if (schema.tools.apiEndpoints?.length > 0) {
    for (const api of schema.tools.apiEndpoints) {
      tools.tools.push({
        name: api.name,
        type: "http",
        description: api.description || api.name,
        config: {
          url: api.url || '',
          method: api.method || 'GET',
          headers: {},
          timeout: 15000
        }
      });
    }
  }

  return JSON.stringify(tools, null, 2);
}

function encodeCodexProvidersJSON(schema) {
  const providers = {
    providers: [
      {
        name: "openai",
        type: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKeyEnv: "OPENAI_API_KEY",
        models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
      },
      {
        name: "azure",
        type: "azure_openai",
        baseUrl: "{{AZURE_OPENAI_URL}}",
        apiKeyEnv: "AZURE_OPENAI_KEY",
        models: ["gpt-4", "gpt-35-turbo"]
      },
      {
        name: "local",
        type: "ollama",
        baseUrl: "http://localhost:11434",
        models: ["llama2", "codellama"]
      }
    ]
  };

  return JSON.stringify(providers, null, 2);
}

function encodeCodexSkillCodeReview(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "Code Review Skill"');
  sections.push('description: "Perform comprehensive code review"');
  sections.push('tools: ["filesystem_read", "terminal_execute"]');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Perform comprehensive code review:');
  sections.push('');
  sections.push('1. Read the target files');
  sections.push('2. Analyze code quality:');
  sections.push('   - Type safety');
  sections.push('   - Error handling');
  sections.push('   - Performance');
  sections.push('   - Security');
  sections.push('3. Provide structured feedback');
  sections.push('4. Suggest improvements');

  return sections.join('\n');
}

function encodeCodexSkillTesting(schema) {
  const sections = [];

  sections.push('---');
  sections.push('name: "Testing Skill"');
  sections.push('description: "Create and run tests"');
  sections.push('tools: ["filesystem", "terminal"]');
  sections.push('---');
  sections.push('');
  sections.push('# Instructions');
  sections.push('');
  sections.push('Create and execute tests:');
  sections.push('');
  sections.push('1. Identify files to test');
  sections.push('2. Create test files in appropriate location');
  sections.push('3. Write unit tests for key functions');
  sections.push('4. Run tests using npm test');
  sections.push('5. Report test results');

  return sections.join('\n');
}

function encodeCodexSetupScript(schema) {
  const lines = [];

  lines.push('#!/bin/bash');
  lines.push('# Codex CLI Setup Script');
  lines.push('# Generated by UAT Converter');
  lines.push('');
  lines.push('echo "Setting up Codex CLI environment..."');
  lines.push('');
  lines.push('# Check if codex is installed');
  lines.push('if ! command -v codex &> /dev/null; then');
  lines.push('  echo "Installing Codex CLI..."');
  lines.push('  npm install -g @openai/codex-cli');
  lines.push('fi');
  lines.push('');
  lines.push('# Copy environment file');
  lines.push('if [ ! -f .env ]; then');
  lines.push('  cp .env.example .env');
  lines.push('  echo "Please edit .env with your API keys"');
  lines.push('fi');
  lines.push('');
  lines.push('# Set default model');
  lines.push(`codex config set default_model ${schema.modelConfig.model || 'gpt-4'}`);
  lines.push('');
  lines.push('echo "Setup complete! Run ./scripts/run.sh to start."');

  return lines.join('\n');
}

function encodeCodexRunScript(schema) {
  const lines = [];

  lines.push('#!/bin/bash');
  lines.push('# Codex CLI Run Script');
  lines.push('# Generated by UAT Converter');
  lines.push('');
  lines.push('echo "Starting Codex CLI Agent..."');
  lines.push('');
  lines.push('# Run codex with AGENTS.md');
  lines.push(`codex --agent ./AGENTS.md --model ${schema.modelConfig.model || 'gpt-4'}`);
  lines.push('');
  lines.push('# Or use custom approval mode');
  lines.push('# codex --agent ./AGENTS.md --approval-mode auto');

  return lines.join('\n');
}

function encodeCodexIgnore(schema) {
  const lines = [];

  lines.push('# Codex CLI Ignore File');
  lines.push('# Files excluded from Codex context');
  lines.push('');
  lines.push('# Dependencies');
  lines.push('node_modules/');
  lines.push('package-lock.json');
  lines.push('');
  lines.push('# Build outputs');
  lines.push('dist/');
  lines.push('build/');
  lines.push('');
  lines.push('# Secrets');
  lines.push('.env');
  lines.push('.env.local');
  lines.push('.env.*.local');
  lines.push('');
  lines.push('# Cache');
  lines.push('.cache/');
  lines.push('*.log');
  lines.push('');
  lines.push('# Large files');
  lines.push('*.min.js');
  lines.push('*.bundle.js');

  return lines.join('\n');
}

function encodeCodexEnvExample(schema) {
  const lines = [];

  lines.push('# Codex CLI Environment Variables');
  lines.push('# Copy to .env and fill in your API keys');
  lines.push('');
  lines.push('# OpenAI API Key (required)');
  lines.push('OPENAI_API_KEY=sk-xxx');
  lines.push('');
  lines.push('# Azure OpenAI (optional)');
  lines.push('AZURE_OPENAI_URL=https://your-resource.openai.azure.com');
  lines.push('AZURE_OPENAI_KEY=xxx');
  lines.push('');
  lines.push('# Local Ollama (optional)');
  lines.push('OLLAMA_BASE_URL=http://localhost:11434');
  lines.push('');
  lines.push('# Codex Config');
  lines.push(`CODEX_DEFAULT_MODEL=${schema.modelConfig.model || 'gpt-4'}`);
  lines.push('CODEX_APPROVAL_MODE=ask');

  return lines.join('\n');
}

function encodeCodexReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Codex Agent'} - Bundle`);
  sections.push('');
  sections.push('OpenAI Codex CLI Agent Bundle');
  sections.push('');

  sections.push('## Contents');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `AGENTS.md` | Main agent definition |');
  sections.push('| `.codex/config.json` | Codex configuration |');
  sections.push('| `.codex/tools.json` | Tool declarations |');
  sections.push('| `.codex/providers.json` | Model providers |');
  sections.push('| `.codex/skills/` | Skill modules |');
  sections.push('| `scripts/setup.sh` | Setup script |');
  sections.push('| `scripts/run.sh` | Run script |');
  sections.push('');

  sections.push('## Installation');
  sections.push('1. Extract to project root');
  sections.push('2. Run `./scripts/setup.sh`');
  sections.push('3. Edit `.env` with API keys');
  sections.push('4. Run `./scripts/run.sh` to start');
  sections.push('');

  sections.push('## CLI Commands');
  sections.push('```bash');
  sections.push('codex                     # Interactive mode');
  sections.push('codex "task description"  # Single task');
  sections.push('codex --agent ./AGENTS.md # Use agent file');
  sections.push('codex --model gpt-4-turbo # Specify model');
  sections.push('```');
  sections.push('');

  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Codex CLI Bundle 解析（导入）
// ============================================

async function parseCodexBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  const agentsFile = zip.file("AGENTS.md");
  let agentsMD = '';
  if (agentsFile) {
    agentsMD = await agentsFile.async("string");
  }

  const configFile = zip.folder(".codex").file("config.json");
  let configJSON = '';
  if (configFile) {
    configJSON = await configFile.async("string");
  }

  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'codex';
  schema.meta.name = manifest.agent?.name || 'Codex Agent';
  schema.meta.description = manifest.agent?.description || '';

  parseCodexAgentsMD(agentsMD, schema);
  parseCodexConfigJSON(configJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  const rawFiles = { agentsMD, configJSON };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 Codex CLI 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseCodexBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'codex';

  // 查找并解析 AGENTS.md 主 Agent 定义文件
  const agentsMD = findFileByPattern(extractedFiles, ['AGENTS.md', 'agents.md']);
  if (agentsMD) {
    parseCodexAgentsMD(agentsMD, schema);
  }

  // 查找并解析 .codex/config.json
  const configJSON = findFileByPattern(extractedFiles, [
    '.codex/config.json',
    'codex/config.json',
    'config.json'
  ]);
  if (configJSON) {
    parseCodexConfigJSON(configJSON, schema);
  }

  // 查找并解析 .codex/tools.json
  const toolsJSON = findFileByPattern(extractedFiles, [
    '.codex/tools.json',
    'codex/tools.json',
    'tools.json'
  ]);
  if (toolsJSON) {
    try {
      const tools = JSON.parse(toolsJSON);
      if (tools.tools?.length > 0) {
        for (const tool of tools.tools) {
          if (tool.type === 'http') {
            const api = {
              name: tool.name,
              url: tool.config?.url || '',
              method: tool.config?.method || 'GET',
              description: tool.description || ''
            };
            schema.tools.apiEndpoints.push(api);
          }
        }
      }
    } catch (e) {
      console.warn('Codex tools JSON parse warning:', e.message);
    }
  }

  // 查找并解析 .codex/providers.json
  const providersJSON = findFileByPattern(extractedFiles, [
    '.codex/providers.json',
    'codex/providers.json',
    'providers.json'
  ]);
  if (providersJSON) {
    try {
      const providers = JSON.parse(providersJSON);
      if (providers.providers?.length > 0) {
        // 提取模型信息
        for (const provider of providers.providers) {
          if (provider.models?.length > 0) {
            // 使用第一个模型的名称作为默认模型
            if (!schema.modelConfig.model) {
              schema.modelConfig.model = provider.models[0];
            }
          }
        }
      }
    } catch (e) {
      console.warn('Codex providers JSON parse warning:', e.message);
    }
  }

  // 查找并解析 .codex/skills/*.md
  const skillFiles = {};
  const skillPatterns = ['code-review.md', 'testing.md', 'skill1.md'];
  for (const skillName of skillPatterns) {
    const content = findFileByPattern(extractedFiles, [
      '.codex/skills/' + skillName,
      'codex/skills/' + skillName,
      'skills/' + skillName,
      skillName
    ]);
    if (content) {
      skillFiles[skillName] = content;
    }
  }

  // 从 skills 文件提取额外内容
  for (const [skillName, content] of Object.entries(skillFiles)) {
    if (content) {
      const skillMatch = content.match(/---\s*\n([\s\S]*?)\n---/);
      if (skillMatch) {
        const skillYAML = skillMatch[1];
        const nameMatch = skillYAML.match(/name:\s*"([^"]+)"/);
        if (nameMatch) {
          // 可以扩展 Schema 以包含 skills 信息
        }
      }
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseCodexAgentsMD(mdText, schema) {
  if (!mdText) return;

  // Parse YAML frontmatter
  const yamlMatch = mdText.match(/---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const yamlText = yamlMatch[1];

    const nameMatch = yamlText.match(/name:\s*"([^"]+)"/);
    if (nameMatch) schema.meta.name = nameMatch[1];

    const modelMatch = yamlText.match(/model:\s*"([^"]+)"/);
    if (modelMatch) schema.modelConfig.model = modelMatch[1];

    const tempMatch = yamlText.match(/temperature:\s*([\d.]+)/);
    if (tempMatch) schema.modelConfig.temperature = parseFloat(tempMatch[1]);

    const maxTokensMatch = yamlText.match(/maxTokens:\s*(\d+)/);
    if (maxTokensMatch) schema.modelConfig.maxTokens = parseInt(maxTokensMatch[1]);
  }

  // Parse Instructions section
  const instructionsMatch = mdText.match(/# Instructions\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (instructionsMatch) {
    schema.identity.systemPrompt = instructionsMatch[1].trim();
  }

  // Parse Constraints
  const constraintsMatch = mdText.match(/## Constraints\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (constraintsMatch) {
    const lines = constraintsMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.constraints.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }
}

function parseCodexConfigJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const config = JSON.parse(jsonText);

    if (config.model?.name) {
      schema.modelConfig.model = config.model.name;
    }
    if (config.model?.parameters?.temperature) {
      schema.modelConfig.temperature = config.model.parameters.temperature;
    }
    if (config.model?.parameters?.maxTokens) {
      schema.modelConfig.maxTokens = config.model.parameters.maxTokens;
    }
  } catch (e) {
    console.warn('Codex config JSON parse warning:', e.message);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Codex CLI 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeCodexToFiles(schema) {
  return {
    'AGENTS.md': encodeCodexAgentsMD(schema),
    '.codex/config.json': encodeCodexConfigJSON(schema),
    '.codex/tools.json': encodeCodexToolsJSON(schema),
    '.codex/providers.json': encodeCodexProvidersJSON(schema),
    'skills/code-review.md': encodeCodexSkillCodeReview(schema),
    'skills/testing.md': encodeCodexSkillTesting(schema),
    'scripts/setup.sh': encodeCodexSetupScript(schema),
    'scripts/run.sh': encodeCodexRunScript(schema),
    '.codexignore': encodeCodexIgnore(schema),
    '.env.example': encodeCodexEnvExample(schema),
    'README.md': encodeCodexReadme(schema)
  };
}

window.CodexBundle = {
  createCodexBundle,
  parseCodexBundle,
  parseCodexBundleFromFiles,
  encodeCodexAgentsMD,
  encodeCodexConfigJSON,
  encodeCodexToolsJSON,
  encodeCodexProvidersJSON,
  encodeCodexSkillCodeReview,
  encodeCodexSkillTesting,
  encodeCodexSetupScript,
  encodeCodexRunScript,
  encodeCodexIgnore,
  encodeCodexEnvExample,
  encodeCodexReadme,
  encodeCodexToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CodexBundle;
}