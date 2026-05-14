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