/**
 * UAT 统一内核模型封装 v2.0 - Core Schema Engine
 * 模块4：全局唯一数据标准，支持完整工具和工作流配置
 */

// ============================================
// UAT-Schema v2.0 完整结构定义
// ============================================

const UAT_SCHEMA_TEMPLATE = {
  "$schema": "UAT-Agent-Schema/v2.0",
  meta: {
    agentId: "",
    name: "",
    description: "",
    author: "",
    createdAt: "",
    updatedAt: "",
    tags: [],
    version: "1.0",
    sourcePlatform: ""  // 来源平台
  },
  identity: {
    systemPrompt: "",
    role: "",
    personality: "",
    language: "zh-CN",
    responseStyle: "",
    constraints: [],
    outputRules: [],
    promptVariables: []  // 新增：Prompt模板变量
  },
  tools: {
    mcpServers: [],     // MCP工具服务器（完整配置）
    apiEndpoints: [],   // API工具端点（完整配置）
    functions: [],      // 内置函数
    permissionScope: "limited"
  },
  workflow: {
    mainLogic: "",
    steps: [],          // 工作流步骤（完整配置）
    triggerRules: [],   // 新增：触发规则
    exceptionHandle: "",
    terminateRule: ""
  },
  memory: {
    longTermMemory: "",
    userPreference: "",
    knowledgeBaseRef: [],  // 知识库引用（仅ID，不传递内容）
    sessionRetention: false,
    sessionMemory: {       // 新增：会话记忆配置
      enabled: true,
      maxMessages: 50
    }
  },
  modelConfig: {
    model: "",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    stream: true,
    advanced: {           // 新增：高级参数
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: []
    }
  }
};

// ============================================
// MCP Server 完整结构模板
// ============================================

const MCP_SERVER_TEMPLATE = {
  id: "",
  name: "",
  url: "",
  config: {
    transport: "stdio",    // stdio | http | websocket
    command: "",
    args: [],
    env: {},
    capabilities: []       // ["tools", "resources", "prompts"]
  },
  tools: [],               // 工具列表
  enabled: true
};

// ============================================
// API Endpoint 完整结构模板
// ============================================

const API_ENDPOINT_TEMPLATE = {
  id: "",
  name: "",
  method: "GET",          // GET | POST | PUT | DELETE
  url: "",
  headers: {},
  params: {},
  body: {},
  auth: {
    type: "none",         // none | bearer | basic | api_key | oauth2
    apiKey: "",
    token: ""
  },
  errorHandling: {
    retryCount: 3,
    retryDelay: 1000,
    fallbackAction: "skip"  // skip | abort | fallback
  },
  responseMapping: {
    successPath: "",
    errorPath: ""
  }
};

// ============================================
// Workflow Step 完整结构模板
// ============================================

const WORKFLOW_STEP_TEMPLATE = {
  stepId: "",
  name: "",
  type: "prompt",         // prompt | condition | loop | parallel | api | function | end
  content: "",
  conditions: [],         // 条件分支配置
  loopConfig: {           // 循环配置
    iterateOver: "",
    variableName: "item",
    maxIterations: 100,
    breakCondition: ""
  },
  parallelConfig: {       // 并行配置
    branches: [],
    mergeStrategy: "all"   // all | first | none
  },
  onError: {              // 错误处理
    action: "skip",       // skip | retry | abort | fallback
    retryCount: 0,
    fallbackStepId: ""
  },
  nextStepId: ""
};

// ============================================
// Condition 完整结构模板
// ============================================

const CONDITION_TEMPLATE = {
  variable: "",
  operator: "equals",     // equals | contains | gt | lt | empty | not_empty | default
  value: "",
  targetStepId: "",
  priority: 0
};

// ============================================
// Prompt Variable 结构模板
// ============================================

const PROMPT_VARIABLE_TEMPLATE = {
  name: "",
  type: "string",         // string | number | boolean | array | object
  default: "",
  description: ""
};

// ============================================
// 核心函数1：创建空白内核模板
// ============================================

function createEmptyUATSchema() {
  return JSON.parse(JSON.stringify(UAT_SCHEMA_TEMPLATE));
}

// ============================================
// 核心函数2：创建空白工具模板
// ============================================

function createEmptyMCPServer() {
  return JSON.parse(JSON.stringify(MCP_SERVER_TEMPLATE));
}

function createEmptyAPIEndpoint() {
  return JSON.parse(JSON.stringify(API_ENDPOINT_TEMPLATE));
}

function createEmptyWorkflowStep() {
  return JSON.parse(JSON.stringify(WORKFLOW_STEP_TEMPLATE));
}

function createEmptyCondition() {
  return JSON.parse(JSON.stringify(CONDITION_TEMPLATE));
}

// ============================================
// 核心函数3：自动补全缺失默认值
// ============================================

function fillSchemaDefaultValues(schema) {
  const defaults = createEmptyUATSchema();

  for (const layer of Object.keys(defaults)) {
    if (layer === "$schema") continue;

    if (!schema[layer]) {
      schema[layer] = defaults[layer];
    } else if (typeof defaults[layer] === 'object' && !Array.isArray(defaults[layer])) {
      for (const key of Object.keys(defaults[layer])) {
        if (schema[layer][key] === undefined || schema[layer][key] === null) {
          schema[layer][key] = defaults[layer][key];
        }
      }
    }
  }

  if (!schema["$schema"]) {
    schema["$schema"] = "UAT-Agent-Schema/v2.0";
  }

  return schema;
}

// ============================================
// 核心函数4：校验结构合法性
// ============================================

function checkSchemaValid(schema) {
  const requiredLayers = ['meta', 'identity', 'tools', 'workflow', 'memory', 'modelConfig'];

  for (const layer of requiredLayers) {
    if (!schema[layer] || typeof schema[layer] !== 'object') {
      console.warn(`Schema校验失败: 缺少或类型错误 - ${layer}`);
      return false;
    }
  }

  if (!Array.isArray(schema.meta.tags)) return false;
  if (!Array.isArray(schema.tools.mcpServers)) return false;
  if (!Array.isArray(schema.tools.apiEndpoints)) return false;
  if (!Array.isArray(schema.workflow.steps)) return false;
  if (!Array.isArray(schema.memory.knowledgeBaseRef)) return false;
  if (typeof schema.modelConfig.temperature !== 'number') return false;

  return true;
}

// ============================================
// 辅助函数：格式化 Schema
// ============================================

function formatSchemaJSON(schema) {
  return JSON.stringify(schema, null, 2);
}

function parseSchemaFromJSON(jsonString) {
  try {
    const schema = JSON.parse(jsonString);
    fillSchemaDefaultValues(schema);
    if (checkSchemaValid(schema)) return schema;
    return null;
  } catch (e) {
    console.warn('Schema JSON 解析失败:', e.message);
    return null;
  }
}

// ============================================
// 辅助函数：提取 Prompt 变量
// ============================================

function extractPromptVariables(text) {
  const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const variables = [];
  const seen = new Set();
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      variables.push({
        name: match[1],
        type: 'string',
        default: '',
        description: ''
      });
    }
  }

  return variables;
}

// ============================================
// 辅助函数：生成 UUID
// ============================================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// 辅助函数：YAML 字符串转义
// ============================================

function escapeYAMLString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

// ============================================
// 导出模块接口
// ============================================

window.UATCore = {
  createEmptyUATSchema,
  createEmptyMCPServer,
  createEmptyAPIEndpoint,
  createEmptyWorkflowStep,
  createEmptyCondition,
  fillSchemaDefaultValues,
  checkSchemaValid,
  formatSchemaJSON,
  parseSchemaFromJSON,
  extractPromptVariables,
  generateUUID,
  escapeYAMLString,
  UAT_SCHEMA_TEMPLATE,
  MCP_SERVER_TEMPLATE,
  API_ENDPOINT_TEMPLATE,
  WORKFLOW_STEP_TEMPLATE
};