/**
 * UAT Zed Editor Bundle 管理器 - Zed Editor Bundle Manager
 * 专门处理 Zed Editor Agent 的配置包导入导出
 *
 * Zed Editor 配置结构：
 * 项目根目录/
 * ├── rules.md                  # 主规则文件
 * ├── .zed/
 * │   ├── settings.json         # Zed编辑器设置
 * │   ├── tasks.json            # 任务配置
 * │   ├── languages/            # 语言特定规则
 * │   ├── context/
 * │   └── prompts/              # 自定义提示词
 * ├── .zedignore                # 文件排除
 * └── README.md
 */

// ============================================
// Zed Editor Bundle 创建（导出）
// ============================================

async function createZedBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Zed-Editor-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainRules: "rules.md",
      zedDir: ".zed/",
      languagesDir: ".zed/languages/",
      promptsDir: ".zed/prompts/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Zed Editor Bundle"
    },
    notes: {
      highPerformance: "高性能原生编辑器",
      multiProvider: "支持Anthropic、OpenAI、Ollama多Provider",
      languageRules: "按编程语言定制规则"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. rules.md
  zip.file("rules.md", encodeZedRulesMD(schema));

  // 3. .zed/ 目录
  const zedFolder = zip.folder(".zed");
  zedFolder.file("settings.json", encodeZedSettingsJSON(schema));
  zedFolder.file("tasks.json", encodeZedTasksJSON(schema));

  // 3.1 languages/
  const languagesFolder = zedFolder.folder("languages");
  languagesFolder.file("rust.md", encodeZedLanguageRust(schema));
  languagesFolder.file("python.md", encodeZedLanguagePython(schema));
  languagesFolder.file("typescript.md", encodeZedLanguageTypeScript(schema));

  // 3.2 context/
  const contextFolder = zedFolder.folder("context");
  contextFolder.file("files.json", encodeZedContextFiles(schema));

  // 3.3 prompts/
  const promptsFolder = zedFolder.folder("prompts");
  promptsFolder.file("explain.md", encodeZedPromptExplain(schema));
  promptsFolder.file("refactor.md", encodeZedPromptRefactor(schema));
  promptsFolder.file("test.md", encodeZedPromptTest(schema));

  // 4. .zedignore
  zip.file(".zedignore", encodeZedIgnore(schema));

  // 5. README.md
  zip.file("README.md", encodeZedReadme(schema));

  // 6. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Zed Editor 编码器
// ============================================

function extractZedProvider(modelName) {
  if (!modelName) return 'anthropic';
  const lower = modelName.toLowerCase();
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gpt')) return 'openai';
  if (lower.includes('llama')) return 'ollama';
  return 'anthropic';
}

function encodeZedRulesMD(schema) {
  const sections = [];

  sections.push('# Zed AI Assistant Rules');
  sections.push('');
  sections.push('> Highest priority rules for Zed Editor AI assistant.');
  sections.push('');

  sections.push('## Project Overview');
  sections.push(`- **Name**: ${schema.meta.name || 'Zed Project'}`);
  sections.push(`- **Description**: ${schema.meta.description || 'AI-assisted development project'}`);
  sections.push('');

  sections.push('## General Guidelines');
  sections.push('- Write clean, idiomatic code');
  sections.push('- Use meaningful variable names');
  sections.push('- Add documentation comments for public items');
  sections.push('');

  sections.push('## Code Generation');
  if (schema.identity.outputRules?.length > 0) {
    for (const rule of schema.identity.outputRules) {
      sections.push(`- ${rule}`);
    }
  } else {
    sections.push('- Use latest stable language features');
    sections.push('- Proper error handling');
    sections.push('- Use async patterns where appropriate');
  }
  sections.push('');

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

  sections.push('## Testing');
  sections.push('- Write unit tests for critical functions');
  sections.push('- Use appropriate testing frameworks');
  sections.push('');

  sections.push('## Output Format');
  sections.push('- Use Markdown for explanations');
  sections.push('- Provide code with comments');
  sections.push('');

  if (schema.identity.systemPrompt) {
    sections.push('## Additional Instructions');
    sections.push('');
    sections.push(schema.identity.systemPrompt);
    sections.push('');
  }

  sections.push('---');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

function encodeZedSettingsJSON(schema) {
  const provider = extractZedProvider(schema.modelConfig.model);

  const settings = {
    assistant: {
      default_model: {
        provider: provider,
        model: schema.modelConfig.model || 'claude-3-5-sonnet'
      },
      fallback_models: [{ provider: 'openai', model: 'gpt-4' }],
      inline_assistant: true,
      enable_experiments: true,
      context_window: 100000
    },
    editor: {
      format_on_save: true,
      tab_size: 4,
      soft_wrap: 'preferred_line_length',
      preferred_line_length: 100
    },
    languages: {
      Rust: { format_on_save: true, tab_size: 4 },
      Python: { format_on_save: true, tab_size: 4 },
      TypeScript: { format_on_save: true, tab_size: 2 }
    }
  };

  return JSON.stringify(settings, null, 2);
}

function encodeZedTasksJSON(schema) {
  const tasks = {
    tasks: [
      { name: "Build", command: "npm run build", cwd: "$ZED_WORKTREE_ROOT" },
      { name: "Test", command: "npm test", cwd: "$ZED_WORKTREE_ROOT" },
      { name: "Lint", command: "npm run lint", cwd: "$ZED_WORKTREE_ROOT" },
      { name: "Run", command: "npm start", cwd: "$ZED_WORKTREE_ROOT" }
    ]
  };

  return JSON.stringify(tasks, null, 2);
}

function encodeZedLanguageRust(schema) {
  return '# Rust Language Rules\n\n## Code Style\n- Use idiomatic Rust patterns\n- Prefer iterators over loops\n- Use Option and Result properly\n\n## Error Handling\n- Use Result<T, E> for fallible operations\n- Use ? operator for propagation\n';
}

function encodeZedLanguagePython(schema) {
  return '# Python Language Rules\n\n## Code Style\n- Follow PEP 8 conventions\n- Use type hints (Python 3.9+)\n- Prefer f-strings for formatting\n\n## Best Practices\n- Use list/dict comprehensions\n- Prefer dataclasses for data\n';
}

function encodeZedLanguageTypeScript(schema) {
  return '# TypeScript Language Rules\n\n## Code Style\n- Use strict mode\n- Prefer interfaces over types for objects\n- Avoid any type\n\n## Features\n- Use ES modules\n- Prefer async/await\n';
}

function encodeZedContextFiles(schema) {
  const context = {
    always_include: ["README.md", "rules.md", "package.json"],
    watch_files: [".zed/languages/*.md"],
    max_context_files: 20,
    max_file_size: 1000000
  };

  return JSON.stringify(context, null, 2);
}

function encodeZedPromptExplain(schema) {
  return '# Explain Code Prompt\n\nExplain the following code:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. High-level purpose\n2. Key functions/methods\n3. Dependencies used\n';
}

function encodeZedPromptRefactor(schema) {
  return '# Refactor Prompt\n\nRefactor the following code:\n\n```{{language}}\n{{code}}\n```\n\nGoals:\n- Improve readability\n- Reduce complexity\n- Enhance performance\n';
}

function encodeZedPromptTest(schema) {
  return '# Test Generation Prompt\n\nGenerate tests for:\n\n```{{language}}\n{{code}}\n```\n\nRequirements:\n- Use appropriate testing framework\n- Include edge cases\n';
}

function encodeZedIgnore(schema) {
  return '# Zed Ignore File\nnode_modules/\ndist/\nbuild/\n.env\n.env.*\n*.min.js\n*.min.css\n';
}

function encodeZedReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Zed Agent'} - Bundle`);
  sections.push('');
  sections.push('Zed Editor AI Assistant Configuration Bundle');
  sections.push('');
  sections.push('## Contents');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `rules.md` | Main rules |');
  sections.push('| `.zed/settings.json` | Editor settings |');
  sections.push('| `.zed/tasks.json` | Task configs |');
  sections.push('| `.zed/languages/` | Language rules |');
  sections.push('');
  sections.push('## Keyboard Shortcuts');
  sections.push('| Action | Mac | Windows/Linux |');
  sections.push('|--------|-----|---------------|');
  sections.push('| Inline Assist | Cmd+Shift+E | Ctrl+Shift+E |');
  sections.push('| Panel Assist | Cmd+Shift+A | Ctrl+Shift+A |');
  sections.push('');
  sections.push('## Providers');
  sections.push('- Anthropic (Claude)');
  sections.push('- OpenAI (GPT-4)');
  sections.push('- Ollama (Local)');
  sections.push('');
  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Zed Editor Bundle 解析（导入）
// ============================================

async function parseZedBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  const rulesFile = zip.file("rules.md");
  let rulesMD = '';
  if (rulesFile) {
    rulesMD = await rulesFile.async("string");
  }

  const settingsFile = zip.folder(".zed")?.file("settings.json");
  let settingsJSON = '';
  if (settingsFile) {
    settingsJSON = await settingsFile.async("string");
  }

  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'zed';
  schema.meta.name = manifest.agent?.name || 'Zed Agent';
  schema.meta.description = manifest.agent?.description || '';

  parseZedRulesMD(rulesMD, schema);
  parseZedSettingsJSON(settingsJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  return { schema, manifest, rawFiles: { rulesMD, settingsJSON } };
}

/**
 * 从提取的文件直接解析 Zed Editor 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseZedBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'zed';

  // 查找并解析 rules.md 主规则文件
  const rulesMD = findFileByPattern(extractedFiles, ['rules.md', 'RULES.md']);
  if (rulesMD) {
    parseZedRulesMD(rulesMD, schema);
  }

  // 查找并解析 .zed/settings.json
  const settingsJSON = findFileByPattern(extractedFiles, [
    '.zed/settings.json',
    'zed/settings.json',
    'settings.json'
  ]);
  if (settingsJSON) {
    parseZedSettingsJSON(settingsJSON, schema);
  }

  // 查找并解析 .zed/tasks.json
  const tasksJSON = findFileByPattern(extractedFiles, [
    '.zed/tasks.json',
    'zed/tasks.json',
    'tasks.json'
  ]);
  if (tasksJSON) {
    try {
      const tasks = JSON.parse(tasksJSON);
      if (tasks.tasks?.length > 0) {
        // 可以将 tasks 映射到 workflow.steps
        for (let i = 0; i < tasks.tasks.length; i++) {
          const task = tasks.tasks[i];
          const step = UATCore.createEmptyWorkflowStep();
          step.stepId = `task_${i}`;
          step.name = task.name;
          step.type = 'task';
          step.content = task.command || '';
          schema.workflow.steps.push(step);
        }
      }
    } catch (e) {
      console.warn('Zed tasks JSON parse warning:', e.message);
    }
  }

  // 查找并解析 .zed/languages/*.md
  const languageFiles = {};
  const languageNames = ['rust.md', 'python.md', 'typescript.md'];
  for (const langName of languageNames) {
    const content = findFileByPattern(extractedFiles, [
      '.zed/languages/' + langName,
      'zed/languages/' + langName,
      'languages/' + langName,
      langName
    ]);
    if (content) {
      languageFiles[langName] = content;
    }
  }

  // 从 language 文件提取额外内容
  for (const [langName, content] of Object.entries(languageFiles)) {
    if (content) {
      // 可以提取语言特定规则，暂不扩展 Schema
    }
  }

  // 查找并解析 .zed/prompts/*.md
  const promptFiles = {};
  const promptNames = ['explain.md', 'refactor.md', 'test.md'];
  for (const promptName of promptNames) {
    const content = findFileByPattern(extractedFiles, [
      '.zed/prompts/' + promptName,
      'zed/prompts/' + promptName,
      'prompts/' + promptName,
      promptName
    ]);
    if (content) {
      promptFiles[promptName] = content;
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseZedRulesMD(mdText, schema) {
  if (!mdText) return;

  const nameMatch = mdText.match(/\*Name\*. (.+)/i);
  if (nameMatch) schema.meta.name = nameMatch[1].trim();

  const constraintsMatch = mdText.match(/## Constraints\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (constraintsMatch) {
    const lines = constraintsMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.constraints.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }

  const rulesMatch = mdText.match(/## Code Generation\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (rulesMatch) {
    const lines = rulesMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.outputRules.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }

  const instructionsMatch = mdText.match(/## Additional Instructions\s*\n([\s\S]*?)(?=\n---|$)/i);
  if (instructionsMatch) {
    schema.identity.systemPrompt = instructionsMatch[1].trim();
  }
}

function parseZedSettingsJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const settings = JSON.parse(jsonText);
    if (settings.assistant?.default_model?.model) {
      schema.modelConfig.model = settings.assistant.default_model.model;
    }
  } catch (e) {
    console.warn('Zed settings JSON parse warning:', e.message);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Zed Editor 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeZedToFiles(schema) {
  return {
    'rules.md': encodeZedRulesMD(schema),
    '.zed/settings.json': encodeZedSettingsJSON(schema),
    '.zed/tasks.json': encodeZedTasksJSON(schema),
    '.zed/languages/rust.md': encodeZedLanguageRust(schema),
    '.zed/languages/python.md': encodeZedLanguagePython(schema),
    '.zed/languages/typescript.md': encodeZedLanguageTypeScript(schema),
    '.zed/context/files.json': encodeZedContextFiles(schema),
    '.zed/prompts/explain.md': encodeZedPromptExplain(schema),
    '.zed/prompts/refactor.md': encodeZedPromptRefactor(schema),
    '.zed/prompts/test.md': encodeZedPromptTest(schema),
    '.zedignore': encodeZedIgnore(schema),
    'README.md': encodeZedReadme(schema)
  };
}

window.ZedBundle = {
  createZedBundle,
  parseZedBundle,
  parseZedBundleFromFiles,
  extractZedProvider,
  encodeZedRulesMD,
  encodeZedSettingsJSON,
  encodeZedTasksJSON,
  encodeZedLanguageRust,
  encodeZedLanguagePython,
  encodeZedLanguageTypeScript,
  encodeZedContextFiles,
  encodeZedPromptExplain,
  encodeZedPromptRefactor,
  encodeZedPromptTest,
  encodeZedIgnore,
  encodeZedReadme,
  encodeZedToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ZedBundle;
}