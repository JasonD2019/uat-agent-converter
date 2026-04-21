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