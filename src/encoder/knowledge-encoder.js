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