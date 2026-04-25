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