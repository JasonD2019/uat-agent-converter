/**
 * UAT GitHub Copilot Bundle 管理器 - GitHub Copilot Bundle Manager
 * 专门处理 GitHub Copilot Agent 的配置包导入导出
 *
 * GitHub Copilot 配置结构：
 * 项目根目录/
 * ├── .github/
 * │   ├── copilot-instructions.md   # 主指令文件（最高优先级）
 * │   └── prompts/                  # 自定义提示词目录
 * ├── .vscode/
 * │   ├── settings.json             # VSCode设置
 * │   └── extensions.json           # 扩展推荐
 * ├── .copilotignore                # 文件排除
 * ├── vscode-copilot-settings.json  # Copilot专用设置
 * └── README.md
 */

// ============================================
// GitHub Copilot Bundle 创建（导出）
// ============================================

async function createCopilotBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "GitHub-Copilot-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainInstructions: ".github/copilot-instructions.md",
      promptsDir: ".github/prompts/",
      vscodeDir: ".vscode/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - GitHub Copilot Bundle"
    },
    notes: {
      vscodeNative: "VSCode原生集成AI助手",
      githubEcosystem: "GitHub生态系统深度集成",
      noMCP: "不支持MCP外部工具扩展"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. .github/ 目录
  const githubFolder = zip.folder(".github");
  githubFolder.file("copilot-instructions.md", encodeCopilotInstructionsMD(schema));

  // 2.1 .github/prompts/ 目录
  const promptsFolder = githubFolder.folder("prompts");
  promptsFolder.file("code-generation.md", encodeCopilotPromptCodeGeneration(schema));
  promptsFolder.file("review.md", encodeCopilotPromptReview(schema));
  promptsFolder.file("test.md", encodeCopilotPromptTest(schema));
  promptsFolder.file("refactor.md", encodeCopilotPromptRefactor(schema));

  // 3. .vscode/ 目录
  const vscodeFolder = zip.folder(".vscode");
  vscodeFolder.file("settings.json", encodeCopilotVSCodeSettings(schema));
  vscodeFolder.file("extensions.json", encodeCopilotVSCodeExtensions(schema));

  // 4. .copilotignore
  const copilotignore = encodeCopilotIgnore(schema);
  zip.file(".copilotignore", copilotignore);

  // 5. vscode-copilot-settings.json
  const copilotSettings = encodeCopilotSettingsJSON(schema);
  zip.file("vscode-copilot-settings.json", copilotSettings);

  // 6. README.md
  zip.file("README.md", encodeCopilotReadme(schema));

  // 7. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// GitHub Copilot 编码器
// ============================================

function encodeCopilotInstructionsMD(schema) {
  const sections = [];

  sections.push('# GitHub Copilot Instructions');
  sections.push('');
  sections.push('> Highest priority instruction file for GitHub Copilot.');
  sections.push('');

  // Project Overview
  sections.push('## Project Overview');
  sections.push(`- **Name**: ${schema.meta.name || 'Copilot Project'}`);
  sections.push(`- **Description**: ${schema.meta.description || 'AI-assisted development project'}`);
  sections.push('- **Type**: General Application');
  sections.push('');

  // Coding Style
  sections.push('## Coding Style');
  sections.push('- Use TypeScript strict mode');
  sections.push('- Prefer modern ES modules syntax');
  sections.push('- Follow consistent naming conventions');
  sections.push('- Add proper type annotations');
  sections.push('');

  // Code Generation Rules
  sections.push('## Code Generation Rules');
  if (schema.identity.outputRules?.length > 0) {
    for (const rule of schema.identity.outputRules) {
      sections.push(`- ${rule}`);
    }
  } else {
    sections.push('- Always add type annotations');
    sections.push('- Use meaningful variable names');
    sections.push('- Add comments for complex logic');
    sections.push('- Handle errors gracefully');
  }
  sections.push('');

  // Constraints
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

  // Testing Requirements
  sections.push('## Testing Requirements');
  sections.push('- Write unit tests for critical functions');
  sections.push('- Use appropriate testing frameworks');
  sections.push('- Aim for good code coverage');
  sections.push('');

  // Review Guidelines
  sections.push('## Review Guidelines');
  sections.push('- Check for potential security issues');
  sections.push('- Verify type safety');
  sections.push('- Ensure code readability');
  sections.push('- Review error handling');
  sections.push('');

  // Output Format
  sections.push('## Output Format');
  sections.push('- Use Markdown for explanations');
  sections.push('- Provide code snippets with comments');
  sections.push('- Explain complex logic step-by-step');
  sections.push('');

  // System Prompt (if present)
  if (schema.identity.systemPrompt) {
    sections.push('## Additional Instructions');
    sections.push('');
    sections.push(schema.identity.systemPrompt);
    sections.push('');
  }

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

function encodeCopilotPromptCodeGeneration(schema) {
  const sections = [];

  sections.push('# Code Generation Prompt');
  sections.push('');
  sections.push('When generating code for this project:');
  sections.push('');
  sections.push('1. Follow the existing code patterns');
  sections.push('2. Use proper types and annotations');
  sections.push('3. Include necessary imports');
  sections.push('4. Add error handling');
  sections.push('5. Write accompanying tests');
  sections.push('');
  sections.push('Template:');
  sections.push('');
  sections.push('```typescript');
  sections.push('/**');
  sections.push(' * [Function description]');
  sections.push(' * @param paramName - Parameter description');
  sections.push(' * @returns Return value description');
  sections.push(' */');
  sections.push('export function functionName(paramName: Type): ReturnType {');
  sections.push('  // Implementation');
  sections.push('}');
  sections.push('```');

  return sections.join('\n');
}

function encodeCopilotPromptReview(schema) {
  const sections = [];

  sections.push('# Code Review Prompt');
  sections.push('');
  sections.push('When reviewing code changes:');
  sections.push('');
  sections.push('1. Check for:');
  sections.push('   - Type safety');
  sections.push('   - Error handling');
  sections.push('   - Performance issues');
  sections.push('   - Security vulnerabilities');
  sections.push('   - Code readability');
  sections.push('');
  sections.push('2. Provide feedback in categories:');
  sections.push('   - **Critical**: Must fix before merge');
  sections.push('   - **Suggested**: Recommended improvements');
  sections.push('   - **Optional**: Nice to have changes');
  sections.push('');
  sections.push('3. Format feedback as:');
  sections.push('   - File: [filename]');
  sections.push('   - Line: [line number]');
  sections.push('   - Issue: [description]');
  sections.push('   - Suggestion: [how to fix]');

  return sections.join('\n');
}

function encodeCopilotPromptTest(schema) {
  const sections = [];

  sections.push('# Test Generation Prompt');
  sections.push('');
  sections.push('Generate tests for the following code:');
  sections.push('');
  sections.push('Requirements:');
  sections.push('- Use appropriate testing framework');
  sections.push('- Include edge cases');
  sections.push('- Add descriptive test names');
  sections.push('- Aim for good coverage');
  sections.push('');
  sections.push('Template:');
  sections.push('');
  sections.push('```typescript');
  sections.push('describe("functionName", () => {');
  sections.push('  it("should handle normal case", () => {');
  sections.push('    // Test implementation');
  sections.push('  });');
  sections.push('});');
  sections.push('```');

  return sections.join('\n');
}

function encodeCopilotPromptRefactor(schema) {
  const sections = [];

  sections.push('# Refactor Prompt');
  sections.push('');
  sections.push('When refactoring code:');
  sections.push('');
  sections.push('1. Preserve existing behavior');
  sections.push('2. Improve code structure');
  sections.push('3. Remove duplication');
  sections.push('4. Enhance readability');
  sections.push('5. Optimize performance if needed');
  sections.push('');
  sections.push('Checklist:');
  sections.push('- Extract common logic into functions');
  sections.push('- Use meaningful names');
  sections.push('- Add documentation');
  sections.push('- Simplify complex conditions');
  sections.push('- Update tests to match changes');

  return sections.join('\n');
}

function encodeCopilotVSCodeSettings(schema) {
  const settings = {
    "github.copilot.enable": {
      "*": true,
      "yaml": false,
      "plaintext": false
    },
    "github.copilot.advanced": {
      "length": 500,
      "temperature": schema.modelConfig.temperature || 0.7
    },
    "github.copilot.editor.enableAutoSuggestions": true,
    "github.copilot.chat.enable": true,
    "editor.inlineSuggest.enabled": true,
    "editor.suggest.preview": true,
    "editor.quickSuggestions": {
      "other": true,
      "comments": false,
      "strings": false
    }
  };

  return JSON.stringify(settings, null, 2);
}

function encodeCopilotVSCodeExtensions(schema) {
  const extensions = {
    recommendations: [
      "GitHub.copilot",
      "GitHub.copilot-chat",
      "GitHub.copilot-labs"
    ]
  };

  return JSON.stringify(extensions, null, 2);
}

function encodeCopilotIgnore(schema) {
  const lines = [];

  lines.push('# Copilot Ignore File');
  lines.push('# Files excluded from Copilot context');
  lines.push('');
  lines.push('# Dependencies');
  lines.push('node_modules/');
  lines.push('');
  lines.push('# Build outputs');
  lines.push('dist/');
  lines.push('build/');
  lines.push('');
  lines.push('# Secrets');
  lines.push('.env');
  lines.push('.env.*');
  lines.push('credentials/');
  lines.push('secrets/');
  lines.push('');
  lines.push('# Minified files');
  lines.push('*.min.js');
  lines.push('*.min.css');
  lines.push('');
  lines.push('# Coverage');
  lines.push('coverage/');
  lines.push('');
  lines.push('# Generated files');
  lines.push('*.generated.*');

  return lines.join('\n');
}

function encodeCopilotSettingsJSON(schema) {
  const settings = {
    projectName: schema.meta.name || 'Copilot Project',
    enableInlineSuggestions: true,
    enableChat: true,
    temperature: schema.modelConfig.temperature || 0.7,
    maxTokens: schema.modelConfig.maxTokens || 4096,
    languagePreferences: {
      typescript: { strictMode: true },
      javascript: { esModules: true }
    },
    rulesSource: ".github/copilot-instructions.md",
    promptsDir: ".github/prompts/"
  };

  return JSON.stringify(settings, null, 2);
}

function encodeCopilotReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Copilot Agent'} - Bundle`);
  sections.push('');
  sections.push('GitHub Copilot Agent Configuration Bundle');
  sections.push('');

  sections.push('## Contents');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `.github/copilot-instructions.md` | Main instructions |');
  sections.push('| `.github/prompts/` | Custom prompts |');
  sections.push('| `.vscode/settings.json` | VSCode settings |');
  sections.push('| `.vscode/extensions.json` | Extension recommendations |');
  sections.push('| `.copilotignore` | File exclusions |');
  sections.push('');

  sections.push('## Installation');
  sections.push('1. Extract to project root');
  sections.push('2. Open project in VSCode');
  sections.push('3. Ensure GitHub Copilot extension installed');
  sections.push('4. Copilot will auto-load instructions');
  sections.push('');

  sections.push('## Chat Commands');
  sections.push('```');
  sections.push('@workspace Explain the project structure');
  sections.push('@terminal Help me run tests');
  sections.push('@vscode How to configure TypeScript');
  sections.push('```');
  sections.push('');

  sections.push('## Prompt Variables');
  sections.push('| Variable | Description |');
  sections.push('|----------|-------------|');
  sections.push('| `{language}` | Current file language |');
  sections.push('| `{file}` | Current file name |');
  sections.push('| `{workspace}` | Workspace name |');
  sections.push('');

  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// GitHub Copilot Bundle 解析（导入）
// ============================================

async function parseCopilotBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  const instructionsFile = zip.folder(".github")?.file("copilot-instructions.md");
  let instructionsMD = '';
  if (instructionsFile) {
    instructionsMD = await instructionsFile.async("string");
  }

  const settingsFile = zip.folder(".vscode")?.file("settings.json");
  let settingsJSON = '';
  if (settingsFile) {
    settingsJSON = await settingsFile.async("string");
  }

  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'copilot';
  schema.meta.name = manifest.agent?.name || 'Copilot Agent';
  schema.meta.description = manifest.agent?.description || '';

  parseCopilotInstructionsMD(instructionsMD, schema);
  parseCopilotSettingsJSON(settingsJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  const rawFiles = { instructionsMD, settingsJSON };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 GitHub Copilot 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseCopilotBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'copilot';

  // 查找并解析 .github/copilot-instructions.md 主指令文件
  const instructionsMD = findFileByPattern(extractedFiles, [
    '.github/copilot-instructions.md',
    'github/copilot-instructions.md',
    'copilot-instructions.md',
    'instructions.md'
  ]);
  if (instructionsMD) {
    parseCopilotInstructionsMD(instructionsMD, schema);
  }

  // 查找并解析 .vscode/settings.json
  const settingsJSON = findFileByPattern(extractedFiles, [
    '.vscode/settings.json',
    'vscode/settings.json',
    'settings.json'
  ]);
  if (settingsJSON) {
    parseCopilotSettingsJSON(settingsJSON, schema);
  }

  // 查找并解析 .github/prompts/*.md
  const promptFiles = {};
  const promptNames = ['code-generation.md', 'review.md', 'test.md', 'refactor.md'];
  for (const promptName of promptNames) {
    const content = findFileByPattern(extractedFiles, [
      '.github/prompts/' + promptName,
      'github/prompts/' + promptName,
      'prompts/' + promptName,
      promptName
    ]);
    if (content) {
      promptFiles[promptName] = content;
    }
  }

  // 从 prompts 文件提取额外内容
  for (const [promptName, content] of Object.entries(promptFiles)) {
    if (content) {
      // 可以提取 prompt 相关内容，暂不扩展 Schema
    }
  }

  // 查找并解析 vscode-copilot-settings.json
  const copilotSettingsJSON = findFileByPattern(extractedFiles, [
    'vscode-copilot-settings.json',
    'copilot-settings.json'
  ]);
  if (copilotSettingsJSON) {
    try {
      const settings = JSON.parse(copilotSettingsJSON);
      if (settings.temperature) {
        schema.modelConfig.temperature = settings.temperature;
      }
      if (settings.maxTokens) {
        schema.modelConfig.maxTokens = settings.maxTokens;
      }
    } catch (e) {
      console.warn('Copilot settings JSON parse warning:', e.message);
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseCopilotInstructionsMD(mdText, schema) {
  if (!mdText) return;

  // Extract project name
  const nameMatch = mdText.match(/\*Name\*. (.+)/i);
  if (nameMatch) {
    schema.meta.name = nameMatch[1].trim();
  }

  // Extract constraints
  const constraintsMatch = mdText.match(/## Constraints\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (constraintsMatch) {
    const lines = constraintsMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.constraints.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }

  // Extract code generation rules
  const rulesMatch = mdText.match(/## Code Generation Rules\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (rulesMatch) {
    const lines = rulesMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.outputRules.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }

  // Extract additional instructions
  const instructionsMatch = mdText.match(/## Additional Instructions\s*\n([\s\S]*?)(?=\n---|$)/i);
  if (instructionsMatch) {
    schema.identity.systemPrompt = instructionsMatch[1].trim();
  }
}

function parseCopilotSettingsJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const settings = JSON.parse(jsonText);

    if (settings["github.copilot.advanced"]?.temperature) {
      schema.modelConfig.temperature = settings["github.copilot.advanced"].temperature;
    }
  } catch (e) {
    console.warn('Copilot settings JSON parse warning:', e.message);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 GitHub Copilot 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeCopilotToFiles(schema) {
  return {
    'copilot-instructions.md': encodeCopilotInstructionsMD(schema),
    '.github/prompts/code-generation.md': encodeCopilotPromptCodeGeneration(schema),
    '.github/prompts/review.md': encodeCopilotPromptReview(schema),
    '.github/prompts/test.md': encodeCopilotPromptTest(schema),
    '.github/prompts/refactor.md': encodeCopilotPromptRefactor(schema),
    '.vscode/settings.json': encodeCopilotVSCodeSettings(schema),
    '.vscode/extensions.json': encodeCopilotVSCodeExtensions(schema),
    '.copilotignore': encodeCopilotIgnore(schema),
    'vscode-copilot-settings.json': encodeCopilotSettingsJSON(schema),
    'README.md': encodeCopilotReadme(schema)
  };
}

window.CopilotBundle = {
  createCopilotBundle,
  parseCopilotBundle,
  parseCopilotBundleFromFiles,
  encodeCopilotInstructionsMD,
  encodeCopilotPromptCodeGeneration,
  encodeCopilotPromptReview,
  encodeCopilotPromptTest,
  encodeCopilotPromptRefactor,
  encodeCopilotVSCodeSettings,
  encodeCopilotVSCodeExtensions,
  encodeCopilotIgnore,
  encodeCopilotSettingsJSON,
  encodeCopilotReadme,
  encodeCopilotToFiles
};