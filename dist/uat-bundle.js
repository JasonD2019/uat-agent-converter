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
 * UAT 多平台编码器集群 v2.0 - Encoder Pool Enhanced
 * 模块6：UAT-Schema v2.0 → 各平台原生格式完整编码
 */

// ============================================
// 编码器统一调度器
// ============================================

function runEncoderPool(schema, targetPlatform) {
  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('Schema 结构不合法');
  }

  let output = '';

  switch (targetPlatform) {
    case 'dify':
      output = encodeDifyYAMLEnhanced(schema);
      break;
    case 'openclaw':
      output = encodeOpenClawEnhanced(schema);
      break;
    case 'claude':
      output = encodeClaudeSkillEnhanced(schema);
      break;
    case 'fastgpt':
      output = encodeFastGPTEnhanced(schema);
      break;
    case 'flowise':
      output = encodeFlowiseEnhanced(schema);
      break;
    // 新增平台
    case 'hermes':
      output = encodeHermesYAML(schema);
      break;
    case 'cursor':
      output = encodeCursorRules(schema);
      break;
    case 'windsurf':
      output = encodeWindsurfRules(schema);
      break;
    case 'copilot':
      output = encodeCopilotInstructions(schema);
      break;
    case 'codex':
      output = encodeCodexAgents(schema);
      break;
    case 'zed':
      output = encodeZedRules(schema);
      break;
    default:
      output = encodePlainTextEnhanced(schema);
  }

  // 添加知识库提示（如果有引用）
  output = addKnowledgeBaseNote(output, schema);

  return output;
}

// ============================================
// 编码器1：Dify YAML DSL 编码器（增强版）
// ============================================

function encodeDifyYAMLEnhanced(schema) {
  const lines = [];

  // 头部
  lines.push('dify_version: "0.1"');
  lines.push('');

  // 应用信息
  lines.push('app:');
  lines.push(`  name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  lines.push(`  description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  lines.push('  mode: "workflow"');
  lines.push('');

  // 模型配置
  lines.push('model:');
  lines.push(`  provider: openai`);
  lines.push(`  name: "${schema.modelConfig.model}"`);
  lines.push(`  temperature: ${schema.modelConfig.temperature}`);
  lines.push(`  max_tokens: ${schema.modelConfig.maxTokens}`);
  if (schema.modelConfig.topP !== 1) {
    lines.push(`  top_p: ${schema.modelConfig.topP}`);
  }
  lines.push('');

  // 工作流
  lines.push('workflow:');
  lines.push('  graph:');
  lines.push('    nodes:');

  // Start节点
  lines.push('      - id: "start_node"');
  lines.push('        type: "start"');
  lines.push('        data:');
  lines.push(`          title: "开始"`);
  if (schema.identity.systemPrompt) {
    lines.push(`          prompt_template: "${UATCore.escapeYAMLString(schema.identity.systemPrompt)}"`);
  }
  lines.push('');

  // 工作流步骤
  for (const step of schema.workflow.steps) {
    encodeDifyWorkflowStep(lines, step, schema);
  }

  // End节点
  lines.push('      - id: "end_node"');
  lines.push('        type: "end"');
  lines.push('        data:');
  lines.push(`          title: "结束"`);
  lines.push('');

  // 边
  lines.push('    edges:');

  // Start到第一个节点
  if (schema.workflow.steps.length > 0) {
    lines.push('      - source: "start_node"');
    lines.push(`        target: "${schema.workflow.steps[0].stepId}"`);
  } else {
    lines.push('      - source: "start_node"');
    lines.push('        target: "end_node"');
  }

  // 步骤连接
  for (const step of schema.workflow.steps) {
    if (step.nextStepId) {
      lines.push(`      - source: "${step.stepId}"`);
      lines.push(`        target: "${step.nextStepId}"`);
    }

    // 条件分支边
    for (const cond of step.conditions) {
      if (cond.targetStepId && cond.operator !== 'default') {
        lines.push(`      - source: "${step.stepId}"`);
        lines.push(`        source_handle: "${cond.operator === 'false' ? 'false' : 'true'}"`);
        lines.push(`        target: "${cond.targetStepId}"`);
      }
    }
  }
  lines.push('');

  // 知识库引用
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    lines.push('knowledge_bases:');
    for (const kb of schema.memory.knowledgeBaseRef) {
      lines.push(`  - id: "${kb.id}"`);
      lines.push(`    name: "${UATCore.escapeYAMLString(kb.name)}"`);
    }
    lines.push('');
  }

  // MCP工具
  if (schema.tools.mcpServers?.length > 0) {
    lines.push('mcp_servers:');
    for (const mcp of schema.tools.mcpServers) {
      lines.push(`  - name: "${UATCore.escapeYAMLString(mcp.name)}"`);
      if (mcp.url) lines.push(`    url: "${mcp.url}"`);
      if (mcp.config?.command) lines.push(`    command: "${mcp.config.command}"`);
      if (mcp.config?.args?.length > 0) {
        lines.push(`    args: [${mcp.config.args.map(a => `"${a}"`).join(', ')}]`);
      }
    }
    lines.push('');
  }

  // API工具
  if (schema.tools.apiEndpoints?.length > 0) {
    lines.push('api_tools:');
    for (const api of schema.tools.apiEndpoints) {
      lines.push(`  - id: "${api.id}"`);
      lines.push(`    name: "${UATCore.escapeYAMLString(api.name)}"`);
      lines.push(`    method: "${api.method}"`);
      lines.push(`    url: "${api.url}"`);

      if (api.headers && Object.keys(api.headers).length > 0) {
        lines.push('    headers:');
        for (const [k, v] of Object.entries(api.headers)) {
          lines.push(`      ${k}: "${v}"`);
        }
      }

      if (api.auth?.type !== 'none') {
        lines.push(`    auth_type: "${api.auth.type}"`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function encodeDifyWorkflowStep(lines, step, schema) {
  lines.push(`      - id: "${step.stepId}"`);
  lines.push(`        type: "${mapStepToDifyType(step.type)}"`);
  lines.push('        data:');
  lines.push(`          title: "${UATCore.escapeYAMLString(step.name)}"`);

  // Prompt节点
  if (step.type === 'prompt' && step.content) {
    lines.push('          model:');
    lines.push(`            name: "${schema.modelConfig.model}"`);
    lines.push(`            temperature: ${schema.modelConfig.temperature}`);
    lines.push(`          prompt_template: "${UATCore.escapeYAMLString(step.content)}"`);
  }

  // 条件节点
  if (step.type === 'condition' && step.conditions?.length > 0) {
    lines.push('          conditions:');
    for (const cond of step.conditions) {
      if (cond.operator !== 'default' && cond.operator !== 'false') {
        lines.push(`            - variable: "${cond.variable}"`);
        lines.push(`              operator: "${cond.operator}"`);
        lines.push(`              value: "${UATCore.escapeYAMLString(cond.value)}"`);
      }
    }

    // 默认分支
    const defaultCond = step.conditions.find(c => c.operator === 'default' || c.priority < 0);
    if (defaultCond) {
      lines.push(`          default_target_node: "${defaultCond.targetStepId}"`);
    }
  }

  // 循环节点
  if (step.type === 'loop' && step.loopConfig) {
    lines.push(`          iter_variable: "${step.loopConfig.iterateOver}"`);
    lines.push(`          item_variable: "${step.loopConfig.variableName}"`);
    lines.push(`          max_iterations: ${step.loopConfig.maxIterations}`);
    if (step.loopConfig.breakCondition) {
      lines.push(`          break_condition: "${UATCore.escapeYAMLString(step.loopConfig.breakCondition)}"`);
    }
  }

  // API节点
  if (step.type === 'api' && step.content) {
    try {
      const apiConfig = JSON.parse(step.content);
      lines.push(`          url: "${apiConfig.url}"`);
      lines.push(`          method: "${apiConfig.method || 'POST'}"`);
      if (apiConfig.headers) {
        lines.push('          headers:');
        for (const [k, v] of Object.entries(apiConfig.headers)) {
          lines.push(`            ${k}: "${v}"`);
        }
      }
    } catch(e) {
      lines.push(`          url: ""`);
    }
  }

  // 错误处理
  if (step.onError?.action) {
    lines.push('          error_handling:');
    lines.push(`            action: "${step.onError.action}"`);
    if (step.onError.retryCount > 0) {
      lines.push(`            retry_count: ${step.onError.retryCount}`);
    }
  }

  lines.push('');
}

function mapStepToDifyType(stepType) {
  const typeMap = {
    'prompt': 'llm',
    'condition': 'if-else',
    'loop': 'iteration',
    'parallel': 'parallel',
    'api': 'http-request',
    'function': 'variable-setter',
    'end': 'end'
  };
  return typeMap[stepType] || 'llm';
}

// ============================================
// 编码器2：FastGPT JSON 编码器（增强版）
// ============================================

function encodeFastGPTEnhanced(schema) {
  const data = {
    version: "1.0",
    appConfig: {
      name: schema.meta.name,
      intro: schema.meta.description,
      type: schema.workflow.steps.length > 0 ? "workflow" : "chat",
      modules: []
    },
    chatConfig: {
      systemPrompt: schema.identity.systemPrompt,
      role: schema.identity.role || "assistant"
    },
    modelConfig: {
      model: schema.modelConfig.model,
      temperature: schema.modelConfig.temperature,
      maxTokens: schema.modelConfig.maxTokens,
      topP: schema.modelConfig.topP,
      frequencyPenalty: schema.modelConfig.advanced?.frequencyPenalty || 0,
      presencePenalty: schema.modelConfig.advanced?.presencePenalty || 0
    },
    workflow: {
      nodes: [],
      edges: []
    },
    datasets: [],
    plugins: []
  };

  // 工作流节点
  for (const step of schema.workflow.steps) {
    const node = {
      nodeId: step.stepId,
      name: step.name,
      type: mapStepToFastGPTType(step.type),
      inputs: {},
      outputs: []
    };

    if (step.type === 'prompt') {
      node.inputs = {
        prompt: step.content,
        model: schema.modelConfig.model,
        temperature: schema.modelConfig.temperature
      };
    }

    if (step.type === 'condition') {
      node.type = 'ifElseNode';
      node.inputs = {
        conditions: step.conditions.map(c => ({
          variable: c.variable,
          operator: c.operator,
          value: c.value,
          targetNodeId: c.targetStepId
        }))
      };
    }

    if (step.type === 'loop') {
      node.type = 'loopNode';
      node.inputs = {
        array: step.loopConfig?.iterateOver || '',
        itemName: step.loopConfig?.variableName || 'item',
        maxIterations: step.loopConfig?.maxIterations || 100
      };
    }

    if (step.type === 'api') {
      node.type = 'httpRequest468';
      try {
        const apiConfig = JSON.parse(step.content || '{}');
        node.inputs = {
          url: apiConfig.url || '',
          method: apiConfig.method || 'POST',
          headers: apiConfig.headers || {},
          body: apiConfig.body || {}
        };
      } catch(e) {
        node.inputs = { url: '', method: 'POST' };
      }
    }

    if (step.onError?.action) {
      node.inputs.errorAction = step.onError.action;
    }

    data.workflow.nodes.push(node);
  }

  // 边
  for (const step of schema.workflow.steps) {
    if (step.nextStepId) {
      data.workflow.edges.push({
        source: step.stepId,
        target: step.nextStepId
      });
    }

    for (const cond of step.conditions) {
      if (cond.targetStepId) {
        data.workflow.edges.push({
          source: step.stepId,
          target: cond.targetStepId,
          conditionType: cond.operator
        });
      }
    }
  }

  // 知识库引用
  for (const kb of schema.memory.knowledgeBaseRef) {
    data.datasets.push({
      id: kb.id,
      name: kb.name
    });
  }

  // API工具
  for (const api of schema.tools.apiEndpoints) {
    data.plugins.push({
      id: api.id,
      name: api.name,
      method: api.method,
      url: api.url,
      headers: api.headers,
      authType: api.auth?.type || 'none',
      retryCount: api.errorHandling?.retryCount || 3
    });
  }

  return JSON.stringify(data, null, 2);
}

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

// ============================================
// 编码器3：Flowise JSON 编码器（增强版）
// ============================================

function encodeFlowiseEnhanced(schema) {
  const data = {
    id: UATCore.generateUUID(),
    name: schema.meta.name,
    description: schema.meta.description,
    nodes: [],
    edges: []
  };

  // 主AI节点
  const mainNodeId = UATCore.generateUUID();
  data.nodes.push({
    id: mainNodeId,
    type: "ChatOpenAI",
    position: { x: 100, y: 100 },
    data: {
      label: "AI Assistant",
      systemPrompt: schema.identity.systemPrompt,
      modelName: schema.modelConfig.model,
      temperature: schema.modelConfig.temperature,
      maxTokens: schema.modelConfig.maxTokens
    }
  });

  // 工作流步骤
  let prevNodeId = mainNodeId;
  let x = 100;

  for (const step of schema.workflow.steps) {
    const nodeId = step.stepId || UATCore.generateUUID();
    x += 250;

    const node = {
      id: nodeId,
      type: mapStepToFlowiseType(step.type),
      position: { x, y: 100 },
      data: {
        label: step.name
      }
    };

    if (step.type === 'prompt' && step.content) {
      node.type = 'PromptTemplate';
      node.data.template = step.content;
    }

    if (step.type === 'condition') {
      node.type = 'IfCondition';
      node.data.variableName = step.conditions[0]?.variable || '';
      node.data.conditionType = step.conditions[0]?.operator || 'equals';
      node.data.value = step.conditions[0]?.value || '';
    }

    if (step.type === 'api') {
      node.type = 'HTTPRequest';
      try {
        const apiConfig = JSON.parse(step.content || '{}');
        node.data.url = apiConfig.url;
        node.data.method = apiConfig.method || 'GET';
        node.data.headers = apiConfig.headers;
      } catch(e) {}
    }

    data.nodes.push(node);

    // 边
    data.edges.push({
      id: UATCore.generateUUID(),
      source: prevNodeId,
      target: nodeId,
      sourceHandle: "output",
      targetHandle: "input"
    });

    prevNodeId = nodeId;
  }

  // API工具节点
  let y = 200;
  for (const api of schema.tools.apiEndpoints) {
    const apiNodeId = api.id || UATCore.generateUUID();

    data.nodes.push({
      id: apiNodeId,
      type: "HTTPRequest",
      position: { x: 100, y },
      data: {
        label: api.name,
        method: api.method,
        url: api.url,
        headers: api.headers
      }
    });

    y += 100;
  }

  return JSON.stringify(data, null, 2);
}

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

// ============================================
// 编码器4：Claude Skill 编码器（增强版）
// ============================================

function encodeClaudeSkillEnhanced(schema) {
  const sections = [];

  // YAML头部
  sections.push('---');
  sections.push(`name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  sections.push(`description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  sections.push(`model: "${schema.modelConfig.model}"`);

  // MCP工具
  if (schema.tools.mcpServers?.length > 0) {
    sections.push('mcpServers:');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`  - ${mcp.id}:`);
      if (mcp.url) sections.push(`      url: "${mcp.url}"`);
      if (mcp.config?.command) sections.push(`      command: "${mcp.config.command}"`);
      if (mcp.config?.args?.length > 0) {
        sections.push(`      args: [${mcp.config.args.map(a => `"${a}"`).join(', ')}]`);
      }
      if (mcp.config?.env && Object.keys(mcp.config.env).length > 0) {
        sections.push('      env:');
        for (const [k, v] of Object.entries(mcp.config.env)) {
          sections.push(`        ${k}: "${v}"`);
        }
      }
      if (mcp.config?.transport) {
        sections.push(`      transport: "${mcp.config.transport}"`);
      }
    }
  }

  sections.push('---');
  sections.push('');

  // 指令正文
  sections.push('# Instructions');
  sections.push('');
  sections.push(schema.identity.systemPrompt);
  sections.push('');

  // Prompt变量
  if (schema.identity.promptVariables?.length > 0) {
    sections.push('## Variables');
    sections.push('');
    for (const v of schema.identity.promptVariables) {
      sections.push(`- {{${v.name}}}: ${v.type}${v.default ? ` (default: ${v.default})` : ''}`);
    }
    sections.push('');
  }

  // 工作流
  if (schema.workflow.steps?.length > 0) {
    sections.push('# Workflow');
    sections.push('');

    for (const step of schema.workflow.steps) {
      sections.push(`## ${step.name}`);
      sections.push('');
      sections.push(`Type: ${step.type}`);
      sections.push(`ID: ${step.stepId}`);
      sections.push('');

      if (step.content) {
        sections.push(step.content);
        sections.push('');
      }

      if (step.type === 'condition' && step.conditions?.length > 0) {
        sections.push('**Conditions:**');
        for (const cond of step.conditions) {
          if (cond.operator !== 'default') {
            sections.push(`- If ${cond.variable} ${cond.operator} "${cond.value}" → ${cond.targetStepId}`);
          }
        }
        sections.push('');
      }

      if (step.type === 'loop' && step.loopConfig?.iterateOver) {
        sections.push('**Loop Configuration:**');
        sections.push(`- Iterate: ${step.loopConfig.iterateOver}`);
        sections.push(`- Variable: ${step.loopConfig.variableName}`);
        sections.push(`- Max: ${step.loopConfig.maxIterations}`);
        sections.push('');
      }
    }
  }

  return sections.join('\n');
}

// ============================================
// 编码器5：OpenClaw Markdown 编码器（增强版）
// ============================================

function encodeOpenClawEnhanced(schema) {
  const sections = [];

  // Identity块
  sections.push('# Identity');
  sections.push('');
  sections.push(`Name: ${schema.meta.name}`);
  sections.push('');

  if (schema.identity.role) {
    sections.push(`Role: ${schema.identity.role}`);
    sections.push('');
  }

  sections.push('## System Prompt');
  sections.push('');
  sections.push(schema.identity.systemPrompt);
  sections.push('');

  // Prompt变量
  if (schema.identity.promptVariables?.length > 0) {
    sections.push('## Variables');
    sections.push('');
    for (const v of schema.identity.promptVariables) {
      sections.push(`- {{${v.name}}}: ${v.default || 'empty'}`);
    }
    sections.push('');
  }

  // Soul块（约束）
  sections.push('# Soul');
  sections.push('');
  if (schema.identity.constraints?.length > 0) {
    for (const constraint of schema.identity.constraints) {
      sections.push(constraint);
      sections.push('');
    }
  }
  if (schema.identity.outputRules?.length > 0) {
    sections.push('## Output Rules');
    sections.push('');
    for (const rule of schema.identity.outputRules) {
      sections.push(`- ${rule}`);
    }
    sections.push('');
  }

  // Skills块（工作流）
  sections.push('# Skills');
  sections.push('');
  if (schema.workflow.steps?.length > 0) {
    for (const step of schema.workflow.steps) {
      sections.push(`## ${step.name}`);
      sections.push('');
      sections.push(`Type: ${step.type}`);
      sections.push('');

      if (step.content) {
        sections.push(step.content);
        sections.push('');
      }

      // 条件
      if (step.type === 'condition' && step.conditions?.length > 0) {
        sections.push('Conditions:');
        for (const cond of step.conditions) {
          sections.push(`- ${cond.variable} ${cond.operator} "${cond.value}" → ${cond.targetStepId}`);
        }
        sections.push('');
      }

      // 循环
      if (step.type === 'loop' && step.loopConfig?.iterateOver) {
        sections.push(`Loop: ${step.loopConfig.iterateOver} as ${step.loopConfig.variableName}`);
        sections.push('');
      }
    }
  } else {
    sections.push('[No skills defined]');
    sections.push('');
  }

  // Model配置
  sections.push('# Model');
  sections.push('');
  sections.push(`model: ${schema.modelConfig.model}`);
  sections.push(`temperature: ${schema.modelConfig.temperature}`);
  sections.push(`max_tokens: ${schema.modelConfig.maxTokens}`);
  sections.push('');

  // 工具
  if (schema.tools.mcpServers?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    sections.push('# Tools');
    sections.push('');

    for (const mcp of schema.tools.mcpServers) {
      sections.push(`## MCP: ${mcp.name}`);
      sections.push(`- ID: ${mcp.id}`);
      if (mcp.url) sections.push(`- URL: ${mcp.url}`);
      sections.push('');
    }

    for (const api of schema.tools.apiEndpoints) {
      sections.push(`## API: ${api.name}`);
      sections.push(`- Method: ${api.method}`);
      sections.push(`- URL: ${api.url}`);
      sections.push('');
    }
  }

  return sections.join('\n');
}

// ============================================
// 编码器6：纯文本编码器（增强版）
// ============================================

function encodePlainTextEnhanced(schema) {
  let output = '';

  if (schema.meta.name) {
    output += `# ${schema.meta.name}\n\n`;
  }

  if (schema.meta.description) {
    output += `${schema.meta.description}\n\n`;
  }

  output += schema.identity.systemPrompt || '';

  return output;
}

// ============================================
// 辅助函数：添加知识库提示
// ============================================

function addKnowledgeBaseNote(output, schema) {
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    const noteLines = [
      '',
      '',
      '# ========== 知识库配置提示 ==========',
      '# 以下知识库引用需在目标平台重新配置:',
    ];

    for (const kb of schema.memory.knowledgeBaseRef) {
      noteLines.push(`# - ${kb.name} (原ID: ${kb.id}, 来源: ${kb.platform || 'unknown'})`);
    }

    noteLines.push('# ==========================================');

    return output + noteLines.join('\n');
  }

  return output;
}

// ============================================
// 编码器7：Hermes YAML 编码器（新增）
// ============================================

function encodeHermesYAML(schema) {
  const lines = [];

  // 版本头部
  lines.push('hermes_version: "1.0"');
  lines.push('');

  // Agent 块
  lines.push('agent:');
  lines.push(`  name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  lines.push(`  description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  lines.push(`  role: "${schema.identity.role || 'assistant'}"`);
  lines.push('');

  // Model 块
  lines.push('model:');
  lines.push(`  provider: "${extractModelProvider(schema.modelConfig.model)}"`);
  lines.push(`  name: "${schema.modelConfig.model}"`);
  lines.push(`  temperature: ${schema.modelConfig.temperature}`);
  lines.push(`  max_tokens: ${schema.modelConfig.maxTokens}`);
  if (schema.modelConfig.topP !== 1) {
    lines.push(`  top_p: ${schema.modelConfig.topP}`);
  }
  lines.push('');

  // Prompt 块
  lines.push('prompt:');
  lines.push(`  system: "${UATCore.escapeYAMLString(schema.identity.systemPrompt)}"`);

  if (schema.identity.constraints?.length > 0) {
    lines.push('  constraints:');
    for (const c of schema.identity.constraints) {
      lines.push(`    - "${UATCore.escapeYAMLString(c)}"`);
    }
  }
  lines.push('');

  // Tools 块
  if (schema.tools.functions?.length > 0 || schema.tools.mcpServers?.length > 0) {
    lines.push('tools:');

    // Functions
    if (schema.tools.functions?.length > 0) {
      lines.push('  functions:');
      for (const fn of schema.tools.functions) {
        lines.push(`    - name: "${fn.name}"`);
        if (fn.description) {
          lines.push(`      description: "${UATCore.escapeYAMLString(fn.description)}"`);
        }
        if (fn.inputs?.length > 0) {
          lines.push('      parameters:');
          for (const input of fn.inputs) {
            lines.push(`        ${input.name}: { type: "${input.type}" }`);
          }
        }
      }
    }

    // MCP Servers
    if (schema.tools.mcpServers?.length > 0) {
      lines.push('  mcp_servers:');
      for (const mcp of schema.tools.mcpServers) {
        lines.push(`    - name: "${mcp.name}"`);
        if (mcp.url) {
          lines.push(`      url: "${mcp.url}"`);
        }
      }
    }
    lines.push('');
  }

  // Workflow 块
  if (schema.workflow.steps?.length > 0) {
    lines.push('workflow:');
    lines.push('  steps:');

    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      lines.push(`    - id: "${step.stepId}"`);
      lines.push(`      type: "${mapStepToHermesType(step.type)}"`);

      if (step.type === 'prompt' && step.content) {
        lines.push(`      action: "${UATCore.escapeYAMLString(step.content)}"`);
      }

      if (step.type === 'api') {
        // 尝试解析工具名称
        const toolMatch = step.content?.match(/Use tool: (.+)/);
        if (toolMatch) {
          lines.push(`      tool: "${toolMatch[1]}"`);
        }
      }

      if (step.type === 'condition' && step.conditions?.length > 0) {
        lines.push('      conditions:');
        for (const cond of step.conditions) {
          if (cond.operator !== 'default') {
            lines.push(`        - variable: "${cond.variable}"`);
            lines.push(`          operator: "${cond.operator}"`);
            lines.push(`          value: "${UATCore.escapeYAMLString(cond.value)}"`);
            lines.push(`          target: "${cond.targetStepId}"`);
          }
        }
      }
    }
    lines.push('');
  }

  // Memory 块
  lines.push('memory:');
  lines.push(`  type: "${schema.memory.sessionMemory?.enabled ? 'conversation' : 'none'}"`);
  if (schema.memory.sessionMemory?.enabled) {
    lines.push(`  max_history: ${schema.memory.sessionMemory.maxMessages || 50}`);
  }
  lines.push('');

  return lines.join('\n');
}

function extractModelProvider(modelName) {
  if (modelName.includes('gpt') || modelName.includes('o1')) return 'openai';
  if (modelName.includes('claude')) return 'anthropic';
  if (modelName.includes('gemini')) return 'google';
  if (modelName.includes('llama') || modelName.includes('mistral')) return 'open-source';
  return 'openai';
}

function mapStepToHermesType(stepType) {
  const typeMap = {
    'prompt': 'prompt',
    'api': 'tool',
    'condition': 'condition',
    'loop': 'loop',
    'parallel': 'parallel',
    'function': 'tool',
    'end': 'end'
  };
  return typeMap[stepType] || 'prompt';
}

// ============================================
// 编码器8：Cursor Rules 编码器（新增）
// ============================================

function encodeCursorRules(schema) {
  const lines = [];

  // 头部注释
  lines.push('# Cursor Rules');
  lines.push('# Generated by UAT Converter');
  lines.push('');

  // 项目名称
  if (schema.meta.name) {
    lines.push(`# Project: ${schema.meta.name}`);
    lines.push('');
  }

  // 系统提示词（转换为规则格式）
  if (schema.identity.systemPrompt) {
    lines.push('## General Guidelines');
    lines.push('');

    // 将提示词转换为规则列表
    const sentences = schema.identity.systemPrompt.split(/[。\n]/).filter(s => s.trim());
    for (const sentence of sentences) {
      if (sentence.trim()) {
        lines.push(`- ${sentence.trim()}`);
      }
    }
    lines.push('');
  }

  // 约束规则
  if (schema.identity.constraints?.length > 0) {
    lines.push('## Code Rules');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    lines.push('## Output Rules');
    lines.push('');
    for (const r of schema.identity.outputRules) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  // 模型偏好（Cursor 支持）
  lines.push('## Model Preferences');
  lines.push('');
  lines.push(`- Prefer model: ${schema.modelConfig.model}`);
  lines.push(`- Temperature: ${schema.modelConfig.temperature}`);
  lines.push('');

  return lines.join('\n');
}

// ============================================
// 编码器9：Windsurf Rules 编码器（新增）
// ============================================

function encodeWindsurfRules(schema) {
  const lines = [];

  lines.push('# Windsurf Rules');
  lines.push('# Generated by UAT Converter');
  lines.push('');

  lines.push('## Code Guidelines');
  lines.push('');

  if (schema.identity.systemPrompt) {
    const sentences = schema.identity.systemPrompt.split(/[。\n]/).filter(s => s.trim());
    for (const sentence of sentences) {
      lines.push(`- ${sentence.trim()}`);
    }
    lines.push('');
  }

  if (schema.identity.constraints?.length > 0) {
    lines.push('## Additional Rules');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// 编码器10：GitHub Copilot 编码器（新增）
// ============================================

function encodeCopilotInstructions(schema) {
  const lines = [];

  lines.push('# GitHub Copilot Instructions');
  lines.push('');
  lines.push('This file provides instructions for GitHub Copilot to follow when generating code.');
  lines.push('');

  // 通用指南
  lines.push('## General Guidelines');
  lines.push('');
  if (schema.identity.systemPrompt) {
    lines.push(schema.identity.systemPrompt);
    lines.push('');
  }

  // 代码风格
  if (schema.identity.constraints?.length > 0) {
    lines.push('## Code Style');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    lines.push('## Output Guidelines');
    lines.push('');
    for (const r of schema.identity.outputRules) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  // 模型建议
  lines.push('## Model Suggestions');
  lines.push('');
  lines.push(`- Recommended model: ${schema.modelConfig.model}`);
  lines.push('');

  return lines.join('\n');
}

// ============================================
// 编码器11：Codex CLI 编码器（新增）
// ============================================

function encodeCodexAgents(schema) {
  const sections = [];

  // YAML 头部
  sections.push('---');
  sections.push(`name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  sections.push(`description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  sections.push(`model: "${schema.modelConfig.model}"`);

  // 工具声明（简化版）
  if (schema.tools.functions?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    sections.push('tools:');
    for (const fn of schema.tools.functions) {
      sections.push(`  - ${fn.name}`);
    }
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`  - ${api.name}`);
    }
  }

  sections.push('---');
  sections.push('');

  // 正文指令
  sections.push('# Instructions');
  sections.push('');
  sections.push(schema.identity.systemPrompt);
  sections.push('');

  // 工作流
  if (schema.workflow.steps?.length > 0) {
    sections.push('# Workflow');
    sections.push('');
    for (const step of schema.workflow.steps) {
      sections.push(`## ${step.name}`);
      sections.push('');
      sections.push(`Type: ${step.type}`);
      if (step.content) {
        sections.push(step.content);
      }
      sections.push('');
    }
  }

  return sections.join('\n');
}

// ============================================
// 编码器12：Zed Editor 编码器（新增）
// ============================================

function encodeZedRules(schema) {
  const lines = [];

  lines.push('# Zed Editor Rules');
  lines.push('# Generated by UAT Converter');
  lines.push('');

  // 系统提示词
  if (schema.identity.systemPrompt) {
    lines.push('## Guidelines');
    lines.push('');
    lines.push(schema.identity.systemPrompt);
    lines.push('');
  }

  // 约束
  if (schema.identity.constraints?.length > 0) {
    lines.push('## Rules');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// 导出模块接口（向后兼容）
// ============================================

// 注意：UATEncoder 类已在 encoder-registry.js 中定义
// 此处仅导出原有函数接口以保持向后兼容

window.UATEncoderLegacy = {
  runEncoderPool,
  encodeDifyYAMLEnhanced,
  encodeFastGPTEnhanced,
  encodeFlowiseEnhanced,
  encodeClaudeSkillEnhanced,
  encodeOpenClawEnhanced,
  encodeHermesYAML,
  encodeCursorRules,
  encodeWindsurfRules,
  encodeCopilotInstructions,
  encodeCodexAgents,
  encodeZedRules,
  encodePlainTextEnhanced,
  addKnowledgeBaseNote
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

// 向后兼容：从 encoder-pool.js 导入原有函数（如果存在）
if (window.UATEncoderLegacy) {
  UATEncoder.runEncoderPool = window.UATEncoderLegacy.runEncoderPool;
  UATEncoder.encodeDifyYAMLEnhanced = window.UATEncoderLegacy.encodeDifyYAMLEnhanced;
  UATEncoder.encodeFastGPTEnhanced = window.UATEncoderLegacy.encodeFastGPTEnhanced;
  UATEncoder.encodeFlowiseEnhanced = window.UATEncoderLegacy.encodeFlowiseEnhanced;
  UATEncoder.encodeClaudeSkillEnhanced = window.UATEncoderLegacy.encodeClaudeSkillEnhanced;
  UATEncoder.encodeOpenClawEnhanced = window.UATEncoderLegacy.encodeOpenClawEnhanced;
  UATEncoder.encodeHermesYAML = window.UATEncoderLegacy.encodeHermesYAML;
  UATEncoder.encodeCursorRules = window.UATEncoderLegacy.encodeCursorRules;
  UATEncoder.encodeWindsurfRules = window.UATEncoderLegacy.encodeWindsurfRules;
  UATEncoder.encodeCopilotInstructions = window.UATEncoderLegacy.encodeCopilotInstructions;
  UATEncoder.encodeCodexAgents = window.UATEncoderLegacy.encodeCodexAgents;
  UATEncoder.encodeZedRules = window.UATEncoderLegacy.encodeZedRules;
  UATEncoder.encodePlainTextEnhanced = window.UATEncoderLegacy.encodePlainTextEnhanced;
  UATEncoder.addKnowledgeBaseNote = window.UATEncoderLegacy.addKnowledgeBaseNote;
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
  supportedPlatforms: ['dify', 'openclaw', 'hermes', 'cursor', 'windsurf', 'claude', 'fastgpt', 'flowise', 'copilot', 'codex', 'zed', 'plain']
};

});
