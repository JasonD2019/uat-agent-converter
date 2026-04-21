/**
 * UAT Flowise Bundle 管理器 - Flowise Bundle Manager
 * 专门处理 Flowise AI Agent 的可视化节点配置包导入导出
 *
 * Flowise 配置结构：
 * 项目导出包/
 * ├── flowise.json              # Flow主配置
 * ├── nodes/
 * │   ├── node_configs.json     # 节点定义
 * │   └── custom_nodes/         # 自定义节点
 * ├── edges.json                # 连接关系
 * ├── variables.json            # 流程变量
 * ├── credentials/
 * │   ├── credentials.json      # API凭据模板
 * │   └── credential_types.json # 凭据类型定义
 * ├── chains/
 * │   ├── llm_chain.json        # LLM Chain
 * │   └── retrieval_chain.json  # 检索 Chain
 * ├── ui/
 * │   ├── theme.json            # 主题设置
 * │   └── layout.json           # 布局位置
 * ├── .env.example
 * └── README.md
 */

// ============================================
// Flowise Bundle 创建（导出）
// ============================================

async function createFlowiseBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Flowise-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainConfig: "flowise.json",
      nodesDir: "nodes/",
      edgesFile: "edges.json",
      variablesFile: "variables.json",
      credentialsDir: "credentials/",
      chainsDir: "chains/",
      uiDir: "ui/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Flowise Bundle"
    },
    notes: {
      langchainEcosystem: "基于LangChain的可视化节点编排",
      credentials: "凭据导出为模板，不含实际密钥",
      vectorStore: "向量存储仅保留配置，需外部服务"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. flowise.json - 主配置
  const flowiseJSON = encodeFlowiseMainJSON(schema);
  zip.file("flowise.json", flowiseJSON);

  // 3. nodes/ 目录
  const nodesFolder = zip.folder("nodes");
  nodesFolder.file("node_configs.json", encodeFlowiseNodeConfigsJSON(schema));
  const customNodesFolder = nodesFolder.folder("custom_nodes");
  customNodesFolder.file("custom_node1.json", encodeFlowiseCustomNodeJSON(schema));

  // 4. edges.json
  zip.file("edges.json", encodeFlowiseEdgesJSON(schema));

  // 5. variables.json
  zip.file("variables.json", encodeFlowiseVariablesJSON(schema));

  // 6. credentials/ 目录
  const credentialsFolder = zip.folder("credentials");
  credentialsFolder.file("credentials.json", encodeFlowiseCredentialsJSON(schema));
  credentialsFolder.file("credential_types.json", encodeFlowiseCredentialTypesJSON(schema));

  // 7. chains/ 目录
  const chainsFolder = zip.folder("chains");
  chainsFolder.file("llm_chain.json", encodeFlowiseLLMChainJSON(schema));
  chainsFolder.file("retrieval_chain.json", encodeFlowiseRetrievalChainJSON(schema));

  // 8. ui/ 目录
  const uiFolder = zip.folder("ui");
  uiFolder.file("theme.json", encodeFlowiseThemeJSON(schema));
  uiFolder.file("layout.json", encodeFlowiseLayoutJSON(schema));

  // 9. .env.example
  const envExample = encodeFlowiseEnvExample(schema);
  zip.file(".env.example", envExample);

  // 10. README.md
  zip.file("README.md", encodeFlowiseReadme(schema));

  // 11. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Flowise 编码器
// ============================================

function extractFlowiseLLMType(modelName) {
  if (!modelName) return 'OpenAI';
  const lower = modelName.toLowerCase();
  if (lower.includes('gpt')) return 'OpenAI';
  if (lower.includes('claude')) return 'Anthropic';
  if (lower.includes('gemini')) return 'Google';
  if (lower.includes('deepseek')) return 'OpenAI'; // DeepSeek compatible with OpenAI API
  return 'OpenAI';
}

function encodeFlowiseMainJSON(schema) {
  const config = {
    name: schema.meta.name || 'Flowise Agent',
    description: schema.meta.description || 'AI chatbot built with Flowise',
    type: "ChatFlow",
    flowId: `flow_${Date.now()}`,
    flowName: "MainChatFlow",
    nodes: "@nodes/node_configs.json",
    edges: "@edges.json",
    variables: "@variables.json",
    credentials: "@credentials/credentials.json",
    settings: {
      chatflow: {
        model: schema.modelConfig.model || 'gpt-4',
        temperature: schema.modelConfig.temperature || 0.7,
        maxTokens: schema.modelConfig.maxTokens || 4096
      }
    }
  };

  return JSON.stringify(config, null, 2);
}

function encodeFlowiseNodeConfigsJSON(schema) {
  const nodes = [];

  // LLM Chain Node
  nodes.push({
    id: "node_llm",
    type: "chainLLM",
    position: { x: 100, y: 100 },
    data: {
      label: "LLM Chain",
      type: "LLMChain",
      inputs: {
        modelName: schema.modelConfig.model || 'gpt-4',
        temperature: schema.modelConfig.temperature || 0.7,
        promptTemplate: {
          type: "PromptTemplate",
          template: schema.identity.systemPrompt || 'You are a helpful AI assistant.\n\nUser question: {question}',
          inputVariables: ["question"]
        }
      },
      outputs: {
        text: "{{llm_output}}"
      }
    }
  });

  // Vector Store Node (if KB exists)
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    nodes.push({
      id: "node_vector",
      type: "vectorStoreRetriever",
      position: { x: 300, y: 100 },
      data: {
        label: "向量检索",
        type: "VectorStoreRetriever",
        inputs: {
          vectorStore: {
            type: "Pinecone",
            indexName: "knowledge_base",
            namespace: "docs"
          },
          embedding: {
            type: "OpenAIEmbeddings",
            modelName: "text-embedding-3-small"
          },
          searchK: 4,
          searchType: "similarity"
        }
      }
    });
  }

  // Conversational Retrieval QA Node
  nodes.push({
    id: "node_qa",
    type: "conversationalRetrievalQAChain",
    position: { x: 500, y: 100 },
    data: {
      label: "对话检索QA",
      type: "ConversationalRetrievalQAChain",
      inputs: {
        llm: "node_llm",
        retriever: schema.memory.knowledgeBaseRef?.length > 0 ? "node_vector" : null,
        returnSourceDocuments: true
      }
    }
  });

  // Tool Nodes
  if (schema.tools.functions?.length > 0) {
    for (let i = 0; i < schema.tools.functions.length; i++) {
      const fn = schema.tools.functions[i];
      nodes.push({
        id: `node_tool_${i}`,
        type: "CustomTool",
        position: { x: 500 + i * 200, y: 200 },
        data: {
          label: fn.name,
          type: "CustomTool",
          inputs: {
            name: fn.name,
            description: fn.description || fn.name,
            func: fn.code || ""
          }
        }
      });
    }
  }

  return JSON.stringify({ nodes }, null, 2);
}

function encodeFlowiseCustomNodeJSON(schema) {
  const customNode = {
    name: "CustomNode",
    type: "CustomNode",
    description: "Custom node for specific functionality",
    inputs: [
      { name: "input1", type: "string", required: true }
    ],
    outputs: [
      { name: "output1", type: "string" }
    ],
    code: "// Custom node implementation\n// Add your logic here"
  };

  return JSON.stringify(customNode, null, 2);
}

function encodeFlowiseEdgesJSON(schema) {
  const edges = [];

  // LLM -> QA
  edges.push({
    source: "node_llm",
    sourceHandle: "llm_output",
    target: "node_qa",
    targetHandle: "llm_input"
  });

  // Vector -> QA (if KB exists)
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    edges.push({
      source: "node_vector",
      sourceHandle: "retriever_output",
      target: "node_qa",
      targetHandle: "retriever_input"
    });
  }

  // Tool edges
  if (schema.tools.functions?.length > 0) {
    for (let i = 0; i < schema.tools.functions.length; i++) {
      edges.push({
        source: "node_qa",
        sourceHandle: "qa_output",
        target: `node_tool_${i}`,
        targetHandle: "tool_input"
      });
    }
  }

  return JSON.stringify({ edges }, null, 2);
}

function encodeFlowiseVariablesJSON(schema) {
  const variables = {
    globalVariables: [],
    flowVariables: []
  };

  if (schema.identity.promptVariables?.length > 0) {
    variables.globalVariables = schema.identity.promptVariables.map(v => ({
      name: v.name,
      type: v.type || 'string',
      defaultValue: v.default || '',
      description: v.description || ''
    }));
  }

  return JSON.stringify(variables, null, 2);
}

function encodeFlowiseCredentialsJSON(schema) {
  const credentials = {
    credentialTypes: [
      {
        name: "openAiApi",
        type: "OpenAI",
        requiredParams: ["apiKey"],
        apiKey: "$OPENAI_API_KEY"
      },
      {
        name: "anthropicApi",
        type: "Anthropic",
        requiredParams: ["apiKey"],
        apiKey: "$ANTHROPIC_API_KEY"
      },
      {
        name: "pineconeApi",
        type: "Pinecone",
        requiredParams: ["apiKey", "environment", "indexName"],
        apiKey: "$PINECONE_API_KEY",
        environment: "$PINECONE_ENVIRONMENT"
      }
    ],
    note: "Replace $ENV_VAR with actual values in .env file"
  };

  return JSON.stringify(credentials, null, 2);
}

function encodeFlowiseCredentialTypesJSON(schema) {
  const types = {
    types: [
      {
        name: "OpenAI",
        category: "LLM",
        fields: [
          { name: "apiKey", type: "password", required: true },
          { name: "baseUrl", type: "string", required: false }
        ]
      },
      {
        name: "Anthropic",
        category: "LLM",
        fields: [
          { name: "apiKey", type: "password", required: true }
        ]
      },
      {
        name: "Pinecone",
        category: "VectorStore",
        fields: [
          { name: "apiKey", type: "password", required: true },
          { name: "environment", type: "string", required: true },
          { name: "indexName", type: "string", required: true }
        ]
      },
      {
        name: "Weaviate",
        category: "VectorStore",
        fields: [
          { name: "url", type: "string", required: true },
          { name: "apiKey", type: "password", required: false }
        ]
      }
    ]
  };

  return JSON.stringify(types, null, 2);
}

function encodeFlowiseLLMChainJSON(schema) {
  const chain = {
    name: "LLMChain",
    type: "LLMChain",
    config: {
      llm: {
        type: extractFlowiseLLMType(schema.modelConfig.model),
        modelName: schema.modelConfig.model || 'gpt-4',
        temperature: schema.modelConfig.temperature || 0.7,
        maxTokens: schema.modelConfig.maxTokens || 4096
      },
      prompt: {
        type: "PromptTemplate",
        template: schema.identity.systemPrompt || 'You are a helpful AI assistant.\n\nTask: {task}\n\nContext: {context}',
        inputVariables: ["task", "context"]
      },
      memory: {
        type: "BufferMemory",
        memoryKey: "chat_history",
        maxTokens: 2000
      }
    }
  };

  return JSON.stringify(chain, null, 2);
}

function encodeFlowiseRetrievalChainJSON(schema) {
  const chain = {
    name: "RetrievalChain",
    type: "ConversationalRetrievalQAChain",
    config: {
      llm: "{{llm_chain}}",
      retriever: {
        type: "VectorStoreRetriever",
        vectorStore: {
          type: "Pinecone",
          config: {
            indexName: "knowledge_base",
            namespace: "docs"
          }
        },
        searchType: "similarity",
        searchK: 4
      },
      returnSourceDocuments: true,
      questionGeneratorChain: {
        type: "LLMChain",
        prompt: "Based on the following conversation and follow-up question, rewrite the follow-up question to be a standalone question.\n\nChat History: {chat_history}\nFollow-up Question: {question}"
      }
    }
  };

  return JSON.stringify(chain, null, 2);
}

function encodeFlowiseThemeJSON(schema) {
  const theme = {
    theme: "light",
    colors: {
      primary: "#1890ff",
      background: "#ffffff",
      nodeDefault: "#f5f5f5",
      nodeSelected: "#e6f7ff"
    },
    nodeStyles: {
      chain: { color: "#52c41a", icon: "🔗" },
      llm: { color: "#1890ff", icon: "🤖" },
      tool: { color: "#faad14", icon: "🔧" },
      vector: { color: "#722ed1", icon: "📚" },
      custom: { color: "#eb2f96", icon: "⚙️" }
    }
  };

  return JSON.stringify(theme, null, 2);
}

function encodeFlowiseLayoutJSON(schema) {
  const positions = [
    { nodeId: "node_llm", x: 100, y: 100 },
    { nodeId: "node_qa", x: 500, y: 100 }
  ];

  if (schema.memory.knowledgeBaseRef?.length > 0) {
    positions.push({ nodeId: "node_vector", x: 300, y: 100 });
  }

  if (schema.tools.functions?.length > 0) {
    for (let i = 0; i < schema.tools.functions.length; i++) {
      positions.push({ nodeId: `node_tool_${i}`, x: 500 + i * 200, y: 200 });
    }
  }

  const layout = {
    positions,
    zoom: 1,
    viewport: { x: 0, y: 0 }
  };

  return JSON.stringify(layout, null, 2);
}

function encodeFlowiseEnvExample(schema) {
  const lines = [];

  lines.push('# Flowise Environment Variables');
  lines.push('# Copy to .env and fill in your API keys');
  lines.push('');

  lines.push('# OpenAI API');
  lines.push('OPENAI_API_KEY=sk-xxx');
  lines.push('');

  lines.push('# Anthropic API (optional)');
  lines.push('ANTHROPIC_API_KEY=sk-xxx');
  lines.push('');

  lines.push('# Pinecone Vector Store');
  lines.push('PINECONE_API_KEY=xxx');
  lines.push('PINECONE_ENVIRONMENT=us-east-1');
  lines.push('PINECONE_INDEX_NAME=knowledge_base');
  lines.push('');

  lines.push('# Flowise Server');
  lines.push('FLOWISE_PORT=3000');
  lines.push('FLOWISE_USERNAME=admin');
  lines.push('FLOWISE_PASSWORD=password');

  return lines.join('\n');
}

function encodeFlowiseReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Flowise Agent'} - Bundle`);
  sections.push('');
  sections.push('Flowise Visual LangChain Flow Bundle');
  sections.push('');

  sections.push('## Contents');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `flowise.json` | Main flow config |');
  sections.push('| `nodes/node_configs.json` | Node definitions |');
  sections.push('| `edges.json` | Node connections |');
  sections.push('| `credentials/` | API credentials templates |');
  sections.push('| `chains/` | Chain configurations |');
  sections.push('| `ui/` | Theme and layout |');
  sections.push('');

  sections.push('## Import Steps');
  sections.push('1. Import to Flowise platform');
  sections.push('2. Configure credentials in Settings');
  sections.push('3. Fill in .env file');
  sections.push('4. Configure vector store if needed');
  sections.push('5. Test flow execution');
  sections.push('');

  sections.push('## Node Types');
  sections.push('- `LLMChain` - LLM response chain');
  sections.push('- `VectorStoreRetriever` - Vector search');
  sections.push('- `ConversationalRetrievalQAChain` - QA chain');
  sections.push('- `CustomTool` - Custom tools');
  sections.push('');

  sections.push('## LangChain Components');
  sections.push('- OpenAI / Anthropic LLMs');
  sections.push('- Pinecone / Weaviate / Chroma vectors');
  sections.push('- BufferMemory / ConversationMemory');
  sections.push('');

  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Flowise Bundle 解析（导入）
// ============================================

async function parseFlowiseBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  const flowiseFile = zip.file("flowise.json");
  let flowiseJSON = '';
  if (flowiseFile) {
    flowiseJSON = await flowiseFile.async("string");
  }

  const nodesFile = zip.folder("nodes").file("node_configs.json");
  let nodesJSON = '';
  if (nodesFile) {
    nodesJSON = await nodesFile.async("string");
  }

  const edgesFile = zip.file("edges.json");
  let edgesJSON = '';
  if (edgesFile) {
    edgesJSON = await edgesFile.async("string");
  }

  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'flowise';
  schema.meta.name = manifest.agent?.name || 'Flowise Agent';
  schema.meta.description = manifest.agent?.description || '';

  parseFlowiseMainJSON(flowiseJSON, schema);
  parseFlowiseNodesJSON(nodesJSON, schema);
  parseFlowiseEdgesJSON(edgesJSON, schema);

  UATCore.fillSchemaDefaultValues(schema);

  const rawFiles = { flowiseJSON, nodesJSON, edgesJSON };

  return { schema, manifest, rawFiles };
}

/**
 * 从提取的文件直接解析 Flowise 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseFlowiseBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'flowise';

  // 查找并解析 flowise.json 主配置文件
  const flowiseJSON = findFileByPattern(extractedFiles, ['flowise.json', 'config.json']);
  if (flowiseJSON) {
    parseFlowiseMainJSON(flowiseJSON, schema);
  }

  // 查找并解析 nodes/node_configs.json
  const nodesJSON = findFileByPattern(extractedFiles, [
    'nodes/node_configs.json',
    'node_configs.json',
    'nodes.json'
  ]);
  if (nodesJSON) {
    parseFlowiseNodesJSON(nodesJSON, schema);
  }

  // 查找并解析 edges.json
  const edgesJSON = findFileByPattern(extractedFiles, ['edges.json']);
  if (edgesJSON) {
    parseFlowiseEdgesJSON(edgesJSON, schema);
  }

  // 查找并解析 variables.json
  const variablesJSON = findFileByPattern(extractedFiles, ['variables.json']);
  if (variablesJSON) {
    try {
      const variables = JSON.parse(variablesJSON);
      if (variables.globalVariables?.length > 0) {
        for (const v of variables.globalVariables) {
          schema.identity.promptVariables.push({
            name: v.name,
            type: v.type || 'string',
            default: v.defaultValue || '',
            description: v.description || ''
          });
        }
      }
    } catch (e) {
      console.warn('Flowise variables parse warning:', e.message);
    }
  }

  // 查找并解析 chains/llm_chain.json
  const llmChainJSON = findFileByPattern(extractedFiles, [
    'chains/llm_chain.json',
    'llm_chain.json'
  ]);
  if (llmChainJSON) {
    try {
      const chain = JSON.parse(llmChainJSON);
      if (chain.config?.llm?.modelName) {
        schema.modelConfig.model = chain.config.llm.modelName;
      }
      if (chain.config?.llm?.temperature) {
        schema.modelConfig.temperature = chain.config.llm.temperature;
      }
      if (chain.config?.llm?.maxTokens) {
        schema.modelConfig.maxTokens = chain.config.llm.maxTokens;
      }
      if (chain.config?.prompt?.template) {
        schema.identity.systemPrompt = chain.config.prompt.template;
      }
    } catch (e) {
      console.warn('Flowise LLM chain parse warning:', e.message);
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseFlowiseMainJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const config = JSON.parse(jsonText);

    if (config.name) {
      schema.meta.name = config.name;
    }
    if (config.description) {
      schema.meta.description = config.description;
    }
    if (config.settings?.chatflow?.model) {
      schema.modelConfig.model = config.settings.chatflow.model;
    }
    if (config.settings?.chatflow?.temperature) {
      schema.modelConfig.temperature = config.settings.chatflow.temperature;
    }
    if (config.settings?.chatflow?.maxTokens) {
      schema.modelConfig.maxTokens = config.settings.chatflow.maxTokens;
    }
  } catch (e) {
    console.warn('Flowise main JSON parse warning:', e.message);
  }
}

function parseFlowiseNodesJSON(jsonText, schema) {
  if (!jsonText) return;

  try {
    const nodesConfig = JSON.parse(jsonText);

    if (nodesConfig.nodes?.length > 0) {
      for (const node of nodesConfig.nodes) {
        // Extract system prompt from LLMChain node
        if (node.type === 'chainLLM' && node.data?.inputs?.promptTemplate?.template) {
          schema.identity.systemPrompt = node.data.inputs.promptTemplate.template;
        }

        // Add custom tools
        if (node.type === 'CustomTool') {
          const fn = {
            name: node.data?.label || node.id,
            description: node.data?.inputs?.description || '',
            code: node.data?.inputs?.func || ''
          };
          schema.tools.functions.push(fn);
        }

        // Map other nodes to workflow steps
        if (node.type !== 'chainLLM' && node.type !== 'CustomTool') {
          const step = UATCore.createEmptyWorkflowStep();
          step.stepId = node.id;
          step.name = node.data?.label || node.id;
          step.type = mapFlowiseNodeTypeToStep(node.type);
          schema.workflow.steps.push(step);
        }
      }
    }
  } catch (e) {
    console.warn('Flowise nodes JSON parse warning:', e.message);
  }
}

function mapFlowiseNodeTypeToStep(nodeType) {
  const typeMap = {
    'vectorStoreRetriever': 'knowledge',
    'conversationalRetrievalQAChain': 'qa',
    'httpRequest': 'api',
    'code': 'code',
    'tool': 'tool'
  };
  return typeMap[nodeType] || 'task';
}

function parseFlowiseEdgesJSON(jsonText, schema) {
  // Edges are implicitly handled through workflow.steps order
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Flowise 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeFlowiseToFiles(schema) {
  return {
    'flowise.json': encodeFlowiseMainJSON(schema),
    'nodes/node_configs.json': encodeFlowiseNodeConfigsJSON(schema),
    'nodes/custom_node.json': encodeFlowiseCustomNodeJSON(schema),
    'edges.json': encodeFlowiseEdgesJSON(schema),
    'variables.json': encodeFlowiseVariablesJSON(schema),
    'credentials.json': encodeFlowiseCredentialsJSON(schema),
    'credentials/types.json': encodeFlowiseCredentialTypesJSON(schema),
    'chains/llm_chain.json': encodeFlowiseLLMChainJSON(schema),
    'chains/retrieval_chain.json': encodeFlowiseRetrievalChainJSON(schema),
    'ui/theme.json': encodeFlowiseThemeJSON(schema),
    'ui/layout.json': encodeFlowiseLayoutJSON(schema),
    '.env.example': encodeFlowiseEnvExample(schema),
    'README.md': encodeFlowiseReadme(schema)
  };
}

window.FlowiseBundle = {
  createFlowiseBundle,
  parseFlowiseBundle,
  parseFlowiseBundleFromFiles,
  extractFlowiseLLMType,
  encodeFlowiseMainJSON,
  encodeFlowiseNodeConfigsJSON,
  encodeFlowiseCustomNodeJSON,
  encodeFlowiseEdgesJSON,
  encodeFlowiseVariablesJSON,
  encodeFlowiseCredentialsJSON,
  encodeFlowiseCredentialTypesJSON,
  encodeFlowiseLLMChainJSON,
  encodeFlowiseRetrievalChainJSON,
  encodeFlowiseThemeJSON,
  encodeFlowiseLayoutJSON,
  encodeFlowiseEnvExample,
  encodeFlowiseReadme,
  encodeFlowiseToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FlowiseBundle;
}