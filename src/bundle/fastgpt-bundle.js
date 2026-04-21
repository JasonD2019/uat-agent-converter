/**
 * UAT FastGPT Bundle 管理器 - FastGPT Bundle Manager
 * 专门处理 FastGPT AI Agent 的 JSON 配置包导入导出
 *
 * FastGPT 配置结构：
 * 项目导出包/
 * ├── fastgpt.json              # 主配置JSON
 * ├── workflow/
 * │   ├── nodes.json            # 节点定义
 * │   ├── edges.json            # 连接关系
 * │   └── variables.json        # 流程变量
 * ├── knowledge/
 * │   ├── datasets.json         # 数据集引用
 * │   └── retrieval_config.json # 检索参数
 * ├── prompts/
 * │   ├── system_prompt.json    # 系统提示词
 * │   └── chat_config.json      # 对话配置
 * ├── app/
 * │   ├── appConfig.json        # 应用设置
 * │   └── uiConfig.json         # UI界面
 * ├── model/
 * │   ├── modelConfig.json      # 主模型
 * │   └── fallback.json         # 降级模型
 * ├── .env.example
 * └── README.md
 */

// ============================================
// FastGPT Bundle 创建（导出）
// ============================================

async function createFastGPTBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "FastGPT-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainConfig: "fastgpt.json",
      workflowDir: "workflow/",
      knowledgeDir: "knowledge/",
      promptsDir: "prompts/",
      appDir: "app/",
      modelDir: "model/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - FastGPT Bundle"
    },
    notes: {
      knowledgeBase: "知识库仅保留ID引用，需在FastGPT平台重新关联",
      workflow: "工作流节点完整导出，包含nodes/edges数组",
      fallback: "降级模型链已配置"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. fastgpt.json - 主配置
  const fastgptJSON = encodeFastGPTMainJSON(schema);
  zip.file("fastgpt.json", fastgptJSON);

  // 3. workflow/ 目录
  const workflowFolder = zip.folder("workflow");
  workflowFolder.file("nodes.json", encodeFastGPTNodesJSON(schema));
  workflowFolder.file("edges.json", encodeFastGPTEdgesJSON(schema));
  workflowFolder.file("variables.json", encodeFastGPTVariablesJSON(schema));

  // 4. knowledge/ 目录
  const knowledgeFolder = zip.folder("knowledge");
  knowledgeFolder.file("datasets.json", encodeFastGPTDatasetsJSON(schema));
  knowledgeFolder.file("retrieval_config.json", encodeFastGPTRetrievalConfig(schema));

  // 5. prompts/ 目录
  const promptsFolder = zip.folder("prompts");
  promptsFolder.file("system_prompt.json", encodeFastGPTSystemPromptJSON(schema));
  promptsFolder.file("chat_config.json", encodeFastGPTChatConfigJSON(schema));

  // 6. app/ 目录
  const appFolder = zip.folder("app");
  appFolder.file("appConfig.json", encodeFastGPTAppConfigJSON(schema));
  appFolder.file("uiConfig.json", encodeFastGPTUIConfigJSON(schema));

  // 7. model/ 目录
  const modelFolder = zip.folder("model");
  modelFolder.file("modelConfig.json", encodeFastGPTModelConfigJSON(schema));
  modelFolder.file("fallback.json", encodeFastGPTFallbackJSON(schema));

  // 8. .env.example
  const envExample = encodeFastGPTEnvExample(schema);
  zip.file(".env.example", envExample);

  // 9. README.md
  zip.file("README.md", encodeFastGPTReadme(schema));

  // 10. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// FastGPT JSON 编码器
// ============================================

function extractFastGPTProvider(modelName) {
  if (!modelName) return 'openai';
  const lower = modelName.toLowerCase();
  if (lower.includes('gpt')) return 'openai';
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gemini')) return 'google';
  if (lower.includes('deepseek')) return 'deepseek';
  if (lower.includes('qwen')) return 'aliyun';
  if (lower.includes('glm')) return 'zhipu';
  return 'openai';
}

function encodeFastGPTMainJSON(schema) {
  const config = {
    version: "4.8",
    appConfig: {
      name: schema.meta.name || 'FastGPT Agent',
      description: schema.meta.description || '',
      type: "workflow",
      icon: "🤖",
      modules: []
    },
    chatConfig: {
      systemPrompt: schema.identity.systemPrompt || 'You are a helpful AI assistant.',
      welcomeText: '你好，我是FastGPT AI助手',
      variables: schema.identity.promptVariables?.map(v => ({
        key: v.name,
        type: v.type || 'string',
        required: v.required || false
      })) || []
    },
    modelConfig: {
      model: schema.modelConfig.model || 'gpt-4',
      temperature: schema.modelConfig.temperature || 0.7,
      maxTokens: schema.modelConfig.maxTokens || 4096,
      provider: extractFastGPTProvider(schema.modelConfig.model)
    },
    workflow: {
      nodes: "@workflow/nodes.json",
      edges: "@workflow/edges.json"
    }
  };

  return JSON.stringify(config, null, 2);
}

function encodeFastGPTNodesJSON(schema) {
  const nodes = [];

  // Start Node
  nodes.push({
    id: "node_start",
    type: "start",
    position: { x: 100, y: 100 },
    data: {
      title: "开始",
      inputs: [
        {
          key: "userQuestion",
          type: "string",
          label: "用户问题",
          required: true
        }
      ]
    }
  });

  // Knowledge Search Node (if KB exists)
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    nodes.push({
      id: "node_knowledge_search",
      type: "knowledgeSearch",
      position: { x: 300, y: 200 },
      data: {
        title: "知识库检索",
        datasetIds: schema.memory.knowledgeBaseRef.map(kb => kb.id),
        searchLimit: 5,
        similarity: 0.5,
        inputs: [{ key: "query", type: "string" }],
        outputs: [{ key: "searchResult", type: "array" }]
      }
    });
  }

  // AI Chat Node
  nodes.push({
    id: "node_ai_chat",
    type: "aiChat",
    position: { x: 300, y: 100 },
    data: {
      title: "AI对话",
      model: schema.modelConfig.model || 'gpt-4',
      systemPrompt: "{{system_prompt}}",
      temperature: schema.modelConfig.temperature || 0.7,
      maxTokens: schema.modelConfig.maxTokens || 4096,
      inputs: [
        { key: "userQuestion", type: "string" },
        { key: "history", type: "array" },
        { key: "context", type: "string" }
      ],
      outputs: [{ key: "answer", type: "string" }]
    }
  });

  // Workflow Steps as Nodes
  if (schema.workflow.steps?.length > 0) {
    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      const nodeType = mapFastGPTNodeType(step.type);
      nodes.push({
        id: `node_step_${i}`,
        type: nodeType,
        position: { x: 500 + i * 200, y: 100 },
        data: {
          title: step.name,
          inputs: [{ key: "input", type: "string" }],
          outputs: [{ key: "output", type: "string" }],
          content: step.content?.substring(0, 200) || ''
        }
      });
    }
  }

  // End Node
  nodes.push({
    id: "node_end",
    type: "end",
    position: { x: 700, y: 100 },
    data: {
      title: "结束",
      outputs: [{ key: "text", value: "{{node_ai_chat.answer}}" }]
    }
  });

  return JSON.stringify({ nodes }, null, 2);
}

function mapFastGPTNodeType(stepType) {
  const typeMap = {
    'prompt': 'aiChat',
    'task': 'codeRun',
    'api': 'httpRequest',
    'condition': 'ifElse',
    'tool': 'tool',
    'variable': 'variableUpdate'
  };
  return typeMap[stepType] || 'aiChat';
}

function encodeFastGPTEdgesJSON(schema) {
  const edges = [];

  // Start -> Knowledge Search (if KB exists)
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    edges.push({
      source: "node_start",
      target: "node_knowledge_search",
      sourceHandle: "output",
      targetHandle: "query"
    });
    edges.push({
      source: "node_knowledge_search",
      target: "node_ai_chat",
      sourceHandle: "searchResult",
      targetHandle: "context"
    });
  } else {
    // Start -> AI Chat directly
    edges.push({
      source: "node_start",
      target: "node_ai_chat",
      sourceHandle: "output",
      targetHandle: "userQuestion"
    });
  }

  // Workflow Step Edges
  if (schema.workflow.steps?.length > 0) {
    edges.push({
      source: "node_ai_chat",
      target: "node_step_0",
      sourceHandle: "answer",
      targetHandle: "input"
    });
    for (let i = 1; i < schema.workflow.steps.length; i++) {
      edges.push({
        source: `node_step_${i - 1}`,
        target: `node_step_${i}`,
        sourceHandle: "output",
        targetHandle: "input"
      });
    }
    edges.push({
      source: `node_step_${schema.workflow.steps.length - 1}`,
      target: "node_end",
      sourceHandle: "output",
      targetHandle: "text"
    });
  } else {
    edges.push({
      source: "node_ai_chat",
      target: "node_end",
      sourceHandle: "answer",
      targetHandle: "text"
    });
  }

  return JSON.stringify({ edges }, null, 2);
}

function encodeFastGPTVariablesJSON(schema) {
  const variables = {
    globalVariables: [],
    flowVariables: []
  };

  if (schema.identity.promptVariables?.length > 0) {
    variables.globalVariables = schema.identity.promptVariables.map(v => ({
      key: v.name,
      type: v.type || 'string',
      defaultValue: v.default || '',
      description: v.description || ''
    }));
  }

  return JSON.stringify(variables, null, 2);
}

function encodeFastGPTDatasetsJSON(schema) {
  const datasets = {
    datasets: [],
    note: "知识库内容不会导出，仅保留ID引用，需要在FastGPT平台重新创建或关联"
  };

  if (schema.memory.knowledgeBaseRef?.length > 0) {
    datasets.datasets = schema.memory.knowledgeBaseRef.map(kb => ({
      id: kb.id,
      name: kb.name,
      type: kb.type || 'external',
      description: kb.description || '',
      vectorModel: "text-embedding-3-small",
      searchConfig: {
        limit: 5,
        similarity: 0.5,
        mode: "embedding"
      }
    }));
  }

  return JSON.stringify(datasets, null, 2);
}

function encodeFastGPTRetrievalConfig(schema) {
  const config = {
    mode: "embedding",
    limit: 5,
    similarity: 0.5,
    quoteTemplate: "{{searchResult}}",
    emptyKnowledgePrompt: "知识库中没有找到相关内容，请直接回答用户问题。"
  };

  return JSON.stringify(config, null, 2);
}

function encodeFastGPTSystemPromptJSON(schema) {
  const promptConfig = {
    systemPrompt: schema.identity.systemPrompt || 'You are a helpful AI assistant.',
    quotePrompt: "从知识库检索到以下相关内容：\n{{searchResult}}\n\n请基于这些内容回答用户问题。",
    emptyKnowledgePrompt: "知识库中没有找到相关内容，请直接回答用户问题。"
  };

  return JSON.stringify(promptConfig, null, 2);
}

function encodeFastGPTChatConfigJSON(schema) {
  const config = {
    welcomeText: '你好，我是FastGPT AI助手，有什么可以帮助你的？',
    suggestedQuestions: ['查询项目文档', '分析数据', '生成报告'],
    inputPlaceholder: '请输入你的问题...',
    maxHistory: 20,
    showSource: true
  };

  return JSON.stringify(config, null, 2);
}

function encodeFastGPTAppConfigJSON(schema) {
  const config = {
    name: schema.meta.name || 'FastGPT Agent',
    description: schema.meta.description || '',
    type: "workflow",
    icon: "🤖",
    tags: schema.meta.tags || [],
    version: "1.0"
  };

  return JSON.stringify(config, null, 2);
}

function encodeFastGPTUIConfigJSON(schema) {
  const config = {
    name: schema.meta.name || 'FastGPT Agent',
    avatar: '🤖',
    intro: schema.meta.description || 'AI助手',
    theme: 'light',
    customCss: '',
    showRunStatus: true,
    showNodeDetail: false,
    showHistory: true,
    showKnowledgeSource: true
  };

  return JSON.stringify(config, null, 2);
}

function encodeFastGPTModelConfigJSON(schema) {
  const config = {
    provider: extractFastGPTProvider(schema.modelConfig.model),
    model: schema.modelConfig.model || 'gpt-4',
    parameters: {
      temperature: schema.modelConfig.temperature || 0.7,
      maxTokens: schema.modelConfig.maxTokens || 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    contextWindow: 8192,
    quoteTemplate: "{{searchResult}}",
    aiChatModel: {
      modelName: schema.modelConfig.model || 'gpt-4',
      customModel: false
    }
  };

  return JSON.stringify(config, null, 2);
}

function encodeFastGPTFallbackJSON(schema) {
  const fallback = {
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-3-haiku"
      },
      {
        provider: "deepseek",
        model: "deepseek-chat"
      }
    ],
    triggerConditions: {
      errorCodes: ["rate_limit", "timeout"],
      maxRetries: 3
    }
  };

  return JSON.stringify(fallback, null, 2);
}

function encodeFastGPTEnvExample(schema) {
  const provider = extractFastGPTProvider(schema.modelConfig.model);
  const lines = [];

  lines.push('# FastGPT Environment Variables');
  lines.push('# Copy to .env and fill in your API keys');
  lines.push('');

  if (provider === 'openai') {
    lines.push('OPENAI_API_KEY=sk-xxx');
    lines.push('OPENAI_BASE_URL=https://api.openai.com/v1');
  } else if (provider === 'anthropic') {
    lines.push('ANTHROPIC_API_KEY=sk-xxx');
  } else if (provider === 'deepseek') {
    lines.push('DEEPSEEK_API_KEY=sk-xxx');
    lines.push('DEEPSEEK_BASE_URL=https://api.deepseek.com/v1');
  } else if (provider === 'aliyun') {
    lines.push('ALIYUN_API_KEY=sk-xxx');
  } else if (provider === 'zhipu') {
    lines.push('ZHIPU_API_KEY=xxx');
  }

  lines.push('');
  lines.push('# FastGPT Platform Config');
  lines.push('FASTGPT_API_URL=https://fastgpt.in/api');
  lines.push('FASTGPT_API_KEY=xxx');

  return lines.join('\n');
}

function encodeFastGPTReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'FastGPT Agent'} - Bundle`);
  sections.push('');
  sections.push('FastGPT Agent JSON Workflow Bundle');
  sections.push('');

  sections.push('## Contents');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `fastgpt.json` | Main config |');
  sections.push('| `workflow/nodes.json` | Node definitions |');
  sections.push('| `workflow/edges.json` | Edge connections |');
  sections.push('| `knowledge/` | Dataset references |');
  sections.push('| `prompts/` | System prompt |');
  sections.push('| `app/` | App/UI settings |');
  sections.push('| `model/` | Model config + fallback |');
  sections.push('');

  sections.push('## Import Steps');
  sections.push('1. Import to FastGPT platform');
  sections.push('2. Re-associate knowledge datasets');
  sections.push('3. Configure API keys in .env');
  sections.push('4. Test workflow nodes');
  sections.push('');

  sections.push('## Node Types');
  sections.push('- `start` - Entry point');
  sections.push('- `aiChat` - LLM response');
  sections.push('- `knowledgeSearch` - Vector retrieval');
  sections.push('- `httpRequest` - API call');
  sections.push('- `codeRun` - Code execution');
  sections.push('- `ifElse` - Condition branch');
  sections.push('- `end` - Output endpoint');
  sections.push('');

  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// FastGPT Bundle 解析（导入）
// ============================================

async function parseFastGPTBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  const fastgptFile = zip.file("fastgpt.json");
  let fastgptJSON = '';
  if (fastgptFile) {
    fastgptJSON = await fastgptFile.async("string");
  }

  const nodesFile = zip.folder("workflow").file("nodes.json");
  let nodesJSON = '';
  if (nodesFile) {
    nodesJSON = await nodesFile.async("string");
  }

  const edgesFile = zip.folder("workflow").file("edges.json");
  let edgesJSON = '';
  if (edgesFile) {
    edgesJSON = await edgesFile.async("string");
  }

  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'fastgpt';
  schema.meta.name = manifest.agent?.name || 'FastGPT Agent';
  schema.meta.description = manifest.agent?.description || '';

  parseFastGPTMainJSON(fastgptJSON, schema);
  parseFastGPTNodesJSON(nodesJSON, schema);
  parseFastGPTEdgesJSON(edgesJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  const rawFiles = { fastgptJSON, nodesJSON, edgesJSON };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 FastGPT 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseFastGPTBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'fastgpt';

  // 查找并解析 fastgpt.json 主配置文件
  const fastgptJSON = findFileByPattern(extractedFiles, ['fastgpt.json', 'config.json']);
  if (fastgptJSON) {
    parseFastGPTMainJSON(fastgptJSON, schema);
  }

  // 查找并解析 workflow/nodes.json
  const nodesJSON = findFileByPattern(extractedFiles, [
    'workflow/nodes.json',
    'nodes.json'
  ]);
  if (nodesJSON) {
    parseFastGPTNodesJSON(nodesJSON, schema);
  }

  // 查找并解析 workflow/edges.json
  const edgesJSON = findFileByPattern(extractedFiles, [
    'workflow/edges.json',
    'edges.json'
  ]);
  if (edgesJSON) {
    parseFastGPTEdgesJSON(edgesJSON, schema);
  }

  // 查找并解析 workflow/variables.json
  const variablesJSON = findFileByPattern(extractedFiles, [
    'workflow/variables.json',
    'variables.json'
  ]);
  if (variablesJSON) {
    try {
      const variables = JSON.parse(variablesJSON);
      if (variables.globalVariables?.length > 0) {
        for (const v of variables.globalVariables) {
          schema.identity.promptVariables.push({
            name: v.key || v.name,
            type: v.type || 'string',
            default: v.defaultValue || v.default || '',
            description: v.description || ''
          });
        }
      }
    } catch (e) {
      console.warn('FastGPT variables parse warning:', e.message);
    }
  }

  // 查找并解析 knowledge/datasets.json
  const datasetsJSON = findFileByPattern(extractedFiles, [
    'knowledge/datasets.json',
    'knowledge_base/datasets.json',
    'datasets.json'
  ]);
  if (datasetsJSON) {
    try {
      const datasets = JSON.parse(datasetsJSON);
      if (datasets.datasets?.length > 0) {
        for (const ds of datasets.datasets) {
          schema.memory.knowledgeBaseRef.push({
            id: ds.id || '',
            name: ds.name || '',
            type: ds.type || 'external',
            description: ds.description || ''
          });
        }
      }
    } catch (e) {
      console.warn('FastGPT datasets parse warning:', e.message);
    }
  }

  // 查找并解析 prompts/system_prompt.json
  const systemPromptJSON = findFileByPattern(extractedFiles, [
    'prompts/system_prompt.json',
    'system_prompt.json'
  ]);
  if (systemPromptJSON) {
    try {
      const promptConfig = JSON.parse(systemPromptJSON);
      if (promptConfig.systemPrompt) {
        schema.identity.systemPrompt = promptConfig.systemPrompt;
      }
    } catch (e) {
      console.warn('FastGPT system prompt parse warning:', e.message);
    }
  }

  // 查找并解析 model/modelConfig.json
  const modelConfigJSON = findFileByPattern(extractedFiles, [
    'model/modelConfig.json',
    'model_config.json',
    'model.json'
  ]);
  if (modelConfigJSON) {
    try {
      const modelConfig = JSON.parse(modelConfigJSON);
      if (modelConfig.model) {
        schema.modelConfig.model = modelConfig.model;
      }
      if (modelConfig.parameters?.temperature) {
        schema.modelConfig.temperature = modelConfig.parameters.temperature;
      }
      if (modelConfig.parameters?.maxTokens) {
        schema.modelConfig.maxTokens = modelConfig.parameters.maxTokens;
      }
    } catch (e) {
      console.warn('FastGPT model config parse warning:', e.message);
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseFastGPTMainJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const config = JSON.parse(jsonText);

    if (config.appConfig?.name) {
      schema.meta.name = config.appConfig.name;
    }
    if (config.appConfig?.description) {
      schema.meta.description = config.appConfig.description;
    }
    if (config.chatConfig?.systemPrompt) {
      schema.identity.systemPrompt = config.chatConfig.systemPrompt;
    }
    if (config.modelConfig?.model) {
      schema.modelConfig.model = config.modelConfig.model;
    }
    if (config.modelConfig?.temperature) {
      schema.modelConfig.temperature = config.modelConfig.temperature;
    }
    if (config.modelConfig?.maxTokens) {
      schema.modelConfig.maxTokens = config.modelConfig.maxTokens;
    }
  } catch (e) {
    console.warn('FastGPT main JSON parse warning:', e.message);
  }
}

function parseFastGPTNodesJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const nodesConfig = JSON.parse(jsonText);

    if (nodesConfig.nodes?.length > 0) {
      for (const node of nodesConfig.nodes) {
        if (node.type !== 'start' && node.type !== 'end' && node.type !== 'aiChat') {
          const step = UATCore.createEmptyWorkflowStep();
          step.stepId = node.id;
          step.name = node.data?.title || node.id;
          step.type = reverseMapFastGPTNodeType(node.type);
          if (node.data?.content) {
            step.content = node.data.content;
          }
          schema.workflow.steps.push(step);
        }
      }
    }
  } catch (e) {
    console.warn('FastGPT nodes JSON parse warning:', e.message);
  }
}

function reverseMapFastGPTNodeType(nodeType) {
  const typeMap = {
    'aiChat': 'prompt',
    'codeRun': 'task',
    'httpRequest': 'api',
    'ifElse': 'condition',
    'tool': 'tool',
    'variableUpdate': 'variable',
    'knowledgeSearch': 'knowledge'
  };
  return typeMap[nodeType] || 'task';
}

function parseFastGPTEdgesJSON(jsonText, schema) {
  // Edges are implicitly handled through workflow.steps order
  // This function can be extended for complex edge parsing
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 FastGPT 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeFastGPTToFiles(schema) {
  return {
    'fastgpt.json': encodeFastGPTMainJSON(schema),
    'workflow/nodes.json': encodeFastGPTNodesJSON(schema),
    'workflow/edges.json': encodeFastGPTEdgesJSON(schema),
    'workflow/variables.json': encodeFastGPTVariablesJSON(schema),
    'knowledge/datasets.json': encodeFastGPTDatasetsJSON(schema),
    'knowledge/retrieval_config.json': encodeFastGPTRetrievalConfig(schema),
    'prompts/system_prompt.json': encodeFastGPTSystemPromptJSON(schema),
    'prompts/chat_config.json': encodeFastGPTChatConfigJSON(schema),
    'app/appConfig.json': encodeFastGPTAppConfigJSON(schema),
    'app/uiConfig.json': encodeFastGPTUIConfigJSON(schema),
    'model/modelConfig.json': encodeFastGPTModelConfigJSON(schema),
    'model/fallback.json': encodeFastGPTFallbackJSON(schema),
    '.env.example': encodeFastGPTEnvExample(schema),
    'README.md': encodeFastGPTReadme(schema)
  };
}

window.FastGPTBundle = {
  createFastGPTBundle,
  parseFastGPTBundle,
  parseFastGPTBundleFromFiles,
  extractFastGPTProvider,
  encodeFastGPTMainJSON,
  encodeFastGPTNodesJSON,
  encodeFastGPTEdgesJSON,
  encodeFastGPTVariablesJSON,
  encodeFastGPTDatasetsJSON,
  encodeFastGPTRetrievalConfig,
  encodeFastGPTSystemPromptJSON,
  encodeFastGPTChatConfigJSON,
  encodeFastGPTAppConfigJSON,
  encodeFastGPTUIConfigJSON,
  encodeFastGPTModelConfigJSON,
  encodeFastGPTFallbackJSON,
  encodeFastGPTEnvExample,
  encodeFastGPTReadme,
  encodeFastGPTToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FastGPTBundle;
}