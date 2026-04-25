/**
 * UAT Knowledge Packager v1.0 - F1 知识库打包器
 * 将知识库引用转换为内嵌内容，支持跨平台传递
 */

// ============================================
// 知识库打包配置
// ============================================

const KNOWLEDGE_PACK_CONFIG = {
  maxContentSize: 100000,      // 单个内容最大字节数
  maxTotalSize: 500000,        // 总打包大小上限
  supportedFormats: ['text', 'json', 'markdown', 'csv'],
  compressionEnabled: false,   // 是否启用压缩
  includeMetadata: true        // 是否包含元数据
};

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
// 知识库打包入口函数
// ============================================

/**
 * 打包知识库内容到 Schema
 * @param {Object} schema - UAT-Schema
 * @param {Object} options - 打包选项
 * @returns {Object} { packed: boolean, stats: Object, warnings: [] }
 */
function packKnowledgeBase(schema, options = {}) {
  const result = {
    packed: false,
    stats: {
      datasets: 0,
      documents: 0,
      qaPairs: 0,
      rules: 0,
      totalSize: 0
    },
    warnings: [],
    errors: []
  };

  // 合并配置
  const config = { ...KNOWLEDGE_PACK_CONFIG, ...options };

  // 检查 Schema 结构
  if (!schema.memory) {
    result.errors.push('Schema 缺少 memory 层');
    return result;
  }

  // 初始化 knowledgeBaseContent
  if (!schema.memory.knowledgeBaseContent) {
    schema.memory.knowledgeBaseContent = getSchemaExtensions().createEmptyKnowledgeBaseContent();
  }

  const kbContent = schema.memory.knowledgeBaseContent;

  // 处理知识库引用
  const refs = schema.memory.knowledgeBaseRef || [];

  for (const ref of refs) {
    // 尝试从引用加载内容
    const loaded = loadKnowledgeRefContent(ref, config);

    if (loaded.success) {
      // 添加到对应类型
      if (loaded.type === 'dataset') {
        kbContent.datasets.push(loaded.content);
        result.stats.datasets++;
      } else if (loaded.type === 'document') {
        kbContent.documents.push(loaded.content);
        result.stats.documents++;
      } else if (loaded.type === 'qa') {
        kbContent.qaPairs.push(loaded.content);
        result.stats.qaPairs++;
      } else if (loaded.type === 'rule') {
        kbContent.rules.push(loaded.content);
        result.stats.rules++;
      }

      result.stats.totalSize += loaded.size;
    } else {
      result.warnings.push(`无法加载知识库引用: ${ref.name || ref.id} - ${loaded.reason}`);
    }
  }

  // 检查大小限制
  if (result.stats.totalSize > config.maxTotalSize) {
    result.warnings.push(`打包大小 ${result.stats.totalSize} 超过限制 ${config.maxTotalSize}`);
    // 可以选择截断或拒绝
  }

  // 处理现有的 longTermMemory 中可能的知识内容
  const longTermMem = schema.memory.longTermMemory || [];
  if (Array.isArray(longTermMem) && longTermMem.length > 0) {
    for (const mem of longTermMem) {
      if (mem.type === 'knowledge' || mem.category === 'knowledge_base') {
        const doc = getSchemaExtensions().createEmptyKnowledgeDocument();
        doc.id = mem.id || getgetUATCore()().generateUUID();
        doc.content = mem.content || '';
        doc.createdAt = mem.createdAt || new Date().toISOString();
        kbContent.documents.push(doc);
        result.stats.documents++;
        result.stats.totalSize += doc.content.length;
      }
    }
  }

  // 处理 memoryEntries 中的知识类型
  const entries = schema.memory.memoryEntries || [];
  if (entries.length > 0) {
    for (const entry of entries) {
      if (entry.type === 'fact' && entry.category === 'knowledge_base') {
        const qa = getSchemaExtensions().createEmptyQAPair();
        qa.id = entry.id || getgetUATCore()().generateUUID();
        qa.question = entry.metadata?.question || '';
        qa.answer = entry.content || '';
        qa.category = entry.category;
        kbContent.qaPairs.push(qa);
        result.stats.qaPairs++;
        result.stats.totalSize += qa.answer.length;
      }
    }
  }

  result.packed = result.stats.datasets > 0 ||
                   result.stats.documents > 0 ||
                   result.stats.qaPairs > 0 ||
                   result.stats.rules > 0;

  return result;
}

// ============================================
// 知识库引用内容加载
// ============================================

/**
 * 从引用加载实际内容
 * @param {Object} ref - 知识库引用对象
 * @param {Object} config - 配置
 * @returns {Object} { success, type, content, size, reason }
 */
function loadKnowledgeRefContent(ref, config) {
  const result = {
    success: false,
    type: 'unknown',
    content: null,
    size: 0,
    reason: ''
  };

  // 如果引用已包含内容
  if (ref.content) {
    result.success = true;
    result.type = ref.type || 'document';
    result.size = ref.content.length;

    if (result.type === 'dataset') {
      const dataset = getSchemaExtensions().createEmptyKnowledgeDataset();
      dataset.id = ref.id || getUATCore().generateUUID();
      dataset.name = ref.name || '';
      dataset.content = ref.content;
      dataset.source = ref.source || '';
      dataset.createdAt = ref.createdAt || new Date().toISOString();
      result.content = dataset;
    } else if (result.type === 'qa') {
      const qa = getSchemaExtensions().createEmptyQAPair();
      qa.id = ref.id || getUATCore().generateUUID();
      qa.question = ref.question || '';
      qa.answer = ref.content;
      result.content = qa;
    } else {
      const doc = getSchemaExtensions().createEmptyKnowledgeDocument();
      doc.id = ref.id || getUATCore().generateUUID();
      doc.title = ref.name || '';
      doc.content = ref.content;
      doc.source = ref.source || '';
      doc.createdAt = ref.createdAt || new Date().toISOString();
      result.content = doc;
      result.type = 'document';
    }

    return result;
  }

  // 检查大小限制
  if (ref.size && ref.size > config.maxContentSize) {
    result.reason = `内容大小 ${ref.size} 超过限制 ${config.maxContentSize}`;
    return result;
  }

  // 外部引用（需要外部加载）
  // 这里只创建占位符，实际加载需要外部实现
  if (ref.url || ref.source) {
    result.reason = '外部引用需要通过外部加载器实现';
    return result;
  }

  // ID引用（无法加载）
  if (ref.id && !ref.content) {
    result.reason = '仅有ID引用，无实际内容';
    return result;
  }

  return result;
}

// ============================================
// 知识库解包函数（反向操作）
// ============================================

/**
 * 从 Schema 提取知识库内容为引用列表
 * @param {Object} schema - UAT-Schema
 * @returns {Object} { refs: [], stats: Object }
 */
function unpackKnowledgeBase(schema) {
  const result = {
    refs: [],
    stats: {
      datasets: 0,
      documents: 0,
      qaPairs: 0,
      rules: 0
    }
  };

  if (!schema.memory?.knowledgeBaseContent) {
    return result;
  }

  const kbContent = schema.memory.knowledgeBaseContent;

  // 提取 datasets
  for (const ds of kbContent.datasets || []) {
    result.refs.push({
      id: ds.id,
      name: ds.name,
      type: 'dataset',
      content: ds.content,
      source: ds.source,
      platform: schema.meta?.sourcePlatform || 'unknown'
    });
    result.stats.datasets++;
  }

  // 提取 documents
  for (const doc of kbContent.documents || []) {
    result.refs.push({
      id: doc.id,
      name: doc.title || doc.name,
      type: 'document',
      content: doc.content,
      source: doc.source,
      platform: schema.meta?.sourcePlatform || 'unknown'
    });
    result.stats.documents++;
  }

  // 提取 qaPairs
  for (const qa of kbContent.qaPairs || []) {
    result.refs.push({
      id: qa.id,
      type: 'qa',
      question: qa.question,
      content: qa.answer,
      category: qa.category,
      platform: schema.meta?.sourcePlatform || 'unknown'
    });
    result.stats.qaPairs++;
  }

  // 提取 rules
  for (const rule of kbContent.rules || []) {
    result.refs.push({
      id: rule.id,
      name: rule.name,
      type: 'rule',
      condition: rule.condition,
      action: rule.action,
      platform: schema.meta?.sourcePlatform || 'unknown'
    });
    result.stats.rules++;
  }

  return result;
}

// ============================================
// 知识库合并函数
// ============================================

/**
 * 合并多个知识库内容
 * @param {Object} targetSchema - 目标 Schema
 * @param {Object} sourceSchema - 源 Schema
 * @returns {Object} 合并统计
 */
function mergeKnowledgeBase(targetSchema, sourceSchema) {
  const stats = {
    mergedDatasets: 0,
    mergedDocuments: 0,
    mergedQAPairs: 0,
    mergedRules: 0,
    skipped: 0
  };

  if (!sourceSchema.memory?.knowledgeBaseContent) {
    return stats;
  }

  // 初始化目标
  if (!targetSchema.memory) targetSchema.memory = {};
  if (!targetSchema.memory.knowledgeBaseContent) {
    targetSchema.memory.knowledgeBaseContent = getSchemaExtensions().createEmptyKnowledgeBaseContent();
  }

  const targetKB = targetSchema.memory.knowledgeBaseContent;
  const sourceKB = sourceSchema.memory.knowledgeBaseContent;

  // 合并 datasets（按ID去重）
  for (const ds of sourceKB.datasets || []) {
    if (!targetKB.datasets.find(d => d.id === ds.id)) {
      targetKB.datasets.push(ds);
      stats.mergedDatasets++;
    } else {
      stats.skipped++;
    }
  }

  // 合并 documents（按ID去重）
  for (const doc of sourceKB.documents || []) {
    if (!targetKB.documents.find(d => d.id === doc.id)) {
      targetKB.documents.push(doc);
      stats.mergedDocuments++;
    } else {
      stats.skipped++;
    }
  }

  // 合并 qaPairs（按ID去重）
  for (const qa of sourceKB.qaPairs || []) {
    if (!targetKB.qaPairs.find(q => q.id === qa.id)) {
      targetKB.qaPairs.push(qa);
      stats.mergedQAPairs++;
    } else {
      stats.skipped++;
    }
  }

  // 合并 rules（按ID去重）
  for (const rule of sourceKB.rules || []) {
    if (!targetKB.rules.find(r => r.id === rule.id)) {
      targetKB.rules.push(rule);
      stats.mergedRules++;
    } else {
      stats.skipped++;
    }
  }

  return stats;
}

// ============================================
// 知识库导出函数
// ============================================

/**
 * 导出知识库为特定格式
 * @param {Object} schema - UAT-Schema
 * @param {string} format - 输出格式 (json, yaml, markdown, csv)
 * @returns {string} 格式化内容
 */
function exportKnowledgeBase(schema, format = 'json') {
  if (!schema.memory?.knowledgeBaseContent) {
    return '';
  }

  const kbContent = schema.memory.knowledgeBaseContent;

  switch (format) {
    case 'json':
      return JSON.stringify(kbContent, null, 2);

    case 'yaml':
      return exportKnowledgeBaseYAML(kbContent);

    case 'markdown':
      return exportKnowledgeBaseMarkdown(kbContent);

    case 'csv':
      return exportKnowledgeBaseCSV(kbContent);

    default:
      return JSON.stringify(kbContent, null, 2);
  }
}

function exportKnowledgeBaseYAML(kbContent) {
  let yaml = 'knowledge_base:\n';

  if (kbContent.datasets?.length > 0) {
    yaml += '  datasets:\n';
    for (const ds of kbContent.datasets) {
      yaml += `    - id: "${ds.id}"\n`;
      yaml += `      name: "${getUATCore().escapeYAMLString(ds.name)}"\n`;
      yaml += `      type: ${ds.type || 'text'}\n`;
      yaml += `      content: "${getUATCore().escapeYAMLString(ds.content)}"\n`;
    }
  }

  if (kbContent.documents?.length > 0) {
    yaml += '  documents:\n';
    for (const doc of kbContent.documents) {
      yaml += `    - id: "${doc.id}"\n`;
      yaml += `      title: "${getUATCore().escapeYAMLString(doc.title)}"\n`;
      yaml += `      content: "${getUATCore().escapeYAMLString(doc.content)}"\n`;
    }
  }

  if (kbContent.qaPairs?.length > 0) {
    yaml += '  qa_pairs:\n';
    for (const qa of kbContent.qaPairs) {
      yaml += `    - id: "${qa.id}"\n`;
      yaml += `      question: "${getUATCore().escapeYAMLString(qa.question)}"\n`;
      yaml += `      answer: "${getUATCore().escapeYAMLString(qa.answer)}"\n`;
    }
  }

  return yaml;
}

function exportKnowledgeBaseMarkdown(kbContent) {
  let md = '# Knowledge Base\n\n';

  if (kbContent.datasets?.length > 0) {
    md += '## Datasets\n\n';
    for (const ds of kbContent.datasets) {
      md += `### ${ds.name || ds.id}\n\n`;
      md += `${ds.content}\n\n`;
    }
  }

  if (kbContent.documents?.length > 0) {
    md += '## Documents\n\n';
    for (const doc of kbContent.documents) {
      md += `### ${doc.title || doc.id}\n\n`;
      md += `${doc.content}\n\n`;
    }
  }

  if (kbContent.qaPairs?.length > 0) {
    md += '## Q&A\n\n';
    for (const qa of kbContent.qaPairs) {
      md += `**Q:** ${qa.question}\n\n`;
      md += `**A:** ${qa.answer}\n\n`;
    }
  }

  return md;
}

function exportKnowledgeBaseCSV(kbContent) {
  let csv = 'type,id,name,content\n';

  for (const ds of kbContent.datasets || []) {
    csv += `dataset,"${ds.id}","${ds.name}","${escapeCSV(ds.content)}"\n`;
  }

  for (const doc of kbContent.documents || []) {
    csv += `document,"${doc.id}","${doc.title}","${escapeCSV(doc.content)}"\n`;
  }

  for (const qa of kbContent.qaPairs || []) {
    csv += `qa,"${qa.id}","${qa.question}","${escapeCSV(qa.answer)}"\n`;
  }

  return csv;
}

function escapeCSV(str) {
  if (!str) return '';
  return str.replace(/"/g, '""').replace(/\n/g, '\\n');
}

// ============================================
// 导出模块接口
// ============================================

window.UATKnowledgePackager = {
  packKnowledgeBase,
  loadKnowledgeRefContent,
  unpackKnowledgeBase,
  mergeKnowledgeBase,
  exportKnowledgeBase,
  KNOWLEDGE_PACK_CONFIG
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATKnowledgePackager;
}