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