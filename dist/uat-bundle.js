(function(root, factory) {
  // UMD wrapper - supports Node.js and browser
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.UATBundle = factory();
  }
})(typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this, function() {

'use strict';

// Create window object for Node.js compatibility
if (typeof window === 'undefined') {
  global.window = {};
}

// ============================================
// Global module aliases (for source compatibility)
// Source files reference these globals directly
// Note: Do NOT declare class/function names here - they are defined in source files
// ============================================
var UATCore;
var UATSchemaExtensions;
var UATDetector;
var UATParser;
var BundleBase;
var runParserPool;
var runEncoderPool;

// Platform Bundle aliases
var OpenClawBundle;
var HermesBundle;
var CursorBundle;
var WindsurfBundle;
var ClaudeCodeBundle;
var DifyBundle;
var FastGPTBundle;
var FlowiseBundle;
var CopilotBundle;
var CodexBundle;
var ZedBundle;


// ===== src/core/schema.js =====
/**
 * UAT 统一内核模型封装 v2.0 - Core Schema Engine
 * 模块4：全局唯一数据标准，支持完整工具和工作流配置
 */

// ============================================
// UAT-Schema v2.0 完整结构定义
// ============================================

const UAT_SCHEMA_TEMPLATE = {
  "$schema": "UAT-Agent-Schema/v2.0.1",
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
    longTermMemory: [],    // 改为数组格式，支持结构化记忆
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
    schema["$schema"] = "UAT-Agent-Schema/v2.0.1";
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

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATCore;
}
// Link global alias
UATCore = window.UATCore;

// ===== src/core/schema-extensions.js =====
/**
 * UAT Schema Extensions v2.1 - F系列优化扩展
 * 新增: memoryEntries, knowledgeBaseContent, skills 结构
 */

// ============================================
// Memory Entry 结构模板 (F2/F3)
// ============================================

const MEMORY_ENTRY_TEMPLATE = {
  id: "",                    // UUID
  type: "fact",              // fact | preference | skill | context | constraint
  category: "",              // 分类标签
  content: "",               // 记忆内容
  priority: 0,               // 优先级 0-10
  source: "user",            // user | system | learned | imported
  createdAt: "",             // ISO日期
  updatedAt: "",             // ISO日期
  expiresAt: "",             // 过期时间（可选）
  metadata: {                // 元数据
    confidence: 1.0,         // 置信度 0-1
    accessCount: 0,          // 访问次数
    lastAccessed: ""         // 最后访问时间
  }
};

// ============================================
// Memory Entry 类型定义
// ============================================

const MEMORY_TYPES = {
  fact: {
    description: "事实性知识，持久存储",
    examples: ["用户姓名", "项目信息", "系统配置"]
  },
  preference: {
    description: "用户偏好，影响行为",
    examples: ["代码风格", "输出语言", "响应长度"]
  },
  skill: {
    description: "技能知识，指导操作",
    examples: ["编程语言", "工具使用", "工作流程"]
  },
  context: {
    description: "上下文信息，会话级",
    examples: ["当前任务", "最近对话", "环境状态"]
  },
  constraint: {
    description: "约束规则，限制行为",
    examples: ["安全限制", "权限边界", "输出规则"]
  }
};

// ============================================
// Knowledge Base Content 结构模板 (F1)
// ============================================

const KNOWLEDGE_BASE_CONTENT_TEMPLATE = {
  datasets: [],              // 数据集列表
  documents: [],             // 文档列表
  qaPairs: [],               // Q&A对列表
  rules: [],                 // 规则列表
  embeddings: {              // 向量化配置
    enabled: false,
    model: "",
    dimension: 0,
    indexType: ""
  }
};

const KNOWLEDGE_DATASET_TEMPLATE = {
  id: "",
  name: "",
  type: "text",              // text | json | csv | markdown
  content: "",               // 文本内容或JSON数据
  source: "",                // 来源路径或URL
  createdAt: "",
  metadata: {
    size: 0,                 // 字节大小
    lineCount: 0,            // 行数
    encoding: "utf-8"
  }
};

const KNOWLEDGE_DOCUMENT_TEMPLATE = {
  id: "",
  title: "",
  content: "",
  source: "",
  summary: "",
  keywords: [],
  createdAt: ""
};

const QA_PAIR_TEMPLATE = {
  id: "",
  question: "",
  answer: "",
  category: "",
  confidence: 1.0
};

const KNOWLEDGE_RULE_TEMPLATE = {
  id: "",
  name: "",
  condition: "",            // 触发条件
  action: "",                // 执行动作
  priority: 0,
  enabled: true
};

// ============================================
// Skills Layer 结构模板 (F4)
// ============================================

const SKILLS_LAYER_TEMPLATE = {
  skills: [],                // 技能列表
  capabilities: [],          // 能力声明
  specializations: [],       // 专业化领域
  certifications: []         // 认证/资质
};

const SKILL_ENTRY_TEMPLATE = {
  id: "",
  name: "",
  category: "",              // programming | analysis | communication | tool | domain
  level: "intermediate",      // beginner | intermediate | advanced | expert
  description: "",
  examples: [],              // 示例场景
  dependencies: [],          // 依赖的其他技能
  usagePatterns: [],         // 使用模式
  learnedFrom: "",           // 学习来源
  verifiedAt: ""             // 验证时间
};

const CAPABILITY_TEMPLATE = {
  id: "",
  name: "",
  description: "",
  enabled: true,
  conditions: []             // 启用条件
};

const SPECIALIZATION_TEMPLATE = {
  id: "",
  domain: "",                // 领域名称
  expertiseLevel: 0,         // 专业程度 0-100
  keywords: [],
  relatedSkills: []
};

// ============================================
// 创建函数
// ============================================

function createEmptyMemoryEntry() {
  return JSON.parse(JSON.stringify(MEMORY_ENTRY_TEMPLATE));
}

function createEmptyKnowledgeBaseContent() {
  return JSON.parse(JSON.stringify(KNOWLEDGE_BASE_CONTENT_TEMPLATE));
}

function createEmptyKnowledgeDataset() {
  return JSON.parse(JSON.stringify(KNOWLEDGE_DATASET_TEMPLATE));
}

function createEmptyKnowledgeDocument() {
  return JSON.parse(JSON.stringify(KNOWLEDGE_DOCUMENT_TEMPLATE));
}

function createEmptyQAPair() {
  return JSON.parse(JSON.stringify(QA_PAIR_TEMPLATE));
}

function createEmptyKnowledgeRule() {
  return JSON.parse(JSON.stringify(KNOWLEDGE_RULE_TEMPLATE));
}

function createEmptySkillsLayer() {
  return JSON.parse(JSON.stringify(SKILLS_LAYER_TEMPLATE));
}

function createEmptySkillEntry() {
  return JSON.parse(JSON.stringify(SKILL_ENTRY_TEMPLATE));
}

function createEmptyCapability() {
  return JSON.parse(JSON.stringify(CAPABILITY_TEMPLATE));
}

function createEmptySpecialization() {
  return JSON.parse(JSON.stringify(SPECIALIZATION_TEMPLATE));
}

// ============================================
// Schema 扩展合并函数
// ============================================

function extendSchemaWithMemoryEntries(schema) {
  if (!schema.memory) schema.memory = {};

  // 初始化 memoryEntries 数组
  if (!schema.memory.memoryEntries) {
    schema.memory.memoryEntries = [];
  }

  // 迁移旧格式 longTermMemory 到新格式
  if (schema.memory.longTermMemory) {
    if (typeof schema.memory.longTermMemory === 'string' && schema.memory.longTermMemory.trim()) {
      // 字符串格式 -> 转换为单个 memoryEntry
      const entry = createEmptyMemoryEntry();
      entry.id = UATCore.generateUUID();
      entry.type = 'fact';
      entry.content = schema.memory.longTermMemory;
      entry.source = 'imported';
      entry.createdAt = new Date().toISOString();
      schema.memory.memoryEntries.push(entry);
    } else if (Array.isArray(schema.memory.longTermMemory)) {
      // 数组格式 -> 转换每个元素
      schema.memory.longTermMemory.forEach(item => {
        if (typeof item === 'string' && item.trim()) {
          const entry = createEmptyMemoryEntry();
          entry.id = UATCore.generateUUID();
          entry.type = 'fact';
          entry.content = item;
          entry.source = 'imported';
          entry.createdAt = new Date().toISOString();
          schema.memory.memoryEntries.push(entry);
        } else if (typeof item === 'object') {
          // 已经是对象格式，直接合并
          if (!item.id) item.id = UATCore.generateUUID();
          schema.memory.memoryEntries.push(Object.assign(createEmptyMemoryEntry(), item));
        }
      });
    }
  }

  return schema;
}

function extendSchemaWithKnowledgeBase(schema) {
  if (!schema.memory) schema.memory = {};

  // 初始化 knowledgeBaseContent
  if (!schema.memory.knowledgeBaseContent) {
    schema.memory.knowledgeBaseContent = createEmptyKnowledgeBaseContent();
  }

  return schema;
}

function extendSchemaWithSkills(schema) {
  if (!schema.identity) schema.identity = {};

  // 初始化 skills layer
  if (!schema.identity.skills) {
    schema.identity.skills = createEmptySkillsLayer();
  }

  return schema;
}

function extendSchemaFull(schema) {
  extendSchemaWithMemoryEntries(schema);
  extendSchemaWithKnowledgeBase(schema);
  extendSchemaWithSkills(schema);
  return schema;
}

// ============================================
// 导出模块接口
// ============================================

window.UATSchemaExtensions = {
  // 模板
  MEMORY_ENTRY_TEMPLATE,
  MEMORY_TYPES,
  KNOWLEDGE_BASE_CONTENT_TEMPLATE,
  KNOWLEDGE_DATASET_TEMPLATE,
  KNOWLEDGE_DOCUMENT_TEMPLATE,
  QA_PAIR_TEMPLATE,
  KNOWLEDGE_RULE_TEMPLATE,
  SKILLS_LAYER_TEMPLATE,
  SKILL_ENTRY_TEMPLATE,
  CAPABILITY_TEMPLATE,
  SPECIALIZATION_TEMPLATE,

  // 创建函数
  createEmptyMemoryEntry,
  createEmptyKnowledgeBaseContent,
  createEmptyKnowledgeDataset,
  createEmptyKnowledgeDocument,
  createEmptyQAPair,
  createEmptyKnowledgeRule,
  createEmptySkillsLayer,
  createEmptySkillEntry,
  createEmptyCapability,
  createEmptySpecialization,

  // 扩展函数
  extendSchemaWithMemoryEntries,
  extendSchemaWithKnowledgeBase,
  extendSchemaWithSkills,
  extendSchemaFull
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATSchemaExtensions;
}
// Link global alias
UATSchemaExtensions = window.UATSchemaExtensions;

// ===== src/detector/platform-detector.js =====
/**
 * UAT 平台自动识别引擎 v2.0 - Platform Detector Extended
 * 模块3：支持更多平台：Cursor、Windsurf、Copilot、Codex、Zed、Hermes
 */

// ============================================
// 平台编码常量定义（扩展版）
// ============================================

const PLATFORM_CODES = {
  // 原有平台
  DIFY: 'dify',
  OPENCLAW: 'openclaw',
  CLAUDE: 'claude',
  FASTGPT: 'fastgpt',
  FLOWISE: 'flowise',
  PLAIN: 'plain',

  // 新增：通用AI编辑器平台
  CURSOR: 'cursor',
  WINDSURF: 'windsurf',
  COPILOT: 'copilot',
  CODEX: 'codex',
  ZED: 'zed',

  // 新增：完整Agent框架平台
  HERMES: 'hermes'
};

// ============================================
// 平台名称映射（扩展版）
// ============================================

const PLATFORM_NAMES = {
  'dify': 'Dify',
  'openclaw': 'OpenClaw',
  'claude': 'Claude Code',
  'fastgpt': 'FastGPT',
  'flowise': 'Flowise',
  'plain': '通用文本',

  'cursor': 'Cursor',
  'windsurf': 'Windsurf',
  'copilot': 'GitHub Copilot',
  'codex': 'Codex CLI',
  'zed': 'Zed Editor',

  'hermes': 'Hermes Agent'
};

// ============================================
// 平台文件扩展名映射
// ============================================

const PLATFORM_EXTENSIONS = {
  'dify': '.yml',
  'openclaw': '.md',
  'claude': '.md',
  'fastgpt': '.json',
  'flowise': '.json',
  'plain': '.txt',

  'cursor': '.cursorrules',
  'windsurf': '.windsurfrules',
  'copilot': '.md',
  'codex': '.md',
  'zed': '.md',

  'hermes': '.yaml'
};

// ============================================
// 平台特征文件名映射
// ============================================

const PLATFORM_FILENAME_MAP = {
  '.cursorrules': 'cursor',
  '.windsurfrules': 'windsurf',
  'copilot-instructions.md': 'copilot',
  'agents.md': 'codex',  // 需内容判断：codex/claude/hermes/openclaw
  'claude.md': 'claude',
  'hermes.yaml': 'hermes',
  '.hermes.yaml': 'hermes',
  'hermes.yml': 'hermes',
  '.hermes.yml': 'hermes',
  'openclaw.json': 'openclaw',
  'soul.md': 'openclaw',
  'identity.md': 'openclaw',
  'memory.md': 'openclaw',
  'heartbeat.md': 'openclaw',
  'tools.md': 'openclaw',
  'user.md': 'openclaw'
};

// ============================================
// 核心函数：自动识别平台类型（扩展版）
// ============================================

function detectPlatform(cleanText) {
  if (!cleanText || cleanText.length < 10) {
    return PLATFORM_CODES.PLAIN;
  }

  // 优先级 1：Dify
  if (isDifyFormat(cleanText)) {
    return PLATFORM_CODES.DIFY;
  }

  // 优先级 2：Hermes（新增）
  if (isHermesFormat(cleanText)) {
    return PLATFORM_CODES.HERMES;
  }

  // 优先级 3：OpenClaw
  if (isOpenClawFormat(cleanText)) {
    return PLATFORM_CODES.OPENCLAW;
  }

  // 优先级 4：Claude Code Skill
  if (isClaudeFormat(cleanText)) {
    return PLATFORM_CODES.CLAUDE;
  }

  // 优先级 5：Codex CLI（新增，类似Claude但有区别）
  if (isCodexFormat(cleanText)) {
    return PLATFORM_CODES.CODEX;
  }

  // 优先级 6：Flowise
  if (isFlowiseFormat(cleanText)) {
    return PLATFORM_CODES.FLOWISE;
  }

  // 优先级 7：FastGPT
  if (isFastGPTFormat(cleanText)) {
    return PLATFORM_CODES.FASTGPT;
  }

  // 优先级 8：规则型平台（新增）
  // Cursor/Windsurf 优先于 Copilot，因为它们有更具体的格式特征
  if (isCursorFormat(cleanText)) {
    return PLATFORM_CODES.CURSOR;
  }

  if (isWindsurfFormat(cleanText)) {
    return PLATFORM_CODES.WINDSURF;
  }

  if (isCopilotFormat(cleanText)) {
    return PLATFORM_CODES.COPILOT;
  }

  if (isZedFormat(cleanText)) {
    return PLATFORM_CODES.ZED;
  }

  // 兜底：通用文本
  return PLATFORM_CODES.PLAIN;
}

// ============================================
// 根据文件名检测平台（更可靠）
// ============================================

function detectPlatformByFilename(filename, content) {
  const lowerName = filename.toLowerCase();

  // ============================================
  // 前置：文件名包含平台名称关键词快速识别（无需内容校验）
  // ============================================

  const PLATFORM_NAME_KEYWORDS = [
    // 按优先级排序（避免冲突，如 claude 可能包含在其他名称中）
    'openclaw',
    'fastgpt',
    'flowise',
    'dify',
    'hermes',
    'cursor',
    'windsurf',
    'copilot',
    'codex',
    'zed',
    'claude',
    'windsurfrules',  // 特殊：优先于 windsurf
    'cursorrules'     // 特殊：优先于 cursor
  ];

  // 检查文件名是否包含平台关键词
  for (const keyword of PLATFORM_NAME_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      // 映射关键词到平台代码
      const keywordToPlatform = {
        'openclaw': 'openclaw',
        'fastgpt': 'fastgpt',
        'flowise': 'flowise',
        'dify': 'dify',
        'hermes': 'hermes',
        'cursor': 'cursor',
        'cursorrules': 'cursor',
        'windsurf': 'windsurf',
        'windsurfrules': 'windsurf',
        'copilot': 'copilot',
        'codex': 'codex',
        'zed': 'zed',
        'claude': 'claude'
      };
      return keywordToPlatform[keyword];
    }
  }

  // ============================================
  // 原有逻辑：需要内容判断的情况
  // ============================================

  // 明确文件名映射（需要内容辅助判断）
  for (const [pattern, platform] of Object.entries(PLATFORM_FILENAME_MAP)) {
    if (lowerName === pattern || lowerName.endsWith(pattern)) {
      // 特殊处理：agents.md 需内容判断
      if (pattern === 'agents.md') {
        if (content.includes('mcpServers:')) return 'claude';
        if (content.includes('hermes_version:')) return 'hermes';
        if (content.includes('# Identity') || content.includes('# Soul') || content.includes('# Skill')) return 'openclaw';
        if (content.includes('Identity:') || content.includes('Soul:') || content.includes('Skill:')) return 'openclaw';
        return 'codex';
      }
      return platform;
    }
  }

  // 扩展名判断
  if (lowerName.endsWith('.cursorrules')) return 'cursor';
  if (lowerName.endsWith('.windsurfrules')) return 'windsurf';
  if (lowerName.endsWith('.hermes.yaml') || lowerName.endsWith('.hermes.yml')) return 'hermes';

  // YAML 文件
  if (lowerName.endsWith('.yml') || lowerName.endsWith('.yaml')) {
    if (content.includes('hermes_version:')) return 'hermes';
    if (content.includes('dify_version:')) return 'dify';
    return 'dify'; // 默认
  }

  // JSON 文件
  if (lowerName.endsWith('.json')) {
    // OpenClaw 特征检测（优先）
    if (content.includes('gateway') && content.includes('agents')) return 'openclaw';
    if (content.includes('"skills"') && content.includes('"heartbeat"')) return 'openclaw';
    if (content.includes('memorySearch') && content.includes('sandbox')) return 'openclaw';

    // FastGPT / Flowise 特征
    if (content.includes('appConfig')) return 'fastgpt';
    if (content.includes('"nodes"') && content.includes('"edges"')) {
      if (content.includes('flowise') || content.includes('position')) return 'flowise';
      return 'fastgpt';
    }
    return 'fastgpt';
  }

  // Markdown 文件
  if (lowerName.endsWith('.md')) {
    if (content.startsWith('---')) {
      if (content.includes('mcpServers:')) return 'claude';
      if (content.includes('tools:') && !content.includes('mcpServers:')) return 'codex';
      return 'claude';
    }
    if (content.includes('Copilot') || lowerName.includes('copilot')) return 'copilot';
    return 'openclaw';
  }

  // 内容判断
  return detectPlatform(content);
}

// ============================================
// 各平台识别规则函数（原有）
// ============================================

function isDifyFormat(text) {
  const difyKeywords = ['dify_version', 'app:', 'workflow:', 'graph:', 'nodes:', 'edges:'];
  for (const keyword of difyKeywords) {
    if (text.includes(keyword)) return true;
  }
  return false;
}

function isOpenClawFormat(text) {
  const openclawKeywords = ['Identity:', 'Soul:', 'Skill:', '# Identity', '# Soul', '# Skill'];
  for (const keyword of openclawKeywords) {
    if (text.includes(keyword)) return true;
  }
  return false;
}

function isClaudeFormat(text) {
  // Claude Skill 特征：文件开头 --- yaml 头部元信息
  if (/^---[\s]*\n/.test(text)) {
    const headerEnd = text.indexOf('---', 3);
    if (headerEnd > 0) {
      const header = text.slice(3, headerEnd);
      // 检查头部是否包含 name/description 等配置
      if (header.includes('name:') || header.includes('description:')) {
        // 有 mcpServers → Claude（完整版）
        if (header.includes('mcpServers:')) return true;
        // 有 model → Claude
        if (header.includes('model:')) return true;
        // 仅 name/description，无 tools → Claude（简化版）
        if (!header.includes('tools:')) return true;
      }
    }
  }
  return false;
}

function isFastGPTFormat(text) {
  if (!text.startsWith('{') && !text.includes('{"')) return false;
  const fastgptKeywords = ['appConfig', 'chatConfig', 'modelConfig', '"nodes":', '"workflow":'];
  for (const keyword of fastgptKeywords) {
    if (text.includes(keyword)) return true;
  }
  return false;
}

function isFlowiseFormat(text) {
  if (!text.startsWith('{')) return false;
  const flowiseKeywords = ['flowId', 'flowise', 'chatflows', 'flowName'];
  for (const keyword of flowiseKeywords) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) return true;
  }
  const hasNodesAndEdges = text.includes('"nodes"') && text.includes('"edges"');
  if (hasNodesAndEdges && text.includes('position')) return true;
  if (hasNodesAndEdges && !text.includes('appConfig') && !text.includes('chatConfig')) return true;
  return false;
}

// ============================================
// 新增平台识别规则函数
// ============================================

function isHermesFormat(text) {
  // Hermes 特征：hermes_version 头部
  if (text.includes('hermes_version:')) return true;

  // Hermes 特征：agent 块 + tools.functions 或 tools.mcp_servers
  if (text.includes('agent:') && (text.includes('tools:') || text.includes('functions:'))) {
    return true;
  }

  // Hermes YAML 结构：prompt.system
  if (text.includes('prompt:') && text.includes('system:')) return true;

  return false;
}

function isCodexFormat(text) {
  // Codex CLI AGENTS.md 格式
  if (text.startsWith('---')) {
    const headerEnd = text.indexOf('---', 3);
    if (headerEnd > 0) {
      const header = text.slice(3, headerEnd);
      // Codex 有 tools 但无 mcpServers
      if (header.includes('tools:') && !header.includes('mcpServers:')) {
        return true;
      }
    }
  }
  return false;
}

function isCursorFormat(text) {
  // .cursorrules 格式：纯文本规则，无YAML/JSON结构
  if (text.startsWith('{') || text.startsWith('---')) return false;

  // 有 Markdown 标题和列表规则
  const hasHeadings = /^#\s+.+/m.test(text);
  const hasRules = /^-\s+.+/m.test(text);

  return hasHeadings && hasRules && !text.match(/^\w+:\s*['"]?/m);
}

function isWindsurfFormat(text) {
  // .windsurfrules 格式：与 Cursor 类似
  return isCursorFormat(text);
}

function isCopilotFormat(text) {
  // GitHub Copilot instructions：Markdown，无 YAML 头
  if (text.startsWith('---') || text.startsWith('{')) return false;

  // 包含 Copilot 相关关键词
  if (text.toLowerCase().includes('copilot')) return true;

  // Markdown 结构
  const hasMarkdown = /^#\s+.+/m.test(text) && /^##\s+.+/m.test(text);
  return hasMarkdown;
}

function isZedFormat(text) {
  // Zed rules.md：简单 Markdown
  if (text.startsWith('---') || text.startsWith('{')) return false;
  return /^#\s+.+/m.test(text);
}

// ============================================
// 辅助函数：获取平台显示名称
// ============================================

function getPlatformDisplayName(platformCode) {
  return PLATFORM_NAMES[platformCode] || '未知平台';
}

function getPlatformExtension(platformCode) {
  return PLATFORM_EXTENSIONS[platformCode] || '.txt';
}

// ============================================
// 导出模块接口
// ============================================

window.UATDetector = {
  detectPlatform,
  detectPlatformByFilename,
  getPlatformDisplayName,
  getPlatformExtension,
  PLATFORM_CODES,
  PLATFORM_NAMES,
  PLATFORM_EXTENSIONS,
  PLATFORM_FILENAME_MAP
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATDetector;
}
// Link global alias
UATDetector = window.UATDetector;

// ===== src/parser/parser-pool.js =====
/**
 * UAT 多平台解析器集群 v2.1 - Parser Pool Enhanced
 * 模块5：各平台原始配置 → UAT-Schema v2.0 完整解析
 * F系列优化：集成 memory-parser.js，支持 memoryEntries 结构
 */

// ============================================
// 加载扩展模块（Node.js/浏览器兼容）
// ============================================

// 确保 UATCore 已加载
if (typeof window !== 'undefined' && window.UATCore) {
  // 浏览器环境已加载
} else if (typeof UATCore === 'undefined') {
  // Node.js 环境尝试加载
  
}

// ============================================
// 解析器统一调度器
// ============================================

function runParserPool(cleanText, platformCode) {
  const schema = UATCore.createEmptyUATSchema();

  switch (platformCode) {
    case 'dify':
      parseDifyDSLEnhanced(cleanText, schema);
      break;
    case 'openclaw':
      parseOpenClawEnhanced(cleanText, schema);
      break;
    case 'claude':
      parseClaudeSkillEnhanced(cleanText, schema);
      break;
    case 'fastgpt':
      parseFastGPTEnhanced(cleanText, schema);
      break;
    case 'flowise':
      parseFlowiseEnhanced(cleanText, schema);
      break;
    // 新增平台
    case 'hermes':
      parseHermesYAML(cleanText, schema);
      break;
    case 'cursor':
      parseCursorRules(cleanText, schema);
      break;
    case 'windsurf':
      parseWindsurfRules(cleanText, schema);
      break;
    case 'copilot':
      parseCopilotInstructions(cleanText, schema);
      break;
    case 'codex':
      parseCodexAgents(cleanText, schema);
      break;
    case 'zed':
      parseZedRules(cleanText, schema);
      break;
    default:
      parsePlainText(cleanText, schema);
  }

  UATCore.fillSchemaDefaultValues(schema);

  // F系列优化：扩展 Schema 并迁移记忆
  if (typeof UATSchemaExtensions !== 'undefined') {
    UATSchemaExtensions.extendSchemaFull(schema);
  }

  // F系列优化：使用统一记忆解析器补充 memoryEntries
  if (typeof UATMemoryParser !== 'undefined' && schema.memory.memoryEntries.length === 0) {
    const entries = UATMemoryParser.parseMemoryToEntries(cleanText, platformCode, schema);
    if (entries.length > 0) {
      schema.memory.memoryEntries = entries;
    }
  }

  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('解析结果结构不合法');
  }

  return schema;
}

// ============================================
// 解析器1：Dify DSL YAML 解析器（增强版）
// ============================================

function parseDifyDSLEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'dify';

  try {
    // 基础信息 - 支持 app.description 和 workflow.name
    const appDescMatch = text.match(/app:\s*\n[\s\S]*?description:\s*["']([^"']+)["']/);
    if (appDescMatch) {
      schema.meta.description = appDescMatch[1];
    }

    // Workflow name 作为 Agent 名称 - 支持无引号格式
    const workflowNameMatch = text.match(/workflow:\s*\n\s*name:\s*["']?([^"'\n]+)["']?/);
    if (workflowNameMatch) {
      schema.meta.name = workflowNameMatch[1].trim();
    } else {
      schema.meta.name = extractYAMLValue(text, 'name') || 'Dify Agent';
    }

    // Agent Identity 块
    const agentIdentityMatch = text.match(/agent_identity:\s*\n([\s\S]*?)(?=\n\w+:|\n\n|$)/);
    if (agentIdentityMatch) {
      const agentBlock = agentIdentityMatch[1];
      const agentName = extractYAMLValueFromBlock(agentBlock, 'name');
      if (agentName) schema.meta.name = agentName;
      schema.identity.role = extractYAMLValueFromBlock(agentBlock, 'role') || '';

      // Personality 作为约束
      const personalityMatch = agentBlock.match(/personality:\s*["']([^"']+)["']/);
      if (personalityMatch) {
        schema.identity.constraints.push(`性格特征: ${personalityMatch[1]}`);
      }
    }

    // 系统提示词 - 从节点中提取
    schema.identity.systemPrompt = extractDifySystemPrompt(text);

    // 模型配置 - 支持嵌套 model 块
    const modelMatch = text.match(/model:\s*\n[\s\S]*?name:\s*["']([^"']+)["']/);
    if (modelMatch) {
      schema.modelConfig.model = modelMatch[1];
    } else {
      schema.modelConfig.model = extractYAMLValue(text, 'model') || 'gpt-4';
    }

    const tempMatch = text.match(/temperature:\s*([\d.]+)/);
    if (tempMatch) {
      schema.modelConfig.temperature = parseFloat(tempMatch[1]);
    }

    const maxTokensMatch = text.match(/max_tokens:\s*(\d+)/);
    if (maxTokensMatch) {
      schema.modelConfig.maxTokens = parseInt(maxTokensMatch[1]);
    }

    // 解析工作流节点
    parseDifyWorkflowNodes(text, schema);

    // 解析知识库引用 - 支持 knowledge_base.datasets 格式
    parseDifyKnowledgeBaseEnhanced(text, schema);

    // 解析工具配置
    parseDifyTools(text, schema);

    // 解析 Memory 块
    parseDifyMemory(text, schema);

  } catch (error) {
    console.warn('Dify 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

function parseDifyWorkflowNodes(text, schema) {
  const nodesMatch = text.match(/nodes:\s*\n([\s\S]*?)(?=\n\s*edges:|\n[a-zA-Z_]|\n\n|$)/);
  const edgesMatch = text.match(/edges:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);

  if (!nodesMatch) return;

  const nodesBlock = nodesMatch[1];
  const edgesBlock = edgesMatch ? edgesMatch[1] : '';

  // 解析边映射
  const edgeMap = parseDifyEdges(edgesBlock);

  // 解析节点
  const nodeRegex = /-\s*id:\s*['"]?([^'":\n]+)['"]?\s*\n([\s\S]*?)(?=\n\s*-\s*id:|$)/g;
  let match;

  while ((match = nodeRegex.exec(nodesBlock)) !== null) {
    const nodeId = match[1].trim();
    const nodeBody = match[2];

    const nodeType = extractYAMLValueFromBlock(nodeBody, 'type') || '';
    const nodeTitle = extractYAMLValueFromBlock(nodeBody, 'title') || nodeId;

    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = nodeId;
    step.name = nodeTitle;
    step.type = mapDifyNodeType(nodeType);
    step.content = extractNodeContent(nodeBody, nodeType);
    step.nextStepId = edgeMap[nodeId]?.default || '';

    // 条件节点详情
    if (nodeType === 'if-else' || nodeType === 'question-classifier') {
      step.conditions = parseDifyConditionsFromNode(nodeBody, edgeMap[nodeId]);
    }

    // 循环节点详情
    if (nodeType === 'iteration') {
      step.loopConfig = {
        iterateOver: extractYAMLValueFromBlock(nodeBody, 'iter_variable') || '',
        variableName: extractYAMLValueFromBlock(nodeBody, 'item_variable') || 'item',
        maxIterations: parseInt(extractYAMLValueFromBlock(nodeBody, 'max_iterations')) || 100,
        breakCondition: extractYAMLValueFromBlock(nodeBody, 'break_condition') || ''
      };
      step.nextStepId = edgeMap[nodeId]?.iterationEnd || '';
    }

    // 错误处理
    const errorAction = extractYAMLValueFromBlock(nodeBody, 'action', 'error_handling:');
    if (errorAction) {
      step.onError = {
        action: errorAction,
        retryCount: parseInt(extractYAMLValueFromBlock(nodeBody, 'retry_count', 'error_handling:')) || 0,
        fallbackStepId: extractYAMLValueFromBlock(nodeBody, 'fallback_node', 'error_handling:') || ''
      };
    }

    schema.workflow.steps.push(step);
  }
}

function parseDifyEdges(edgesBlock) {
  const edgeMap = {};

  if (!edgesBlock) return edgeMap;

  const edgeRegex = /-\s*source:\s*['"]?([^'":\n]+)['"]?\s*\n\s*target:\s*['"]?([^'":\n]+)['"]?/g;
  let match;

  while ((match = edgeRegex.exec(edgesBlock)) !== null) {
    const source = match[1].trim();
    const target = match[2].trim();

    if (!edgeMap[source]) edgeMap[source] = {};
    edgeMap[source].default = target;
  }

  // 解析带 source_handle 的边（条件分支）
  const condEdgeRegex = /-\s*source:\s*['"]?([^'":\n]+)['"]?\s*\n\s*source_handle:\s*['"]?([^'":\n]+)['"]?\s*\n\s*target:\s*['"]?([^'":\n]+)['"]?/g;
  while ((match = condEdgeRegex.exec(edgesBlock)) !== null) {
    const source = match[1].trim();
    const handle = match[2].trim();
    const target = match[3].trim();

    if (!edgeMap[source]) edgeMap[source] = {};
    edgeMap[source][handle] = target;
  }

  return edgeMap;
}

function parseDifyConditionsFromNode(nodeBody, edgeMap) {
  const conditions = [];

  // 条件配置块
  const condMatch = nodeBody.match(/conditions:\s*\n([\s\S]*?)(?=\n\s*\w+:|\n\n|$)/);
  if (condMatch) {
    const condBlock = condMatch[1];
    const condItemRegex = /-\s*variable:\s*['"]?([^'":\n]+)['"]?\s*\n\s*operator:\s*['"]?([^'":\n]+)['"]?\s*\n\s*value:\s*['"]?([^'":\n]+)['"]?/g;
    let match;

    while ((match = condItemRegex.exec(condBlock)) !== null) {
      conditions.push({
        variable: match[1].trim(),
        operator: match[2].trim(),
        value: match[3].trim(),
        targetStepId: '',
        priority: 0
      });
    }
  }

  // 从 edge 映射获取 target
  if (edgeMap) {
    for (const cond of conditions) {
      if (edgeMap.true) cond.targetStepId = edgeMap.true;
    }
    // 默认分支
    if (edgeMap.false || edgeMap.default) {
      conditions.push({
        variable: '',
        operator: 'default',
        value: '',
        targetStepId: edgeMap.false || edgeMap.default,
        priority: -1
      });
    }
  }

  return conditions;
}

function parseDifyKnowledgeBase(text, schema) {
  const kbId = extractYAMLValue(text, 'knowledge_base_id');
  if (kbId) {
    schema.memory.knowledgeBaseRef.push({
      id: kbId,
      name: extractYAMLValue(text, 'knowledge_base_name') || 'Knowledge Base',
      platform: 'dify'
    });
  }

  // 多知识库
  const kbMatch = text.match(/knowledge_bases:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);
  if (kbMatch) {
    const kbBlock = kbMatch[1];
    const kbItemRegex = /-\s*id:\s*['"]?([^'":\n]+)['"]?\s*\n\s*name:\s*['"]?([^'":\n]+)['"]?/g;
    let match;

    while ((match = kbItemRegex.exec(kbBlock)) !== null) {
      schema.memory.knowledgeBaseRef.push({
        id: match[1].trim(),
        name: match[2].trim(),
        platform: 'dify'
      });
    }
  }
}

// 增强版知识库解析 - 支持 knowledge_base.datasets 格式
function parseDifyKnowledgeBaseEnhanced(text, schema) {
  // 先调用原有解析
  parseDifyKnowledgeBase(text, schema);

  // 新格式: knowledge_base.datasets
  const kbBlockMatch = text.match(/knowledge_base:\s*\n([\s\S]*?)(?=\n\w+:|\n\n|$)/);
  if (kbBlockMatch) {
    const kbBlock = kbBlockMatch[1];
    const datasetsMatch = kbBlock.match(/datasets:\s*\n([\s\S]*?)(?=\n\s*\w+:|\n\n|$)/);

    if (datasetsMatch) {
      const datasetsBlock = datasetsMatch[1];
      const dsRegex = /-\s*id:\s*["']([^"']+)["']\s*\n\s*name:\s*["']([^"']+)["']/g;
      let match;

      while ((match = dsRegex.exec(datasetsBlock)) !== null) {
        // 避免重复添加
        const existing = schema.memory.knowledgeBaseRef.find(kb => kb.id === match[1]);
        if (!existing) {
          schema.memory.knowledgeBaseRef.push({
            id: match[1].trim(),
            name: match[2].trim(),
            platform: 'dify'
          });
        }
      }
    }
  }
}

// Dify Memory 解析
function parseDifyMemory(text, schema) {
  const memoryMatch = text.match(/memory:\s*\n([\s\S]*?)(?=\n\w+:|\n\n|$)/);
  if (memoryMatch) {
    const memoryBlock = memoryMatch[1];

    // long_term 记忆列表
    const longTermMatch = memoryBlock.match(/long_term:\s*\n([\s\S]*?)(?=\n\s*\w+:|\n\n|$)/);
    if (longTermMatch) {
      const longTermBlock = longTermMatch[1];
      const itemRegex = /-\s*["']([^"']+)["']/g;
      let match;

      while ((match = itemRegex.exec(longTermBlock)) !== null) {
        schema.memory.longTermMemory.push({
          id: UATCore.generateUUID(),
          type: 'string',
          content: match[1].trim(),
          importance: 0.8
        });
      }
    }

    // user_preference
    const userPrefMatch = memoryBlock.match(/user_preference:\s*["']([^"']+)["']/);
    if (userPrefMatch) {
      schema.memory.longTermMemory.push({
        id: UATCore.generateUUID(),
        type: 'preference',
        content: userPrefMatch[1].trim(),
        importance: 0.9
      });
    }
  }
}

function parseDifyTools(text, schema) {
  // MCP 工具
  const mcpMatch = text.match(/mcp_servers:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);
  if (mcpMatch) {
    const mcpBlock = mcpMatch[1];
    const mcpItemRegex = /-\s*(?:name|id):\s*['"]?([^'":\n]+)['"]?\s*\n([\s\S]*?)(?=\n\s*-\s*|\n[a-zA-Z_]|\n\n|$)/g;
    let match;

    while ((match = mcpItemRegex.exec(mcpBlock)) !== null) {
      const name = match[1].trim();
      const configBlock = match[2];

      const mcp = UATCore.createEmptyMCPServer();
      mcp.id = name;
      mcp.name = name;
      mcp.url = extractYAMLValueFromBlock(configBlock, 'url') || '';
      mcp.config.command = extractYAMLValueFromBlock(configBlock, 'command') || '';

      schema.tools.mcpServers.push(mcp);
    }
  }

  // API 工具
  const apiMatch = text.match(/api_tools:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);
  if (apiMatch) {
    const apiBlock = apiMatch[1];
    const apiItemRegex = /-\s*id:\s*['"]?([^'":\n]+)['"]?\s*\n([\s\S]*?)(?=\n\s*-\s*|\n[a-zA-Z_]|\n\n|$)/g;
    let match;

    while ((match = apiItemRegex.exec(apiBlock)) !== null) {
      const id = match[1].trim();
      const configBlock = match[2];

      const api = UATCore.createEmptyAPIEndpoint();
      api.id = id;
      api.name = extractYAMLValueFromBlock(configBlock, 'name') || id;
      api.method = extractYAMLValueFromBlock(configBlock, 'method') || 'POST';
      api.url = extractYAMLValueFromBlock(configBlock, 'url') || '';

      schema.tools.apiEndpoints.push(api);
    }
  }
}

function mapDifyNodeType(difyType) {
  const typeMap = {
    'start': 'prompt',
    'end': 'end',
    'llm': 'prompt',
    'knowledge-retrieval': 'api',
    'http-request': 'api',
    'if-else': 'condition',
    'question-classifier': 'condition',
    'iteration': 'loop',
    'parallel': 'parallel',
    'variable-aggregator': 'function',
    'variable-setter': 'function',
    'template-transform': 'function',
    'code': 'function'
  };
  return typeMap[difyType] || 'prompt';
}

function extractNodeContent(nodeBody, nodeType) {
  if (nodeType === 'llm' || nodeType === 'start') {
    return extractYAMLValueFromBlock(nodeBody, 'prompt_template') || '';
  }
  if (nodeType === 'http-request') {
    const url = extractYAMLValueFromBlock(nodeBody, 'url') || '';
    const method = extractYAMLValueFromBlock(nodeBody, 'method') || 'POST';
    return JSON.stringify({ url, method });
  }
  return '';
}

// ============================================
// 解析器2：FastGPT JSON 解析器（增强版）
// ============================================

function parseFastGPTEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'fastgpt';

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    schema.identity.systemPrompt = text;
    return;
  }

  // 应用配置
  if (data.appConfig) {
    schema.meta.name = data.appConfig.name || 'FastGPT Agent';
    schema.meta.description = data.appConfig.intro || '';
  }

  // 新格式：直接 name 字段
  if (data.name && !schema.meta.name) {
    schema.meta.name = data.name;
  }
  if (data.description && !schema.meta.description) {
    schema.meta.description = data.description;
  }

  // 对话配置
  if (data.chatConfig) {
    schema.identity.systemPrompt = data.chatConfig.systemPrompt || '';
    schema.identity.role = data.chatConfig.role || 'assistant';
  }

  // 模型配置
  if (data.modelConfig) {
    schema.modelConfig.model = data.modelConfig.model || 'gpt-4';
    schema.modelConfig.temperature = data.modelConfig.temperature || 0.7;
    schema.modelConfig.maxTokens = data.modelConfig.maxTokens || 4096;
    schema.modelConfig.topP = data.modelConfig.topP || 1;

    if (data.modelConfig.frequencyPenalty) {
      schema.modelConfig.advanced.frequencyPenalty = data.modelConfig.frequencyPenalty;
    }
    if (data.modelConfig.presencePenalty) {
      schema.modelConfig.advanced.presencePenalty = data.modelConfig.presencePenalty;
    }
  }

  // 工作流节点
  if (data.workflow?.nodes) {
    parseFastGPTWorkflowNodes(data.workflow, schema);
  }

  // Agent Identity（新格式）
  if (data.agentIdentity) {
    schema.identity.role = data.agentIdentity.role || schema.identity.role;
    if (data.agentIdentity.personality && Array.isArray(data.agentIdentity.personality)) {
      schema.identity.constraints.push(`性格: ${data.agentIdentity.personality.join(', ')}`);
    }
  }

  // Memory 配置（新格式）
  if (data.memory) {
    if (data.memory.longTermMemory && Array.isArray(data.memory.longTermMemory)) {
      for (const mem of data.memory.longTermMemory) {
        if (typeof mem === 'string') {
          schema.memory.longTermMemory.push({
            id: UATCore.generateUUID(),
            type: 'string',
            content: mem,
            importance: 0.8
          });
        } else if (mem.content) {
          schema.memory.longTermMemory.push({
            id: mem.id || UATCore.generateUUID(),
            type: mem.type || 'string',
            content: mem.content,
            importance: mem.importance || 0.8
          });
        }
      }
    }

    if (data.memory.sessionMemory) {
      schema.memory.sessionMemory.enabled = data.memory.sessionMemory.enabled || true;
      schema.memory.sessionMemory.maxMessages = data.memory.sessionMemory.maxMessages || 50;
    }

    if (data.memory.longTermMemory) {
      // 已处理
    }
  }

  // 知识库引用 - 支持两种格式
  if (data.datasets) {
    // 旧格式：直接数组
    if (Array.isArray(data.datasets)) {
      for (const ds of data.datasets) {
        schema.memory.knowledgeBaseRef.push({
          id: ds.id || '',
          name: ds.name || 'Dataset',
          platform: 'fastgpt'
        });
      }
    }
    // 新格式：datasets.datasets 嵌套
    else if (data.datasets.datasets && Array.isArray(data.datasets.datasets)) {
      for (const ds of data.datasets.datasets) {
        schema.memory.knowledgeBaseRef.push({
          id: ds.id || '',
          name: ds.name || 'Dataset',
          type: ds.type || 'external',
          platform: 'fastgpt'
        });
      }
    }
  }

  // 插件工具
  if (data.plugins) {
    for (const plugin of data.plugins) {
      const api = UATCore.createEmptyAPIEndpoint();
      api.id = plugin.id || UATCore.generateUUID();
      api.name = plugin.name || '';
      api.method = plugin.method || 'POST';
      api.url = plugin.url || '';
      api.headers = plugin.headers || {};

      if (plugin.authType) {
        api.auth.type = plugin.authType;
      }

      schema.tools.apiEndpoints.push(api);
    }
  }
}

function parseFastGPTWorkflowNodes(workflow, schema) {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  // 构建边映射
  const edgeMap = {};
  for (const edge of edges) {
    const source = edge.source;
    if (!edgeMap[source]) edgeMap[source] = [];
    edgeMap[source].push({
      target: edge.target,
      conditionType: edge.conditionType
    });
  }

  for (const node of nodes) {
    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = node.nodeId || node.id;
    step.name = node.name || node.nodeName || '';
    step.type = mapFastGPTNodeType(node.type);
    step.content = node.inputs?.prompt || node.inputs?.text || '';

    // 条件节点
    if (node.type === 'ifElseNode' && node.inputs?.conditions) {
      for (const cond of node.inputs.conditions) {
        step.conditions.push({
          variable: cond.variable || '',
          operator: cond.operator || 'equals',
          value: cond.value || '',
          targetStepId: cond.targetNodeId || '',
          priority: 0
        });
      }
    }

    // 循环节点
    if (node.type === 'loopNode' && node.inputs) {
      step.loopConfig = {
        iterateOver: node.inputs.array || '',
        variableName: node.inputs.itemName || 'item',
        maxIterations: node.inputs.maxIterations || 100,
        breakCondition: node.inputs.breakCondition || ''
      };
    }

    // API节点
    if (node.type === 'httpRequest468' || node.inputs?.url) {
      step.type = 'api';
      step.content = JSON.stringify({
        url: node.inputs?.url || '',
        method: node.inputs?.method || 'POST',
        headers: node.inputs?.headers || {},
        body: node.inputs?.body || {}
      });
    }

    // 连接
    if (edgeMap[step.stepId]) {
      const firstEdge = edgeMap[step.stepId][0];
      step.nextStepId = firstEdge.target;
    }

    schema.workflow.steps.push(step);
  }
}

function mapFastGPTNodeType(type) {
  const typeMap = {
    'userGuide': 'prompt',
    'questionInput': 'prompt',
    'chatNode': 'prompt',
    'datasetSearchNode': 'api',
    'httpRequest468': 'api',
    'ifElseNode': 'condition',
    'loopNode': 'loop',
    'variableUpdateNode': 'function',
    'answerNode': 'end',
    'pluginInput': 'api'
  };
  return typeMap[type] || 'prompt';
}

// ============================================
// 解析器3：Flowise JSON 解析器（增强版）
// ============================================

function parseFlowiseEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'flowise';

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    schema.identity.systemPrompt = text;
    return;
  }

  schema.meta.name = data.name || data.flowName || 'Flowise Flow';
  schema.meta.description = data.description || '';

  if (!data.nodes) return;

  // 解析节点
  for (const node of data.nodes) {
    const nodeData = node.data || {};

    // AI节点提取系统提示词和模型配置
    if (node.type === 'ChatOpenAI' || node.type === 'LLMChain') {
      if (!schema.identity.systemPrompt) {
        schema.identity.systemPrompt = nodeData.systemPrompt || '';
      }

      schema.modelConfig.model = nodeData.modelName || nodeData.model || 'gpt-4';
      schema.modelConfig.temperature = parseFloat(nodeData.temperature) || 0.7;
      schema.modelConfig.maxTokens = parseInt(nodeData.maxTokens) || 4096;
    }

    // 工作流步骤
    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = node.id;
    step.name = nodeData.label || nodeData.name || '';
    step.type = mapFlowiseNodeType(node.type);
    step.content = '';

    // PromptTemplate节点
    if (node.type === 'PromptTemplate') {
      step.content = nodeData.template || '';

      // 提取变量
      if (nodeData.promptVariables) {
        for (const v of nodeData.promptVariables) {
          schema.identity.promptVariables.push({
            name: v.name || v,
            type: 'string',
            default: v.default || ''
          });
        }
      }
    }

    // 条件节点
    if (node.type === 'IfCondition') {
      step.conditions.push({
        variable: nodeData.variableName || '',
        operator: nodeData.conditionType || 'equals',
        value: nodeData.value || '',
        targetStepId: '',
        priority: 0
      });
    }

    // HTTP节点作为工具
    if (node.type === 'HTTPRequest') {
      const api = UATCore.createEmptyAPIEndpoint();
      api.id = node.id;
      api.name = nodeData.label || 'HTTP Request';
      api.method = nodeData.method || 'GET';
      api.url = nodeData.url || '';
      api.headers = nodeData.headers || {};

      schema.tools.apiEndpoints.push(api);

      step.type = 'api';
      step.content = JSON.stringify({ url: nodeData.url, method: nodeData.method });
    }

    schema.workflow.steps.push(step);
  }

  // 解析边
  if (data.edges) {
    for (const edge of data.edges) {
      const sourceStep = schema.workflow.steps.find(s => s.stepId === edge.source);
      if (sourceStep) {
        if (edge.sourceHandle) {
          // 条件分支
          if (edge.sourceHandle.includes('true') && sourceStep.conditions.length > 0) {
            sourceStep.conditions[0].targetStepId = edge.target;
          } else if (edge.sourceHandle.includes('false')) {
            sourceStep.conditions.push({
              variable: '',
              operator: 'false',
              value: '',
              targetStepId: edge.target,
              priority: -1
            });
          }
        } else {
          sourceStep.nextStepId = edge.target;
        }
      }
    }
  }
}

function mapFlowiseNodeType(type) {
  const typeMap = {
    'ChatOpenAI': 'prompt',
    'LLMChain': 'prompt',
    'ConversationChain': 'prompt',
    'PromptTemplate': 'prompt',
    'HTTPRequest': 'api',
    'IfCondition': 'condition',
    'Loop': 'loop',
    'Agent': 'prompt',
    'BufferMemory': 'function',
    'VectorStore': 'api'
  };
  return typeMap[type] || 'prompt';
}

// ============================================
// 解析器4：Claude Skill 解析器（增强版）
// ============================================

function parseClaudeSkillEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'claude';

  try {
    if (text.startsWith('---')) {
      const headerEnd = text.indexOf('---', 3);
      if (headerEnd > 0) {
        const yamlHeader = text.slice(3, headerEnd).trim();
        const bodyContent = text.slice(headerEnd + 3).trim();

        // 解析 YAML 头部
        schema.meta.name = extractYAMLValue(yamlHeader, 'name') || 'Claude Skill';
        schema.meta.description = extractYAMLValue(yamlHeader, 'description') || '';
        schema.modelConfig.model = extractYAMLValue(yamlHeader, 'model') || 'claude-3-opus';

        // 正文作为系统提示词
        schema.identity.systemPrompt = bodyContent;

        // 提取 Prompt 变量
        schema.identity.promptVariables = UATCore.extractPromptVariables(bodyContent);

        // 解析 MCP 配置
        parseClaudeMCPConfig(yamlHeader, schema);
      }
    } else {
      schema.identity.systemPrompt = text;
      schema.meta.name = 'Claude Skill';
    }

  } catch (error) {
    console.warn('Claude 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

function parseClaudeMCPConfig(yamlHeader, schema) {
  const mcpMatch = yamlHeader.match(/mcpServers:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n---|$)/);
  if (!mcpMatch) return;

  const mcpBlock = mcpMatch[1];
  const lines = mcpBlock.split('\n');

  let currentServer = null;

  for (const line of lines) {
    // 服务器声明
    if (line.match(/^  -\s+[\w_-]+:/)) {
      if (currentServer) schema.tools.mcpServers.push(currentServer);

      const nameMatch = line.match(/^  -\s+([\w_-]+):/);
      const name = nameMatch[1];
      currentServer = UATCore.createEmptyMCPServer();
      currentServer.id = name;
      currentServer.name = name;
    }

    // 配置项
    if (currentServer && line.match(/^      \w+:/)) {
      const keyMatch = line.match(/^      (\w+):\s*['"]?([^'"]*)['"]?/);
      if (keyMatch) {
        const key = keyMatch[1];
        const value = keyMatch[2].trim();

        if (key === 'url') currentServer.url = value;
        if (key === 'command') currentServer.config.command = value;
        if (key === 'transport') currentServer.config.transport = value;

        if (key === 'args') {
          try {
            currentServer.config.args = JSON.parse(value || '[]');
          } catch(e) { currentServer.config.args = []; }
        }

        if (key === 'env') {
          try {
            currentServer.config.env = JSON.parse(value || '{}');
          } catch(e) { currentServer.config.env = {}; }
        }
      }
    }
  }

  if (currentServer) schema.tools.mcpServers.push(currentServer);
}

// ============================================
// 解析器5：OpenClaw 解析器（增强版 - 支持 JSON 和 Markdown）
// ============================================

function parseOpenClawEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'openclaw';

  try {
    // 检测是否为 JSON 格式
    if (text.trim().startsWith('{')) {
      parseOpenClawJSON(text, schema);
      return;
    }

    // Markdown 格式解析
    parseOpenClawMarkdown(text, schema);

  } catch (error) {
    console.warn('OpenClaw 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

// OpenClaw JSON 配置解析
function parseOpenClawJSON(text, schema) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // 如果解析失败，尝试 Markdown 解析
    parseOpenClawMarkdown(text, schema);
    return;
  }

  // Agent 基础信息
  if (data.agent) {
    schema.meta.name = data.agent.name || 'OpenClaw Agent';
    schema.meta.description = data.agent.description || '';
    schema.modelConfig.model = data.agent.model || 'gpt-4';
    schema.modelConfig.temperature = data.agent.temperature || 0.7;
    schema.modelConfig.maxTokens = data.agent.max_tokens || 4096;
  }

  // Soul 配置
  if (data.soul) {
    schema.identity.role = data.soul.mission || '';
    if (data.soul.personality && Array.isArray(data.soul.personality)) {
      schema.identity.constraints.push(`性格: ${data.soul.personality.join(', ')}`);
    }
    if (data.soul.communication_style) {
      schema.identity.constraints.push(`沟通风格: ${data.soul.communication_style}`);
    }
  }

  // Identity 配置
  if (data.identity) {
    schema.identity.role = data.identity.role || schema.identity.role;
    if (data.identity.background) {
      schema.identity.constraints.push(`背景: ${data.identity.background}`);
    }
    if (data.identity.expertise && Array.isArray(data.identity.expertise)) {
      schema.identity.constraints.push(`专业领域: ${data.identity.expertise.join(', ')}`);
    }
  }

  // 系统提示词构建
  schema.identity.systemPrompt = buildOpenClawSystemPrompt(data);

  // Memory 配置
  if (data.memory) {
    // 长期记忆
    if (data.memory.long_term_memory && Array.isArray(data.memory.long_term_memory)) {
      for (const mem of data.memory.long_term_memory) {
        schema.memory.longTermMemory.push({
          id: mem.id || UATCore.generateUUID(),
          type: mem.type || 'string',
          content: mem.content || '',
          importance: mem.importance || 0.8
        });
      }
    }

    // 知识库引用
    if (data.memory.knowledge_base_ref && Array.isArray(data.memory.knowledge_base_ref)) {
      for (const kb of data.memory.knowledge_base_ref) {
        schema.memory.knowledgeBaseRef.push({
          id: kb.id || '',
          name: kb.name || 'Knowledge Base',
          type: kb.type || 'external',
          platform: 'openclaw'
        });
      }
    }

    // 用户偏好
    if (data.memory.user_preference) {
      schema.memory.longTermMemory.push({
        id: UATCore.generateUUID(),
        type: 'preference',
        content: data.memory.user_preference,
        importance: 0.9
      });
    }
  }

  // Tools 配置
  if (data.tools && Array.isArray(data.tools)) {
    for (const tool of data.tools) {
      if (tool.type === 'function') {
        schema.tools.functions.push({
          id: tool.name || UATCore.generateUUID(),
          name: tool.name || '',
          description: tool.description || '',
          code: '',
          inputs: tool.schema?.input || [],
          outputs: tool.schema?.output || []
        });
      }
    }
  }

  // Workflow 配置
  if (data.workflow && Array.isArray(data.workflow)) {
    for (let i = 0; i < data.workflow.length; i++) {
      const wfStep = data.workflow[i];
      const step = UATCore.createEmptyWorkflowStep();
      step.stepId = `step_${i}`;
      step.name = wfStep.step || `Step ${i + 1}`;
      step.type = mapOpenClawStepType(wfStep.type);
      step.content = wfStep.content || '';
      step.nextStepId = i < data.workflow.length - 1 ? `step_${i + 1}` : '';

      schema.workflow.steps.push(step);
    }
  }
}

// OpenClaw Markdown 解析
function parseOpenClawMarkdown(text, schema) {
  // Identity 块
  const identityMatch = text.match(/#?\s*Identity\s*\n([\s\S]*?)(?=\n#|\nSoul|\nSkill|\n\n|$)/i);
  if (identityMatch) {
    const identityBlock = identityMatch[1];
    schema.identity.role = extractMarkdownSection(identityBlock, 'Role');
    schema.identity.systemPrompt = extractMarkdownSection(identityBlock, 'System Prompt') ||
                                    extractMarkdownSection(identityBlock, 'Prompt') ||
                                    identityBlock.trim();

    // 提取名称
    const nameMatch = identityBlock.match(/Name:\s*['"]?([^'":\n]+)['"]?/i);
    if (nameMatch) schema.meta.name = nameMatch[1].trim();
  }

  // Soul 块（全局约束）
  const soulMatch = text.match(/#?\s*Soul\s*\n([\s\S]*?)(?=\n#|\nSkill|\n\n|$)/i);
  if (soulMatch) {
    const soulBlock = soulMatch[1];
    const constraints = soulBlock.split(/\n\n+/).filter(s => s.trim());
    schema.identity.constraints = constraints;
  }

  // Skill 块（工作流步骤）
  const skillMatch = text.match(/#?\s*Skill[s]?\s*\n([\s\S]*?)(?=\n#|\n\n|$)/i);
  if (skillMatch) {
    const skillBlock = skillMatch[1];
    const skills = skillBlock.split(/\n##\s+/).filter(s => s.trim());

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const name = skill.split('\n')[0].trim();

      const step = UATCore.createEmptyWorkflowStep();
      step.stepId = `skill_${i}`;
      step.name = name;
      step.type = 'prompt';
      step.content = skill.trim();
      step.nextStepId = i < skills.length - 1 ? `skill_${i + 1}` : '';

      schema.workflow.steps.push(step);
    }
  }

  // Model 配置
  const modelMatch = text.match(/Model:\s*([a-zA-Z0-9_-]+)/i);
  if (modelMatch) schema.modelConfig.model = modelMatch[1];

  // Prompt 变量
  schema.identity.promptVariables = UATCore.extractPromptVariables(schema.identity.systemPrompt);
}

function buildOpenClawSystemPrompt(data) {
  let prompt = '';

  if (data.soul?.mission) {
    prompt += `# Mission\n${data.soul.mission}\n\n`;
  }

  if (data.identity?.role) {
    prompt += `# Role\n${data.identity.role}\n\n`;
  }

  if (data.soul?.communication_style) {
    prompt += `# Communication Style\n${data.soul.communication_style}\n\n`;
  }

  return prompt.trim();
}

function mapOpenClawStepType(openclawType) {
  const typeMap = {
    'action': 'prompt',
    'prompt': 'prompt',
    'tool': 'api',
    'condition': 'condition',
    'loop': 'loop',
    'end': 'end'
  };
  return typeMap[openclawType] || 'prompt';
}

// ============================================
// 解析器6：通用纯文本解析器
// ============================================

function parsePlainText(text, schema) {
  schema.meta.sourcePlatform = 'plain';
  schema.identity.systemPrompt = text;
  schema.meta.name = 'Plain Text Agent';
  schema.meta.description = '从纯文本导入';

  schema.identity.promptVariables = UATCore.extractPromptVariables(text);
}

// ============================================
// 辅助函数
// ============================================

function extractYAMLValue(text, key, parentKey = null) {
  if (parentKey) {
    const parentMatch = text.match(new RegExp(`${parentKey}[\\s]*\\n([\\s\\S]*?)(?=\\n\\w+:|$)`));
    if (parentMatch) {
      return extractYAMLValueFromBlock(parentMatch[1], key);
    }
    return null;
  }

  const regex = new RegExp(`${key}:\\s*['"]?([^'":\\n]+)['"]?`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractYAMLValueFromBlock(block, key, parentKey = null) {
  if (parentKey) {
    const parentMatch = block.match(new RegExp(`${parentKey}[\\s]*\\n([\\s\\S]*?)(?=\\n\\s*\\w+:|$)`));
    if (parentMatch) {
      return extractYAMLValueFromBlock(parentMatch[1], key);
    }
    return null;
  }

  const regex = new RegExp(`(?:^|\\n)\\s*${key}:\\s*['"]?([^'":\\n]+)['"]?`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function extractDifySystemPrompt(text) {
  const promptMatch = text.match(/prompt_template:\s*['"]([^'"]+)['"]/i);
  if (promptMatch) return promptMatch[1];

  const sysMatch = text.match(/system_prompt:\s*['"]([^'"]+)['"]/i);
  if (sysMatch) return sysMatch[1];

  return '';
}

function extractMarkdownSection(text, heading) {
  const regex = new RegExp(`#?\\s*${heading}\\s*\\n([^\\n]+(?:\\n[^#\\n]+)*)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// ============================================
// 解析器7：Hermes YAML 解析器（新增）
// ============================================

function parseHermesYAML(text, schema) {
  schema.meta.sourcePlatform = 'hermes';

  try {
    // 提取版本
    const version = extractYAMLValue(text, 'hermes_version');

    // 新格式：name/description 直接定义
    const directName = extractYAMLValue(text, 'name');
    if (directName) {
      schema.meta.name = directName;
    }
    const directDesc = extractYAMLValue(text, 'description');
    if (directDesc) {
      schema.meta.description = directDesc;
    }

    // Agent 块（旧格式）
    const agentMatch = text.match(/agent:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (agentMatch) {
      const agentBlock = agentMatch[1];
      if (!schema.meta.name) {
        schema.meta.name = extractYAMLValueFromBlock(agentBlock, 'name') || 'Hermes Agent';
      }
      if (!schema.meta.description) {
        schema.meta.description = extractYAMLValueFromBlock(agentBlock, 'description') || '';
      }
      schema.identity.role = extractYAMLValueFromBlock(agentBlock, 'role') || 'assistant';
    }

    // Model 块 - 支持两种格式
    const modelMatch = text.match(/model:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (modelMatch) {
      const modelBlock = modelMatch[1];
      // 新格式: model.name 可能在嵌套的 parameters 里
      const modelName = extractYAMLValueFromBlock(modelBlock, 'name');
      if (modelName) {
        schema.modelConfig.model = modelName;
      } else {
        schema.modelConfig.model = extractYAMLValueFromBlock(modelBlock, 'provider') || 'gpt-4';
      }

      // Temperature 在 parameters 里
      const tempMatch = modelBlock.match(/temperature:\s*([\d.]+)/);
      if (tempMatch) {
        schema.modelConfig.temperature = parseFloat(tempMatch[1]);
      }

      const maxTokensMatch = modelBlock.match(/max_tokens:\s*(\d+)/);
      if (maxTokensMatch) {
        schema.modelConfig.maxTokens = parseInt(maxTokensMatch[1]);
      }
    }

    // Identity 块（新格式）
    const identityMatch = text.match(/identity:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (identityMatch) {
      const identityBlock = identityMatch[1];
      schema.identity.role = extractYAMLValueFromBlock(identityBlock, 'role') || schema.identity.role;

      const background = extractYAMLValueFromBlock(identityBlock, 'background');
      if (background) {
        schema.identity.constraints.push(`背景: ${background}`);
      }

      // expertise 数组
      const expertiseMatch = identityBlock.match(/expertise:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (expertiseMatch) {
        const expertiseLines = expertiseMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        const expertises = expertiseLines.map(l => l.replace(/^-\s*/, '').trim()).filter(l => l);
        if (expertises.length > 0) {
          schema.identity.constraints.push(`专业领域: ${expertises.join(', ')}`);
        }
      }
    }

    // Soul 块（新格式）
    const soulMatch = text.match(/soul:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (soulMatch) {
      const soulBlock = soulMatch[1];
      const mission = extractYAMLValueFromBlock(soulBlock, 'mission');
      if (mission) {
        schema.identity.systemPrompt = mission;
      }

      // personality 数组
      const personalityMatch = soulBlock.match(/personality:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (personalityMatch) {
        const personalityLines = personalityMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        const personalities = personalityLines.map(l => l.replace(/^-\s*/, '').trim()).filter(l => l);
        if (personalities.length > 0) {
          schema.identity.constraints.push(`性格: ${personalities.join(', ')}`);
        }
      }

      const commStyle = extractYAMLValueFromBlock(soulBlock, 'communication_style');
      if (commStyle) {
        schema.identity.constraints.push(`沟通风格: ${commStyle}`);
      }
    }

    // Prompt 块（旧格式）
    const promptMatch = text.match(/prompt:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (promptMatch) {
      const promptBlock = promptMatch[1];
      if (!schema.identity.systemPrompt) {
        schema.identity.systemPrompt = extractYAMLValueFromBlock(promptBlock, 'system') || '';
      }

      // 约束列表
      const constraintsMatch = promptBlock.match(/constraints:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (constraintsMatch) {
        const constraintLines = constraintsMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        for (const line of constraintLines) {
          const c = line.replace(/^-\s*/, '').trim();
          if (c) schema.identity.constraints.push(c);
        }
      }
    }

    // Tools 块：Functions
    const toolsMatch = text.match(/tools:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (toolsMatch) {
      const toolsBlock = toolsMatch[1];

      // Functions
      const functionsMatch = toolsBlock.match(/functions:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (functionsMatch) {
        parseHermesFunctions(functionsMatch[1], schema);
      }

      // MCP Servers
      const mcpMatch = toolsBlock.match(/mcp_servers:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (mcpMatch) {
        parseHermesMCPServers(mcpMatch[1], schema);
      }
    }

    // Workflow 块
    const workflowMatch = text.match(/workflow:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (workflowMatch) {
      parseHermesWorkflow(workflowMatch[1], schema);
    }

    // Memory 块 - 支持两种格式
    const memoryMatch = text.match(/memory:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (memoryMatch) {
      const memoryBlock = memoryMatch[1];

      // Session memory（旧格式）
      const memType = extractYAMLValueFromBlock(memoryBlock, 'type');
      if (memType === 'conversation') {
        schema.memory.sessionMemory.enabled = true;
        schema.memory.sessionMemory.maxMessages = parseInt(extractYAMLValueFromBlock(memoryBlock, 'max_history')) || 50;
      }

      // Session limit（新格式）
      const sessionLimitMatch = memoryBlock.match(/session_limit:\s*(\d+)/);
      if (sessionLimitMatch) {
        schema.memory.sessionMemory.enabled = true;
        schema.memory.sessionMemory.maxMessages = parseInt(sessionLimitMatch[1]);
      }

      // Long term memory entries（新格式）
      const longTermMatch = memoryBlock.match(/long_term:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (longTermMatch) {
        const longTermBlock = longTermMatch[1];
        const entriesMatch = longTermBlock.match(/entries:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
        if (entriesMatch) {
          parseHermesLongTermMemory(entriesMatch[1], schema);
        }
      }
    }

    // Knowledge Base 块（新格式）
    const kbMatch = text.match(/knowledge_base:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (kbMatch) {
      const kbBlock = kbMatch[1];
      const refsMatch = kbBlock.match(/references:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (refsMatch) {
        parseHermesKnowledgeBase(refsMatch[1], schema);
      }
    }

  } catch (error) {
    console.warn('Hermes 解析警告:', error.message);
    schema.identity.systemPrompt = text;
    schema.meta.name = 'Hermes Agent';
  }
}

function parseHermesFunctions(block, schema) {
  const lines = block.split('\n');
  let currentFn = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s*name:/)) {
      if (currentFn) schema.tools.functions.push(currentFn);
      currentFn = {
        id: UATCore.generateUUID(),
        name: '',
        description: '',
        code: '',
        inputs: [],
        outputs: []
      };
      currentFn.name = line.replace(/^\s*-\s*name:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }

    if (currentFn && line.match(/^\s*description:/)) {
      currentFn.description = line.replace(/^\s*description:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }

    // Parameters 解析（简化）
    if (currentFn && line.match(/^\s*parameters:/)) {
      // 简化处理，不解析完整参数结构
    }
  }

  if (currentFn) schema.tools.functions.push(currentFn);
}

function parseHermesMCPServers(block, schema) {
  const lines = block.split('\n');
  let currentServer = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s*name:/)) {
      if (currentServer) schema.tools.mcpServers.push(currentServer);
      const name = line.replace(/^\s*-\s*name:\s*['"]?([^'"]+)['"]?/, '$1').trim();
      currentServer = UATCore.createEmptyMCPServer();
      currentServer.id = name;
      currentServer.name = name;
    }

    if (currentServer && line.match(/^\s*url:/)) {
      currentServer.url = line.replace(/^\s*url:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }
  }

  if (currentServer) schema.tools.mcpServers.push(currentServer);
}

// Hermes 长期记忆解析（新格式）
function parseHermesLongTermMemory(block, schema) {
  const entryRegex = /-\s*id:\s*["']([^"']+)["']\s*\n\s*type:\s*["']([^"']+)["']\s*\n\s*content:\s*["']([^"']+)["']/g;
  let match;

  while ((match = entryRegex.exec(block)) !== null) {
    schema.memory.longTermMemory.push({
      id: match[1].trim(),
      type: match[2].trim(),
      content: match[3].trim(),
      importance: 0.8
    });
  }
}

// Hermes 知识库引用解析（新格式）
function parseHermesKnowledgeBase(block, schema) {
  const refRegex = /-\s*id:\s*["']([^"']+)["']\s*\n\s*name:\s*["']([^"']+)["']/g;
  let match;

  while ((match = refRegex.exec(block)) !== null) {
    schema.memory.knowledgeBaseRef.push({
      id: match[1].trim(),
      name: match[2].trim(),
      platform: 'hermes'
    });
  }
}

function parseHermesWorkflow(block, schema) {
  const stepsMatch = block.match(/steps:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
  if (!stepsMatch) return;

  const stepsBlock = stepsMatch[1];
  const lines = stepsBlock.split('\n');

  let currentStep = null;
  let prevStepId = '';

  for (const line of lines) {
    if (line.match(/^\s*-\s*id:/)) {
      if (currentStep) {
        if (prevStepId) {
          // 连接上一个步骤
          const prevStep = schema.workflow.steps.find(s => s.stepId === prevStepId);
          if (prevStep) prevStep.nextStepId = currentStep.stepId;
        }
        schema.workflow.steps.push(currentStep);
        prevStepId = currentStep.stepId;
      }

      currentStep = UATCore.createEmptyWorkflowStep();
      currentStep.stepId = line.replace(/^\s*-\s*id:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }

    if (currentStep) {
      if (line.match(/^\s*type:/)) {
        currentStep.type = mapHermesStepType(line.replace(/^\s*type:\s*['"]?([^'"]+)['"]?/, '$1').trim());
      }
      if (line.match(/^\s*action:/)) {
        currentStep.content = line.replace(/^\s*action:\s*['"]?([^'"]+)['"]?/, '$1').trim();
      }
      if (line.match(/^\s*tool:/)) {
        const toolName = line.replace(/^\s*tool:\s*['"]?([^'"]+)['"]?/, '$1').trim();
        currentStep.type = 'api';
        currentStep.content = `Use tool: ${toolName}`;
      }
    }
  }

  if (currentStep) schema.workflow.steps.push(currentStep);
}

function mapHermesStepType(hermesType) {
  const typeMap = {
    'prompt': 'prompt',
    'tool': 'api',
    'condition': 'condition',
    'loop': 'loop',
    'end': 'end'
  };
  return typeMap[hermesType] || 'prompt';
}

// ============================================
// 解析器8：Cursor Rules 解析器（新增）
// ============================================

function parseCursorRules(text, schema) {
  schema.meta.sourcePlatform = 'cursor';
  schema.meta.name = 'Cursor Rules Agent';

  // 纯文本作为系统提示词
  schema.identity.systemPrompt = text;

  // 提取规则分类
  const sections = text.split(/^#\s+/m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    if (title && content) {
      // 提取规则项
      const rules = content.match(/^-\s+.+/gm) || [];
      for (const rule of rules) {
        schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
      }
    }
  }

  // 提取 Prompt 变量
  schema.identity.promptVariables = UATCore.extractPromptVariables(text);
}

// ============================================
// 解析器9：Windsurf Rules 解析器（新增）
// ============================================

function parseWindsurfRules(text, schema) {
  schema.meta.sourcePlatform = 'windsurf';
  schema.meta.name = 'Windsurf Rules Agent';

  // 与 Cursor 类似
  schema.identity.systemPrompt = text;

  // 提取规则
  const rules = text.match(/^-\s+.+/gm) || [];
  for (const rule of rules) {
    schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
  }

  // 提取标题作为分类
  const headings = text.match(/^##\s+.+/gm) || [];
  for (const h of headings) {
    const category = h.replace(/^##\s*/, '').trim();
    schema.identity.constraints.push(`Category: ${category}`);
  }
}

// ============================================
// 解析器10：GitHub Copilot 解析器（新增）
// ============================================

function parseCopilotInstructions(text, schema) {
  schema.meta.sourcePlatform = 'copilot';
  schema.meta.name = 'Copilot Instructions Agent';

  // Markdown 格式
  schema.identity.systemPrompt = text;

  // 提取 Markdown 标题作为分类
  const headings = text.match(/^##\s+.+/gm) || [];
  for (const h of headings) {
    const category = h.replace(/^##\s*/, '').trim();
    schema.identity.constraints.push(`Section: ${category}`);
  }

  // 提取规则项
  const rules = text.match(/^-\s+.+/gm) || [];
  for (const rule of rules) {
    schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
  }
}

// ============================================
// 解析器11：Codex CLI 解析器（新增）
// ============================================

function parseCodexAgents(text, schema) {
  schema.meta.sourcePlatform = 'codex';

  try {
    if (text.startsWith('---')) {
      const headerEnd = text.indexOf('---', 3);
      if (headerEnd > 0) {
        const yamlHeader = text.slice(3, headerEnd).trim();
        const bodyContent = text.slice(headerEnd + 3).trim();

        schema.meta.name = extractYAMLValue(yamlHeader, 'name') || 'Codex Agent';
        schema.meta.description = extractYAMLValue(yamlHeader, 'description') || '';
        schema.identity.systemPrompt = bodyContent;

        // 简化工具声明
        const toolsMatch = yamlHeader.match(/tools:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
        if (toolsMatch) {
          const toolLines = toolsMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
          for (const line of toolLines) {
            const toolName = line.replace(/^-\s*/, '').trim();
            schema.tools.functions.push({
              id: toolName,
              name: toolName,
              description: `Built-in ${toolName} capability`,
              code: '',
              inputs: [],
              outputs: []
            });
          }
        }
      }
    } else {
      schema.identity.systemPrompt = text;
      schema.meta.name = 'Codex Agent';
    }
  } catch (error) {
    console.warn('Codex 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

// ============================================
// 解析器12：Zed Editor 解析器（新增）
// ============================================

function parseZedRules(text, schema) {
  schema.meta.sourcePlatform = 'zed';
  schema.meta.name = 'Zed Rules Agent';

  // Markdown 格式
  schema.identity.systemPrompt = text;

  // 提取规则
  const rules = text.match(/^-\s+.+/gm) || [];
  for (const rule of rules) {
    schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
  }
}

// ============================================
// 导出模块接口（更新）
// ============================================

window.UATParser = {
  runParserPool,
  parseDifyDSLEnhanced,
  parseFastGPTEnhanced,
  parseFlowiseEnhanced,
  parseClaudeSkillEnhanced,
  parseOpenClawEnhanced,
  parseHermesYAML,
  parseCursorRules,
  parseWindsurfRules,
  parseCopilotInstructions,
  parseCodexAgents,
  parseZedRules,
  parsePlainText
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATParser;
}
// Link global alias
UATParser = window.UATParser;
runParserPool = window.UATParser.runParserPool;

// ===== src/parser/memory-parser.js =====
/**
 * UAT Memory Parser v1.0 - F2/F3 统一记忆解析
 * 支持11平台记忆格式解析和转换
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

function getSchemaExtensions() {
  return typeof UATSchemaExtensions !== 'undefined' ? UATSchemaExtensions : window.UATSchemaExtensions;
}

// ============================================
// 平台分类定义
// ============================================

const PLATFORM_MEMORY_CLASSES = {
  // A类: 结构化JSON格式
  dify: { class: 'A', format: 'json', fields: ['memory.long_term'] },
  fastgpt: { class: 'A', format: 'json', fields: ['appConfig.chatConfig.history', 'userPreference'] },
  flowise: { class: 'A', format: 'json', fields: ['nodes[].data.memory'] },

  // B类: 嵌入字段格式
  openclaw: { class: 'B', format: 'json+md', fields: ['memory.entries', 'SOUL.md'] },
  hermes: { class: 'B', format: 'yaml+md', fields: ['memory.entries', 'soul.md'] },

  // C类: Markdown格式
  cursor: { class: 'C', format: 'md', blockType: 'list' },
  windsurf: { class: 'C', format: 'md', blockType: 'list' },
  claude: { class: 'C', format: 'md', blockType: 'json' },
  codex: { class: 'C', format: 'md', blockType: 'table' },
  copilot: { class: 'C', format: 'md', blockType: 'list' },
  zed: { class: 'C', format: 'md', blockType: 'json' }
};

// ============================================
// 通用记忆解析入口
// ============================================

/**
 * 从原始内容解析记忆到 memoryEntries
 * @param {string} content - 原始内容
 * @param {string} platform - 平台名称
 * @param {Object} schema - 目标Schema
 * @returns {Array} memoryEntries 数组
 */
function parseMemoryToEntries(content, platform, schema) {
  const config = PLATFORM_MEMORY_CLASSES[platform];
  if (!config) {
    return parsePlainTextMemory(content);
  }

  switch (config.class) {
    case 'A':
      return parseClassAMemory(content, platform, config);
    case 'B':
      return parseClassBMemory(content, platform, config);
    case 'C':
      return parseClassCMemory(content, platform, config);
    default:
      return [];
  }
}

// ============================================
// A类平台解析 (JSON结构化)
// ============================================

function parseClassAMemory(content, platform, config) {
  const entries = [];

  try {
    // 处理 YAML 格式 (Dify)
    if (platform === 'dify') {
      return parseDifyMemory(content);
    }

    // 处理 JSON 格式
    const json = typeof content === 'string' ? JSON.parse(content) : content;

    if (platform === 'fastgpt') {
      // FastGPT: appConfig.chatConfig + userPreference
      const chatConfig = json.appConfig?.chatConfig || {};
      if (chatConfig.history) {
        chatConfig.history.forEach((h, idx) => {
          entries.push(createMemoryEntryFromData({
            type: 'context',
            content: h.content || h,
            source: 'imported',
            category: 'chat_history'
          }));
        });
      }
      if (json.userPreference) {
        entries.push(createMemoryEntryFromData({
          type: 'preference',
          content: json.userPreference,
          source: 'imported',
          category: 'user_settings'
        }));
      }
    }

    if (platform === 'flowise') {
      // Flowise: nodes[].data.memory
      const nodes = json.nodes || [];
      nodes.forEach(node => {
        if (node.data?.memory) {
          const mem = node.data.memory;
          if (Array.isArray(mem)) {
            mem.forEach(item => {
              entries.push(createMemoryEntryFromData({
                type: 'fact',
                content: typeof item === 'string' ? item : JSON.stringify(item),
                source: 'imported',
                category: node.type || 'unknown'
              }));
            });
          }
        }
      });
    }

  } catch (e) {
    console.warn(`[${platform}] JSON解析失败:`, e.message);
  }

  return entries;
}

function parseDifyMemory(content) {
  const entries = [];

  try {
    // YAML 解析
    const yaml = parseSimpleYAML(content);

    // long_term memory
    if (yaml.memory?.long_term) {
      const longTerm = yaml.memory.long_term;
      if (typeof longTerm === 'string') {
        entries.push(createMemoryEntryFromData({
          type: 'fact',
          content: longTerm,
          source: 'imported',
          category: 'long_term'
        }));
      } else if (Array.isArray(longTerm)) {
        longTerm.forEach(item => {
          if (typeof item === 'string') {
            entries.push(createMemoryEntryFromData({
              type: 'fact',
              content: item,
              source: 'imported',
              category: 'long_term'
            }));
          } else if (typeof item === 'object') {
            entries.push(createMemoryEntryFromObject(item));
          }
        });
      }
    }

    // query variable memory (session)
    if (yaml.variables) {
      Object.entries(yaml.variables).forEach(([key, value]) => {
        entries.push(createMemoryEntryFromData({
          type: 'context',
          content: `${key}: ${value}`,
          source: 'imported',
          category: 'session_variable'
        }));
      });
    }

  } catch (e) {
    console.warn('[dify] YAML解析失败:', e.message);
  }

  return entries;
}

// ============================================
// B类平台解析 (嵌入字段)
// ============================================

function parseClassBMemory(content, platform, config) {
  const entries = [];

  try {
    if (platform === 'openclaw') {
      return parseOpenClawMemory(content);
    }

    if (platform === 'hermes') {
      return parseHermesMemory(content);
    }

  } catch (e) {
    console.warn(`[${platform}] B类解析失败:`, e.message);
  }

  return entries;
}

function parseOpenClawMemory(content) {
  const entries = [];

  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;

    // memory.entries 数组
    if (json.memory?.entries) {
      json.memory.entries.forEach(entry => {
        entries.push(createMemoryEntryFromObject(entry));
      });
    }

    // SOUL.md 内嵌解析
    if (json.soul?.content) {
      const soulEntries = parseMarkdownMemory(json.soul.content, 'list');
      entries.push(...soulEntries);
    }

    // knowledge_base.datasets
    if (json.knowledge_base?.datasets) {
      json.knowledge_base.datasets.forEach(ds => {
        entries.push(createMemoryEntryFromData({
          type: 'fact',
          content: ds.content || ds.name || '知识库数据集',
          source: 'imported',
          category: 'knowledge_base',
          metadata: { datasetId: ds.id || ds.name }
        }));
      });
    }

  } catch (e) {
    console.warn('[openclaw] 解析失败:', e.message);
  }

  return entries;
}

function parseHermesMemory(content) {
  const entries = [];

  try {
    // YAML + MD 混合解析
    const yamlMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (yamlMatch) {
      const yaml = parseSimpleYAML(yamlMatch[1]);

      // memory.entries
      if (yaml.memory?.entries) {
        yaml.memory.entries.forEach(entry => {
          entries.push(createMemoryEntryFromObject(entry));
        });
      }

      // soul.md 内容
      if (yaml.soul?.file) {
        // 嵌入的 soul 内容
      }
    }

    // Markdown 部分
    const mdContent = content.replace(/^---\n[\s\S]+?\n---\n/, '');
    const mdEntries = parseMarkdownMemory(mdContent, 'list');
    entries.push(...mdEntries);

  } catch (e) {
    console.warn('[hermes] 解析失败:', e.message);
  }

  return entries;
}

// ============================================
// C类平台解析 (Markdown格式)
// ============================================

function parseClassCMemory(content, platform, config) {
  const blockType = config.blockType || 'list';
  return parseMarkdownMemory(content, blockType);
}

/**
 * Markdown 记忆解析 - 支持多种格式
 * @param {string} content - Markdown内容
 * @param {string} blockType - json | table | list
 * @returns {Array} memoryEntries
 */
function parseMarkdownMemory(content, blockType) {
  const entries = [];

  // 查找 Memory 相关章节
  const memorySection = extractMemorySection(content);

  if (!memorySection) {
    return entries;
  }

  switch (blockType) {
    case 'json':
      entries.push(...parseMarkdownJSONBlock(memorySection));
      break;
    case 'table':
      entries.push(...parseMarkdownTable(memorySection));
      break;
    case 'list':
      entries.push(...parseMarkdownList(memorySection));
      break;
  }

  return entries;
}

/**
 * 提取 Memory 章节
 */
function extractMemorySection(content) {
  // 匹配 ## Memory 或 # Memory 章节
  const patterns = [
    /##\s*Memory\s*\n([\s\S]+?)(?=\n##|\n#|$)/i,
    /#\s*Memory\s*\n([\s\S]+?)(?=\n#|$)/i,
    /##\s*记忆\s*\n([\s\S]+?)(?=\n##|\n#|$)/i,
    /Memory:\s*\n([\s\S]+?)(?=\n\n[A-Z]|\n##|$)/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * 解析 Markdown JSON 代码块 (Claude/Zed)
 */
function parseMarkdownJSONBlock(section) {
  const entries = [];

  // 匹配 ```json 代码块
  const jsonBlockPattern = /```json\s*\n([\s\S]+?)\n```/g;
  let match;

  while ((match = jsonBlockPattern.exec(section)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      if (Array.isArray(json)) {
        json.forEach(item => {
          entries.push(createMemoryEntryFromObject(item));
        });
      } else if (typeof json === 'object') {
        // 可能是 memoryEntries 结构
        if (json.entries) {
          json.entries.forEach(item => {
            entries.push(createMemoryEntryFromObject(item));
          });
        } else {
          entries.push(createMemoryEntryFromObject(json));
        }
      }
    } catch (e) {
      console.warn('JSON block解析失败:', e.message);
    }
  }

  // 匹配 ```yaml 代码块
  const yamlBlockPattern = /```yaml\s*\n([\s\S]+?)\n```/g;
  while ((match = yamlBlockPattern.exec(section)) !== null) {
    const yaml = parseSimpleYAML(match[1]);
    if (yaml.entries) {
      yaml.entries.forEach(item => {
        entries.push(createMemoryEntryFromObject(item));
      });
    }
  }

  return entries;
}

/**
 * 解析 Markdown 表格 (Codex)
 */
function parseMarkdownTable(section) {
  const entries = [];

  // 匹配表格格式
  // | Type | Content | Priority |
  // |------|---------|----------|
  // | fact | ...     | 5        |
  const tablePattern = /\|[\s\S]+?\n(?=\n[^|]|\n$|$)/g;
  const match = section.match(tablePattern);

  if (match) {
    const lines = match[0].split('\n').filter(l => l.trim() && !l.match(/^\|[-]+\|/));

    // 解析表头
    const headerLine = lines[0];
    if (!headerLine) return entries;

    const headers = headerLine.split('|').map(h => h.trim().toLowerCase()).filter(h => h);

    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split('|').map(c => c.trim()).filter(c => c);
      if (row.length >= 2) {
        const entryData = {};

        headers.forEach((h, idx) => {
          if (idx < row.length) {
            entryData[h] = row[idx];
          }
        });

        // 标准化字段
        entries.push(createMemoryEntryFromData({
          type: entryData.type || 'fact',
          content: entryData.content || entryData.memory || entryData.description || '',
          priority: parseInt(entryData.priority) || 0,
          category: entryData.category || '',
          source: 'imported'
        }));
      }
    }
  }

  return entries;
}

/**
 * 解析 Markdown 列表 (Cursor/Windsurf/Copilot)
 */
function parseMarkdownList(section) {
  const entries = [];

  // 匹配列表项: - item 或 * item
  const listPattern = /^[-*]\s+(.+)$/gm;
  let match;

  while ((match = listPattern.exec(section)) !== null) {
    const content = match[1].trim();

    // 尝试解析带类型的列表项: - [fact] xxx 或 - fact: xxx
    const typedMatch = content.match(/^\[([a-z]+)\]\s+(.+)$/i) ||
                       content.match(/^([a-z]+):\s+(.+)$/i);

    if (typedMatch) {
      entries.push(createMemoryEntryFromData({
        type: typedMatch[1].toLowerCase(),
        content: typedMatch[2],
        source: 'imported',
        category: ''
      }));
    } else {
      // 简单列表项
      entries.push(createMemoryEntryFromData({
        type: 'fact',
        content: content,
        source: 'imported',
        category: ''
      }));
    }
  }

  return entries;
}

// ============================================
// 纯文本解析
// ============================================

function parsePlainTextMemory(content) {
  const entries = [];

  // 尝试JSON解析
  try {
    const json = JSON.parse(content);
    if (Array.isArray(json)) {
      json.forEach(item => {
        entries.push(createMemoryEntryFromObject(item));
      });
      return entries;
    }
  } catch (e) {}

  // 尝试YAML解析
  try {
    const yaml = parseSimpleYAML(content);
    if (yaml.entries) {
      yaml.entries.forEach(item => {
        entries.push(createMemoryEntryFromObject(item));
      });
      return entries;
    }
  } catch (e) {}

  // 按行分割
  const lines = content.split('\n').filter(l => l.trim());
  lines.forEach(line => {
    entries.push(createMemoryEntryFromData({
      type: 'fact',
      content: line,
      source: 'imported',
      category: ''
    }));
  });

  return entries;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从结构化数据创建 MemoryEntry
 */
function createMemoryEntryFromData(data) {
  const entry = getSchemaExtensions().createEmptyMemoryEntry();

  entry.id = getUATCore().generateUUID();
  entry.type = data.type || 'fact';
  entry.content = data.content || '';
  entry.source = data.source || 'imported';
  entry.category = data.category || '';
  entry.priority = data.priority || 0;
  entry.createdAt = new Date().toISOString();

  if (data.metadata) {
    entry.metadata = { ...entry.metadata, ...data.metadata };
  }

  return entry;
}

/**
 * 从对象创建 MemoryEntry (合并模板)
 */
function createMemoryEntryFromObject(obj) {
  const entry = getSchemaExtensions().createEmptyMemoryEntry();

  // 映射常见字段
  entry.id = obj.id || getUATCore().generateUUID();
  entry.type = obj.type || obj.memory_type || 'fact';
  entry.content = obj.content || obj.value || obj.text || obj.memory || '';
  entry.category = obj.category || obj.tag || '';
  entry.priority = parseInt(obj.priority) || obj.weight || 0;
  entry.source = obj.source || 'imported';
  entry.createdAt = obj.createdAt || obj.created_at || new Date().toISOString();
  entry.updatedAt = obj.updatedAt || obj.updated_at || '';

  // metadata
  if (obj.metadata) {
    entry.metadata = { ...entry.metadata, ...obj.metadata };
  }
  if (obj.confidence) {
    entry.metadata.confidence = parseFloat(obj.confidence);
  }
  if (obj.expiresAt || obj.expires_at) {
    entry.expiresAt = obj.expiresAt || obj.expires_at;
  }

  return entry;
}

/**
 * 简易 YAML 解析器 (不支持复杂结构)
 */
function parseSimpleYAML(content) {
  const result = {};
  const lines = content.split('\n');
  let currentKey = '';
  let currentArray = null;
  let indentLevel = 0;

  for (let line of lines) {
    // 空行
    if (!line.trim()) continue;

    // 计算缩进
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // 数组项
    if (trimmed.startsWith('- ')) {
      if (currentArray) {
        const value = trimmed.slice(2).trim();
        // 尝试解析 key: value
        const kvMatch = value.match(/^([a-z_]+):\s*(.+)$/);
        if (kvMatch) {
          const obj = {};
          obj[kvMatch[1]] = parseYAMLValue(kvMatch[2]);
          currentArray.push(obj);
        } else {
          currentArray.push(parseYAMLValue(value));
        }
      }
      continue;
    }

    // key: value
    const kvMatch = trimmed.match(/^([a-z_][a-z0-9_]+):\s*(.*)$/i);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2];

      if (value === '' || value === '|') {
        // 多行值或数组开始
        if (indent > indentLevel) {
          currentArray = [];
          result[currentKey] = currentArray;
        }
      } else {
        result[currentKey] = parseYAMLValue(value);
        currentArray = null;
      }

      indentLevel = indent;
    }
  }

  return result;
}

function parseYAMLValue(value) {
  // 移除引号
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // 数字
  if (!isNaN(value) && value !== '') {
    return value.includes('.') ? parseFloat(value) : parseInt(value);
  }

  // 布尔
  if (value === 'true') return true;
  if (value === 'false') return false;

  // null
  if (value === 'null') return null;

  return value;
}

// ============================================
// 导出模块接口
// ============================================

window.UATMemoryParser = {
  parseMemoryToEntries,
  parseClassAMemory,
  parseClassBMemory,
  parseClassCMemory,
  parseMarkdownMemory,
  parseMarkdownJSONBlock,
  parseMarkdownTable,
  parseMarkdownList,
  parsePlainTextMemory,
  createMemoryEntryFromData,
  createMemoryEntryFromObject,
  parseSimpleYAML,
  PLATFORM_MEMORY_CLASSES
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATMemoryParser;
}
// ===== src/encoder/encoder-pool.js =====
/**
 * UAT Encoder Pool - 编码器调度器（精简版）
 * 仅负责调度，实际编码由各平台 Bundle 完成
 *
 * v2.1 重构说明：
 * - 删除冗余编码函数（与 Bundle 重复）
 * - 统一调用 Bundle.encodeToFiles() 确保输出完整
 * - 保持向后兼容，runEncoderPool 返回主文件内容
 */

// ============================================
// 编码器统一调度器
// ============================================

function runEncoderPool(schema, targetPlatform) {
  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('Schema 结构不合法');
  }

  // 获取目标 Bundle
  const bundles = {
    dify: window.DifyBundle,
    openclaw: window.OpenClawBundle,
    hermes: window.HermesBundle,
    cursor: window.CursorBundle,
    windsurf: window.WindsurfBundle,
    claude: window.ClaudeCodeBundle,
    fastgpt: window.FastGPTBundle,
    flowise: window.FlowiseBundle,
    copilot: window.CopilotBundle,
    codex: window.CodexBundle,
    zed: window.ZedBundle
  };

  const bundle = bundles[targetPlatform];
  if (!bundle) {
    throw new Error(`不支持的平台: ${targetPlatform}`);
  }

  // 调用 Bundle 的 encodeToFiles 获取完整文件结构
  const files = bundle.encodeToFiles(schema);

  // 返回主文件内容（向后兼容单文件输出场景）
  const mainFile = Object.keys(files)[0];
  return files[mainFile] || '';
}

// ============================================
// 辅助函数：获取所有文件（新增）
// ============================================

function runEncoderPoolGetFiles(schema, targetPlatform) {
  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('Schema 结构不合法');
  }

  const bundles = {
    dify: window.DifyBundle,
    openclaw: window.OpenClawBundle,
    hermes: window.HermesBundle,
    cursor: window.CursorBundle,
    windsurf: window.WindsurfBundle,
    claude: window.ClaudeCodeBundle,
    fastgpt: window.FastGPTBundle,
    flowise: window.FlowiseBundle,
    copilot: window.CopilotBundle,
    codex: window.CodexBundle,
    zed: window.ZedBundle
  };

  const bundle = bundles[targetPlatform];
  if (!bundle) {
    throw new Error(`不支持的平台: ${targetPlatform}`);
  }

  return bundle.encodeToFiles(schema);
}

// ============================================
// 导出模块接口
// ============================================

window.UATEncoderLegacy = {
  runEncoderPool,
  runEncoderPoolGetFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATEncoderLegacy;
}
// Link global alias
runEncoderPool = window.runEncoderPool;

// ===== src/encoder/encoder-registry.js =====
/**
 * UAT Encoder Registry - 编码器注册表
 * 调度各平台 Bundle 的编码方法
 */

/**
 * UATEncoder 类 - 平台编码器
 * 支持多文件输出用于 UI 预览和 ZIP 打包
 */
class UATEncoder {
  constructor(platform) {
    this.platform = platform;
  }

  /**
   * 将 Schema 转换为平台文件结构
   * @param {Object} schema - UAT-Schema v2.0
   * @returns {Object} { path: content }
   */
  encodeToFiles(schema) {
    const encoders = {
      openclaw: window.OpenClawBundle?.encodeOpenClawToFiles,
      hermes: window.HermesBundle?.encodeHermesToFiles,
      cursor: window.CursorBundle?.encodeCursorToFiles,
      windsurf: window.WindsurfBundle?.encodeWindsurfToFiles,
      claude: window.ClaudeCodeBundle?.encodeClaudeToFiles,
      dify: window.DifyBundle?.encodeDifyToFiles,
      fastgpt: window.FastGPTBundle?.encodeFastGPTToFiles,
      codex: window.CodexBundle?.encodeCodexToFiles,
      flowise: window.FlowiseBundle?.encodeFlowiseToFiles,
      copilot: window.CopilotBundle?.encodeCopilotToFiles,
      zed: window.ZedBundle?.encodeZedToFiles
    };

    const encoder = encoders[this.platform];
    if (encoder) {
      return encoder(schema);
    }

    // Fallback: 单文件格式
    return { 'agent.txt': JSON.stringify(schema, null, 2) };
  }

  /**
   * 静态方法：获取平台编码器
   * @param {string} platform - 目标平台
   * @returns {UATEncoder} 编码器实例
   */
  static getEncoder(platform) {
    return new UATEncoder(platform);
  }
}

// ============================================
// 导出模块接口
// ============================================

window.UATEncoder = UATEncoder;

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UATEncoder;
}
// UATEncoder class defined above and exported to window.UATEncoder

// ===== src/encoder/memory-encoder.js =====
/**
 * UAT Memory Encoder v1.0 - G系列 memoryEntries编码器
 * 支持多种输出格式：YAML、JSON、JSON代码块、表格、列表
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

// ============================================
// memoryEntries → YAML格式 (Dify)
// ============================================

/**
 * 编码memoryEntries为Dify YAML格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} YAML字符串
 */
function encodeMemoryEntriesToYAML(entries) {
  if (!entries || entries.length === 0) return '';

  let yaml = 'memory:\n';
  yaml += '  long_term:\n';

  entries.forEach(entry => {
    const content = entry.content || '';
    // YAML字符串转义
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    yaml += `    - "${escaped}"\n`;
  });

  return yaml;
}

/**
 * 编码memoryEntries为Hermes YAML格式（带类型）
 * @param {Array} entries - memoryEntries数组
 * @returns {string} YAML字符串
 */
function encodeMemoryEntriesToYAMLWithType(entries) {
  if (!entries || entries.length === 0) return '';

  let yaml = 'memory:\n';
  yaml += '  entries:\n';

  entries.forEach(entry => {
    yaml += `    - id: "${entry.id || getUATCore().generateUUID()}"\n`;
    yaml += `      type: ${entry.type || 'fact'}\n`;
    yaml += `      content: "${escapeYAMLString(entry.content || '')}"\n`;
    if (entry.priority) yaml += `      priority: ${entry.priority}\n`;
    if (entry.category) yaml += `      category: ${entry.category}\n`;
  });

  return yaml;
}

// ============================================
// memoryEntries → JSON格式 (FastGPT/Flowise)
// ============================================

/**
 * 编码memoryEntries为JSON数组格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} JSON字符串
 */
function encodeMemoryEntriesToJSON(entries) {
  if (!entries || entries.length === 0) return '[]';

  const simplified = entries.map(entry => ({
    id: entry.id || getUATCore().generateUUID(),
    type: entry.type || 'fact',
    content: entry.content || '',
    priority: entry.priority || 0,
    category: entry.category || '',
    source: entry.source || 'imported'
  }));

  return JSON.stringify(simplified, null, 2);
}

/**
 * 编码memoryEntries为FastGPT memory配置格式
 * @param {Array} entries - memoryEntries数组
 * @returns {Object} FastGPT memory配置对象
 */
function encodeMemoryEntriesToFastGPTFormat(entries) {
  return {
    longTermMemory: entries.map(e => ({
      id: e.id || getUATCore().generateUUID(),
      type: e.type || 'fact',
      content: e.content || '',
      importance: (e.priority || 5) / 10
    })),
    sessionMemory: {
      enabled: true,
      maxMessages: 50
    }
  };
}

/**
 * 编码memoryEntries为Flowise节点格式
 * @param {Array} entries - memoryEntries数组
 * @returns {Object} Flowise memory节点配置
 */
function encodeMemoryEntriesToFlowiseFormat(entries) {
  return {
    memory: entries.map(e => ({
      type: e.type || 'fact',
      content: e.content || ''
    }))
  };
}

// ============================================
// memoryEntries → JSON代码块格式 (Claude/Zed)
// ============================================

/**
 * 编码memoryEntries为JSON代码块格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown JSON代码块
 */
function encodeMemoryEntriesToJSONBlock(entries) {
  if (!entries || entries.length === 0) return '';

  const memoryObj = {
    memoryEntries: entries.map(entry => ({
      id: entry.id || getUATCore().generateUUID(),
      type: entry.type || 'fact',
      content: entry.content || '',
      priority: entry.priority || 0,
      source: entry.source || 'imported',
      createdAt: entry.createdAt || new Date().toISOString()
    }))
  };

  return '```json\n' + JSON.stringify(memoryObj, null, 2) + '\n```';
}

/**
 * 编码memoryEntries为Claude CLAUDE.md格式（带Memory章节）
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown Memory章节
 */
function encodeMemoryEntriesToClaudeMD(entries) {
  if (!entries || entries.length === 0) return '';

  let md = '## Memory\n\n';
  md += 'Structured memory entries:\n\n';
  md += encodeMemoryEntriesToJSONBlock(entries);

  return md;
}

// ============================================
// memoryEntries → Markdown表格格式 (Codex)
// ============================================

/**
 * 编码memoryEntries为Markdown表格格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown表格
 */
function encodeMemoryEntriesToTable(entries) {
  if (!entries || entries.length === 0) return '';

  let table = '## Memory\n\n';
  table += '| Type | Content | Priority | Category |\n';
  table += '|------|---------|----------|----------|\n';

  entries.forEach(entry => {
    const type = entry.type || 'fact';
    const content = (entry.content || '').substring(0, 50); // 截断过长内容
    const priority = entry.priority || 0;
    const category = entry.category || '';
    table += `| ${type} | ${content} | ${priority} | ${category} |\n`;
  });

  return table;
}

/**
 * 编码memoryEntries为Codex AGENTS.md格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown Memory章节
 */
function encodeMemoryEntriesToCodexMD(entries) {
  if (!entries || entries.length === 0) return '';

  return encodeMemoryEntriesToTable(entries);
}

// ============================================
// memoryEntries → Markdown列表格式 (Cursor/Windsurf/Copilot)
// ============================================

/**
 * 编码memoryEntries为分类列表格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown分类列表
 */
function encodeMemoryEntriesToList(entries) {
  if (!entries || entries.length === 0) return '';

  // 按类型分组
  const grouped = {};
  entries.forEach(entry => {
    const type = entry.type || 'fact';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(entry);
  });

  let list = '## Memory\n\n';

  Object.entries(grouped).forEach(([type, items]) => {
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    list += `### ${typeName}\n\n`;

    items.forEach(entry => {
      list += `- ${entry.content || ''}\n`;
    });

    list += '\n';
  });

  return list;
}

/**
 * 编码memoryEntries为Cursor .cursorrules格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown Memory章节
 */
function encodeMemoryEntriesToCursorRules(entries) {
  return encodeMemoryEntriesToList(entries);
}

/**
 * 编码memoryEntries为Windsurf .windsurfrules格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown Memory章节
 */
function encodeMemoryEntriesToWindsurfRules(entries) {
  return encodeMemoryEntriesToList(entries);
}

/**
 * 编码memoryEntries为Copilot instructions格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown Memory章节
 */
function encodeMemoryEntriesToCopilotInstructions(entries) {
  return encodeMemoryEntriesToList(entries);
}

// ============================================
// memoryEntries → OpenClaw格式 (JSON + MD)
// ============================================

/**
 * 编码memoryEntries为OpenClaw JSON配置格式
 * @param {Array} entries - memoryEntries数组
 * @returns {Object} OpenClaw memory配置对象
 */
function encodeMemoryEntriesToOpenClawJSON(entries) {
  return {
    entries: entries.map(entry => ({
      id: entry.id || getUATCore().generateUUID(),
      type: entry.type || 'fact',
      content: entry.content || '',
      priority: entry.priority || 0,
      category: entry.category || '',
      source: entry.source || 'imported',
      createdAt: entry.createdAt || new Date().toISOString()
    }))
  };
}

/**
 * 编码memoryEntries为OpenClaw MEMORY.md格式
 * @param {Array} entries - memoryEntries数组
 * @returns {string} Markdown MEMORY.md内容
 */
function encodeMemoryEntriesToOpenClawMD(entries) {
  if (!entries || entries.length === 0) return '# Memory\n\nNo memory entries.';

  let md = '# Memory\n\n';
  md += '## Entries\n\n';
  md += '| Type | Content | Priority | Source |\n';
  md += '|------|---------|----------|--------|\n';

  entries.forEach(entry => {
    md += `| ${entry.type || 'fact'} | ${(entry.content || '').substring(0, 40)} | ${entry.priority || 0} | ${entry.source || 'imported'} |\n`;
  });

  return md;
}

// ============================================
// 辅助函数
// ============================================

/**
 * YAML字符串转义
 */
function escapeYAMLString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * 从longTermMemory（旧格式）迁移到memoryEntries
 * @param {Array|string} longTermMemory - 旧格式长期记忆
 * @returns {Array} memoryEntries数组
 */
function migrateLongTermMemoryToEntries(longTermMemory) {
  const entries = [];

  if (!longTermMemory) return entries;

  if (typeof longTermMemory === 'string') {
    // 单字符串
    if (longTermMemory.trim()) {
      entries.push({
        id: getUATCore().generateUUID(),
        type: 'fact',
        content: longTermMemory,
        priority: 5,
        source: 'migrated'
      });
    }
  } else if (Array.isArray(longTermMemory)) {
    // 数组
    longTermMemory.forEach(item => {
      if (typeof item === 'string' && item.trim()) {
        entries.push({
          id: getUATCore().generateUUID(),
          type: 'fact',
          content: item,
          priority: 5,
          source: 'migrated'
        });
      } else if (typeof item === 'object' && item.content) {
        entries.push({
          id: item.id || getUATCore().generateUUID(),
          type: item.type || 'fact',
          content: item.content,
          priority: item.priority || item.importance * 10 || 5,
          category: item.category || '',
          source: item.source || 'migrated'
        });
      }
    });
  }

  return entries;
}

// ============================================
// 统一调度函数
// ============================================

/**
 * 根据平台编码memoryEntries
 * @param {Array} entries - memoryEntries数组
 * @param {string} platform - 目标平台
 * @param {string} format - 输出格式 (json/yaml/md)
 * @returns {string|Object} 编码结果
 */
function encodeMemoryEntriesForPlatform(entries, platform, format = 'auto') {
  const encoders = {
    // A类：JSON/YAML内嵌
    dify: { func: encodeMemoryEntriesToYAML, format: 'yaml' },
    fastgpt: { func: encodeMemoryEntriesToFastGPTFormat, format: 'json' },
    flowise: { func: encodeMemoryEntriesToFlowiseFormat, format: 'json' },

    // B类：JSON+MD分离
    openclaw: { func: encodeMemoryEntriesToOpenClawJSON, format: 'json', mdFunc: encodeMemoryEntriesToOpenClawMD },
    hermes: { func: encodeMemoryEntriesToYAMLWithType, format: 'yaml' },

    // C类：Markdown格式
    claude: { func: encodeMemoryEntriesToClaudeMD, format: 'md' },
    zed: { func: encodeMemoryEntriesToJSONBlock, format: 'md' },
    codex: { func: encodeMemoryEntriesToCodexMD, format: 'md' },
    cursor: { func: encodeMemoryEntriesToCursorRules, format: 'md' },
    windsurf: { func: encodeMemoryEntriesToWindsurfRules, format: 'md' },
    copilot: { func: encodeMemoryEntriesToCopilotInstructions, format: 'md' }
  };

  const encoder = encoders[platform];
  if (!encoder) {
    // 默认：JSON格式
    return encodeMemoryEntriesToJSON(entries);
  }

  return encoder.func(entries);
}

/**
 * 获取平台的MD格式编码器（用于B类平台）
 * @param {string} platform - 平台名称
 * @returns {Function|null} MD编码函数
 */
function getMemoryEncoderMD(platform) {
  const encoders = {
    openclaw: encodeMemoryEntriesToOpenClawMD
  };

  return encoders[platform] || null;
}

// ============================================
// 导出模块接口
// ============================================

window.UATMemoryEncoder = {
  // YAML格式
  encodeMemoryEntriesToYAML,
  encodeMemoryEntriesToYAMLWithType,

  // JSON格式
  encodeMemoryEntriesToJSON,
  encodeMemoryEntriesToFastGPTFormat,
  encodeMemoryEntriesToFlowiseFormat,

  // JSON代码块格式
  encodeMemoryEntriesToJSONBlock,
  encodeMemoryEntriesToClaudeMD,

  // 表格格式
  encodeMemoryEntriesToTable,
  encodeMemoryEntriesToCodexMD,

  // 列表格式
  encodeMemoryEntriesToList,
  encodeMemoryEntriesToCursorRules,
  encodeMemoryEntriesToWindsurfRules,
  encodeMemoryEntriesToCopilotInstructions,

  // OpenClaw格式
  encodeMemoryEntriesToOpenClawJSON,
  encodeMemoryEntriesToOpenClawMD,

  // 统一调度
  encodeMemoryEntriesForPlatform,
  getMemoryEncoderMD,

  // 辅助函数
  escapeYAMLString,
  migrateLongTermMemoryToEntries
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATMemoryEncoder;
}
// ===== src/encoder/knowledge-encoder.js =====
/**
 * UAT Knowledge Encoder v1.0 - G系列 knowledgeBaseContent编码器
 * 支持多种输出格式：YAML、JSON、Markdown
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

// ============================================
// knowledgeBaseContent → YAML格式 (Dify)
// ============================================

/**
 * 编码knowledgeBaseContent为Dify YAML格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {string} YAML字符串
 */
function encodeKnowledgeToDifyYAML(kbContent) {
  if (!kbContent || !kbContent.datasets?.length) return '';

  let yaml = 'knowledge_base:\n';
  yaml += '  datasets:\n';

  kbContent.datasets.forEach(ds => {
    yaml += `    - id: "${ds.id || getUATCore().generateUUID()}"\n`;
    yaml += `      name: "${escapeYAMLString(ds.name || 'Dataset')}"\n`;
    if (ds.type) yaml += `      type: ${ds.type}\n`;
    if (ds.content) {
      yaml += `      content: "${escapeYAMLString(ds.content.substring(0, 500))}"\n`;
    }
  });

  return yaml;
}

/**
 * 编码知识库引用为Dify YAML格式（仅引用）
 * @param {Array} kbRefs - knowledgeBaseRef数组
 * @returns {string} YAML字符串
 */
function encodeKnowledgeRefToDifyYAML(kbRefs) {
  if (!kbRefs || kbRefs.length === 0) return '';

  let yaml = 'knowledge_base:\n';
  yaml += '  datasets:\n';

  kbRefs.forEach(ref => {
    yaml += `    - id: "${ref.id || ''}"\n`;
    yaml += `      name: "${escapeYAMLString(ref.name || 'Knowledge Base')}"\n`;
  });

  return yaml;
}

// ============================================
// knowledgeBaseContent → JSON格式 (FastGPT/Flowise)
// ============================================

/**
 * 编码knowledgeBaseContent为FastGPT JSON格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {Object} FastGPT datasets配置
 */
function encodeKnowledgeToFastGPTJSON(kbContent) {
  if (!kbContent) return { datasets: [] };

  const datasets = [];

  // datasets
  if (kbContent.datasets?.length) {
    kbContent.datasets.forEach(ds => {
      datasets.push({
        id: ds.id || getUATCore().generateUUID(),
        name: ds.name || 'Dataset',
        type: ds.type || 'external',
        content: ds.content || ''
      });
    });
  }

  // documents
  if (kbContent.documents?.length) {
    kbContent.documents.forEach(doc => {
      datasets.push({
        id: doc.id || getUATCore().generateUUID(),
        name: doc.title || 'Document',
        type: 'document',
        content: doc.content || ''
      });
    });
  }

  return {
    datasets: {
      datasets
    }
  };
}

/**
 * 编码知识库引用为FastGPT格式（仅引用）
 * @param {Array} kbRefs - knowledgeBaseRef数组
 * @returns {Object} FastGPT datasets引用配置
 */
function encodeKnowledgeRefToFastGPTJSON(kbRefs) {
  if (!kbRefs || kbRefs.length === 0) return { datasets: { datasets: [] } };

  return {
    datasets: {
      datasets: kbRefs.map(ref => ({
        id: ref.id || '',
        name: ref.name || 'Knowledge Base',
        type: ref.type || 'external'
      }))
    }
  };
}

/**
 * 编码knowledgeBaseContent为Flowise JSON格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {Object} Flowise知识库配置
 */
function encodeKnowledgeToFlowiseJSON(kbContent) {
  if (!kbContent) return {};

  const result = {
    vectorStore: {
      documents: []
    }
  };

  // documents转换为vectorStore格式
  if (kbContent.documents?.length) {
    kbContent.documents.forEach(doc => {
      result.vectorStore.documents.push({
        content: doc.content || '',
        metadata: {
          source: doc.source || '',
          title: doc.title || ''
        }
      });
    });
  }

  return result;
}

// ============================================
// knowledgeBaseContent → JSON+MD格式 (OpenClaw/Hermes)
// ============================================

/**
 * 编码knowledgeBaseContent为OpenClaw JSON格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {Object} OpenClaw knowledge_base配置
 */
function encodeKnowledgeToOpenClawJSON(kbContent) {
  if (!kbContent) return { datasets: [] };

  const datasets = [];

  if (kbContent.datasets?.length) {
    kbContent.datasets.forEach(ds => {
      datasets.push({
        id: ds.id || getUATCore().generateUUID(),
        name: ds.name || 'Dataset',
        type: ds.type || 'text',
        source: ds.source || '',
        size: ds.metadata?.size || 0
      });
    });
  }

  if (kbContent.documents?.length) {
    kbContent.documents.forEach(doc => {
      datasets.push({
        id: doc.id || getUATCore().generateUUID(),
        name: doc.title || 'Document',
        type: 'document',
        source: doc.source || ''
      });
    });
  }

  return {
    datasets
  };
}

/**
 * 编码knowledgeBaseContent为KNOWLEDGE.md格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {string} Markdown内容
 */
function encodeKnowledgeToMarkdown(kbContent) {
  if (!kbContent) return '# Knowledge Base\n\nNo knowledge content.';

  let md = '# Knowledge Base\n\n';

  // Datasets
  if (kbContent.datasets?.length) {
    md += '## Datasets\n\n';
    kbContent.datasets.forEach(ds => {
      md += `### ${ds.name || 'Dataset'}\n\n`;
      if (ds.content) {
        md += `${ds.content.substring(0, 1000)}\n\n`;
      }
    });
  }

  // Documents
  if (kbContent.documents?.length) {
    md += '## Documents\n\n';
    kbContent.documents.forEach(doc => {
      md += `### ${doc.title || 'Document'}\n\n`;
      if (doc.content) {
        md += `${doc.content.substring(0, 1000)}\n\n`;
      }
    });
  }

  // Q&A Pairs
  if (kbContent.qaPairs?.length) {
    md += '## Q&A\n\n';
    kbContent.qaPairs.forEach(qa => {
      md += `**Q:** ${qa.question || ''}\n\n`;
      md += `**A:** ${qa.answer || ''}\n\n`;
    });
  }

  // Rules
  if (kbContent.rules?.length) {
    md += '## Rules\n\n';
    kbContent.rules.forEach(rule => {
      md += `- **${rule.name || 'Rule'}**: ${rule.condition || ''} → ${rule.action || ''}\n`;
    });
  }

  return md;
}

/**
 * 编码knowledgeBaseContent为Hermes YAML格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {string} YAML字符串
 */
function encodeKnowledgeToHermesYAML(kbContent) {
  if (!kbContent) return '';

  let yaml = 'knowledge_base:\n';

  if (kbContent.datasets?.length) {
    yaml += '  datasets:\n';
    kbContent.datasets.forEach(ds => {
      yaml += `    - id: "${ds.id || getUATCore().generateUUID()}"\n`;
      yaml += `      name: "${escapeYAMLString(ds.name || 'Dataset')}"\n`;
    });
  }

  if (kbContent.documents?.length) {
    yaml += '  documents:\n';
    kbContent.documents.forEach(doc => {
      yaml += `    - id: "${doc.id || getUATCore().generateUUID()}"\n`;
      yaml += `      title: "${escapeYAMLString(doc.title || 'Document')}"\n`;
    });
  }

  return yaml;
}

// ============================================
// 知识库引用处理
// ============================================

/**
 * 编码知识库引用为通用Markdown提示
 * @param {Array} kbRefs - knowledgeBaseRef数组
 * @returns {string} Markdown提示内容
 */
function encodeKnowledgeRefToMarkdown(kbRefs) {
  if (!kbRefs || kbRefs.length === 0) return '';

  let md = '## Knowledge Base\n\n';
  md += 'The following knowledge bases were referenced:\n\n';

  kbRefs.forEach(ref => {
    md += `- **${ref.name || 'Knowledge Base'}** (${ref.id || 'no-id'})\n`;
  });

  md += '\nNote: Knowledge content needs to be uploaded to the target platform manually.\n';

  return md;
}

/**
 * 编码knowledgeBaseContent为Markdown列表格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {string} Markdown列表内容
 */
function encodeKnowledgeToList(kbContent) {
  if (!kbContent) return '';

  let md = '## Knowledge Base\n\n';

  // Datasets
  if (kbContent.datasets?.length) {
    md += '### Datasets\n\n';
    kbContent.datasets.forEach(ds => {
      md += `- **${ds.name || 'Dataset'}** (${ds.type || 'text'})\n`;
      if (ds.content) {
        md += `  ${ds.content.substring(0, 200)}${ds.content.length > 200 ? '...' : ''}\n`;
      }
    });
    md += '\n';
  }

  // Documents
  if (kbContent.documents?.length) {
    md += '### Documents\n\n';
    kbContent.documents.forEach(doc => {
      md += `- **${doc.title || 'Document'}**\n`;
      if (doc.source) {
        md += `  Source: ${doc.source}\n`;
      }
    });
    md += '\n';
  }

  // Q&A Pairs
  if (kbContent.qaPairs?.length) {
    md += '### Q&A Pairs\n\n';
    md += `- ${kbContent.qaPairs.length} Q&A pairs available\n\n`;
  }

  // Rules
  if (kbContent.rules?.length) {
    md += '### Rules\n\n';
    kbContent.rules.forEach(rule => {
      md += `- **${rule.name || 'Rule'}**: ${rule.condition || ''}\n`;
    });
    md += '\n';
  }

  return md;
}

// ============================================
// CSV导出格式
// ============================================

/**
 * 编码knowledgeBaseContent为CSV格式
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @returns {string} CSV字符串
 */
function encodeKnowledgeToCSV(kbContent) {
  if (!kbContent) return '';

  let csv = 'type,id,name,content\n';

  kbContent.datasets?.forEach(ds => {
    csv += `dataset,"${ds.id}","${escapeCSVField(ds.name)}","${escapeCSVField(ds.content?.substring(0, 200))}"\n`;
  });

  kbContent.documents?.forEach(doc => {
    csv += `document,"${doc.id}","${escapeCSVField(doc.title)}","${escapeCSVField(doc.content?.substring(0, 200))}"\n`;
  });

  kbContent.qaPairs?.forEach(qa => {
    csv += `qa,"${qa.id}","${escapeCSVField(qa.question)}","${escapeCSVField(qa.answer)}"\n`;
  });

  return csv;
}

function escapeCSVField(str) {
  if (!str) return '';
  return str.replace(/"/g, '""').replace(/\n/g, '\\n');
}

// ============================================
// 辅助函数
// ============================================

function escapeYAMLString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * 合并knowledgeBaseRef和knowledgeBaseContent
 * @param {Array} kbRefs - 知识库引用
 * @param {Object} kbContent - 知识库内容
 * @returns {Object} 合并后的知识库配置
 */
function mergeKnowledgeBase(kbRefs, kbContent) {
  const merged = {
    refs: kbRefs || [],
    content: kbContent || {},
    hasContent: false
  };

  if (kbContent) {
    merged.hasContent = (kbContent.datasets?.length > 0) ||
                        (kbContent.documents?.length > 0) ||
                        (kbContent.qaPairs?.length > 0);
  }

  return merged;
}

// ============================================
// 统一调度函数
// ============================================

/**
 * 根据平台编码knowledgeBaseContent
 * @param {Object} kbContent - knowledgeBaseContent对象
 * @param {string} platform - 目标平台
 * @param {string} format - 输出格式 (json/yaml/md)
 * @returns {string|Object} 编码结果
 */
function encodeKnowledgeForPlatform(kbContent, platform, format = 'auto') {
  const encoders = {
    // A类：内嵌内容
    dify: { func: encodeKnowledgeToDifyYAML, format: 'yaml' },
    fastgpt: { func: encodeKnowledgeToFastGPTJSON, format: 'json' },
    flowise: { func: encodeKnowledgeToFlowiseJSON, format: 'json' },

    // B类：JSON+MD分离
    openclaw: { func: encodeKnowledgeToOpenClawJSON, format: 'json', mdFunc: encodeKnowledgeToMarkdown },
    hermes: { func: encodeKnowledgeToHermesYAML, format: 'yaml', mdFunc: encodeKnowledgeToMarkdown }
  };

  const encoder = encoders[platform];

  if (!encoder) {
    // C类：仅引用或Markdown提示
    return encodeKnowledgeRefToMarkdown(null);
  }

  return encoder.func(kbContent);
}

/**
 * 获取平台的MD格式编码器
 * @param {string} platform - 平台名称
 * @returns {Function|null} MD编码函数
 */
function getKnowledgeEncoderMD(platform) {
  const encoders = {
    openclaw: encodeKnowledgeToMarkdown,
    hermes: encodeKnowledgeToMarkdown
  };

  return encoders[platform] || encodeKnowledgeRefToMarkdown;
}

// ============================================
// 导出模块接口
// ============================================

window.UATKnowledgeEncoder = {
  // YAML格式
  encodeKnowledgeToDifyYAML,
  encodeKnowledgeToHermesYAML,
  encodeKnowledgeRefToDifyYAML,

  // JSON格式
  encodeKnowledgeToFastGPTJSON,
  encodeKnowledgeToFlowiseJSON,
  encodeKnowledgeToOpenClawJSON,
  encodeKnowledgeRefToFastGPTJSON,

  // Markdown格式
  encodeKnowledgeToMarkdown,
  encodeKnowledgeRefToMarkdown,
  encodeKnowledgeToList,

  // CSV格式
  encodeKnowledgeToCSV,

  // 统一调度
  encodeKnowledgeForPlatform,
  getKnowledgeEncoderMD,

  // 辅助函数
  mergeKnowledgeBase,
  escapeYAMLString
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATKnowledgeEncoder;
}
// ===== src/encoder/skills-encoder.js =====
/**
 * UAT Skills Encoder v1.0 - G系列 skillsLayer编码器
 * 支持多种输出格式：YAML、JSON、Markdown列表、表格
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

// ============================================
// skillsLayer → YAML格式 (Dify/Hermes)
// ============================================

/**
 * 编码skillsLayer为Dify YAML格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} YAML字符串
 */
function encodeSkillsToDifyYAML(skills) {
  if (!skills || !skills.skills?.length) return '';

  let yaml = 'skills:\n';

  skills.skills.forEach(skill => {
    yaml += `  - name: "${escapeYAMLString(skill.name || 'Skill')}"\n`;
    yaml += `    description: "${escapeYAMLString(skill.description || '')}"\n`;
    if (skill.category) yaml += `    category: ${skill.category}\n`;
    if (skill.level) yaml += `    level: ${skill.level}\n`;
  });

  return yaml;
}

/**
 * 编码skillsLayer为Hermes YAML格式（带完整属性）
 * @param {Object} skills - skillsLayer对象
 * @returns {string} YAML字符串
 */
function encodeSkillsToHermesYAML(skills) {
  if (!skills || !skills.skills?.length) return '';

  let yaml = 'skills:\n';

  skills.skills.forEach(skill => {
    yaml += `  - id: "${skill.id || getUATCore().generateUUID()}"\n`;
    yaml += `    name: "${escapeYAMLString(skill.name || 'Skill')}"\n`;
    yaml += `    category: ${skill.category || 'general'}\n`;
    yaml += `    level: ${skill.level || 1}\n`;
    if (skill.description) yaml += `    description: "${escapeYAMLString(skill.description)}"\n`;
    if (skill.source) yaml += `    source: ${skill.source}\n`;
    if (skill.confidence) yaml += `    confidence: ${skill.confidence}\n`;
  });

  return yaml;
}

// ============================================
// skillsLayer → JSON格式 (FastGPT/Flowise/OpenClaw)
// ============================================

/**
 * 编码skillsLayer为FastGPT JSON格式
 * @param {Object} skills - skillsLayer对象
 * @returns {Object} FastGPT skills配置
 */
function encodeSkillsToFastGPTJSON(skills) {
  if (!skills) return { skills: [] };

  return {
    skills: skills.skills?.map(skill => ({
      id: skill.id || getUATCore().generateUUID(),
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || '',
      enabled: skill.enabled !== false
    })) || []
  };
}

/**
 * 编码skillsLayer为Flowise JSON格式
 * @param {Object} skills - skillsLayer对象
 * @returns {Object} Flowise skills配置
 */
function encodeSkillsToFlowiseJSON(skills) {
  if (!skills) return {};

  return {
    skills: skills.skills?.map(skill => ({
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || ''
    })) || []
  };
}

/**
 * 编码skillsLayer为OpenClaw JSON格式
 * @param {Object} skills - skillsLayer对象
 * @returns {Object} OpenClaw skills配置
 */
function encodeSkillsToOpenClawJSON(skills) {
  if (!skills) return { skills: [] };

  return {
    skills: skills.skills?.map(skill => ({
      id: skill.id || getUATCore().generateUUID(),
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || '',
      source: skill.source || 'inferred',
      createdAt: skill.createdAt || new Date().toISOString()
    })) || [],
    inferenceMetadata: skills.inferenceMetadata || {
      source: 'parser',
      confidence: 0.8,
      inferredAt: new Date().toISOString()
    }
  };
}

// ============================================
// skillsLayer → Markdown格式 (OpenClaw/Codex/Cursor)
// ============================================

/**
 * 编码skillsLayer为Markdown列表格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown内容
 */
function encodeSkillsToMarkdownList(skills) {
  if (!skills || !skills.skills?.length) return '';

  // 按类别分组
  const grouped = {};
  skills.skills.forEach(skill => {
    const category = skill.category || 'general';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(skill);
  });

  let md = '## Skills\n\n';

  Object.entries(grouped).forEach(([category, items]) => {
    const categoryName = getCategoryDisplayName(category);
    md += `### ${categoryName}\n\n`;

    items.forEach(skill => {
      const levelStars = getLevelStars(skill.level || 1);
      md += `- **${skill.name || 'Skill'}** ${levelStars}\n`;
      if (skill.description) {
        md += `  ${skill.description}\n`;
      }
    });

    md += '\n';
  });

  return md;
}

/**
 * 编码skillsLayer为简单列表格式（别名）
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown列表内容
 */
function encodeSkillsToList(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';

  skills.skills.forEach(skill => {
    md += `- **${skill.name || 'Skill'}**: ${skill.description || 'No description'}\n`;
  });

  return md;
}

/**
 * 编码skillsLayer为Markdown表格格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown表格
 */
function encodeSkillsToMarkdownTable(skills) {
  if (!skills || !skills.skills?.length) return '';

  let table = '## Skills\n\n';
  table += '| Name | Category | Level | Description |\n';
  table += '|------|----------|-------|-------------|\n';

  skills.skills.forEach(skill => {
    const name = skill.name || 'Skill';
    const category = getCategoryDisplayName(skill.category || 'general');
    const level = skill.level || 1;
    const desc = (skill.description || '').substring(0, 50);
    table += `| ${name} | ${category} | ${level} | ${desc} |\n`;
  });

  return table;
}

/**
 * 编码skillsLayer为SKILLS.md格式（OpenClaw专用）
 * @param {Object} skills - skillsLayer对象
 * @returns {string} SKILLS.md完整内容
 */
function encodeSkillsToOpenClawMD(skills) {
  if (!skills || !skills.skills?.length) {
    return '# Skills\n\nNo skills defined.\n';
  }

  let md = '# Skills\n\n';
  md += 'Agent capabilities and expertise areas.\n\n';

  // 总览统计
  const stats = getSkillsStats(skills);
  md += `**Total Skills**: ${stats.total}\n`;
  md += `**Categories**: ${stats.categories}\n\n`;

  md += encodeSkillsToMarkdownTable(skills);

  // 详细说明
  md += '\n## Details\n\n';

  skills.skills.forEach(skill => {
    md += `### ${skill.name || 'Skill'}\n\n`;
    md += `- **Category**: ${getCategoryDisplayName(skill.category || 'general')}\n`;
    md += `- **Level**: ${skill.level || 1}/5\n`;
    if (skill.description) {
      md += `- **Description**: ${skill.description}\n`;
    }
    if (skill.source) {
      md += `- **Source**: ${skill.source}\n`;
    }
    md += '\n';
  });

  return md;
}

/**
 * 编码skillsLayer为Codex AGENTS.md skills章节
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown Skills章节
 */
function encodeSkillsToCodexMD(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';
  md += 'The agent possesses the following capabilities:\n\n';

  skills.skills.forEach(skill => {
    md += `- **${skill.name || 'Skill'}** (${skill.category || 'general'})\n`;
    if (skill.description) {
      md += `  ${skill.description}\n`;
    }
  });

  return md;
}

/**
 * 编码skillsLayer为Cursor/Windsurf rules格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown Skills章节
 */
function encodeSkillsToCursorRules(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';

  skills.skills.forEach(skill => {
    md += `- ${skill.name || 'Skill'}: ${skill.description || 'No description'}\n`;
  });

  return md;
}

// ============================================
// skillsLayer → Claude/Zed JSON Block格式
// ============================================

/**
 * 编码skillsLayer为JSON代码块格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown JSON代码块
 */
function encodeSkillsToJSONBlock(skills) {
  if (!skills) return '';

  const skillsObj = {
    skills: skills.skills?.map(skill => ({
      id: skill.id || getUATCore().generateUUID(),
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || '',
      source: skill.source || 'inferred'
    })) || [],
    inferenceMetadata: skills.inferenceMetadata || {}
  };

  return '```json\n' + JSON.stringify(skillsObj, null, 2) + '\n```';
}

/**
 * 编码skillsLayer为Claude SKILLS.md格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} SKILLS.md内容
 */
function encodeSkillsToClaudeMD(skills) {
  if (!skills || !skills.skills?.length) {
    return '# Skills\n\nNo skills defined.\n';
  }

  let md = '# Skills\n\n';
  md += 'Agent capabilities derived from configuration.\n\n';
  md += encodeSkillsToJSONBlock(skills);

  return md;
}

// ============================================
// skillsLayer → Copilot Instructions格式
// ============================================

/**
 * 编码skillsLayer为Copilot instructions格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown Skills章节
 */
function encodeSkillsToCopilotInstructions(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';
  md += 'I have expertise in:\n\n';

  skills.skills.forEach(skill => {
    md += `- ${skill.name || 'Skill'}\n`;
  });

  return md;
}

// ============================================
// 辅助函数
// ============================================

/**
 * YAML字符串转义
 */
function escapeYAMLString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * 获取类别显示名称
 */
function getCategoryDisplayName(category) {
  const names = {
    programming: 'Programming',
    analysis: 'Analysis',
    communication: 'Communication',
    tool: 'Tool Usage',
    domain: 'Domain Knowledge',
    general: 'General'
  };
  return names[category] || category;
}

/**
 * 获取等级星号表示
 */
function getLevelStars(level) {
  const maxLevel = 5;
  const normalizedLevel = Math.min(Math.max(level, 1), maxLevel);
  return '★'.repeat(normalizedLevel) + '☆'.repeat(maxLevel - normalizedLevel);
}

/**
 * 获取技能统计信息
 */
function getSkillsStats(skills) {
  if (!skills || !skills.skills) {
    return { total: 0, categories: 0 };
  }

  const categories = new Set(skills.skills.map(s => s.category || 'general'));
  return {
    total: skills.skills.length,
    categories: categories.size
  };
}

/**
 * 合并多个来源的技能
 * @param {Array} skillsArrays - 多个skills数组
 * @returns {Object} 合并后的skillsLayer
 */
function mergeSkills(skillsArrays) {
  const allSkills = [];
  const seen = new Set();

  skillsArrays.forEach(skills => {
    if (skills && skills.skills) {
      skills.skills.forEach(skill => {
        const key = `${skill.category || 'general'}:${skill.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          allSkills.push(skill);
        }
      });
    }
  });

  return {
    skills: allSkills,
    inferenceMetadata: {
      source: 'merged',
      confidence: 0.9,
      inferredAt: new Date().toISOString()
    }
  };
}

// ============================================
// 统一调度函数
// ============================================

/**
 * 根据平台编码skillsLayer
 * @param {Object} skills - skillsLayer对象
 * @param {string} platform - 目标平台
 * @param {string} format - 输出格式 (json/yaml/md)
 * @returns {string|Object} 编码结果
 */
function encodeSkillsForPlatform(skills, platform, format = 'auto') {
  const encoders = {
    // A类：内嵌格式
    dify: { func: encodeSkillsToDifyYAML, format: 'yaml' },
    hermes: { func: encodeSkillsToHermesYAML, format: 'yaml' },
    fastgpt: { func: encodeSkillsToFastGPTJSON, format: 'json' },
    flowise: { func: encodeSkillsToFlowiseJSON, format: 'json' },

    // B类：JSON+MD分离
    openclaw: { func: encodeSkillsToOpenClawJSON, format: 'json', mdFunc: encodeSkillsToOpenClawMD },
    codex: { func: encodeSkillsToMarkdownTable, format: 'md' },

    // C类：Markdown格式
    cursor: { func: encodeSkillsToCursorRules, format: 'md' },
    windsurf: { func: encodeSkillsToCursorRules, format: 'md' },
    claude: { func: encodeSkillsToClaudeMD, format: 'md' },
    copilot: { func: encodeSkillsToCopilotInstructions, format: 'md' },
    zed: { func: encodeSkillsToJSONBlock, format: 'md' }
  };

  const encoder = encoders[platform];
  if (!encoder) {
    // 默认：Markdown列表
    return encodeSkillsToMarkdownList(skills);
  }

  return encoder.func(skills);
}

/**
 * 获取平台的MD格式编码器（用于B类平台）
 * @param {string} platform - 平台名称
 * @returns {Function|null} MD编码函数
 */
function getSkillsEncoderMD(platform) {
  const encoders = {
    openclaw: encodeSkillsToOpenClawMD,
    codex: encodeSkillsToCodexMD
  };

  return encoders[platform] || encodeSkillsToMarkdownList;
}

// ============================================
// 导出模块接口
// ============================================

window.UATSkillsEncoder = {
  // YAML格式
  encodeSkillsToDifyYAML,
  encodeSkillsToHermesYAML,

  // JSON格式
  encodeSkillsToFastGPTJSON,
  encodeSkillsToFlowiseJSON,
  encodeSkillsToOpenClawJSON,

  // Markdown格式
  encodeSkillsToMarkdownList,
  encodeSkillsToList,
  encodeSkillsToMarkdownTable,
  encodeSkillsToOpenClawMD,
  encodeSkillsToCodexMD,
  encodeSkillsToCursorRules,
  encodeSkillsToClaudeMD,
  encodeSkillsToCopilotInstructions,

  // JSON代码块
  encodeSkillsToJSONBlock,

  // 统一调度
  encodeSkillsForPlatform,
  getSkillsEncoderMD,

  // 辅助函数
  escapeYAMLString,
  getCategoryDisplayName,
  getLevelStars,
  getSkillsStats,
  mergeSkills
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATSkillsEncoder;
}
// ===== src/encoder/mcp-encoder.js =====
/**
 * UAT MCP Encoder v1.0 - H系列 MCP配置编码器
 * 完整保留MCP配置，敏感信息脱敏，生成迁移提示
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

function getSecretsSanitizer() {
  return typeof UATSecretsSanitizer !== 'undefined' ? UATSecretsSanitizer : window.UATSecretsSanitizer;
}

// ============================================
// 敏感键识别
// ============================================

/**
 * 判断是否为敏感环境变量键
 * @param {string} key - 环境变量名
 * @returns {boolean} 是否敏感
 */
function isSecretEnvKey(key) {
  const secretPatterns = [
    /API_KEY/i,
    /SECRET/i,
    /TOKEN/i,
    /PASSWORD/i,
    /PASS/i,
    /PRIVATE/i,
    /AUTH/i,
    /CREDENTIAL/i,
    /ACCESS_KEY/i,
    /PRIVATE_KEY/i
  ];

  return secretPatterns.some(pattern => pattern.test(key));
}

/**
 * 获取脱敏后的环境变量值
 * @param {string} key - 环境变量名
 * @param {string} value - 原始值
 * @returns {string} 脱敏后的值
 */
function sanitizeEnvValue(key, value) {
  if (!value) return '';

  if (isSecretEnvKey(key)) {
    return '***需配置***';
  }

  return value;
}

// ============================================
// MCP配置编码
// ============================================

/**
 * 编码MCP配置为完整结构（脱敏+迁移提示）
 * @param {Array} mcpServers - MCP服务器数组
 * @param {string} targetPlatform - 目标平台
 * @returns {Array} 编码后的MCP配置
 */
function encodeMCPConfigComplete(mcpServers, targetPlatform) {
  if (!mcpServers || mcpServers.length === 0) return [];

  const encoded = [];

  mcpServers.forEach(mcp => {
    const encodedMcp = {
      id: mcp.id || getUATCore().generateUUID(),
      name: mcp.name || 'MCP Server',
      url: mcp.url || '',
      config: {
        transport: mcp.config?.transport || 'stdio',
        command: mcp.config?.command || '',
        args: mcp.config?.args || [],
        env: {},
        capabilities: mcp.config?.capabilities || ['tools']
      },
      tools: mcp.tools || [],
      enabled: mcp.enabled !== false,
      _migrationHint: generateMigrationHint(mcp, targetPlatform)
    };

    // 处理env变量：保留非敏感，脱敏敏感
    if (mcp.config?.env) {
      Object.entries(mcp.config.env).forEach(([key, value]) => {
        encodedMcp.config.env[key] = sanitizeEnvValue(key, value);
        if (isSecretEnvKey(key)) {
          encodedMcp._migrationHint.secretsToConfigure.push(key);
        }
      });
    }

    encoded.push(encodedMcp);
  });

  return encoded;
}

/**
 * 编码MCP配置为Dify YAML格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {string} YAML字符串
 */
function encodeMCPToDifyYAML(mcpServers) {
  if (!mcpServers || mcpServers.length === 0) return '';

  let yaml = 'mcp_servers:\n';

  mcpServers.forEach(mcp => {
    yaml += `  - name: "${mcp.name || 'MCP Server'}"\n`;
    yaml += `    transport: ${mcp.config?.transport || 'stdio'}\n`;
    if (mcp.config?.command) {
      yaml += `    command: "${mcp.config.command}"\n`;
    }
    if (mcp.config?.args?.length > 0) {
      yaml += `    args:\n`;
      mcp.config.args.forEach(arg => {
        yaml += `      - "${arg}"\n`;
      });
    }
    if (mcp.tools?.length > 0) {
      yaml += `    tools:\n`;
      mcp.tools.forEach(tool => {
        yaml += `      - name: "${tool.name || 'Tool'}"\n`;
        yaml += `        description: "${tool.description || ''}"\n`;
      });
    }
  });

  return yaml;
}

/**
 * 编码MCP配置为Hermes YAML格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {string} YAML字符串
 */
function encodeMCPToHermesYAML(mcpServers) {
  if (!mcpServers || mcpServers.length === 0) return '';

  let yaml = 'mcp:\n';
  yaml += '  servers:\n';

  mcpServers.forEach(mcp => {
    yaml += `    - id: "${mcp.id || getUATCore().generateUUID()}"\n`;
    yaml += `      name: "${mcp.name || 'MCP Server'}"\n`;
    yaml += `      transport: ${mcp.config?.transport || 'stdio'}\n`;
    if (mcp.config?.command) {
      yaml += `      command: "${mcp.config.command}"\n`;
    }
    if (mcp.config?.env) {
      yaml += '      env:\n';
      Object.entries(mcp.config.env).forEach(([key, value]) => {
        yaml += `        ${key}: "${sanitizeEnvValue(key, value)}"\n`;
      });
    }
    yaml += `      enabled: ${mcp.enabled !== false}\n`;
  });

  return yaml;
}

/**
 * 编码MCP配置为OpenClaw JSON格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {Object} JSON对象
 */
function encodeMCPToOpenClawJSON(mcpServers) {
  return {
    mcpServers: encodeMCPConfigComplete(mcpServers, 'openclaw'),
    migrationNotes: [
      'MCP servers need manual configuration after import',
      'Secrets marked with ***需配置*** need to be filled'
    ]
  };
}

/**
 * 编码MCP配置为FastGPT JSON格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {Object} JSON对象
 */
function encodeMCPToFastGPTJSON(mcpServers) {
  if (!mcpServers || mcpServers.length === 0) return { mcpServers: [] };

  return {
    mcpServers: mcpServers.map(mcp => ({
      id: mcp.id || getUATCore().generateUUID(),
      name: mcp.name || 'MCP Server',
      type: mcp.config?.transport || 'stdio',
      config: {
        command: mcp.config?.command || '',
        args: mcp.config?.args || [],
        envSecrets: Object.keys(mcp.config?.env || {})
          .filter(k => isSecretEnvKey(k))
      },
      tools: mcp.tools?.map(t => t.name) || [],
      enabled: mcp.enabled !== false
    }))
  };
}

/**
 * 编码MCP配置为Flowise JSON格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {Object} JSON对象
 */
function encodeMCPToFlowiseJSON(mcpServers) {
  if (!mcpServers || mcpServers.length === 0) return {};

  return {
    mcpNodes: mcpServers.map(mcp => ({
      type: 'MCPNode',
      id: mcp.id || getUATCore().generateUUID(),
      data: {
        label: mcp.name || 'MCP Server',
        transport: mcp.config?.transport || 'stdio',
        command: mcp.config?.command || '',
        tools: mcp.tools || []
      }
    }))
  };
}

// ============================================
// MCP配置Markdown格式
// ============================================

/**
 * 编码MCP配置为Markdown章节（Cursor/Windsurf/Claude）
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {string} Markdown内容
 */
function encodeMCPToMarkdownSection(mcpServers) {
  if (!mcpServers || mcpServers.length === 0) return '';

  let md = '## MCP Servers\n\n';
  md += '> MCP servers configured for this project:\n\n';

  mcpServers.forEach(mcp => {
    md += `### ${mcp.name || 'MCP Server'}\n\n`;
    md += `- **Transport**: ${mcp.config?.transport || 'stdio'}\n`;
    if (mcp.config?.command) {
      md += `- **Command**: \`${mcp.config.command}\`\n`;
    }
    if (mcp.config?.args?.length > 0) {
      md += `- **Args**: ${mcp.config.args.map(a => `\`${a}\``).join(', ')}\n`;
    }
    if (mcp.tools?.length > 0) {
      md += `- **Tools**: ${mcp.tools.map(t => t.name).join(', ')}\n`;
    }

    // 脱敏提示
    const secrets = Object.keys(mcp.config?.env || {})
      .filter(k => isSecretEnvKey(k));
    if (secrets.length > 0) {
      md += `- **⚠ Secrets to configure**: ${secrets.join(', ')}\n`;
    }
    md += '\n';
  });

  return md;
}

/**
 * 编码MCP配置为TOOLS.md MCP章节（OpenClaw）
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {string} Markdown内容
 */
function encodeMCPToOpenClawToolsMD(mcpServers) {
  if (!mcpServers || mcpServers.length === 0) return '';

  let md = '## MCP Servers\n\n';
  md += 'Model Context Protocol servers provide extended capabilities:\n\n';

  const encoded = encodeMCPConfigComplete(mcpServers, 'openclaw');

  encoded.forEach(mcp => {
    md += `### ${mcp.name}\n\n`;
    md += `| Property | Value |\n`;
    md += `|----------|-------|\n`;
    md += `| Transport | ${mcp.config.transport} |\n`;
    md += `| Command | \`${mcp.config.command || 'N/A'}\` |\n`;
    md += `| Capabilities | ${mcp.config.capabilities.join(', ')} |\n`;
    md += `| Enabled | ${mcp.enabled} |\n`;
    md += '\n';

    if (mcp._migrationHint.secretsToConfigure.length > 0) {
      md += `**⚠ Secrets needed**: ${mcp._migrationHint.secretsToConfigure.join(', ')}\n\n`;
    }

    if (mcp.tools?.length > 0) {
      md += '**Tools**:\n\n';
      mcp.tools.forEach(tool => {
        md += `- ${tool.name}: ${tool.description || 'No description'}\n`;
      });
      md += '\n';
    }
  });

  return md;
}

/**
 * 编码MCP配置为Claude settings.json格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {Object} settings.json MCP部分
 */
function encodeMCPToClaudeSettings(mcpServers) {
  const settings = { mcpServers: {} };

  if (!mcpServers || mcpServers.length === 0) return settings;

  mcpServers.forEach(mcp => {
    const key = mcp.name || 'MCP Server';
    settings.mcpServers[key] = {
      transport: mcp.config?.transport || 'stdio',
      command: mcp.config?.command || '',
      args: mcp.config?.args || [],
      env: {}
    };

    // 处理环境变量
    if (mcp.config?.env) {
      Object.entries(mcp.config.env).forEach(([k, v]) => {
        settings.mcpServers[key].env[k] = sanitizeEnvValue(k, v);
      });
    }
  });

  return settings;
}

/**
 * 编码MCP配置为Cursor/Windsurf mcp.json格式
 * @param {Array} mcpServers - MCP服务器数组
 * @returns {Object} mcp.json内容
 */
function encodeMCPToCursorMCPJSON(mcpServers) {
  return encodeMCPToClaudeSettings(mcpServers);
}

// ============================================
// 迁移提示生成
// ============================================

/**
 * 生成迁移提示信息
 * @param {Object} mcp - MCP服务器对象
 * @param {string} targetPlatform - 目标平台
 * @returns {Object} 迁移提示
 */
function generateMigrationHint(mcp, targetPlatform) {
  const hints = {
    platform: targetPlatform,
    settingsKey: '',
    secretsToConfigure: [],
    setupSteps: []
  };

  // 平台特定迁移路径
  switch (targetPlatform) {
    case 'claude':
      hints.settingsKey = `mcpServers.${mcp.name}`;
      hints.setupSteps = [
        'Add MCP server configuration to .claude/settings.json',
        'Configure secrets in .env file',
        'Restart Claude Code to load MCP servers'
      ];
      break;

    case 'cursor':
      hints.settingsKey = `.cursor/mcp.json → mcpServers.${mcp.name}`;
      hints.setupSteps = [
        'Add MCP server configuration to .cursor/mcp.json',
        'Configure secrets in .env file',
        'Cursor will auto-detect MCP servers on project open'
      ];
      break;

    case 'windsurf':
      hints.settingsKey = `.windsurf/mcp.json → mcpServers.${mcp.name}`;
      hints.setupSteps = [
        'Add MCP server configuration to .windsurf/mcp.json',
        'Configure secrets in .env file',
        'Windsurf will auto-detect MCP servers on project open'
      ];
      break;

    case 'openclaw':
      hints.settingsKey = `openclaw.json → mcpServers[${mcp.name}]`;
      hints.setupSteps = [
        'Add MCP server configuration to openclaw.json',
        'Configure secrets in .env file',
        'OpenClaw will load MCP servers on agent start'
      ];
      break;

    case 'hermes':
      hints.settingsKey = `config.yaml → mcp.servers[${mcp.name}]`;
      hints.setupSteps = [
        'Add MCP server configuration to config.yaml',
        'Configure secrets in .env file',
        'Hermes will load MCP servers on startup'
      ];
      break;

    case 'zed':
      hints.settingsKey = `.zed/settings.json → mcpServers.${mcp.name}`;
      hints.setupSteps = [
        'Add MCP server configuration to .zed/settings.json',
        'Configure secrets in environment',
        'Zed will load MCP servers on editor start'
      ];
      break;

    default:
      hints.settingsKey = 'MCP configuration needs manual setup';
      hints.setupSteps = [
        'Check target platform documentation for MCP setup',
        'Configure secrets appropriately'
      ];
  }

  return hints;
}

// ============================================
// MCP配置完整性报告
// ============================================

/**
 * 生成MCP迁移报告
 * @param {Array} mcpServers - MCP服务器数组
 * @param {string} targetPlatform - 目标平台
 * @returns {Object} 迁移报告
 */
function generateMCPMigrationReport(mcpServers, targetPlatform) {
  const encoded = encodeMCPConfigComplete(mcpServers, targetPlatform);

  const report = {
    platform: targetPlatform,
    totalServers: encoded.length,
    serversNeedingSecrets: 0,
    allSecretsRequired: [],
    migrationSteps: [],
    warnings: []
  };

  encoded.forEach(mcp => {
    if (mcp._migrationHint.secretsToConfigure.length > 0) {
      report.serversNeedingSecrets++;
      report.allSecretsRequired.push(...mcp._migrationHint.secretsToConfigure);
    }
    report.migrationSteps.push(...mcp._migrationHint.setupSteps);
  });

  // 唯一化
  report.allSecretsRequired = [...new Set(report.allSecretsRequired)];
  report.migrationSteps = [...new Set(report.migrationSteps)];

  // 警告
  if (report.serversNeedingSecrets > 0) {
    report.warnings.push(
      `${report.serversNeedingSecrets} MCP servers require secret configuration before use`
    );
  }

  return report;
}

// ============================================
// 统一调度函数
// ============================================

/**
 * 根据平台编码MCP配置
 * @param {Array} mcpServers - MCP服务器数组
 * @param {string} platform - 目标平台
 * @param {string} format - 输出格式 (json/yaml/md)
 * @returns {string|Object} 编码结果
 */
function encodeMCPForPlatform(mcpServers, platform, format = 'auto') {
  const encoders = {
    dify: { func: encodeMCPToDifyYAML, format: 'yaml' },
    hermes: { func: encodeMCPToHermesYAML, format: 'yaml' },
    openclaw: { func: encodeMCPToOpenClawJSON, format: 'json' },
    fastgpt: { func: encodeMCPToFastGPTJSON, format: 'json' },
    flowise: { func: encodeMCPToFlowiseJSON, format: 'json' },
    claude: { func: encodeMCPToClaudeSettings, format: 'json' },
    cursor: { func: encodeMCPToCursorMCPJSON, format: 'json' },
    windsurf: { func: encodeMCPToCursorMCPJSON, format: 'json' },
    zed: { func: encodeMCPToClaudeSettings, format: 'json' },
    codex: { func: encodeMCPToMarkdownSection, format: 'md' },
    copilot: { func: encodeMCPToMarkdownSection, format: 'md' }
  };

  const encoder = encoders[platform];
  if (!encoder) {
    return encodeMCPToMarkdownSection(mcpServers);
  }

  return encoder.func(mcpServers);
}

// ============================================
// 导出模块接口
// ============================================

window.UATMCPEncoder = {
  // JSON格式
  encodeMCPConfigComplete,
  encodeMCPToOpenClawJSON,
  encodeMCPToFastGPTJSON,
  encodeMCPToFlowiseJSON,
  encodeMCPToClaudeSettings,
  encodeMCPToCursorMCPJSON,

  // YAML格式
  encodeMCPToDifyYAML,
  encodeMCPToHermesYAML,

  // Markdown格式
  encodeMCPToMarkdownSection,
  encodeMCPToOpenClawToolsMD,

  // 统一调度
  encodeMCPForPlatform,

  // 辅助函数
  isSecretEnvKey,
  sanitizeEnvValue,
  generateMigrationHint,
  generateMCPMigrationReport
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATMCPEncoder;
}
// ===== src/bundle/bundle-base.js =====
/**
 * UAT Bundle Base - 共用工具函数
 * 各平台 Bundle 编码器的共用辅助函数
 */

// ============================================
// 模型提供商提取
// ============================================

/**
 * 从模型名称提取提供商
 * @param {string} modelName - 模型名称
 * @returns {string} 提供商名称
 */
function extractModelProvider(modelName) {
  if (!modelName) return 'openai';
  if (modelName.includes('gpt') || modelName.includes('o1') || modelName.includes('o3')) return 'openai';
  if (modelName.includes('claude')) return 'anthropic';
  if (modelName.includes('gemini')) return 'google';
  if (modelName.includes('llama') || modelName.includes('mistral') || modelName.includes('qwen')) return 'open-source';
  return 'openai';
}

// ============================================
// 知识库提示
// ============================================

/**
 * 添加知识库配置提示到输出
 * @param {string} output - 原输出内容
 * @param {Object} schema - UAT-Schema
 * @returns {string} 带知识库提示的输出
 */
function addKnowledgeBaseNote(output, schema) {
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    const noteLines = [
      '',
      '',
      '# ========== 知识库配置提示 ==========',
      '# 以下知识库引用需在目标平台重新配置:'
    ];

    for (const kb of schema.memory.knowledgeBaseRef) {
      noteLines.push(`# - ${kb.name || kb} (原ID: ${kb.id || kb}, 来源: ${kb.platform || 'unknown'})`);
    }

    noteLines.push('# ========== 知识库配置提示结束 ==========');

    return output + noteLines.join('\n');
  }
  return output;
}

// ============================================
// 步骤类型映射（各平台）
// ============================================

/**
 * 步骤类型映射 - Dify
 */
function mapStepToDifyType(stepType) {
  const typeMap = {
    'prompt': 'llm',
    'condition': 'if_else',
    'loop': 'iteration',
    'api': 'http_request',
    'function': 'code',
    'end': 'end'
  };
  return typeMap[stepType] || 'llm';
}

/**
 * 步骤类型映射 - FastGPT
 */
function mapStepToFastGPTType(stepType) {
  const typeMap = {
    'prompt': 'chatNode',
    'condition': 'ifElseNode',
    'loop': 'loopNode',
    'api': 'httpRequest468',
    'function': 'variableUpdateNode',
    'end': 'answerNode'
  };
  return typeMap[stepType] || 'chatNode';
}

/**
 * 步骤类型映射 - Flowise
 */
function mapStepToFlowiseType(stepType) {
  const typeMap = {
    'prompt': 'PromptTemplate',
    'condition': 'IfCondition',
    'loop': 'Loop',
    'api': 'HTTPRequest',
    'function': 'VariableSetter',
    'end': 'End'
  };
  return typeMap[stepType] || 'PromptTemplate';
}

/**
 * 步骤类型映射 - Hermes
 */
function mapStepToHermesType(stepType) {
  const typeMap = {
    'prompt': 'prompt',
    'condition': 'condition',
    'loop': 'loop',
    'api': 'api_call',
    'function': 'function',
    'end': 'end'
  };
  return typeMap[stepType] || 'prompt';
}

// ============================================
// YAML 辅助函数
// ============================================

/**
 * YAML 行添加辅助
 * @param {Array} lines - 行数组
 * @param {string} key - 键名
 * @param {any} value - 值
 * @param {string} indent - 缩进
 */
function addYAMLLine(lines, key, value, indent = '') {
  if (value === undefined || value === null) return;
  if (typeof value === 'string') {
    lines.push(`${indent}${key}: "${window.UATCore?.escapeYAMLString?.(value) || value}"`);
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    lines.push(`${indent}${key}: ${value}`);
  } else if (Array.isArray(value) && value.length === 0) {
    lines.push(`${indent}${key}: []`);
  } else if (Array.isArray(value)) {
    lines.push(`${indent}${key}:`);
    for (const item of value) {
      lines.push(`${indent}  - ${item}`);
    }
  }
}

// ============================================
// Provider/Base URL 提取辅助
// ============================================

/**
 * 从模型配置提取基础 URL
 * @param {string} provider - 提供商名称
 * @returns {string} 基础 URL
 */
function getProviderBaseUrl(provider) {
  const urls = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com',
    'google': 'https://generativelanguage.googleapis.com',
    'open-source': 'http://localhost:11434/v1'  // Ollama 默认
  };
  return urls[provider] || urls['openai'];
}

// ============================================
// 导出模块接口
// ============================================

window.BundleBase = {
  extractModelProvider,
  addKnowledgeBaseNote,
  mapStepToDifyType,
  mapStepToFastGPTType,
  mapStepToFlowiseType,
  mapStepToHermesType,
  addYAMLLine,
  getProviderBaseUrl
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.BundleBase;
}
// Link global alias
BundleBase = window.BundleBase;

// ===== src/bundle/openclaw-bundle.js =====
/**
 * UAT OpenClaw Bundle 管理器 - OpenClaw Bundle Manager
 * 专门处理 OpenClaw Agent 的多文件配置包导入导出
 *
 * OpenClaw 配置结构：
 * ~/.openclaw/
 * ├── openclaw.json       # 全局JSON5主配置（网关+模型+多Agent）
 * ├── .env                # 密钥隔离
 * ├── workspace/          # 7大Markdown灵魂文件
 * │   ├── AGENTS.md       # 启动中枢（最高优先级）
 * │   ├── SOUL.md         # 行为内核（系统Prompt）
 * │   ├── IDENTITY.md     # 身份定义
 * │   ├── USER.md         # 用户画像
 * │   ├── TOOLS.md        # 工具清单
 * │   ├── MEMORY.md       # 长期记忆
 * │   └── HEARTBEAT.md    # 定时任务
 * ├── agents/             # 多Agent实例
 * │   └── main/           # 默认主Agent
 * └── logs/               # 运行日志
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
// OpenClaw Bundle 创建（导出）
// ============================================

/**
 * 创建 OpenClaw Bundle ZIP 包
 * @param {Object} schema - UAT-Schema v2.0
 * @param {Object} options - 可选配置
 * @returns {Promise<Blob>} ZIP 文件
 */
async function createOpenClawBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json - Bundle 清单
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "OpenClaw-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      config: "openclaw.json",
      workspace: "workspace/",
      workspaceFiles: [
        "AGENTS.md",
        "SOUL.md",
        "IDENTITY.md",
        "USER.md",
        "TOOLS.md",
        "MEMORY.md",
        "HEARTBEAT.md"
      ],
      envTemplate: ".env.example",
      agentsDir: "agents/main/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - OpenClaw Bundle"
    },
    notes: {
      knowledgeBase: "知识库引用已保留，需在 OpenClaw 中重新配置",
      secrets: "密钥已移除，请填写 .env 文件",
      dailyMemory: "日记忆文件运行时自动生成，不在导出包中"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. openclaw.json - 全局主配置
  const configJSON = encodeOpenClawConfigJSON(schema);
  zip.file("openclaw.json", configJSON);

  // 3. .env.example - 密钥模板
  const envExample = encodeOpenClawEnvExample(schema);
  zip.file(".env.example", envExample);

  // 4. workspace/ 目录 - 7大Markdown灵魂文件
  const workspaceFolder = zip.folder("workspace");

  workspaceFolder.file("AGENTS.md", encodeOpenClawAgentsMD(schema));
  workspaceFolder.file("SOUL.md", encodeOpenClawSoulMD(schema));
  workspaceFolder.file("IDENTITY.md", encodeOpenClawIdentityMD(schema));
  workspaceFolder.file("USER.md", encodeOpenClawUserMD(schema));
  workspaceFolder.file("TOOLS.md", encodeOpenClawToolsMD(schema));
  workspaceFolder.file("MEMORY.md", encodeOpenClawMemoryMD(schema));
  workspaceFolder.file("SKILLS.md", encodeOpenClawSkillsMD(schema));
  workspaceFolder.file("HEARTBEAT.md", encodeOpenClawHeartbeatMD(schema));

  // 5. agents/main/ 目录结构
  const agentsFolder = zip.folder("agents");
  const mainAgentFolder = agentsFolder.folder("main");

  // agents/main/agent/ 配置目录（可选）
  const agentConfigFolder = mainAgentFolder.folder("agent");
  agentConfigFolder.file("README.md", "# Agent Private Config\n\nThis directory contains agent-specific configurations.\n");

  // agents/main/memory/ 日记忆目录
  const memoryFolder = mainAgentFolder.folder("memory");
  memoryFolder.file("README.md", "# Daily Memory Directory\n\nDaily memory files (YYYY-MM-DD.md) are generated at runtime.\n\nThis directory is empty in the export bundle.\n");

  // 6. README.md - 使用说明
  const readmeMD = encodeOpenClawReadme(schema);
  zip.file("README.md", readmeMD);

  // 7. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// openclaw.json 编码器（JSON5格式，带注释）
// ============================================

function encodeOpenClawConfigJSON(schema) {
  const provider = extractOpenClawProvider(schema.modelConfig.model);
  const modelName = schema.modelConfig.model;

  // JSON5 格式（支持注释）
  const config = `// OpenClaw Global Configuration
// Generated by UAT Converter
// JSON5 format - supports comments

{
  "agents": {
    "defaults": {
      // Model configuration with fallback chain
      "model": {
        "primary": "${provider}/${modelName}",
        "fallbacks": ["openai/gpt-4o"]
      },

      // Default workspace directory
      "workspace": "~/.openclaw/workspace",

      // Sandbox security mode
      "sandbox": {
        "mode": "non-main"
      },

      // Memory search configuration
      "memorySearch": {
        "enabled": true,
        "provider": "local",
        "hybrid": {
          "enabled": true,
          "bm25Weight": 0.3,
          "vectorWeight": 0.7
        }
      },

      // Heartbeat automation
      "heartbeat": {
        "every": "1h"
      },

      // Context compaction
      "compaction": {
        "enabled": true,
        "threshold": 80000
      }
    }
  },

  // Gateway WebSocket configuration
  "gateway": {
    "port": 18789,
    "bind": "127.0.0.1",
    "auth": {
      "mode": "token"
    },
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },

  // Skills configuration
  "skills": {
    "shell": {
      "enabled": true,
      "timeout": 30000
    },
    "filesystem": {
      "enabled": true,
      "sandbox": true
    },
    "browser": {
      "enabled": ${schema.tools.apiEndpoints?.length > 0 ? 'true' : 'false'}
    },
    "search": {
      "enabled": false
    }
  },

  // Message channels (Discord/Slack/etc)
  "channels": {}
}`;

  return config;
}

function extractOpenClawProvider(modelName) {
  if (!modelName) return 'openai';
  const lower = modelName.toLowerCase();

  if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3')) return 'openai';
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gemini')) return 'google';
  if (lower.includes('deepseek')) return 'deepseek';
  if (lower.includes('llama') || lower.includes('mistral')) return 'openrouter';
  if (lower.includes('qwen')) return 'alibaba';
  if (lower.includes('ollama') || lower.includes('local')) return 'ollama';

  return 'openai';
}

function getOpenClawBaseUrl(provider) {
  const urls = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com',
    'google': 'https://generativelanguage.googleapis.com',
    'deepseek': 'https://api.deepseek.com',
    'openrouter': 'https://openrouter.ai/api/v1',
    'alibaba': 'https://dashscope.aliyuncs.com/api/v1',
    'ollama': 'http://localhost:11434'
  };
  return urls[provider] || urls['openai'];
}

// ============================================
// AGENTS.md 编码器（启动中枢）
// ============================================

function encodeOpenClawAgentsMD(schema) {
  const sections = [];

  sections.push('# AGENTS.md - OpenClaw Agent Startup Hub');
  sections.push('');
  sections.push('> This file defines the loading sequence, global rules, and workflow for the Agent.');
  sections.push('> It is loaded first and has the highest priority in the prompt construction.');
  sections.push('');

  // 加载顺序
  sections.push('## Loading Sequence');
  sections.push('');
  sections.push('On each session start, the Agent loads files in this order:');
  sections.push('');
  sections.push('1. **SOUL.md** → Behavior kernel, core principles');
  sections.push('2. **IDENTITY.md** → Identity definition, role, capabilities');
  sections.push('3. **USER.md** → User preferences and interaction style');
  sections.push('4. **Daily Memory** → `memory/YYYY-MM-DD.md` (runtime generated)');
  sections.push('5. **MEMORY.md** → Long-term persistent memory');
  sections.push('6. **TOOLS.md** → Available tools and permissions');
  sections.push('');
  sections.push('---');
  sections.push('');

  // 全局规则
  sections.push('## Global Rules');
  sections.push('');
  sections.push('- Always follow constraints defined in SOUL.md');
  sections.push('- Respect user preferences from USER.md');
  sections.push('- Use only tools declared in TOOLS.md');
  sections.push('- Maintain memory consistency across sessions');
  sections.push('- Apply heartbeat tasks defined in HEARTBEAT.md');
  sections.push('');

  // 工作流定义
  if (schema.workflow.steps?.length > 0) {
    sections.push('## Workflow');
    sections.push('');
    sections.push('Default task processing flow:');
    sections.push('');

    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      sections.push(`### Step ${i + 1}: ${step.name}`);
      sections.push('');
      sections.push(`- **Type**: ${step.type}`);
      if (step.content) {
        sections.push(`- **Content**: ${step.content.substring(0, 150)}${step.content.length > 150 ? '...' : ''}`);
      }
      if (step.conditions?.length > 0) {
        sections.push('- **Conditions**:');
        for (const cond of step.conditions) {
          sections.push(`  - ${cond.variable} ${cond.operator} "${cond.value}" → ${cond.targetStepId}`);
        }
      }
      sections.push('');
    }
  }

  // Prompt 变量
  if (schema.identity.promptVariables?.length > 0) {
    sections.push('## Template Variables');
    sections.push('');
    sections.push('Available variables for prompt templates:');
    sections.push('');
    for (const v of schema.identity.promptVariables) {
      sections.push(`- \`{{${v.name}}}\`: ${v.description || v.type} (default: ${v.default || 'empty'})`);
    }
    sections.push('');
  }

  // 元信息
  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// SOUL.md 编码器（行为内核）
// ============================================

function encodeOpenClawSoulMD(schema) {
  const sections = [];

  sections.push('# SOUL.md - Agent Behavior Kernel');
  sections.push('');
  sections.push('> This file contains the core principles, constraints, and behavioral rules.');
  sections.push('> It is the primary system prompt that defines how the Agent thinks and acts.');
  sections.push('');

  // 核心原则
  sections.push('## Core Principles');
  sections.push('');
  sections.push(schema.identity.systemPrompt || 'You are a helpful AI assistant.');
  sections.push('');

  // 约束规则
  if (schema.identity.constraints?.length > 0) {
    sections.push('## Constraints');
    sections.push('');
    sections.push('These are hard rules that must never be violated:');
    sections.push('');
    for (const c of schema.identity.constraints) {
      sections.push(`- ${c}`);
    }
    sections.push('');
  }

  // 输出风格
  if (schema.identity.responseStyle) {
    sections.push('## Output Style');
    sections.push('');
    sections.push(schema.identity.responseStyle);
    sections.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    sections.push('## Output Rules');
    sections.push('');
    for (const r of schema.identity.outputRules) {
      sections.push(`- ${r}`);
    }
    sections.push('');
  }

  // 语言风格
  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    sections.push(`- Primary: ${schema.identity.language}`);
    sections.push('');
  }

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// IDENTITY.md 编码器（身份定义）
// ============================================

function encodeOpenClawIdentityMD(schema) {
  const sections = [];

  sections.push('# IDENTITY.md - Agent Identity Definition');
  sections.push('');
  sections.push('> This file defines the Agent\'s name, role, and capability boundaries.');
  sections.push('');

  // 基础信息
  sections.push('## Basic Info');
  sections.push('');
  sections.push(`- **Name**: ${schema.meta.name || 'OpenClaw Agent'}`);
  sections.push(`- **Description**: ${schema.meta.description || 'AI Assistant'}`);
  sections.push('');

  // 角色定义
  sections.push('## Role');
  sections.push('');
  sections.push(schema.identity.role || 'AI Assistant');
  sections.push('');

  // 性格特点
  if (schema.identity.personality) {
    sections.push('## Personality');
    sections.push('');
    sections.push(schema.identity.personality);
    sections.push('');
  }

  // 语言偏好
  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    const langDisplay = schema.identity.language === 'zh-CN' ? 'Chinese' :
                        schema.identity.language === 'en-US' ? 'English' : schema.identity.language;
    sections.push(`Primary language: ${langDisplay}`);
    sections.push('');
  }

  // 能力边界
  sections.push('## Capabilities');
  sections.push('');
  if (schema.tools.mcpServers?.length > 0 || schema.tools.functions?.length > 0) {
    sections.push('### Tools Available');
    sections.push('');
    if (schema.tools.mcpServers?.length > 0) {
      for (const mcp of schema.tools.mcpServers) {
        sections.push(`- **${mcp.name}**: ${mcp.tools?.map(t => t.name).join(', ') || 'MCP Server'}`);
      }
    }
    if (schema.tools.functions?.length > 0) {
      for (const fn of schema.tools.functions) {
        sections.push(`- **${fn.name}**: ${fn.description || 'Custom function'}`);
      }
    }
    sections.push('');
  }

  if (schema.tools.apiEndpoints?.length > 0) {
    sections.push('### API Endpoints');
    sections.push('');
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`- **${api.name}**: ${api.method} ${api.url}`);
    }
    sections.push('');
  }

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// USER.md 编码器（用户画像）
// ============================================

function encodeOpenClawUserMD(schema) {
  const sections = [];

  sections.push('# USER.md - User Profile');
  sections.push('');
  sections.push('> This file contains user preferences and interaction settings.');
  sections.push('> Customize this file to match your actual preferences.');
  sections.push('');

  // 用户偏好（导出时为模板）
  sections.push('## Preferences');
  sections.push('');
  sections.push('- **Language**: Default (auto-detect from input)');
  sections.push('- **Response Length**: Balanced');
  sections.push('- **Detail Level**: Standard');
  sections.push('');

  sections.push('## Interaction Style');
  sections.push('');
  sections.push('- **Tone**: Professional and friendly');
  sections.push('- **Format**: Markdown preferred');
  sections.push('- **Code Style**: Clean and documented');
  sections.push('');

  // userPreference 在 memory 中，是字符串
  const userPref = schema.memory.userPreference || '';
  if (userPref.length > 0) {
    sections.push('## Custom Preferences');
    sections.push('');
    sections.push(userPref);
    sections.push('');
  }

  sections.push('---');
  sections.push('');
  sections.push('*Note: Edit this file to personalize the Agent behavior.*');

  return sections.join('\n');
}

// ============================================
// TOOLS.md 编码器（工具清单）
// ============================================

function encodeOpenClawToolsMD(schema) {
  const sections = [];

  sections.push('# TOOLS.md - Available Tools');
  sections.push('');
  sections.push('> This file declares all tools the Agent can use.');
  sections.push('> Tools must be enabled in openclaw.json skills configuration.');
  sections.push('');

  // 内置工具
  sections.push('## Built-in Tools');
  sections.push('');
  sections.push('### Shell');
  sections.push('- Execute shell commands');
  sections.push('- Timeout: 30 seconds');
  sections.push('- Sandbox: enabled');
  sections.push('');

  sections.push('### Filesystem');
  sections.push('- Read/write files');
  sections.push('- Sandbox mode: non-main');
  sections.push('');

  sections.push('### Browser');
  sections.push('- Web navigation and scraping');
  sections.push('- Enabled: ' + (schema.tools.apiEndpoints?.length > 0 ? 'yes' : 'no'));
  sections.push('');

  // MCP 工具 - 使用MCP编码器
  const mcpEncoder = getUATMCPEncoder();
  if (schema.tools.mcpServers?.length > 0) {
    if (mcpEncoder) {
      sections.push(mcpEncoder.encodeMCPToOpenClawToolsMD(schema.tools.mcpServers));
    } else {
      // 兼容旧版
      sections.push('## MCP Servers');
      sections.push('');
      for (const mcp of schema.tools.mcpServers) {
        sections.push(`### ${mcp.name}`);
        sections.push('');
        sections.push(`- **URL**: ${mcp.url || 'local'}`);
        sections.push(`- **Transport**: ${mcp.config?.transport || 'stdio'}`);
        if (mcp.config?.command) {
          sections.push(`- **Command**: ${mcp.config.command}`);
        }
        if (mcp.tools?.length > 0) {
          sections.push(`- **Tools**: ${mcp.tools.map(t => t.name).join(', ')}`);
        }
        sections.push('');
      }
    }
  }

  // API 工具
  if (schema.tools.apiEndpoints?.length > 0) {
    sections.push('## API Endpoints');
    sections.push('');
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`### ${api.name}`);
      sections.push('');
      sections.push(`- **Method**: ${api.method || 'GET'}`);
      sections.push(`- **URL**: ${api.url}`);
      if (api.auth?.type) {
        sections.push(`- **Auth**: ${api.auth.type}`);
      }
      sections.push('');
    }
  }

  // 自定义函数
  if (schema.tools.functions?.length > 0) {
    sections.push('## Custom Functions');
    sections.push('');
    for (const fn of schema.tools.functions) {
      sections.push(`### ${fn.name}`);
      sections.push('');
      sections.push(`- **Description**: ${fn.description || fn.name}`);
      if (fn.inputs?.length > 0) {
        sections.push(`- **Inputs**: ${fn.inputs.map(i => i.name).join(', ')}`);
      }
      sections.push('');
    }
  }

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// MEMORY.md 编码器（长期记忆）
// ============================================

function encodeOpenClawMemoryMD(schema) {
  const memoryEncoder = getUATMemoryEncoder();
  const kbEncoder = getUATKnowledgeEncoder();
  const sections = [];

  sections.push('# MEMORY.md - Long-term Memory');
  sections.push('');
  sections.push('> This file stores persistent knowledge extracted from conversations.');
  sections.push('> It is loaded during the startup sequence (step 5).');
  sections.push('');

  // 使用memoryEntries编码器（新格式）
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push('## Structured Memory');
    sections.push('');
    sections.push(memoryEncoder.encodeMemoryEntriesToTable(schema.memory.memoryEntries));
    sections.push('');
  }

  // 知识库引用
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    sections.push('## Knowledge Base References');
    sections.push('');
    for (const kb of schema.memory.knowledgeBaseRef) {
      sections.push(`- **${kb.name || kb}**: ${kb.id || kb}`);
      sections.push(`  - Type: ${kb.type || 'external'}`);
      sections.push(`  - Status: Reference preserved, needs reconfiguration`);
      sections.push('');
    }
    sections.push('');
    sections.push('*Note: Knowledge base content is not transferred. Re-configure in OpenClaw.*');
    sections.push('');
  }

  // 知识库内容编码（如果有）
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      sections.push('## Knowledge Content');
      sections.push('');
      sections.push(kbEncoder.encodeKnowledgeToMarkdown(kbContent));
      sections.push('');
    }
  }

  // 长期记忆 (longTermMemory 支持字符串或数组格式)
  const longTermMemory = schema.memory.longTermMemory || '';
  const isLongTermMemoryArray = Array.isArray(longTermMemory);
  const hasMemory = isLongTermMemoryArray ? longTermMemory.length > 0 : (longTermMemory && longTermMemory.length > 0);

  if (hasMemory) {
    sections.push('## Stored Memories');
    sections.push('');

    if (isLongTermMemoryArray) {
      // 数组格式：结构化记忆
      for (const mem of longTermMemory) {
        const topic = mem.type || mem.id || 'Memory Entry';
        const content = mem.content || '';
        const importance = mem.importance || 0.8;

        sections.push(`### ${topic}`);
        sections.push('');
        if (content) {
          sections.push(content);
        }
        sections.push(`*Importance: ${importance}*`);
        sections.push('');
      }
    } else {
      // 字符串格式：兼容旧版
      const memSections = longTermMemory.split(/\n### /);
      for (let i = 0; i < memSections.length; i++) {
        const section = memSections[i];
        if (i === 0 && !section.startsWith('###')) {
          if (section.trim()) {
            sections.push(section.trim());
            sections.push('');
          }
        } else {
          const lines = section.split('\n');
          const topic = lines[0].replace(/^### /, '').trim();
          const content = lines.slice(1).join('\n').trim();
          sections.push(`### ${topic || 'Memory Entry'}`);
          sections.push('');
          if (content) {
            sections.push(content);
            sections.push('');
          }
        }
      }
    }
  }

  // 空记忆说明
  const hasKnowledgeBase = schema.memory.knowledgeBaseRef?.length > 0;
  const hasMemoryEntries = schema.memory.memoryEntries?.length > 0;
  if (!hasMemory && !hasKnowledgeBase && !hasMemoryEntries) {
    sections.push('## Memory Status');
    sections.push('');
    sections.push('No long-term memories stored yet.');
    sections.push('');
    sections.push('Memories will be accumulated through conversations and persisted here.');
    sections.push('');
  }

  // 会话记忆配置
  sections.push('## Session Memory Configuration');
  sections.push('');
  sections.push(`- **Max Messages**: ${schema.memory.sessionMemory?.maxMessages || 100}`);
  sections.push(`- **Storage**: SQLite (agents/main/sessions/)`);
  sections.push('');

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// HEARTBEAT.md 编码器（定时任务）
// ============================================

function encodeOpenClawHeartbeatMD(schema) {
  const sections = [];

  sections.push('# HEARTBEAT.md - Automation Tasks');
  sections.push('');
  sections.push('> This file defines periodic tasks that run automatically.');
  sections.push('> Configured in openclaw.json: heartbeat.every = "1h"');
  sections.push('');

  // 定时任务
  sections.push('## Default Tasks');
  sections.push('');
  sections.push('### Memory Sync');
  sections.push('- Run: Every 1 hour');
  sections.push('- Action: Sync session memories to MEMORY.md');
  sections.push('');

  sections.push('### Context Compaction');
  sections.push('- Run: When context exceeds threshold');
  sections.push('- Action: Compress and summarize old messages');
  sections.push('');

  sections.push('### Self-check');
  sections.push('- Run: Every 6 hours');
  sections.push('- Action: Verify configuration integrity');
  sections.push('');

  // 自定义任务（如果有）
  if (schema.workflow.cronTasks?.length > 0) {
    sections.push('## Custom Tasks');
    sections.push('');
    for (const task of schema.workflow.cronTasks) {
      sections.push(`### ${task.name}`);
      sections.push('');
      sections.push(`- **Schedule**: ${task.schedule}`);
      sections.push(`- **Action**: ${task.action}`);
      sections.push('');
    }
  }

  sections.push('---');
  sections.push('');
  sections.push('*Heartbeat tasks run in the background without user intervention.*');

  return sections.join('\n');
}

// ============================================
// SKILLS.md 编码器（技能清单）
// ============================================

function encodeOpenClawSkillsMD(schema) {
  const skillsEncoder = getUATSkillsEncoder();

  if (schema.skills && skillsEncoder) {
    return skillsEncoder.encodeSkillsToOpenClawMD(schema.skills);
  }

  return '# Skills\n\nNo skills defined.\n';
}

// ============================================
// .env.example 编码器（密钥模板）
// ============================================

function encodeOpenClawEnvExample(schema) {
  const lines = [];
  const provider = extractOpenClawProvider(schema.modelConfig.model);

  lines.push('# OpenClaw Environment Variables Template');
  lines.push('# Copy this file to .env and fill in your API keys');
  lines.push('');
  lines.push('# WARNING: Never commit .env to Git!');
  lines.push('# Add .env to your .gitignore');
  lines.push('');

  // 主要模型密钥
  lines.push('# Model Provider API Keys');
  lines.push('');

  if (provider === 'openai') {
    lines.push('OPENAI_API_KEY=sk-your-openai-key-here');
  } else if (provider === 'anthropic') {
    lines.push('ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here');
  } else if (provider === 'google') {
    lines.push('GOOGLE_API_KEY=your-google-api-key-here');
  } else if (provider === 'deepseek') {
    lines.push('DEEPSEEK_API_KEY=sk-your-deepseek-key-here');
  } else if (provider === 'openrouter') {
    lines.push('OPENROUTER_API_KEY=sk-or-your-openrouter-key-here');
  } else if (provider === 'ollama') {
    lines.push('OLLAMA_HOST=http://localhost:11434');
  } else {
    lines.push(`${provider.toUpperCase()}_API_KEY=your-api-key-here`);
  }
  lines.push('');

  // Fallback 模型密钥
  lines.push('# Fallback Model Keys');
  lines.push('OPENAI_API_KEY=sk-your-openai-key-here  # For fallback to gpt-4o');
  lines.push('');

  // MCP 工具密钥
  if (schema.tools.mcpServers?.length > 0) {
    lines.push('# MCP Server Credentials');
    lines.push('');
    for (const mcp of schema.tools.mcpServers) {
      if (mcp.config?.env) {
        for (const [key, _] of Object.entries(mcp.config.env)) {
          lines.push(`MCP_${mcp.name.toUpperCase()}_${key.toUpperCase()}=your-value-here`);
        }
      }
    }
    lines.push('');
  }

  // Gateway 配置
  lines.push('# Gateway Configuration');
  lines.push('');
  lines.push('#OPENCLAW_GATEWAY_PORT=18789');
  lines.push('#OPENCLAW_GATEWAY_TOKEN=your-secure-token-here');
  lines.push('');

  lines.push('# Optional Settings');
  lines.push('');
  lines.push('#OPENCLAW_LOG_LEVEL=INFO');
  lines.push('#OPENCLAW_SANDBOX_MODE=non-main');
  lines.push('');

  return lines.join('\n');
}

// ============================================
// README.md 编码器（使用说明）
// ============================================

function encodeOpenClawReadme(schema) {
  const sections = [];
  const provider = extractOpenClawProvider(schema.modelConfig.model);

  sections.push(`# ${schema.meta.name || 'OpenClaw Agent'} - Bundle`);
  sections.push('');
  sections.push('This bundle contains the complete configuration for an OpenClaw Agent.');
  sections.push('');
  sections.push('## Bundle Contents');
  sections.push('');
  sections.push('| File/Directory | Description |');
  sections.push('|----------------|-------------|');
  sections.push('| `openclaw.json` | Global configuration (gateway, model, skills) |');
  sections.push('| `.env.example` | Environment variables template |');
  sections.push('| `workspace/AGENTS.md` | Startup hub, loading sequence |');
  sections.push('| `workspace/SOUL.md` | Behavior kernel, system prompt |');
  sections.push('| `workspace/IDENTITY.md` | Identity definition |');
  sections.push('| `workspace/USER.md` | User profile template |');
  sections.push('| `workspace/TOOLS.md` | Available tools declaration |');
  sections.push('| `workspace/MEMORY.md` | Long-term memory |');
  sections.push('| `workspace/HEARTBEAT.md` | Periodic tasks |');
  sections.push('| `agents/main/` | Default agent instance directory |');
  sections.push('');

  sections.push('## Installation');
  sections.push('');
  sections.push('1. Extract this ZIP to your OpenClaw directory:');
  sections.push('   ```bash');
  sections.push('   unzip openclaw_bundle.zip -d ~/.openclaw/');
  sections.push('   ```');
  sections.push('');
  sections.push('2. Configure your API keys:');
  sections.push('   ```bash');
  sections.push('   cp ~/.openclaw/.env.example ~/.openclaw/.env');
  sections.push('   # Edit .env and add your API keys');
  sections.push('   ```');
  sections.push('');
  sections.push('3. Start OpenClaw:');
  sections.push('   ```bash');
  sections.push('   openclaw run');
  sections.push('   ```');
  sections.push('');

  sections.push('## Configuration');
  sections.push('');
  sections.push(`- **Model**: ${provider}/${schema.modelConfig.model}`);
  sections.push(`- **Gateway Port**: 18789`);
  sections.push(`- **Sandbox Mode**: non-main`);
  sections.push('');

  if (schema.tools.mcpServers?.length) {
    sections.push('### MCP Servers');
    sections.push('');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`- ${mcp.name}: ${mcp.url || 'local'}`);
    }
    sections.push('');
  }

  if (schema.tools.apiEndpoints?.length) {
    sections.push('### API Tools');
    sections.push('');
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`- ${api.name}: ${api.method} ${api.url}`);
    }
    sections.push('');
  }

  sections.push('## Architecture');
  sections.push('');
  sections.push('OpenClaw uses a 7-file Markdown architecture:');
  sections.push('');
  sections.push('1. **AGENTS.md** - Highest priority, defines loading sequence');
  sections.push('2. **SOUL.md** - Core system prompt and constraints');
  sections.push('3. **IDENTITY.md** - Agent name, role, capabilities');
  sections.push('4. **USER.md** - User preferences');
  sections.push('5. **MEMORY.md** - Long-term knowledge');
  sections.push('6. **TOOLS.md** - Available tools');
  sections.push('7. **HEARTBEAT.md** - Automation tasks');
  sections.push('');

  sections.push('## Notes');
  sections.push('');
  sections.push('- **Knowledge Base**: If this agent uses knowledge bases, configure them in OpenClaw separately.');
  sections.push('- **Secrets**: Never commit `.env` file to Git.');
  sections.push('- **Daily Memory**: Session memories are stored in `agents/main/memory/YYYY-MM-DD.md` at runtime.');
  sections.push('');

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// OpenClaw Bundle 解析（导入）
// ============================================

/**
 * 解析 OpenClaw Bundle ZIP 包
 * @param {File|Blob} zipFile - ZIP 文件
 * @returns {Promise<Object>} { schema, manifest, rawFiles }
 */
async function parseOpenClawBundle(zipFile) {
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

  // 2. 解析 openclaw.json
  const configFile = zip.file("openclaw.json");
  let configJSON = '';
  if (configFile) {
    configJSON = await configFile.async("string");
  }

  // 3. 解析 workspace/ 目录
  const workspaceFiles = {};
  const workspaceDir = zip.folder("workspace");

  for (const filename of ['AGENTS.md', 'SOUL.md', 'IDENTITY.md', 'USER.md', 'TOOLS.md', 'MEMORY.md', 'HEARTBEAT.md']) {
    const file = workspaceDir.file(filename);
    if (file) {
      workspaceFiles[filename] = await file.async("string");
    }
  }

  // 4. 构建 UAT-Schema
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'openclaw';
  schema.meta.name = manifest.agent?.name || 'OpenClaw Agent';
  schema.meta.description = manifest.agent?.description || '';

  // 从 openclaw.json 解析模型配置
  parseOpenClawConfigJSON(configJSON, schema);

  // 从各 MD 文件解析内容
  parseOpenClawAgentsMD(workspaceFiles['AGENTS.md'] || '', schema);
  parseOpenClawSoulMD(workspaceFiles['SOUL.md'] || '', schema);
  parseOpenClawIdentityMD(workspaceFiles['IDENTITY.md'] || '', schema);
  parseOpenClawToolsMD(workspaceFiles['TOOLS.md'] || '', schema);
  parseOpenClawMemoryMD(workspaceFiles['MEMORY.md'] || '', schema);

  // 补全默认值
  UATCore.fillSchemaDefaultValues(schema);

  // 原始文件内容（供调试）
  const rawFiles = {
    configJSON,
    workspaceFiles
  };

  return { schema, manifest, rawFiles };
}

/**
 * 解析 OpenClaw 配置文件（无 manifest，从提取的文件直接解析）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 实例（可选）
 * @returns {Promise<Object>} schema
 */
async function parseOpenClawBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'openclaw';
  schema.meta.name = 'OpenClaw Agent';

  // 1. 解析 openclaw.json
  const configJSON = findFileByPattern(extractedFiles, ['openclaw.json']);
  if (configJSON) {
    parseOpenClawConfigJSON(configJSON, schema);
  }

  // 2. 解析 workspace/ 目录下的各 MD 文件
  const workspaceFiles = {};
  for (const filename of ['AGENTS.md', 'SOUL.md', 'IDENTITY.md', 'USER.md', 'TOOLS.md', 'MEMORY.md', 'HEARTBEAT.md']) {
    const content = findFileByPattern(extractedFiles, [
      'workspace/' + filename,
      filename,
      filename.toLowerCase()
    ]);
    if (content) {
      workspaceFiles[filename] = content;
    }
  }

  // 3. 从各 MD 文件解析内容
  parseOpenClawAgentsMD(workspaceFiles['AGENTS.md'] || '', schema);
  parseOpenClawSoulMD(workspaceFiles['SOUL.md'] || '', schema);
  parseOpenClawIdentityMD(workspaceFiles['IDENTITY.md'] || '', schema);
  parseOpenClawToolsMD(workspaceFiles['TOOLS.md'] || '', schema);
  parseOpenClawMemoryMD(workspaceFiles['MEMORY.md'] || '', schema);

  // 4. 从 AGENTS.md 提取 name
  if (workspaceFiles['AGENTS.md']) {
    const nameMatch = workspaceFiles['AGENTS.md'].match(/Name:\s*['"]?([^'":\n]+)['"]?/i);
    if (nameMatch) schema.meta.name = nameMatch[1].trim();
  }

  // 补全默认值
  UATCore.fillSchemaDefaultValues(schema);

  return schema;
}

/**
 * 从文件集合中查找匹配的文件内容
 */
function findFileByPattern(files, patterns) {
  for (const pattern of patterns) {
    // 精确匹配
    for (const [path, content] of Object.entries(files)) {
      if (path === pattern || path.endsWith('/' + pattern)) {
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
// 解析辅助函数
// ============================================

function parseOpenClawConfigJSON(jsonText, schema) {
  if (!jsonText) return;

  // 移除注释（JSON5）
  const cleanJSON = jsonText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  try {
    const config = JSON.parse(cleanJSON);

    // 模型配置
    const primaryModel = config.agents?.defaults?.model?.primary;
    if (primaryModel) {
      // 格式: provider/modelName
      const parts = primaryModel.split('/');
      if (parts.length === 2) {
        schema.modelConfig.model = parts[1];
      } else {
        schema.modelConfig.model = primaryModel;
      }
    }

    // 工具配置
    const skills = config.skills;
    if (skills?.shell?.enabled) {
      schema.tools.permissionScope = 'extended';
    }

    // 记忆配置
    const memorySearch = config.agents?.defaults?.memorySearch;
    if (memorySearch?.enabled) {
      schema.memory.vectorStorage.enabled = true;
    }

  } catch (e) {
    console.warn('openclaw.json 解析警告:', e.message);
  }
}

function parseOpenClawAgentsMD(mdText, schema) {
  if (!mdText) return;

  // 从标题提取名称（如 "# AGENT xxx · xxx" 或 "# xxx AGENTS"）
  const titleMatch = mdText.match(/^#\s+(.*?AGENT.*|.*AGENTS.*)/im);
  if (titleMatch) {
    const title = titleMatch[1];
    // 尝试从标题中提取名称
    const nameMatch = title.match(/·\s*(.+)$/);
    if (nameMatch && !schema.meta.name) {
      schema.meta.name = nameMatch[1].trim();
    }
  }

  // 通用策略：提取所有列表项作为 constraints 或 workflow steps
  const lines = mdText.split('\n');
  const constraintKeywords = ['铁律', '禁止', '严禁', '禁止', '必须', '红线', '不可违反', 'never', 'must not'];

  for (const line of lines) {
    // 匹配数字列表或符号列表
    const listMatch = line.match(/^(\d+)\.\s+(.+)/) || line.match(/^[-*]\s+(.+)/);
    if (!listMatch) continue;

    const content = listMatch[2] ? listMatch[2].trim() : '';
    if (!content || content.length < 5) continue;

    // 根据关键词判断类型
    const hasConstraintKeyword = constraintKeywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()));

    if (hasConstraintKeyword) {
      // 作为 constraint
      schema.identity.constraints.push(content);
    } else if (content.includes('读取') || content.includes('加载') || content.includes('执行') || content.includes('流程')) {
      // 作为 workflow step
      const step = UATCore.createEmptyWorkflowStep();
      step.stepId = `step_${schema.workflow.steps.length}`;
      step.name = content.substring(0, 50);
      step.type = 'prompt';
      step.content = content;
      schema.workflow.steps.push(step);
    }
  }
}

function parseOpenClawSoulMD(mdText, schema) {
  if (!mdText) return;

  // 从标题提取名称（如 "# DevEngineer - Soul" 或 "# xxx - Soul"）
  const titleMatch = mdText.match(/^#\s+(.+?)(\s+-\s+Soul)?$/m);
  if (titleMatch) {
    const name = titleMatch[1].replace(/\s+-\s+Soul$/i, '').trim();
    if (name && !schema.meta.name) {
      schema.meta.name = name;
    }
  }

  // 通用策略：提取所有非标题、非空行的文本作为 systemPrompt
  // 排除第一行标题，收集有意义的内容
  const lines = mdText.split('\n');
  const contentLines = [];
  let foundFirstContent = false;

  for (const line of lines) {
    // 排除标题行（# 开头）
    if (line.match(/^#+\s/)) continue;
    // 排除空行
    if (!line.trim()) continue;
    // 排除纯分隔线
    if (line.match(/^[-=*]{3,}$/)) continue;

    // 收集内容
    contentLines.push(line);
    foundFirstContent = true;
  }

  // 如果有内容，作为 systemPrompt
  if (contentLines.length > 0) {
    schema.identity.systemPrompt = contentLines.join('\n');
  }

  // 通用策略：从所有列表项提取 constraints
  // 任何以 `-` 或数字开头的行，且包含约束性关键词
  const constraintKeywords = ['不', '禁止', '严禁', '禁止', '必须', 'never', 'must', '禁止', '红线', '铁律', '约束', 'constraint'];
  const outputKeywords = ['输出', '风格', 'style', '格式', 'format', '口头禅', '习惯'];

  for (const line of lines) {
    const isListItem = line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/);
    if (!isListItem) continue;

    const content = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').replace(/❌\s*/, '').trim();
    if (!content) continue;

    // 根据关键词判断是 constraint 还是 outputRule
    const hasConstraintKeyword = constraintKeywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()));
    const hasOutputKeyword = outputKeywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()));

    if (hasConstraintKeyword) {
      schema.identity.constraints.push(content);
    } else if (hasOutputKeyword) {
      schema.identity.outputRules.push(content);
    }
  }
}

function parseOpenClawIdentityMD(mdText, schema) {
  if (!mdText) return;

  // 通用策略：从列表项中提取 Name/Role/Description
  // 匹配格式: - **Key:** Value 或 *Key*: Value 或 Key: Value
  const lines = mdText.split('\n');

  for (const line of lines) {
    // 匹配 `- **Name:** xxx` 或 `- Name: xxx` 等格式
    const keyValueMatch = line.match(/^[-*]\s+\*?\*?(\w+)\*?\*?:\s*`?([^`\n]+)`?/i);
    if (keyValueMatch) {
      const key = keyValueMatch[1].toLowerCase();
      const value = keyValueMatch[2].trim();

      switch (key) {
        case 'name':
          if (!schema.meta.name || schema.meta.name === 'OpenClaw Agent') {
            schema.meta.name = value;
          }
          break;
        case 'display name':
        case 'description':
          if (!schema.meta.description) {
            schema.meta.description = value;
          }
          break;
        case 'role':
          schema.identity.role = value;
          break;
        case 'vibe':
        case 'personality':
          schema.identity.personality = value;
          break;
      }
    }

    // 也匹配 `*Name*: xxx` 格式（UAT导出格式）
    const altMatch = line.match(/^\*(\w+)\*:\s*(.+)/i);
    if (altMatch) {
      const key = altMatch[1].toLowerCase();
      const value = altMatch[2].trim();

      if (key === 'name' && !schema.meta.name) {
        schema.meta.name = value;
      } else if (key === 'description' && !schema.meta.description) {
        schema.meta.description = value;
      }
    }
  }

  // 如果名称未提取到，尝试从标题提取
  if (!schema.meta.name || schema.meta.name === 'OpenClaw Agent') {
    const titleMatch = mdText.match(/^#\s+(.+)/m);
    if (titleMatch) {
      schema.meta.name = titleMatch[1].replace(/IDENTITY/i, '').trim();
    }
  }
}

function parseOpenClawToolsMD(mdText, schema) {
  if (!mdText) return;

  // 通用策略：从表格提取 skills/tools
  // 匹配任何表格行：| `xxx` | xxx | xxx |
  const tableRows = mdText.matchAll(/\| `([^`]+)` \| ([^|]+) \|/g);
  for (const match of tableRows) {
    const name = match[1];
    const desc = match[2].trim();

    // 添加为 function
    const fn = {
      name: name,
      description: desc,
      code: ''
    };
    schema.tools.functions.push(fn);
  }

  // 通用策略：从标题+描述格式提取 MCP/API
  // 匹配 ### Name 后面有 URL/Method 等描述
  const sections = mdText.split(/\n### /);
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');

    const name = lines[0].trim();
    const urlMatch = section.match(/[-*]\s+\*?URL\*?:\s*(.+)/i);
    const methodMatch = section.match(/[-*]\s+\*?Method\*?:\s*(\w+)/i);

    if (urlMatch) {
      // 可能是 MCP server 或 API endpoint
      const url = urlMatch[1].trim();

      if (methodMatch) {
        // API endpoint
        const api = UATCore.createEmptyAPIEndpoint();
        api.id = name;
        api.name = name;
        api.method = methodMatch[1];
        api.url = url;
        schema.tools.apiEndpoints.push(api);
      } else {
        // MCP server
        const mcp = UATCore.createEmptyMCPServer();
        mcp.id = name;
        mcp.name = name;
        mcp.url = url;
        schema.tools.mcpServers.push(mcp);
      }
    }
  }
}

function parseOpenClawMemoryMD(mdText, schema) {
  if (!mdText) return;

  // 通用策略：提取数字配置
  const numConfigs = mdText.matchAll(/[-*]\s+\*?(\w+)\*?:\s*(\d+)/gi);
  for (const match of numConfigs) {
    const key = match[1].toLowerCase();
    const value = parseInt(match[2]);

    if (key.includes('max') || key.includes('limit')) {
      schema.memory.sessionMemory.maxMessages = value;
    }
  }

  // 通用策略：从 ### 标题提取长期记忆条目
  // 匹配任何 ### 标题后的内容作为记忆条目，合并为字符串
  const sections = mdText.split(/\n### /);
  const memoryEntries = [];
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const topic = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    if (topic && content) {
      memoryEntries.push(`### ${topic}\n${content}`);
    }
  }

  // 如果有记忆条目，合并为 longTermMemory 字符串
  if (memoryEntries.length > 0) {
    schema.memory.longTermMemory = memoryEntries.join('\n\n');
  } else if (mdText.length > 100) {
    // 如果没有 ### 格式，将整个文档作为长期记忆
    schema.memory.longTermMemory = mdText.replace(/^#\s+.*\n/, '').trim();
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 OpenClaw 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeOpenClawToFiles(schema) {
  return {
    'openclaw.json': encodeOpenClawConfigJSON(schema),
    'workspace/AGENTS.md': encodeOpenClawAgentsMD(schema),
    'workspace/SOUL.md': encodeOpenClawSoulMD(schema),
    'workspace/IDENTITY.md': encodeOpenClawIdentityMD(schema),
    'workspace/USER.md': encodeOpenClawUserMD(schema),
    'workspace/TOOLS.md': encodeOpenClawToolsMD(schema),
    'workspace/MEMORY.md': encodeOpenClawMemoryMD(schema),
    'workspace/SKILLS.md': encodeOpenClawSkillsMD(schema),
    'workspace/HEARTBEAT.md': encodeOpenClawHeartbeatMD(schema),
    '.env.example': encodeOpenClawEnvExample(schema),
    'README.md': encodeOpenClawReadme(schema)
  };
}

window.OpenClawBundle = {
  createOpenClawBundle,
  parseOpenClawBundle,
  parseOpenClawBundleFromFiles,
  encodeOpenClawConfigJSON,
  encodeOpenClawAgentsMD,
  encodeOpenClawSoulMD,
  encodeOpenClawIdentityMD,
  encodeOpenClawUserMD,
  encodeOpenClawToolsMD,
  encodeOpenClawMemoryMD,
  encodeOpenClawSkillsMD,
  encodeOpenClawHeartbeatMD,
  encodeOpenClawEnvExample,
  encodeOpenClawReadme,
  extractOpenClawProvider,
  getOpenClawBaseUrl,
  encodeOpenClawToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.OpenClawBundle;
}
// Link global alias
OpenClawBundle = window.OpenClawBundle;

// ===== src/bundle/hermes-bundle.js =====
/**
 * UAT Hermes Bundle 管理器 - Hermes Bundle Manager
 * 专门处理 Hermes Agent 的多文件配置包导入导出
 *
 * Hermes 配置结构：
 * ~/.hermes/
 * ├── config.yaml    # 主配置
 * ├── SOUL.md        # 人格本体
 * ├── .env           # 密钥（导出时仅模板）
 * ├── skills/        # 技能目录
 * └── memories/      # 记忆库
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
// Hermes Bundle 创建（导出）
// ============================================

/**
 * 创建 Hermes Bundle ZIP 包
 * @param {Object} schema - UAT-Schema v2.0
 * @param {Object} options - 可选配置
 * @returns {Promise<Blob>} ZIP 文件
 */
async function createHermesBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json - Bundle 清单
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Hermes-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      config: "config.yaml",
      soul: "SOUL.md",
      envTemplate: ".env.example",
      skillsDir: "skills/",
      readme: "README.md"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Hermes Bundle"
    },
    notes: {
      knowledgeBase: "知识库引用已保留，需在 Hermes 中重新配置",
      secrets: "密钥已移除，请填写 .env 文件"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. config.yaml - Hermes 主配置
  const configYAML = encodeHermesConfigYAML(schema);
  zip.file("config.yaml", configYAML);

  // 3. SOUL.md - 人格本体（独立文件）
  const soulMD = encodeHermesSoulMD(schema);
  zip.file("SOUL.md", soulMD);

  // 4. .env.example - 密钥模板
  const envExample = encodeHermesEnvExample(schema);
  zip.file(".env.example", envExample);

  // 5. skills/ 目录
  const skillsFolder = zip.folder("skills");
  const skillsContent = encodeHermesSkillsDir(schema);

  // 技能注册表
  skillsFolder.file("skill_registry.json", JSON.stringify(skillsContent.registry, null, 2));

  // MCP 工具包装
  if (schema.tools.mcpServers?.length > 0) {
    skillsFolder.file("mcp_tools.py", skillsContent.mcpTools);
  }

  // API 工具包装
  if (schema.tools.apiEndpoints?.length > 0) {
    skillsFolder.file("api_tools.py", skillsContent.apiTools);
  }

  // 自定义函数
  if (schema.tools.functions?.length > 0) {
    skillsFolder.file("custom_functions.py", skillsContent.customFunctions);
  }

  // Skills YAML（新格式）
  if (skillsContent.skillsYAML) {
    skillsFolder.file("skills.yaml", skillsContent.skillsYAML);
  }

  // 6. memories/ 目录（空目录，可选）
  const memoriesFolder = zip.folder("memories");
  memoriesFolder.file("memory_export.json", JSON.stringify({
    exportedAt: new Date().toISOString(),
    sessions: [],
    userProfile: {}
  }));

  // 7. README.md - 使用说明
  const readmeMD = encodeHermesReadme(schema);
  zip.file("README.md", readmeMD);

  // 8. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Hermes config.yaml 编码器
// ============================================

function encodeHermesConfigYAML(schema) {
  const lines = [];

  // 版本头部
  lines.push('# Hermes Agent Configuration');
  lines.push('# Generated by UAT Converter');
  lines.push('');
  lines.push('hermes_version: "1.0"');
  lines.push('');

  // Identity 扩展字段
  if (schema.identity.role || schema.identity.personality || schema.identity.language) {
    lines.push('# Identity Configuration');
    lines.push('identity:');
    if (schema.identity.role) {
      lines.push(`  role: "${schema.identity.role}"`);
    }
    if (schema.identity.personality) {
      lines.push(`  personality: "${schema.identity.personality}"`);
    }
    if (schema.identity.language) {
      lines.push(`  language: "${schema.identity.language}"`);
    }
    lines.push('');
  }

  // 模型配置
  lines.push('# Model Configuration');
  lines.push('model:');
  const provider = extractHermesProvider(schema.modelConfig.model);
  lines.push(`  provider: "${provider}"`);
  lines.push(`  base_url: "${getHermesBaseUrl(provider)}"`);
  lines.push(`  model_name: "${schema.modelConfig.model}"`);
  lines.push(`  api_key_env: "${provider.toUpperCase()}_API_KEY"`);
  lines.push(`  temperature: ${schema.modelConfig.temperature}`);
  lines.push(`  max_tokens: ${schema.modelConfig.maxTokens}`);
  if (schema.modelConfig.topP !== 1) {
    lines.push(`  top_p: ${schema.modelConfig.topP}`);
  }
  if (schema.modelConfig.advanced?.frequencyPenalty) {
    lines.push(`  frequency_penalty: ${schema.modelConfig.advanced.frequencyPenalty}`);
  }
  if (schema.modelConfig.advanced?.presencePenalty) {
    lines.push(`  presence_penalty: ${schema.modelConfig.advanced.presencePenalty}`);
  }
  lines.push('');

  // 工具配置
  lines.push('# Tools Configuration');
  lines.push('tools:');
  lines.push('  enabled: true');
  lines.push('  auto_approve_safe_tools: true');
  lines.push('  toolsets:');
  lines.push('    - filesystem');
  lines.push('    - terminal');

  if (schema.tools.mcpServers?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    lines.push('  custom_skills_dir: "./skills/"');
  }
  lines.push('');

  // 上下文配置
  lines.push('# Context Configuration');
  lines.push('context:');
  lines.push('  compression_enabled: true');
  lines.push('  max_history_tokens: 100000');
  lines.push('  prompt_caching: true');
  lines.push('  cache_ttl: 300  # 5 minutes');
  lines.push('');

  // 记忆配置
  lines.push('# Memory Configuration');
  lines.push('memory:');
  lines.push('  enabled: true');
  lines.push('  backend: sqlite');
  lines.push('  max_history_messages: 100');
  if (schema.memory.sessionMemory?.maxMessages) {
    lines.push(`  session_limit: ${schema.memory.sessionMemory.maxMessages}`);
  }

  // 使用memoryEntries编码器（新格式）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    lines.push('');
    lines.push('  # Structured Memory Entries');
    lines.push(memoryEncoder.encodeMemoryEntriesToYAMLWithType(schema.memory.memoryEntries));
  }

  lines.push('');

  // 知识库配置
  const kbEncoder = getUATKnowledgeEncoder();
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      lines.push('# Knowledge Base');
      lines.push(kbEncoder.encodeKnowledgeToHermesYAML(kbContent));
    }
  }

  // 安全配置
  lines.push('# Safety & Compliance');
  lines.push('safety:');
  lines.push('  approval_required: false');
  lines.push('  auto_approve_tools:');
  lines.push('    - filesystem_read');
  lines.push('    - terminal_safe');
  if (schema.compliance?.piiHandling) {
    lines.push('  pii_detection: true');
    lines.push('  pii_masking: true');
  }
  lines.push('');

  // 日志配置
  lines.push('# Logging');
  lines.push('logging:');
  lines.push('  enabled: true');
  lines.push('  level: INFO');
  lines.push('  redact_secrets: true');
  lines.push('  log_dir: "./logs/"');
  lines.push('');

  // 网关配置（可选）
  if (schema.tools.mcpServers?.length > 0) {
    lines.push('# Message Gateways');
    lines.push('gateways:');
    lines.push('  enabled: []');
    lines.push('');
  }

  // 插件配置（可选）
  lines.push('# Plugins');
  lines.push('plugins:');
  lines.push('  enabled: []');
  lines.push('');

  return lines.join('\n');
}

function extractHermesProvider(modelName) {
  if (!modelName) return 'openai';
  const lower = modelName.toLowerCase();

  if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3')) return 'openai';
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gemini')) return 'google';
  if (lower.includes('llama') || lower.includes('mistral')) return 'openrouter';
  if (lower.includes('deepseek')) return 'deepseek';
  if (lower.includes('qwen')) return 'alibaba';

  return 'openrouter';  // 默认使用 OpenRouter 作为通用适配
}

function getHermesBaseUrl(provider) {
  const urls = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com',
    'google': 'https://generativelanguage.googleapis.com',
    'openrouter': 'https://openrouter.ai/api/v1',
    'deepseek': 'https://api.deepseek.com',
    'alibaba': 'https://dashscope.aliyuncs.com/api/v1',
    'ollama': 'http://localhost:11434'
  };
  return urls[provider] || urls['openrouter'];
}

// ============================================
// Hermes SOUL.md 编码器
// ============================================

function encodeHermesSoulMD(schema) {
  const sections = [];

  // 标题
  sections.push(`# ${schema.meta.name || 'Hermes Agent'}`);
  sections.push('');
  sections.push(`> ${schema.meta.description || 'AI Assistant powered by Hermes'}`);
  sections.push('');

  // 角色
  sections.push('## Role');
  sections.push('');
  sections.push(schema.identity.role || 'AI Assistant');
  sections.push('');

  // 系统提示词（核心）
  sections.push('## System Prompt');
  sections.push('');
  sections.push(schema.identity.systemPrompt || 'You are a helpful AI assistant.');
  sections.push('');

  // 性格/风格
  if (schema.identity.personality) {
    sections.push('## Personality');
    sections.push('');
    sections.push(schema.identity.personality);
    sections.push('');
  }

  // 语言风格
  if (schema.identity.responseStyle || schema.identity.language) {
    sections.push('## Response Style');
    sections.push('');
    if (schema.identity.language) {
      sections.push(`- Language: ${schema.identity.language}`);
    }
    if (schema.identity.responseStyle) {
      sections.push(`- Style: ${schema.identity.responseStyle}`);
    }
    sections.push('');
  }

  // 约束规则
  if (schema.identity.constraints?.length > 0) {
    sections.push('## Constraints');
    sections.push('');
    sections.push('Follow these rules in all interactions:');
    sections.push('');
    for (const c of schema.identity.constraints) {
      sections.push(`- ${c}`);
    }
    sections.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    sections.push('## Output Rules');
    sections.push('');
    for (const r of schema.identity.outputRules) {
      sections.push(`- ${r}`);
    }
    sections.push('');
  }

  // Prompt 变量（如果有）
  if (schema.identity.promptVariables?.length > 0) {
    sections.push('## Template Variables');
    sections.push('');
    sections.push('This agent supports the following template variables:');
    sections.push('');
    for (const v of schema.identity.promptVariables) {
      sections.push(`- \`{{${v.name}}}\`: ${v.description || v.type} (default: ${v.default || 'empty'})`);
    }
    sections.push('');
  }

  // 工作流（如果有）
  if (schema.workflow.steps?.length > 0) {
    sections.push('## Workflow');
    sections.push('');
    sections.push('Default task processing flow:');
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

  // 创建时间
  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Hermes .env.example 编码器
// ============================================

function encodeHermesEnvExample(schema) {
  const lines = [];

  lines.push('# Hermes Environment Variables Template');
  lines.push('# Copy this file to .env and fill in your API keys');
  lines.push('');
  lines.push('# WARNING: Never commit .env to Git!');
  lines.push('');

  // 根据模型推断需要的 API Key
  const provider = extractHermesProvider(schema.modelConfig.model);

  lines.push('# Model Provider API Keys');
  lines.push('');

  if (provider === 'openai') {
    lines.push('OPENAI_API_KEY=sk-your-openai-key-here');
    lines.push('#OPENAI_ORG_ID=org-your-org-id');
  } else if (provider === 'anthropic') {
    lines.push('ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here');
  } else if (provider === 'google') {
    lines.push('GOOGLE_API_KEY=your-google-api-key-here');
  } else if (provider === 'openrouter') {
    lines.push('OPENROUTER_API_KEY=sk-or-your-openrouter-key-here');
  } else if (provider === 'deepseek') {
    lines.push('DEEPSEEK_API_KEY=sk-your-deepseek-key-here');
  } else if (provider === 'ollama') {
    lines.push('OLLAMA_HOST=http://localhost:11434');
  } else {
    lines.push(`${provider.toUpperCase()}_API_KEY=your-api-key-here`);
  }
  lines.push('');

  // MCP 工具密钥（如果有）
  if (schema.tools.mcpServers?.length > 0) {
    lines.push('# MCP Server Credentials');
    lines.push('');
    for (const mcp of schema.tools.mcpServers) {
      if (mcp.config?.env) {
        for (const [key, _] of Object.entries(mcp.config.env)) {
          lines.push(`MCP_${mcp.name.toUpperCase()}_${key.toUpperCase}=your-value-here`);
        }
      }
    }
    lines.push('');
  }

  // 其他可选配置
  lines.push('# Optional Settings');
  lines.push('');
  lines.push('#HERMES_LOG_LEVEL=INFO');
  lines.push('#HERMES_APPROVAL_MODE=auto');
  lines.push('');

  return lines.join('\n');
}

// ============================================
// Hermes skills/ 目录编码器
// ============================================

function encodeHermesSkillsDir(schema) {
  const skillsEncoder = getUATSkillsEncoder();
  const result = {
    registry: { skills: [] },
    mcpTools: '',
    apiTools: '',
    customFunctions: '',
    skillsYAML: ''
  };

  // 使用skillsLayer编码器（新格式）
  if (schema.skills && skillsEncoder) {
    result.skillsYAML = skillsEncoder.encodeSkillsToHermesYAML(schema.skills);
  }

  // 技能注册表
  if (schema.tools.mcpServers?.length > 0) {
    for (const mcp of schema.tools.mcpServers) {
      result.registry.skills.push({
        name: mcp.name,
        type: 'mcp',
        description: mcp.tools?.map(t => t.name).join(', ') || 'MCP Server',
        file: 'mcp_tools.py',
        enabled: mcp.enabled !== false,
        config: {
          url: mcp.url || '',
          transport: mcp.config?.transport || 'stdio',
          command: mcp.config?.command || '',
          args: mcp.config?.args || []
        }
      });
    }
  }

  if (schema.tools.apiEndpoints?.length > 0) {
    for (const api of schema.tools.apiEndpoints) {
      result.registry.skills.push({
        name: api.name,
        type: 'http',
        description: api.name,
        file: 'api_tools.py',
        enabled: true,
        config: {
          method: api.method || 'GET',
          url: api.url || '',
          headers: api.headers || {},
          authType: api.auth?.type || 'none'
        }
      });
    }
  }

  if (schema.tools.functions?.length > 0) {
    for (const fn of schema.tools.functions) {
      result.registry.skills.push({
        name: fn.name,
        type: 'function',
        description: fn.description || fn.name,
        file: 'custom_functions.py',
        enabled: true,
        inputs: fn.inputs || [],
        outputs: fn.outputs || []
      });
    }
  }

  // MCP 工具 Python 代码
  result.mcpTools = generateMCPToolsPy(schema);

  // API 工具 Python 代码
  result.apiTools = generateAPIToolsPy(schema);

  // 自定义函数 Python 代码
  result.customFunctions = generateCustomFunctionsPy(schema);

  return result;
}

function generateMCPToolsPy(schema) {
  const lines = [];

  lines.push('"""');
  lines.push('Hermes MCP Tools Wrapper');
  lines.push('Generated by UAT Converter');
  lines.push('"""');
  lines.push('');
  lines.push('from typing import Dict, Any, Optional');
  lines.push('import asyncio');
  lines.push('');

  if (!schema.tools.mcpServers?.length) {
    lines.push('# No MCP servers defined');
    lines.push('MCP_TOOLS = {}');
    return lines.join('\n');
  }

  lines.push('# MCP Server Registry');
  lines.push('MCP_SERVERS = {');

  for (const mcp of schema.tools.mcpServers) {
    lines.push(`    "${mcp.name}": {`);
    lines.push(`        "url": "${mcp.url || ''}",`);
    lines.push(`        "transport": "${mcp.config?.transport || 'stdio'}",`);
    if (mcp.config?.command) {
      lines.push(`        "command": "${mcp.config.command}",`);
    }
    if (mcp.config?.args?.length) {
      lines.push(`        "args": ${JSON.stringify(mcp.config.args)},`);
    }
    lines.push(`        "enabled": ${mcp.enabled !== false}`);
    lines.push(`    },`);
  }

  lines.push('}');
  lines.push('');
  lines.push('');
  lines.push('# Tool definitions for Hermes');
  lines.push('def get_mcp_tools():');
  lines.push('    """Return MCP tool definitions for Hermes agent"""');
  lines.push('    tools = []');
  lines.push('    for name, config in MCP_SERVERS.items():');
  lines.push('        if config.get("enabled"):');
  lines.push('            tools.append({');
  lines.push('                "name": name,');
  lines.push('                "type": "mcp_server",');
  lines.push('                "config": config');
  lines.push('            })');
  lines.push('    return tools');
  lines.push('');

  return lines.join('\n');
}

function generateAPIToolsPy(schema) {
  const lines = [];

  lines.push('"""');
  lines.push('Hermes API Tools Wrapper');
  lines.push('Generated by UAT Converter');
  lines.push('"""');
  lines.push('');
  lines.push('import requests');
  lines.push('from typing import Dict, Any, Optional');
  lines.push('');

  if (!schema.tools.apiEndpoints?.length) {
    lines.push('# No API endpoints defined');
    lines.push('API_TOOLS = {}');
    return lines.join('\n');
  }

  lines.push('# API Endpoint Registry');
  lines.push('API_ENDPOINTS = {');

  for (const api of schema.tools.apiEndpoints) {
    lines.push(`    "${api.name}": {`);
    lines.push(`        "method": "${api.method || 'GET'}",`);
    lines.push(`        "url": "${api.url || ''}",`);
    if (Object.keys(api.headers || {}).length) {
      lines.push(`        "headers": ${JSON.stringify(api.headers)},`);
    }
    lines.push(`        "auth_type": "${api.auth?.type || 'none'}"`);
    lines.push(`    },`);
  }

  lines.push('}');
  lines.push('');
  lines.push('');
  lines.push('# API Tool Functions');
  lines.push('def call_api(name: str, params: Dict = None, data: Dict = None) -> Dict:');

  for (const api of schema.tools.apiEndpoints) {
    lines.push(`    """Call ${api.name} API"""`);
  }

  lines.push('    endpoint = API_ENDPOINTS.get(name)');
  lines.push('    if not endpoint:');
  lines.push('        raise ValueError(f"Unknown API: {name}")');
  lines.push('');
  lines.push('    response = requests.request(');
  lines.push('        method=endpoint["method"],');
  lines.push('        url=endpoint["url"],');
  lines.push('        headers=endpoint.get("headers", {}),');
  lines.push('        params=params,');
  lines.push('        json=data');
  lines.push('    )');
  lines.push('    return response.json()');
  lines.push('');
  lines.push('');
  lines.push('def get_api_tools():');
  lines.push('    """Return API tool definitions for Hermes agent"""');
  lines.push('    tools = []');
  lines.push('    for name, config in API_ENDPOINTS.items():');
  lines.push('        tools.append({');
  lines.push('            "name": name,');
  lines.push('            "type": "http_request",');
  lines.push('            "config": config');
  lines.push('        })');
  lines.push('    return tools');
  lines.push('');

  return lines.join('\n');
}

function generateCustomFunctionsPy(schema) {
  const lines = [];

  lines.push('"""');
  lines.push('Hermes Custom Functions');
  lines.push('Generated by UAT Converter');
  lines.push('"""');
  lines.push('');
  lines.push('from typing import Dict, Any, List');
  lines.push('');

  if (!schema.tools.functions?.length) {
    lines.push('# No custom functions defined');
    lines.push('CUSTOM_FUNCTIONS = {}');
    return lines.join('\n');
  }

  for (const fn of schema.tools.functions) {
    lines.push(`def ${fn.name.replace(/[^a-zA-Z0-9_]/g, '_')}(**kwargs) -> Any:`);
    lines.push(`    """${fn.description || fn.name}"""`);
    if (fn.code) {
      lines.push(fn.code);
    } else {
      lines.push('    # TODO: Implement function logic');
      lines.push('    return kwargs');
    }
    lines.push('');
  }

  lines.push('# Function Registry');
  lines.push('CUSTOM_FUNCTIONS = {');
  for (const fn of schema.tools.functions) {
    const fnName = fn.name.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`    "${fn.name}": ${fnName},`);
  }
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ============================================
// Hermes README.md 编码器
// ============================================

function encodeHermesReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Hermes Agent'} - Bundle`);
  sections.push('');
  sections.push(`This bundle contains the complete configuration for a Hermes Agent.`);
  sections.push('');

  sections.push('## Bundle Contents');
  sections.push('');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `config.yaml` | Main Hermes configuration (model, tools, safety) |');
  sections.push('| `SOUL.md` | Agent personality and system prompt |');
  sections.push('| `.env.example` | Environment variables template (copy to .env) |');
  sections.push('| `skills/` | Custom skills and tools |');
  sections.push('| `memories/` | Memory storage (empty by default) |');
  sections.push('');

  sections.push('## Installation');
  sections.push('');
  sections.push('1. Extract this ZIP to your Hermes directory:');
  sections.push('   ```bash');
  sections.push('   unzip hermes_bundle.zip -d ~/.hermes/');
  sections.push('   ```');
  sections.push('');
  sections.push('2. Configure your API keys:');
  sections.push('   ```bash');
  sections.push('   cp ~/.hermes/.env.example ~/.hermes/.env');
  sections.push('   # Edit .env and add your API keys');
  sections.push('   ```');
  sections.push('');
  sections.push('3. Start Hermes:');
  sections.push('   ```bash');
  sections.push('   hermes run');
  sections.push('   ```');
  sections.push('');

  sections.push('## Configuration');
  sections.push('');
  sections.push(`- **Model**: ${schema.modelConfig.model}`);
  sections.push(`- **Temperature**: ${schema.modelConfig.temperature}`);
  sections.push(`- **Max Tokens**: ${schema.modelConfig.maxTokens}`);
  sections.push('');

  if (schema.tools.mcpServers?.length) {
    sections.push('### MCP Servers');
    sections.push('');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`- ${mcp.name}: ${mcp.url || 'local'}`);
    }
    sections.push('');
  }

  if (schema.tools.apiEndpoints?.length) {
    sections.push('### API Tools');
    sections.push('');
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`- ${api.name}: ${api.method} ${api.url}`);
    }
    sections.push('');
  }

  sections.push('## Notes');
  sections.push('');
  sections.push('- **Knowledge Base**: If this agent uses knowledge bases, configure them in Hermes separately.');
  sections.push('- **Secrets**: Never commit `.env` file to Git.');
  sections.push('- **Custom Skills**: Add Python files to `skills/` directory to extend capabilities.');
  sections.push('');

  sections.push('---');
  sections.push('');
  sections.push(`*Generated by UAT Converter at ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Hermes Bundle 解析（导入）
// ============================================

/**
 * 解析 Hermes Bundle ZIP 包
 * @param {File|Blob} zipFile - ZIP 文件
 * @returns {Promise<Object>} { schema, manifest, rawFiles }
 */
async function parseHermesBundle(zipFile) {
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

  // 2. 解析 config.yaml
  const configFile = zip.file("config.yaml");
  let configYAML = '';
  if (configFile) {
    configYAML = await configFile.async("string");
  }

  // 3. 解析 SOUL.md
  const soulFile = zip.file("SOUL.md");
  let soulMD = '';
  if (soulFile) {
    soulMD = await soulFile.async("string");
  }

  // 4. 解析 skills/ 目录
  const skillRegistryFile = zip.file("skills/skill_registry.json");
  let skillRegistry = { skills: [] };
  if (skillRegistryFile) {
    skillRegistry = JSON.parse(await skillRegistryFile.async("string"));
  }

  // 5. 构建 UAT-Schema
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'hermes';
  schema.meta.name = manifest.agent?.name || 'Hermes Agent';
  schema.meta.description = manifest.agent?.description || '';

  // 从 config.yaml 解析模型配置
  parseHermesConfigYAML(configYAML, schema);

  // 从 SOUL.md 解析人格
  parseHermesSoulMD(soulMD, schema);

  // 从 skill_registry.json 解析工具
  parseHermesSkillRegistry(skillRegistry, schema);

  // 补全默认值
  UATCore.fillSchemaDefaultValues(schema);

  // 原始文件内容（供调试）
  const rawFiles = {
    configYAML,
    soulMD,
    skillRegistry
  };

  return { schema, manifest, rawFiles };
}

/**
 * 解析 Hermes 配置文件（无 manifest，从提取的文件直接解析）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 实例（可选）
 * @returns {Promise<Object>} schema
 */
async function parseHermesBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'hermes';
  schema.meta.name = 'Hermes Agent';

  // 1. 解析 config.yaml
  const configYAML = findFileByPattern(extractedFiles, ['config.yaml', 'config.yml']);
  if (configYAML) {
    parseHermesConfigYAML(configYAML, schema);
    // 从 config.yaml 提取 name
    const nameMatch = configYAML.match(/name:\s*['"]?([^'":\n]+)['"]?/i);
    if (nameMatch) schema.meta.name = nameMatch[1].trim();
  }

  // 2. 解析 SOUL.md
  const soulMD = findFileByPattern(extractedFiles, ['SOUL.md', 'soul.md']);
  if (soulMD) {
    parseHermesSoulMD(soulMD, schema);
  }

  // 3. 解析 skill_registry.json
  const skillRegistryJSON = findFileByPattern(extractedFiles, ['skills/skill_registry.json', 'skill_registry.json']);
  if (skillRegistryJSON) {
    try {
      const skillRegistry = JSON.parse(skillRegistryJSON);
      parseHermesSkillRegistry(skillRegistry, schema);
    } catch (e) {
      console.warn('skill_registry.json parse error:', e.message);
    }
  }

  // 4. 解析 memories/memory_export.json
  const memoryJSON = findFileByPattern(extractedFiles, ['memories/memory_export.json', 'memory_export.json']);
  if (memoryJSON) {
    try {
      const memoryData = JSON.parse(memoryJSON);
      if (memoryData.longTermMemory) {
        schema.memory.longTermMemory = memoryData.longTermMemory;
      }
    } catch (e) {
      console.warn('memory_export.json parse error:', e.message);
    }
  }

  // 补全默认值
  UATCore.fillSchemaDefaultValues(schema);

  return schema;
}

/**
 * 从文件集合中查找匹配的文件内容
 */
function findFileByPattern(files, patterns) {
  for (const pattern of patterns) {
    // 精确匹配
    for (const [path, content] of Object.entries(files)) {
      if (path === pattern || path.endsWith('/' + pattern)) {
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

function parseHermesConfigYAML(yamlText, schema) {
  if (!yamlText) return;

  // 提取模型配置
  schema.modelConfig.model = extractYAMLValue(yamlText, 'model_name') ||
                             extractYAMLValue(yamlText, 'name', 'model:') || 'gpt-4';
  schema.modelConfig.temperature = parseFloat(extractYAMLValue(yamlText, 'temperature')) || 0.7;
  schema.modelConfig.maxTokens = parseInt(extractYAMLValue(yamlText, 'max_tokens')) || 4096;

  const topP = parseFloat(extractYAMLValue(yamlText, 'top_p'));
  if (topP) schema.modelConfig.topP = topP;

  const freqPenalty = parseFloat(extractYAMLValue(yamlText, 'frequency_penalty'));
  if (freqPenalty) schema.modelConfig.advanced.frequencyPenalty = freqPenalty;

  const presPenalty = parseFloat(extractYAMLValue(yamlText, 'presence_penalty'));
  if (presPenalty) schema.modelConfig.advanced.presencePenalty = presPenalty;

  // 提取工具配置
  const toolsEnabled = extractYAMLValue(yamlText, 'enabled', 'tools:');
  if (toolsEnabled === 'true' || toolsEnabled === true) {
    schema.tools.permissionScope = 'extended';
  }

  // 提取记忆配置
  const memLimit = parseInt(extractYAMLValue(yamlText, 'session_limit'));
  if (memLimit) {
    schema.memory.sessionMemory.maxMessages = memLimit;
  }
}

function parseHermesSoulMD(mdText, schema) {
  if (!mdText) return;

  // 提取系统提示词（## System Prompt 后的内容）
  const promptMatch = mdText.match(/## System Prompt\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (promptMatch) {
    schema.identity.systemPrompt = promptMatch[1].trim();
  } else {
    // 如果没有明确标记，取全文
    schema.identity.systemPrompt = mdText;
  }

  // 提取角色
  const roleMatch = mdText.match(/## Role\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (roleMatch) {
    schema.identity.role = roleMatch[1].trim();
  }

  // 提取约束
  const constraintsMatch = mdText.match(/## Constraints\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (constraintsMatch) {
    const lines = constraintsMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.constraints.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }

  // 提取输出规则
  const rulesMatch = mdText.match(/## Output Rules\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (rulesMatch) {
    const lines = rulesMatch[1].split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        schema.identity.outputRules.push(line.replace(/^-\s*/, '').trim());
      }
    }
  }
}

function parseHermesSkillRegistry(registry, schema) {
  if (!registry?.skills) return;

  for (const skill of registry.skills) {
    if (skill.type === 'mcp') {
      const mcp = UATCore.createEmptyMCPServer();
      mcp.id = skill.name;
      mcp.name = skill.name;
      mcp.url = skill.config?.url || '';
      mcp.config = {
        transport: skill.config?.transport || 'stdio',
        command: skill.config?.command || '',
        args: skill.config?.args || [],
        env: {},
        capabilities: []
      };
      mcp.enabled = skill.enabled !== false;
      schema.tools.mcpServers.push(mcp);
    }

    if (skill.type === 'http') {
      const api = UATCore.createEmptyAPIEndpoint();
      api.id = skill.name;
      api.name = skill.name;
      api.method = skill.config?.method || 'GET';
      api.url = skill.config?.url || '';
      api.headers = skill.config?.headers || {};
      api.auth.type = skill.config?.authType || 'none';
      schema.tools.apiEndpoints.push(api);
    }

    if (skill.type === 'function') {
      schema.tools.functions.push({
        id: skill.name,
        name: skill.name,
        description: skill.description || skill.name,
        code: '',
        inputs: skill.inputs || [],
        outputs: skill.outputs || []
      });
    }
  }
}

// ============================================
// 辅助函数
// ============================================

function extractYAMLValue(text, key, parentKey = null) {
  if (parentKey) {
    const parentMatch = text.match(new RegExp(`${parentKey}[\\s]*\\n([\\s\\S]*?)(?=\\n\\w+:|$)`));
    if (parentMatch) {
      return extractYAMLValueFromBlock(parentMatch[1], key);
    }
    return null;
  }

  const regex = new RegExp(`${key}:\\s*['"]?([^'":\\n]+)['"]?`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractYAMLValueFromBlock(block, key) {
  const regex = new RegExp(`(?:^|\\n)\\s*${key}:\\s*['"]?([^'":\\n]+)['"]?`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

// ============================================
// 导出模块接口
// ============================================

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Hermes 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeHermesToFiles(schema) {
  const skillsDir = encodeHermesSkillsDir(schema);
  return {
    'config.yaml': encodeHermesConfigYAML(schema),
    'SOUL.md': encodeHermesSoulMD(schema),
    'skills/skill_registry.json': JSON.stringify(skillsDir.registry, null, 2),
    'skills/mcp_tools.py': skillsDir.mcpTools,
    'skills/api_tools.py': skillsDir.apiTools,
    'skills/custom_functions.py': skillsDir.customFunctions,
    '.env.example': encodeHermesEnvExample(schema),
    'README.md': encodeHermesReadme(schema)
  };
}

window.HermesBundle = {
  createHermesBundle,
  parseHermesBundle,
  parseHermesBundleFromFiles,
  encodeHermesConfigYAML,
  encodeHermesSoulMD,
  encodeHermesEnvExample,
  encodeHermesSkillsDir,
  encodeHermesReadme,
  extractHermesProvider,
  getHermesBaseUrl,
  encodeHermesToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.HermesBundle;
}
// Link global alias
HermesBundle = window.HermesBundle;

// ===== src/bundle/cursor-bundle.js =====
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

  // Role 定位
  if (schema.identity.role) {
    sections.push('## Role');
    sections.push('');
    sections.push(`You are acting as: ${schema.identity.role}`);
    sections.push('');
  }

  // Personality 性格特点
  if (schema.identity.personality) {
    sections.push('## Personality');
    sections.push('');
    sections.push(`Communication style: ${schema.identity.personality}`);
    sections.push('');
  }

  // Language 语言偏好
  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    const langDisplay = schema.identity.language === 'zh-CN' ? 'Chinese' :
                        schema.identity.language === 'en-US' ? 'English' : schema.identity.language;
    sections.push(`Primary language: ${langDisplay}`);
    sections.push(`- Respond in ${langDisplay} unless specified otherwise`);
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

  // Memory encoding（使用memoryEntries）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push(memoryEncoder.encodeMemoryEntriesToList(schema.memory.memoryEntries));
  }

  // 知识库编码
  const kbEncoder = getUATKnowledgeEncoder();
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      sections.push(kbEncoder.encodeKnowledgeToList(kbContent));
    }
  }

  // 技能编码
  const skillsEncoder = getUATSkillsEncoder();
  if (schema.skills?.skills?.length > 0 && skillsEncoder) {
    sections.push(skillsEncoder.encodeSkillsToList(schema.skills));
  }

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

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CursorBundle;
}
// Link global alias
CursorBundle = window.CursorBundle;

// ===== src/bundle/windsurf-bundle.js =====
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

  // Role 定位
  if (schema.identity.role) {
    sections.push('## Role');
    sections.push('');
    sections.push(`You are acting as: ${schema.identity.role}`);
    sections.push('');
  }

  // Personality 性格特点
  if (schema.identity.personality) {
    sections.push('## Personality');
    sections.push('');
    sections.push(`Communication style: ${schema.identity.personality}`);
    sections.push('');
  }

  // Language 语言偏好
  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    const langDisplay = schema.identity.language === 'zh-CN' ? 'Chinese' :
                        schema.identity.language === 'en-US' ? 'English' : schema.identity.language;
    sections.push(`Primary language: ${langDisplay}`);
    sections.push(`- Respond in ${langDisplay} unless specified otherwise`);
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

  // Memory encoding（使用memoryEntries）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push(memoryEncoder.encodeMemoryEntriesToList(schema.memory.memoryEntries));
  }

  // 知识库编码
  const kbEncoder = getUATKnowledgeEncoder();
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      sections.push(kbEncoder.encodeKnowledgeToList(kbContent));
    }
  }

  // 技能编码
  const skillsEncoder = getUATSkillsEncoder();
  if (schema.skills?.skills?.length > 0 && skillsEncoder) {
    sections.push(skillsEncoder.encodeSkillsToList(schema.skills));
  }

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
// Link global alias
WindsurfBundle = window.WindsurfBundle;

// ===== src/bundle/claude-code-bundle.js =====
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
// Link global alias
ClaudeCodeBundle = window.ClaudeCodeBundle;

// ===== src/bundle/dify-bundle.js =====
/**
 * UAT Dify Bundle 管理器 - Dify Bundle Manager
 * 专门处理 Dify AI Agent 的多文件配置包导入导出
 *
 * Dify 配置结构：
 * 项目导出包/
 * ├── dify.yml                  # 主DSL配置文件
 * ├── workflow/
 * │   ├── nodes.yml             # 工作流节点定义
 * │   ├── edges.yml             # 节点连接关系
 * │   └── variables.yml         # 流程变量
 * ├── knowledge_base/
 * │   ├── references.json       # 知识库ID引用
 * │   └── README.md             # 知识库说明
 * ├── prompts/
 * │   ├── system_prompt.txt     # 系统提示词
 * │   └── templates/            # 变量模板
 * ├── tools/
 * │   ├── custom_tools.yml      # 自定义工具
 * │   └── api_tools.yml         # API工具配置
 * ├── app_config/
 * │   ├── ui_settings.json      # UI界面设置
 * │   └── model_config.json     # 模型参数
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
// Dify Bundle 创建（导出）
// ============================================

async function createDifyBundle(schema, options = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = new JSZip();

  // 1. manifest.json
  const manifest = {
    bundleVersion: "1.0",
    bundleType: "Dify-Agent-Bundle",
    agent: {
      name: schema.meta.name,
      description: schema.meta.description,
      sourcePlatform: schema.meta.sourcePlatform || 'unknown'
    },
    files: {
      mainConfig: "dify.yml",
      workflowDir: "workflow/",
      knowledgeDir: "knowledge_base/",
      promptsDir: "prompts/",
      toolsDir: "tools/",
      appConfigDir: "app_config/"
    },
    exportMeta: {
      createdAt: new Date().toISOString(),
      exportedBy: "UAT v2.0 - Dify Bundle"
    },
    notes: {
      knowledgeBase: "知识库仅保留ID引用，需在Dify平台重新关联",
      workflow: "工作流节点完整导出，可在Dify平台重建"
    }
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. dify.yml - 主DSL配置
  const difyYML = encodeDifyYML(schema);
  zip.file("dify.yml", difyYML);

  // 3. workflow/ 目录
  const workflowFolder = zip.folder("workflow");
  workflowFolder.file("nodes.yml", encodeDifyNodesYML(schema));
  workflowFolder.file("edges.yml", encodeDifyEdgesYML(schema));
  workflowFolder.file("variables.yml", encodeDifyVariablesYML(schema));

  // 4. knowledge_base/ 目录
  const kbFolder = zip.folder("knowledge_base");
  kbFolder.file("references.json", encodeDifyKBReferences(schema));
  kbFolder.file("README.md", encodeDifyKBReadme(schema));

  // 5. prompts/ 目录
  const promptsFolder = zip.folder("prompts");
  promptsFolder.file("system_prompt.txt", encodeDifySystemPrompt(schema));
  const templatesFolder = promptsFolder.folder("templates");
  templatesFolder.file("user_input.yml", encodeDifyUserInputTemplate(schema));

  // 6. tools/ 目录
  const toolsFolder = zip.folder("tools");
  toolsFolder.file("custom_tools.yml", encodeDifyCustomTools(schema));
  toolsFolder.file("api_tools.yml", encodeDifyAPITools(schema));

  // 7. app_config/ 目录
  const appConfigFolder = zip.folder("app_config");
  appConfigFolder.file("ui_settings.json", encodeDifyUISettings(schema));
  appConfigFolder.file("model_config.json", encodeDifyModelConfig(schema));

  // 8. README.md
  zip.file("README.md", encodeDifyReadme(schema));

  // 9. 生成 ZIP
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

// ============================================
// Dify DSL 编码器
// ============================================

function encodeDifyYML(schema) {
  const lines = [];

  lines.push('# Dify Agent Configuration');
  lines.push('# Generated by UAT Converter');
  lines.push('');
  lines.push('dify_version: "0.1"');
  lines.push('');

  // App 配置
  lines.push('app:');
  lines.push(`  name: "${schema.meta.name || 'Dify Agent'}"`);
  lines.push(`  description: "${schema.meta.description || ''}"`);
  lines.push('  mode: "workflow"');
  lines.push('  icon: "🤖"');
  lines.push('');

  // Identity 扩展字段
  if (schema.identity.role || schema.identity.personality || schema.identity.language) {
    lines.push('identity:');
    if (schema.identity.role) {
      lines.push(`  role: "${schema.identity.role}"`);
    }
    if (schema.identity.personality) {
      lines.push(`  personality: "${schema.identity.personality}"`);
    }
    if (schema.identity.language) {
      lines.push(`  language: "${schema.identity.language}"`);
    }
    lines.push('');
  }

  // Model 配置
  lines.push('model:');
  const provider = extractDifyProvider(schema.modelConfig.model);
  lines.push(`  provider: ${provider}`);
  lines.push(`  name: "${schema.modelConfig.model}"`);
  lines.push(`  temperature: ${schema.modelConfig.temperature || 0.7}`);
  lines.push(`  max_tokens: ${schema.modelConfig.maxTokens || 4096}`);
  lines.push('');

  // Workflow 引用
  lines.push('workflow:');
  lines.push('  graph:');
  lines.push('    nodes: "@workflow/nodes.yml"');
  lines.push('    edges: "@workflow/edges.yml"');
  lines.push('');

  // Memory - 使用UATMemoryEncoder
  if (schema.memory.memoryEntries?.length > 0) {
    const memoryEncoder = getUATMemoryEncoder();
    if (memoryEncoder) {
      lines.push('# Memory Configuration');
      lines.push(memoryEncoder.encodeMemoryEntriesToYAML(schema.memory.memoryEntries));
    }
  }

  // Knowledge Base
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    lines.push('knowledge_base:');
    lines.push('  enabled: true');
    lines.push('  datasets: "@knowledge_base/references.json"');
    lines.push('  retrieval:');
    lines.push('    top_k: 5');
    lines.push('    score_threshold: 0.5');
    lines.push('');
  }

  // Tools
  lines.push('tools:');
  lines.push('  builtin: []');
  lines.push('  custom: "@tools/custom_tools.yml"');
  lines.push('');

  // Skills encoding（使用YAML格式）
  if (schema.skills?.skills?.length > 0) {
    const skillsEncoder = getUATSkillsEncoder();
    if (skillsEncoder) {
      lines.push(skillsEncoder.encodeSkillsToDifyYAML(schema.skills));
    }
  }

  return lines.join('\n');
}

function extractDifyProvider(modelName) {
  if (!modelName) return 'openai';
  const lower = modelName.toLowerCase();
  if (lower.includes('gpt')) return 'openai';
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gemini')) return 'google';
  if (lower.includes('deepseek')) return 'deepseek';
  return 'openai';
}

function encodeDifyNodesYML(schema) {
  const lines = [];

  lines.push('# Workflow Nodes Definition');
  lines.push('');

  // Start Node
  lines.push('- id: "start_node"');
  lines.push('  type: "start"');
  lines.push('  data:');
  lines.push('    title: "开始"');
  lines.push('    variables:');
  lines.push('      - name: "user_input"');
  lines.push('        type: "string"');
  lines.push('        required: true');
  lines.push('');

  // LLM Node
  lines.push('- id: "llm_node"');
  lines.push('  type: "llm"');
  lines.push('  data:');
  lines.push('    title: "AI推理"');
  lines.push('    model:');
  lines.push(`      provider: ${extractDifyProvider(schema.modelConfig.model)}`);
  lines.push(`      name: "${schema.modelConfig.model}"`);
  lines.push('    prompt_template: "@prompts/system_prompt.txt"');
  lines.push('');

  // Workflow Steps as Nodes
  if (schema.workflow.steps?.length > 0) {
    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      lines.push(`- id: "step_${i}"`);
      lines.push(`  type: "${step.type}"`);
      lines.push('  data:');
      lines.push(`    title: "${step.name}"`);
      if (step.content) {
        lines.push(`    content: "${step.content.substring(0, 200)}"`);
      }
      lines.push('');
    }
  }

  // End Node
  lines.push('- id: "end_node"');
  lines.push('  type: "end"');
  lines.push('  data:');
  lines.push('    title: "结束"');
  lines.push('    outputs:');
  lines.push('      - name: "response"');
  lines.push('        value_selector: "llm_node/text"');

  return lines.join('\n');
}

function encodeDifyEdgesYML(schema) {
  const lines = [];

  lines.push('# Workflow Edges Definition');
  lines.push('');

  lines.push('- source: "start_node"');
  lines.push('  target: "llm_node"');
  lines.push('');

  // Workflow Step Edges
  if (schema.workflow.steps?.length > 0) {
    for (let i = 0; i < schema.workflow.steps.length; i++) {
      lines.push(`- source: "${i === 0 ? 'llm_node' : `step_${i - 1}`}"`);
      lines.push(`  target: "step_${i}"`);
      lines.push('');
    }
    lines.push(`- source: "step_${schema.workflow.steps.length - 1}"`);
    lines.push('  target: "end_node"');
  } else {
    lines.push('- source: "llm_node"');
    lines.push('  target: "end_node"');
  }

  return lines.join('\n');
}

function encodeDifyVariablesYML(schema) {
  const lines = [];

  lines.push('# Workflow Variables');
  lines.push('');

  if (schema.identity.promptVariables?.length > 0) {
    for (const v of schema.identity.promptVariables) {
      lines.push(`- name: "${v.name}"`);
      lines.push(`  type: "${v.type || 'string'}"`);
      lines.push(`  default: "${v.default || ''}"`);
      lines.push('');
    }
  } else {
    lines.push('# No custom variables defined');
  }

  return lines.join('\n');
}

function encodeDifyKBReferences(schema) {
  const kbEncoder = getUATKnowledgeEncoder();

  // 如果有knowledgeBaseContent，使用编码器完整编码
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      return kbEncoder.encodeKnowledgeToDifyYAML(kbContent);
    }
  }

  // 否则仅保留引用
  const kbConfig = {
    datasets: [],
    note: "知识库内容不会导出，仅保留ID引用，需要在Dify平台重新创建或关联"
  };

  if (schema.memory.knowledgeBaseRef?.length > 0) {
    for (const kb of schema.memory.knowledgeBaseRef) {
      kbConfig.datasets.push({
        id: kb.id,
        name: kb.name,
        type: kb.type || 'external',
        description: kb.description || '',
        retrieval_config: {
          top_k: 5,
          score_threshold: 0.5
        }
      });
    }
  }

  return JSON.stringify(kbConfig, null, 2);
}

function encodeDifyKBReadme(schema) {
  const sections = [];

  sections.push('# Dify Knowledge Base');
  sections.push('');
  sections.push('知识库配置说明：');
  sections.push('');
  sections.push('- references.json 中仅包含知识库ID引用');
  sections.push('- 知识库内容需要在Dify平台重新上传或关联');
  sections.push('- 支持的知识库类型：文件上传、网页链接、API数据');
  sections.push('');

  return sections.join('\n');
}

function encodeDifySystemPrompt(schema) {
  return schema.identity.systemPrompt || 'You are a helpful AI assistant.';
}

function encodeDifyUserInputTemplate(schema) {
  const lines = [];

  lines.push('name: "user_input_template"');
  lines.push('variables:');
  lines.push('  - name: "query"');
  lines.push('    type: "string"');
  lines.push('    description: "用户查询内容"');
  lines.push('template: |');
  lines.push('  用户问题: {{query}}');

  return lines.join('\n');
}

function encodeDifyCustomTools(schema) {
  const lines = [];

  lines.push('# Dify Custom Tools');
  lines.push('');

  if (schema.tools.functions?.length > 0) {
    for (const fn of schema.tools.functions) {
      lines.push(`- name: "${fn.name}"`);
      lines.push(`  description: "${fn.description || fn.name}"`);
      lines.push('  type: "function"');
      lines.push('');
    }
  } else {
    lines.push('# No custom tools defined');
  }

  return lines.join('\n');
}

function encodeDifyAPITools(schema) {
  const lines = [];

  lines.push('# Dify API Tools');
  lines.push('');

  if (schema.tools.apiEndpoints?.length > 0) {
    for (const api of schema.tools.apiEndpoints) {
      lines.push(`- name: "${api.name}"`);
      lines.push('  type: "http"');
      lines.push('  config:');
      lines.push(`    url: "${api.url}"`);
      lines.push(`    method: "${api.method || 'GET'}"`);
      lines.push('');
    }
  } else {
    lines.push('# No API tools defined');
  }

  return lines.join('\n');
}

function encodeDifyUISettings(schema) {
  const settings = {
    display_name: schema.meta.name || 'Dify Agent',
    icon: '🤖',
    theme: 'light',
    opening_statement: '你好，我是AI助手，有什么可以帮助你的？',
    suggested_questions: ['帮我查询项目文档', '分析数据'],
    input_placeholder: '输入你的问题...'
  };

  return JSON.stringify(settings, null, 2);
}

function encodeDifyModelConfig(schema) {
  const config = {
    provider: extractDifyProvider(schema.modelConfig.model),
    model: schema.modelConfig.model || 'gpt-4',
    parameters: {
      temperature: schema.modelConfig.temperature || 0.7,
      max_tokens: schema.modelConfig.maxTokens || 4096,
      top_p: 1.0
    }
  };

  return JSON.stringify(config, null, 2);
}

function encodeDifyReadme(schema) {
  const sections = [];

  sections.push(`# ${schema.meta.name || 'Dify Agent'} - Bundle`);
  sections.push('');
  sections.push('Dify Agent DSL Bundle');
  sections.push('');

  sections.push('## Contents');
  sections.push('| File | Description |');
  sections.push('|------|-------------|');
  sections.push('| `dify.yml` | Main DSL config |');
  sections.push('| `workflow/nodes.yml` | Node definitions |');
  sections.push('| `workflow/edges.yml` | Edge connections |');
  sections.push('| `knowledge_base/` | KB references |');
  sections.push('| `prompts/` | Prompt templates |');
  sections.push('');

  sections.push('## Import Steps');
  sections.push('1. Upload to Dify platform');
  sections.push('2. Re-associate knowledge bases');
  sections.push('3. Configure API keys');
  sections.push('');

  sections.push(`*Generated: ${new Date().toISOString()}*`);

  return sections.join('\n');
}

// ============================================
// Dify Bundle 解析（导入）
// ============================================

async function parseDifyBundle(zipFile) {
  if (!window.JSZip) {
    throw new Error('JSZip 库未加载');
  }

  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error('Bundle 缺少 manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async("string"));

  const difyYMLFile = zip.file("dify.yml");
  let difyYML = '';
  if (difyYMLFile) {
    difyYML = await difyYMLFile.async("string");
  }

  const nodesFile = zip.folder("workflow").file("nodes.yml");
  let nodesYML = '';
  if (nodesFile) {
    nodesYML = await nodesFile.async("string");
  }

  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'dify';
  schema.meta.name = manifest.agent?.name || 'Dify Agent';
  schema.meta.description = manifest.agent?.description || '';

  parseDifyYML(difyYML, schema);
  parseDifyNodesYML(nodesYML, schema);

  UATCore.fillSchemaDefaultValues(schema);

  return { schema, manifest, rawFiles: { difyYML, nodesYML } };
}

/**
 * 从提取的文件直接解析 Dify 配置（无需 manifest）
 * @param {Object} extractedFiles - { path: content }
 * @param {JSZip} zip - ZIP 对象（可选）
 * @returns {Promise<Object>} UAT-Schema
 */
async function parseDifyBundleFromFiles(extractedFiles, zip) {
  const schema = UATCore.createEmptyUATSchema();
  schema.meta.sourcePlatform = 'dify';

  // 查找并解析 dify.yml 主配置文件
  const difyYML = findFileByPattern(extractedFiles, ['dify.yml', 'dify.yaml']);
  if (difyYML) {
    parseDifyYML(difyYML, schema);
  }

  // 查找并解析 workflow/nodes.yml
  const nodesYML = findFileByPattern(extractedFiles, [
    'workflow/nodes.yml',
    'workflow/nodes.yaml',
    'nodes.yml'
  ]);
  if (nodesYML) {
    parseDifyNodesYML(nodesYML, schema);
  }

  // 查找并解析 workflow/edges.yml
  const edgesYML = findFileByPattern(extractedFiles, [
    'workflow/edges.yml',
    'workflow/edges.yaml',
    'edges.yml'
  ]);
  // edges 暂不直接映射到 Schema

  // 查找并解析 workflow/variables.yml
  const variablesYML = findFileByPattern(extractedFiles, [
    'workflow/variables.yml',
    'workflow/variables.yaml',
    'variables.yml'
  ]);
  if (variablesYML) {
    try {
      // 简单提取变量
      const varMatches = variablesYML.matchAll(/- name:\s*"([^"]+)"/g);
      for (const match of varMatches) {
        const pv = {
          name: match[1],
          type: 'string',
          default: '',
          description: ''
        };
        schema.identity.promptVariables.push(pv);
      }
    } catch (e) {
      console.warn('Dify variables parse warning:', e.message);
    }
  }

  // 查找并解析 prompts/system_prompt.txt
  const systemPrompt = findFileByPattern(extractedFiles, [
    'prompts/system_prompt.txt',
    'prompts/system_prompt.md',
    'system_prompt.txt'
  ]);
  if (systemPrompt) {
    schema.identity.systemPrompt = systemPrompt.trim();
  }

  // 查找并解析 knowledge_base/references.json
  const kbJSON = findFileByPattern(extractedFiles, [
    'knowledge_base/references.json',
    'knowledge/references.json',
    'references.json'
  ]);
  if (kbJSON) {
    try {
      const kbConfig = JSON.parse(kbJSON);
      if (kbConfig.datasets?.length > 0) {
        for (const ds of kbConfig.datasets) {
          schema.memory.knowledgeBaseRef.push({
            id: ds.id || '',
            name: ds.name || '',
            type: ds.type || 'external',
            description: ds.description || ''
          });
        }
      }
    } catch (e) {
      console.warn('Dify KB JSON parse warning:', e.message);
    }
  }

  // 查找并解析 app_config/model_config.json
  const modelConfigJSON = findFileByPattern(extractedFiles, [
    'app_config/model_config.json',
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
      if (modelConfig.parameters?.max_tokens) {
        schema.modelConfig.maxTokens = modelConfig.parameters.max_tokens;
      }
    } catch (e) {
      console.warn('Dify model config parse warning:', e.message);
    }
  }

  UATCore.fillSchemaDefaultValues(schema);
  return schema;
}

function parseDifyYML(ymlText, schema) {
  if (!ymlText) return;

  const nameMatch = ymlText.match(/name:\s*"([^"]+)"/);
  if (nameMatch) schema.meta.name = nameMatch[1];

  const modelMatch = ymlText.match(/name:\s*"([^"]+)"/m);
  if (modelMatch) schema.modelConfig.model = modelMatch[1];

  const tempMatch = ymlText.match(/temperature:\s*([\d.]+)/);
  if (tempMatch) schema.modelConfig.temperature = parseFloat(tempMatch[1]);
}

function parseDifyNodesYML(ymlText, schema) {
  if (!ymlText) return;

  const stepMatches = ymlText.matchAll(/- id: "step_\d+"\s*\n\s*type: "([^"]+)"/g);
  for (const match of stepMatches) {
    const step = UATCore.createEmptyWorkflowStep();
    step.type = match[1];
    schema.workflow.steps.push(step);
  }
}

// ============================================
// 导出模块接口
// ============================================

/**
 * 将 Schema 转换为 Dify 平台文件结构
 * @param {Object} schema - UAT-Schema v2.0
 * @returns {Object} { path: content }
 */
function encodeDifyToFiles(schema) {
  return {
    'dify.yml': encodeDifyYML(schema),
    'workflow/nodes.yml': encodeDifyNodesYML(schema),
    'workflow/edges.yml': encodeDifyEdgesYML(schema),
    'workflow/variables.yml': encodeDifyVariablesYML(schema),
    'knowledge_base/references.json': encodeDifyKBReferences(schema),
    'prompts/system_prompt.txt': encodeDifySystemPrompt(schema),
    'tools/custom_tools.yml': encodeDifyCustomTools(schema),
    'tools/api_tools.yml': encodeDifyAPITools(schema),
    'app_config/ui_settings.json': encodeDifyUISettings(schema),
    'app_config/model_config.json': encodeDifyModelConfig(schema),
    'README.md': encodeDifyKBReadme(schema)
  };
}

window.DifyBundle = {
  createDifyBundle,
  parseDifyBundle,
  parseDifyBundleFromFiles,
  extractDifyProvider,
  encodeDifyYML,
  encodeDifyNodesYML,
  encodeDifyEdgesYML,
  encodeDifyVariablesYML,
  encodeDifyKBReferences,
  encodeDifyKBReadme,
  encodeDifySystemPrompt,
  encodeDifyUserInputTemplate,
  encodeDifyCustomTools,
  encodeDifyAPITools,
  encodeDifyUISettings,
  encodeDifyModelConfig,
  encodeDifyReadme,
  encodeDifyToFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.DifyBundle;
}
// Link global alias
DifyBundle = window.DifyBundle;

// ===== src/bundle/fastgpt-bundle.js =====
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
  const memoryEncoder = getUATMemoryEncoder();
  const skillsEncoder = getUATSkillsEncoder();

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
    identity: {
      role: schema.identity.role || '',
      personality: schema.identity.personality || '',
      language: schema.identity.language || 'zh-CN'
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

  // Memory encoding if memoryEntries present
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    config.memory = memoryEncoder.encodeMemoryEntriesToFastGPTFormat(schema.memory.memoryEntries);
  }

  // Skills encoding if skills present
  if (schema.skills && skillsEncoder) {
    config.skills = skillsEncoder.encodeSkillsToFastGPTJSON(schema.skills);
  }

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
  const kbEncoder = getUATKnowledgeEncoder();

  // 如果有knowledgeBaseContent，使用编码器完整编码
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      return JSON.stringify(kbEncoder.encodeKnowledgeToFastGPTJSON(kbContent), null, 2);
    }
  }

  // 否则仅保留引用
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
// Link global alias
FastGPTBundle = window.FastGPTBundle;

// ===== src/bundle/flowise-bundle.js =====
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
  const memoryEncoder = getUATMemoryEncoder();
  const kbEncoder = getUATKnowledgeEncoder();
  const skillsEncoder = getUATSkillsEncoder();

  const config = {
    name: schema.meta.name || 'Flowise Agent',
    description: schema.meta.description || 'AI chatbot built with Flowise',
    type: "ChatFlow",
    flowId: `flow_${Date.now()}`,
    flowName: "MainChatFlow",
    identity: {
      role: schema.identity.role || '',
      personality: schema.identity.personality || '',
      language: schema.identity.language || 'en-US'
    },
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

  // Memory encoding if memoryEntries present
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    config.memory = memoryEncoder.encodeMemoryEntriesToFlowiseFormat(schema.memory.memoryEntries);
  }

  // Knowledge encoding if knowledgeBaseContent present
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    config.knowledge = kbEncoder.encodeKnowledgeToFlowiseJSON(schema.memory.knowledgeBaseContent);
  }

  // Skills encoding if skills present
  if (schema.skills && skillsEncoder) {
    config.skills = skillsEncoder.encodeSkillsToFlowiseJSON(schema.skills);
  }

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
// Link global alias
FlowiseBundle = window.FlowiseBundle;

// ===== src/bundle/copilot-bundle.js =====
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

  // Role 定位
  if (schema.identity.role) {
    sections.push('## Role');
    sections.push('');
    sections.push(`You are acting as: ${schema.identity.role}`);
    sections.push('');
  }

  // Personality 性格特点
  if (schema.identity.personality) {
    sections.push('## Personality');
    sections.push('');
    sections.push(`Communication style: ${schema.identity.personality}`);
    sections.push('');
  }

  // Language 语言偏好
  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    const langDisplay = schema.identity.language === 'zh-CN' ? 'Chinese' :
                        schema.identity.language === 'en-US' ? 'English' : schema.identity.language;
    sections.push(`Primary language: ${langDisplay}`);
    sections.push(`- Respond in ${langDisplay} unless specified otherwise`);
    sections.push('');
  }

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

  // Memory encoding（使用列表格式）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push(memoryEncoder.encodeMemoryEntriesToCopilotInstructions(schema.memory.memoryEntries));
  }

  // 知识库编码（使用列表格式）
  const kbEncoder = getUATKnowledgeEncoder();
  if (schema.memory.knowledgeBaseContent && kbEncoder) {
    const kbContent = schema.memory.knowledgeBaseContent;
    if (kbContent.datasets?.length > 0 || kbContent.documents?.length > 0) {
      sections.push(kbEncoder.encodeKnowledgeToList(kbContent));
    }
  }

  // 技能编码（使用列表格式）
  const skillsEncoder = getUATSkillsEncoder();
  if (schema.skills?.skills?.length > 0 && skillsEncoder) {
    sections.push(skillsEncoder.encodeSkillsToCopilotInstructions(schema.skills));
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

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CopilotBundle;
}
// Link global alias
CopilotBundle = window.CopilotBundle;

// ===== src/bundle/codex-bundle.js =====
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
// Link global alias
CodexBundle = window.CodexBundle;

// ===== src/bundle/zed-bundle.js =====
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

  // Role 定位
  if (schema.identity.role) {
    sections.push('## Role');
    sections.push('');
    sections.push(`You are acting as: ${schema.identity.role}`);
    sections.push('');
  }

  // Personality 性格特点
  if (schema.identity.personality) {
    sections.push('## Personality');
    sections.push('');
    sections.push(`Communication style: ${schema.identity.personality}`);
    sections.push('');
  }

  // Language 语言偏好
  if (schema.identity.language) {
    sections.push('## Language');
    sections.push('');
    const langDisplay = schema.identity.language === 'zh-CN' ? 'Chinese' :
                        schema.identity.language === 'en-US' ? 'English' : schema.identity.language;
    sections.push(`Primary language: ${langDisplay}`);
    sections.push(`- Respond in ${langDisplay} unless specified otherwise`);
    sections.push('');
  }

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

  // Memory encoding（使用JSON代码块格式）
  const memoryEncoder = getUATMemoryEncoder();
  if (schema.memory.memoryEntries?.length > 0 && memoryEncoder) {
    sections.push(memoryEncoder.encodeMemoryEntriesToJSONBlock(schema.memory.memoryEntries));
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
// Link global alias
ZedBundle = window.ZedBundle;

// ===== src/cli/bundle-cli.js =====
/**
 * UAT Bundle CLI - Lightweight CLI entry for standalone bundle
 *
 * Supports: parse, convert, detect, platforms commands
 * Designed for dynamic loading via Skill's WebFetch mechanism
 */

// ============================================
// CLI Argument Parser
// ============================================

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] && args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

// ============================================
// Command Handlers
// ============================================

function handleParse(options) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;

  let content = options.content;

  // Read from file if --input provided
  if (!content && options.input && fs) {
    try {
      content = fs.readFileSync(options.input, 'utf-8');
    } catch (e) {
      console.error(`❌ Cannot read file: ${options.input}`);
      return;
    }
  }

  if (!content) {
    console.error('❌ Missing input. Use --content <string> or --input <file>');
    showHelp();
    return;
  }

  const platform = options.platform || window.UATDetector?.detectPlatform?.(content) || 'plain';
  const result = window.UATParser?.runParserPool?.(content, platform);

  if (result) {
    if (options.output && fs) {
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      console.log(`✅ Schema saved to: ${options.output}`);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } else {
    console.error('❌ Parse failed. Check input format.');
  }
}

function handleConvert(options) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;

  let schema = options.schema;

  // Parse schema from string or file
  if (typeof schema === 'string') {
    try {
      schema = JSON.parse(schema);
    } catch (e) {
      // Maybe it's a file path
      if (fs && options.schema) {
        try {
          const content = fs.readFileSync(options.schema, 'utf-8');
          schema = JSON.parse(content);
        } catch (e2) {
          console.error('❌ Invalid schema JSON');
          return;
        }
      }
    }
  }

  const target = options.target;
  if (!target) {
    console.error('❌ Missing --target platform');
    showHelp();
    return;
  }

  const result = window.UATEncoder?.runEncoderPool?.(schema, target);

  if (result) {
    const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
    console.log(output);
  } else {
    console.error('❌ Convert failed. Check schema and target platform.');
  }
}

function handleDetect(options) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;

  let content = options.content;

  if (!content && options.input && fs) {
    try {
      content = fs.readFileSync(options.input, 'utf-8');
    } catch (e) {
      console.error(`❌ Cannot read file: ${options.input}`);
      return;
    }
  }

  if (!content) {
    console.error('❌ Missing input content');
    return;
  }

  const platform = window.UATDetector?.detectPlatform?.(content) || 'plain';
  // Simple confidence: check if we detected a specific platform vs plain
  const confidence = platform === 'plain' ? 0 : 0.8;
  console.log(`Platform: ${platform}`);
  console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
}

function showPlatforms() {
  const platforms = window.UATBundle?.supportedPlatforms ||
    ['dify', 'openclaw', 'hermes', 'cursor', 'windsurf', 'claude', 'fastgpt', 'flowise', 'copilot', 'codex', 'zed', 'plain'];
  console.log('Supported platforms:');
  platforms.forEach(p => console.log(`  - ${p}`));
}

function showHelp() {
  console.log(`
UAT Bundle CLI - Agent Config Converter

Usage:
  node uat-bundle.js parse --content <string> [--platform <name>]
  node uat-bundle.js parse --input <file> [--platform <name>] [--output <schema.json>]
  node uat-bundle.js convert --schema <json|file> --target <platform>
  node uat-bundle.js detect --content <string>
  node uat-bundle.js detect --input <file>
  node uat-bundle.js platforms

Examples:
  node uat-bundle.js detect --content "dify_version: 0.1"
  node uat-bundle.js parse --input dify.yml --platform dify
  node uat-bundle.js convert --schema schema.json --target cursor

Supported platforms: dify, openclaw, hermes, cursor, windsurf, claude, fastgpt, flowise, copilot, codex, zed
`);
}

// ============================================
// CLI Entry Point
// ============================================

function runBundleCLI(args) {
  const command = args[0];
  const options = parseArgs(args.slice(1));

  switch (command) {
    case 'parse':
      handleParse(options);
      break;
    case 'convert':
      handleConvert(options);
      break;
    case 'detect':
      handleDetect(options);
      break;
    case 'platforms':
      showPlatforms();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) {
        console.error(`❌ Unknown command: ${command}`);
      }
      showHelp();
  }
}

// ============================================
// Exports
// ============================================

window.runBundleCLI = runBundleCLI;

// Node.js auto-execute when bundle is run directly
if (typeof process !== 'undefined' && process.argv && process.argv.length > 2) {
  runBundleCLI(process.argv.slice(2));
}

// ===== Bundle API Exports =====
return {
  /**
   * Parse config content to UAT-Schema
   * @param {string} content - Config file content
   * @param {string} [platform] - Source platform (auto-detect if omitted)
   * @returns {Object} UAT-Schema v2.0 JSON
   */
  parse: function(content, platform) {
    if (!platform) {
      platform = window.UATDetector?.detectPlatform?.(content) || 'plain';
    }
    return window.UATParser?.runParserPool?.(content, platform) || null;
  },

  /**
   * Convert UAT-Schema to target platform
   * @param {Object} schema - UAT-Schema v2.0 JSON
   * @param {string} target - Target platform name
   * @returns {Object|string} Platform config output
   */
  convert: function(schema, target) {
    return window.UATEncoder?.runEncoderPool?.(schema, target) || null;
  },

  /**
   * Detect platform from config content
   * @param {string} content - Config file content
   * @returns {Object} { platform, confidence }
   */
  detect: function(content) {
    const platform = window.UATDetector?.detectPlatform?.(content) || 'plain';
    const confidence = platform === 'plain' ? 0 : 0.8;
    return { platform, confidence };
  },

  /**
   * Run CLI commands (Node.js only)
   * @param {Array} args - Command line arguments
   */
  runCLI: function(args) {
    if (typeof process !== 'undefined' && window.runBundleCLI) {
      window.runBundleCLI(args || process.argv.slice(2));
    }
  },

  // Module references for advanced use
  UATCore: window.UATCore,
  UATDetector: window.UATDetector,
  UATParser: window.UATParser,
  UATSchemaExtensions: window.UATSchemaExtensions,
  UATEncoder: window.UATEncoder,

  // Platform Bundle references
  OpenClawBundle: window.OpenClawBundle,
  HermesBundle: window.HermesBundle,
  CursorBundle: window.CursorBundle,
  WindsurfBundle: window.WindsurfBundle,
  ClaudeCodeBundle: window.ClaudeCodeBundle,
  DifyBundle: window.DifyBundle,
  FastGPTBundle: window.FastGPTBundle,
  FlowiseBundle: window.FlowiseBundle,
  CopilotBundle: window.CopilotBundle,
  CodexBundle: window.CodexBundle,
  ZedBundle: window.ZedBundle,

  supportedPlatforms: ['dify', 'openclaw', 'hermes', 'cursor', 'windsurf', 'claude', 'fastgpt', 'flowise', 'copilot', 'codex', 'zed', 'plain']
};

});
