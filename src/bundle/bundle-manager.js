/**
 * UAT Bundle 打包/解包管理器 - Bundle Manager
 * 模块：多资源 Agent 包的导入导出
 */

// ============================================
// Bundle 打包
// ============================================

/**
 * 将 Schema 和资源打包为 ZIP 文件
 * @param {Object} schema - UAT-Schema v2.0
 * @param {Object} resources - 资源对象
 * @returns {Promise<Blob>} ZIP 文件
 */
async function createUATBundle(schema, resources = {}) {
  // 需要 JSZip 库
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载，请先引入 JSZip');
  }

  const zip = new JSZip();

  // 1. 创建 Manifest
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "UAT-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown',
      schemaFile: "agent.schema.json"
    },
    resources: {
      tools: [],
      workflows: []
    },
    knowledgeBases: {
      note: "知识库内容暂不传递，仅保留ID引用",
      refCount: schema.memory.knowledgeBaseRef?.length || 0,
      refs: schema.memory.knowledgeBaseRef || []
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0"
    }
  };

  // 2. 添加 Schema 文件
  zip.file("agent.schema.json", JSON.stringify(schema, null, 2));

  // 3. 添加 MCP 工具配置
  if (schema.tools.mcpServers?.length > 0) {
    const toolsFolder = zip.folder("tools");

    for (const mcp of schema.tools.mcpServers) {
      if (mcp.config && Object.keys(mcp.config).length > 0) {
        const configData = {
          id: mcp.id,
          name: mcp.name,
          url: mcp.url,
          config: mcp.config,
          tools: mcp.tools || [],
          enabled: mcp.enabled
        };

        toolsFolder.file(`mcp_${mcp.id}.json`, JSON.stringify(configData, null, 2));
        manifest.resources.tools.push({
          id: mcp.id,
          file: `tools/mcp_${mcp.id}.json`,
          type: 'mcp'
        });
      }
    }
  }

  // 4. 添加工作流详情（复杂节点）
  const complexSteps = schema.workflow.steps?.filter(s =>
    s.type === 'condition' || s.type === 'loop' || s.type === 'parallel'
  ) || [];

  if (complexSteps.length > 0) {
    const wfFolder = zip.folder("workflows");

    for (const step of complexSteps) {
      const detail = {
        stepId: step.stepId,
        name: step.name,
        type: step.type,
        conditions: step.conditions || [],
        loopConfig: step.loopConfig || {},
        parallelConfig: step.parallelConfig || {},
        onError: step.onError || {}
      };

      wfFolder.file(`${step.stepId}.json`, JSON.stringify(detail, null, 2));
      manifest.resources.workflows.push({
        id: step.stepId,
        file: `workflows/${step.stepId}.json`,
        type: step.type
      });
    }
  }

  // 5. 添加 Manifest
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 6. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Bundle 解包
// ============================================

/**
 * 解析 UAT-Bundle ZIP 文件
 * @param {File|Blob} zipFile - ZIP 文件
 * @returns {Promise<Object>} { schema, manifest }
 */
async function parseUATBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  // 1. 解析 Manifest
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }

  const manifest = JSON.parse(await manifestFile.async("string"));

  // 2. 解析 Schema
  const schemaFile = zip.file(manifest.agent.schemaFile);
  if (!schemaFile) {
    throw new Error('Bundle 缺少 Schema 文件');
  }

  const schema = JSON.parse(await schemaFile.async("string"));

  // 3. 合并工具配置
  for (const toolRef of manifest.resources.tools || []) {
    const toolFile = zip.file(toolRef.file);
    if (toolFile) {
      const config = JSON.parse(await toolFile.async("string"));

      const toolInSchema = schema.tools.mcpServers?.find(t => t.id === toolRef.id);
      if (toolInSchema) {
        toolInSchema.config = config.config || {};
        toolInSchema.tools = config.tools || [];
      }
    }
  }

  // 4. 合并工作流详情
  for (const wfRef of manifest.resources.workflows || []) {
    const wfFile = zip.file(wfRef.file);
    if (wfFile) {
      const detail = JSON.parse(await wfFile.async("string"));

      const stepInSchema = schema.workflow.steps?.find(s => s.stepId === wfRef.id);
      if (stepInSchema) {
        stepInSchema.conditions = detail.conditions || [];
        stepInSchema.loopConfig = detail.loopConfig || {};
        stepInSchema.parallelConfig = detail.parallelConfig || {};
        stepInSchema.onError = detail.onError || {};
      }
    }
  }

  // 5. 补全默认值
  UATCore.fillSchemaDefaultValues(schema);

  return { schema, manifest };
}

// ============================================
// 多文件导入
// ============================================

/**
 * 导入多文件 Agent 配置
 * @param {FileList} files - 文件列表
 * @returns {Promise<Object>} { schema, platform, resources }
 */
async function importMultipleFiles(files) {
  const fileMap = {};

  // 读取所有文件
  for (const file of files) {
    const content = await readFileContent(file);
    fileMap[file.name] = content;
  }

  // 检测主要配置文件
  const mainFile = detectMainConfigFile(fileMap);
  const platform = detectPlatformFromFiles(fileMap, mainFile);

  // 创建 Schema
  const schema = UATCore.createEmptyUATSchema();
  const resources = { tools: [], workflows: [] };

  // 根据平台解析
  switch (platform) {
    case 'dify':
      UATParser.parseDifyDSLEnhanced(fileMap[mainFile], schema);
      break;
    case 'fastgpt':
      UATParser.parseFastGPTEnhanced(fileMap[mainFile], schema);
      break;
    case 'flowise':
      UATParser.parseFlowiseEnhanced(fileMap[mainFile], schema);
      break;
    case 'claude':
      UATParser.parseClaudeSkillEnhanced(fileMap[mainFile], schema);
      // 检查是否有 MCP 配置文件
      parseClaudeMCPFiles(fileMap, schema);
      break;
    case 'openclaw':
      parseOpenClawMultiFiles(fileMap, schema);
      break;
    default:
      UATParser.parsePlainText(fileMap[mainFile], schema);
  }

  UATCore.fillSchemaDefaultValues(schema);

  return { schema, platform, resources };
}

/**
 * 读取文件内容
 */
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 检测主要配置文件
 */
function detectMainConfigFile(fileMap) {
  const filenames = Object.keys(fileMap);

  // Bundle ZIP 文件
  if (filenames.some(f => f.endsWith('.zip') || f.endsWith('.uat'))) {
    return filenames.find(f => f.endsWith('.zip') || f.endsWith('.uat'));
  }

  // OpenClaw: Identity.md
  if (filenames.includes('Identity.md')) return 'Identity.md';

  // 优先级：yml > json > md (带YAML头) > md > txt
  for (const f of filenames) {
    if (f.endsWith('.yml') || f.endsWith('.yaml')) return f;
  }
  for (const f of filenames) {
    if (f.endsWith('.json')) return f;
  }
  for (const f of filenames) {
    if (f.endsWith('.md') && fileMap[f].startsWith('---')) return f;
  }
  for (const f of filenames) {
    if (f.endsWith('.md')) return f;
  }
  for (const f of filenames) {
    if (f.endsWith('.txt')) return f;
  }

  return filenames[0];
}

/**
 * 从文件列表检测平台
 */
function detectPlatformFromFiles(fileMap, mainFile) {
  const filenames = Object.keys(fileMap);

  // ZIP Bundle
  if (mainFile.endsWith('.zip') || mainFile.endsWith('.uat')) {
    return 'bundle';
  }

  // OpenClaw 特征文件
  if (filenames.includes('Identity.md') || filenames.includes('Soul.md')) {
    return 'openclaw';
  }

  // Claude: Skill.md + mcp*.json
  if (filenames.some(f => f.toLowerCase().includes('mcp') && f.endsWith('.json'))) {
    return 'claude';
  }

  // Dify: YAML 特征
  if (mainFile.endsWith('.yml') || mainFile.endsWith('.yaml')) {
    return 'dify';
  }

  // 检测主文件内容
  return UATDetector.detectPlatform(fileMap[mainFile]);
}

/**
 * 解析 Claude MCP 配置文件
 */
function parseClaudeMCPFiles(fileMap, schema) {
  const mcpFiles = Object.keys(fileMap).filter(f =>
    f.toLowerCase().includes('mcp') && f.endsWith('.json')
  );

  for (const mcpFile of mcpFiles) {
    try {
      const mcpConfig = JSON.parse(fileMap[mcpFile]);

      if (mcpConfig.mcpServers) {
        for (const [serverId, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
          const mcp = UATCore.createEmptyMCPServer();
          mcp.id = serverId;
          mcp.name = serverConfig.name || serverId;
          mcp.url = serverConfig.url || '';
          mcp.config = {
            transport: serverConfig.transport || 'stdio',
            command: serverConfig.command || '',
            args: serverConfig.args || [],
            env: serverConfig.env || {},
            capabilities: serverConfig.capabilities || []
          };

          schema.tools.mcpServers.push(mcp);
        }
      }
    } catch (e) {
      console.warn('MCP 配置解析失败:', mcpFile);
    }
  }
}

/**
 * 解析 OpenClaw 多文件
 */
function parseOpenClawMultiFiles(fileMap, schema) {
  schema.meta.sourcePlatform = 'openclaw';

  // Identity.md
  if (fileMap['Identity.md']) {
    const identityContent = fileMap['Identity.md'];

    // 提取名称
    const nameMatch = identityContent.match(/Name:\s*['"]?([^'":\n]+)['"]?/i);
    if (nameMatch) schema.meta.name = nameMatch[1].trim();

    // 提取角色
    const roleMatch = identityContent.match(/Role:\s*['"]?([^'":\n]+)['"]?/i);
    if (roleMatch) schema.identity.role = roleMatch[1].trim();

    // 提取系统提示词
    const promptSection = identityContent.match(/##\s*System\s*Prompt\s*\n([\s\S]*?)(?=\n##|\n#|\n\n|$)/i);
    if (promptSection) {
      schema.identity.systemPrompt = promptSection[1].trim();
    } else {
      schema.identity.systemPrompt = identityContent;
    }
  }

  // Soul.md
  if (fileMap['Soul.md']) {
    const soulContent = fileMap['Soul.md'];
    const constraints = soulContent.split(/\n\n+/).filter(s => s.trim() && !s.startsWith('#'));
    schema.identity.constraints = constraints;
  }

  // Skills 目录下的文件
  const skillFiles = Object.keys(fileMap).filter(f =>
    f.startsWith('Skills/') || f.includes('skill') && f.endsWith('.md')
  );

  for (let i = 0; i < skillFiles.length; i++) {
    const skillFile = skillFiles[i];
    const content = fileMap[skillFile];
    const name = skillFile.replace('Skills/', '').replace('.md', '');

    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = `skill_${i}`;
    step.name = name;
    step.type = 'prompt';
    step.content = content;
    step.nextStepId = i < skillFiles.length - 1 ? `skill_${i + 1}` : '';

    schema.workflow.steps.push(step);
  }
}

// ============================================
// 导出统计
// ============================================

/**
 * 获取 Bundle 统计信息
 */
function getBundleStats(schema) {
  return {
    name: schema.meta.name,
    platform: schema.meta.sourcePlatform,
    stepsCount: schema.workflow.steps?.length || 0,
    mcpToolsCount: schema.tools.mcpServers?.length || 0,
    apiToolsCount: schema.tools.apiEndpoints?.length || 0,
    knowledgeRefCount: schema.memory.knowledgeBaseRef?.length || 0,
    promptVariablesCount: schema.identity.promptVariables?.length || 0,
    conditionsCount: schema.workflow.steps?.filter(s => s.type === 'condition').length || 0,
    loopsCount: schema.workflow.steps?.filter(s => s.type === 'loop').length || 0
  };
}

// ============================================
// 共享辅助函数
// ============================================

/**
 * 从文件集合中查找匹配的文件内容
 * @param {Object} files - { path: content }
 * @param {Array} patterns - 文件名模式列表
 * @returns {string|null} 文件内容
 */
function findFileByPattern(files, patterns) {
  for (const pattern of patterns) {
    // 精确匹配
    for (const [path, content] of Object.entries(files)) {
      if (path === pattern || path.endsWith('/' + pattern) || path === './' + pattern) {
        return content;
      }
    }
    // 文件名匹配（pattern 可能带路径，只比较文件名）
    const patternFileName = pattern.split('/').pop();
    for (const [path, content] of Object.entries(files)) {
      if (path.split('/').pop() === patternFileName) {
        return content;
      }
    }
    // 包含匹配
    for (const [path, content] of Object.entries(files)) {
      if (path.toLowerCase().includes(pattern.toLowerCase())) {
        return content;
      }
    }
  }
  return null;
}

// ============================================
// 导出模块接口
// ============================================

window.UATBundle = {
  createUATBundle,
  parseUATBundle,
  importMultipleFiles,
  readFileContent,
  detectMainConfigFile,
  detectPlatformFromFiles,
  getBundleStats,
  findFileByPattern
};