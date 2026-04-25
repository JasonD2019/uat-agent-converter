/**
 * UAT Integrity Report v1.0 - F6 完整性报告生成
 * 生成 Schema 转换完整性报告，记录转换前后数据对比
 */

// ============================================
// 报告配置
// ============================================

const REPORT_CONFIG = {
  includeOriginal: false,     // 是否包含原始值（安全考虑）
  maxDetailItems: 50,         // 详情最大条目数
  timestampFormat: 'ISO',     // 时间戳格式
  outputFormat: 'markdown',   // 默认输出格式
  severityThreshold: 'medium' // 警告严重程度阈值
};

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

// ============================================
// 完整性检查规则
// ============================================

const INTEGRITY_CHECKS = {
  // 必须存在的字段
  requiredFields: [
    'meta.name',
    'meta.sourcePlatform',
    'identity.systemPrompt',
    'modelConfig.model',
    'tools.mcpServers',
    'tools.apiEndpoints',
    'workflow.steps',
    'memory.longTermMemory',
    'memory.memoryEntries'
  ],

  // 数值范围检查
  rangeChecks: {
    'modelConfig.temperature': { min: 0, max: 2 },
    'modelConfig.maxTokens': { min: 1, max: 100000 },
    'modelConfig.topP': { min: 0, max: 1 },
    'modelConfig.advanced.frequencyPenalty': { min: -2, max: 2 },
    'modelConfig.advanced.presencePenalty': { min: -2, max: 2 }
  },

  // 数组长度检查
  lengthChecks: {
    'identity.constraints': { max: 100, warn: 50 },
    'workflow.steps': { max: 200, warn: 100 },
    'memory.memoryEntries': { max: 500, warn: 200 },
    'tools.mcpServers': { max: 50, warn: 20 },
    'tools.apiEndpoints': { max: 100, warn: 50 }
  },

  // 字段类型检查
  typeChecks: {
    'meta.name': 'string',
    'meta.description': 'string',
    'identity.systemPrompt': 'string',
    'identity.role': 'string',
    'modelConfig.temperature': 'number',
    'modelConfig.maxTokens': 'number',
    'tools.mcpServers': 'array',
    'tools.apiEndpoints': 'array',
    'workflow.steps': 'array',
    'memory.longTermMemory': 'array',
    'memory.memoryEntries': 'array'
  },

  // 格式检查
  formatChecks: {
    'meta.agentId': 'uuid',
    'meta.createdAt': 'isoDate',
    'meta.updatedAt': 'isoDate'
  }
};

// ============================================
// 完整性报告生成入口
// ============================================

/**
 * 生成 Schema 完整性报告
 * @param {Object} sourceSchema - 源 Schema
 * @param {Object} targetSchema - 目标 Schema（可选）
 * @param {Object} options - 报告选项
 * @returns {Object} 完整性报告对象
 */
function generateIntegrityReport(sourceSchema, targetSchema = null, options = {}) {
  const config = { ...REPORT_CONFIG, ...options };

  const report = {
    id: getUATCore().generateUUID(),
    timestamp: new Date().toISOString(),
    sourcePlatform: sourceSchema.meta?.sourcePlatform || 'unknown',
    targetPlatform: targetSchema?.meta?.sourcePlatform || 'unknown',

    summary: {
      status: 'valid',          // valid | warning | error | invalid
      totalChecks: 0,
      passed: 0,
      warnings: 0,
      errors: 0,
      dataLoss: 0,
      transformation: 'none'
    },

    checks: {
      requiredFields: [],
      rangeChecks: [],
      lengthChecks: [],
      typeChecks: [],
      formatChecks: [],
      customChecks: []
    },

    dataTransfer: {
      meta: { transferred: false, items: 0 },
      identity: { transferred: false, items: 0, charCount: 0 },
      tools: { transferred: false, mcpServers: 0, apiEndpoints: 0, functions: 0 },
      workflow: { transferred: false, steps: 0 },
      memory: { transferred: false, entries: 0, kbRefs: 0 },
      skills: { transferred: false, skills: 0, capabilities: 0 }
    },

    warnings: [],
    errors: [],
    suggestions: []
  };

  // 执行各项检查
  checkRequiredFields(sourceSchema, report);
  checkRangeValues(sourceSchema, report);
  checkArrayLengths(sourceSchema, report);
  checkFieldTypes(sourceSchema, report);
  checkFieldFormats(sourceSchema, report);

  // 如果有目标 Schema，执行转换检查
  if (targetSchema) {
    checkTransformation(sourceSchema, targetSchema, report);
    report.summary.transformation = 'complete';
  }

  // 计算统计
  report.summary.totalChecks = countChecks(report.checks);
  report.summary.passed = countPassed(report.checks);
  report.summary.warnings = report.warnings.length;
  report.summary.errors = report.errors.length;

  // 确定整体状态
  if (report.summary.errors > 0) {
    report.summary.status = 'error';
  } else if (report.summary.warnings > 0) {
    report.summary.status = 'warning';
  } else {
    report.summary.status = 'valid';
  }

  return report;
}

// ============================================
// 必须字段检查
// ============================================

function checkRequiredFields(schema, report) {
  for (const fieldPath of INTEGRITY_CHECKS.requiredFields) {
    const value = getFieldValue(schema, fieldPath);
    const exists = value !== undefined && value !== null;

    const result = {
      field: fieldPath,
      status: exists ? 'passed' : 'missing',
      severity: exists ? 'none' : 'error',
      value: exists ? 'present' : 'missing'
    };

    report.checks.requiredFields.push(result);

    if (!exists) {
      report.errors.push({
        type: 'required_field_missing',
        field: fieldPath,
        severity: 'error',
        message: `必须字段 ${fieldPath} 缺失`
      });
    }
  }
}

// ============================================
// 数值范围检查
// ============================================

function checkRangeValues(schema, report) {
  for (const [fieldPath, range] of Object.entries(INTEGRITY_CHECKS.rangeChecks)) {
    const value = getFieldValue(schema, fieldPath);

    if (value === undefined || value === null) {
      continue; // 跳过未定义的字段
    }

    const inRange = value >= range.min && value <= range.max;

    const result = {
      field: fieldPath,
      status: inRange ? 'passed' : 'out_of_range',
      severity: inRange ? 'none' : 'warning',
      value: value,
      range: `${range.min} - ${range.max}`
    };

    report.checks.rangeChecks.push(result);

    if (!inRange) {
      report.warnings.push({
        type: 'value_out_of_range',
        field: fieldPath,
        severity: 'warning',
        message: `${fieldPath} 值 ${value} 超出范围 [${range.min}, ${range.max}]`
      });
    }
  }
}

// ============================================
// 数组长度检查
// ============================================

function checkArrayLengths(schema, report) {
  for (const [fieldPath, limits] of Object.entries(INTEGRITY_CHECKS.lengthChecks)) {
    const value = getFieldValue(schema, fieldPath);

    if (!Array.isArray(value)) {
      continue; // 跳过非数组字段
    }

    const length = value.length;
    const exceedsMax = length > limits.max;
    const exceedsWarn = length > limits.warn;

    const result = {
      field: fieldPath,
      status: exceedsMax ? 'exceeded' : (exceedsWarn ? 'warning' : 'passed'),
      severity: exceedsMax ? 'error' : (exceedsWarn ? 'warning' : 'none'),
      length: length,
      max: limits.max,
      warn: limits.warn
    };

    report.checks.lengthChecks.push(result);

    if (exceedsMax) {
      report.errors.push({
        type: 'array_length_exceeded',
        field: fieldPath,
        severity: 'error',
        message: `${fieldPath} 数组长度 ${length} 超过最大限制 ${limits.max}`
      });
    } else if (exceedsWarn) {
      report.warnings.push({
        type: 'array_length_warning',
        field: fieldPath,
        severity: 'warning',
        message: `${fieldPath} 数组长度 ${length} 超过警告阈值 ${limits.warn}`
      });
    }
  }
}

// ============================================
// 字段类型检查
// ============================================

function checkFieldTypes(schema, report) {
  for (const [fieldPath, expectedType] of Object.entries(INTEGRITY_CHECKS.typeChecks)) {
    const value = getFieldValue(schema, fieldPath);

    if (value === undefined || value === null) {
      continue; // 跳过未定义的字段
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const typeMatch = actualType === expectedType;

    const result = {
      field: fieldPath,
      status: typeMatch ? 'passed' : 'type_mismatch',
      severity: typeMatch ? 'none' : 'warning',
      expected: expectedType,
      actual: actualType
    };

    report.checks.typeChecks.push(result);

    if (!typeMatch) {
      report.warnings.push({
        type: 'type_mismatch',
        field: fieldPath,
        severity: 'warning',
        message: `${fieldPath} 类型不匹配，期望 ${expectedType}，实际 ${actualType}`
      });
    }
  }
}

// ============================================
// 字段格式检查
// ============================================

function checkFieldFormats(schema, report) {
  for (const [fieldPath, format] of Object.entries(INTEGRITY_CHECKS.formatChecks)) {
    const value = getFieldValue(schema, fieldPath);

    if (!value) {
      continue; // 跳过空值
    }

    let valid = false;

    switch (format) {
      case 'uuid':
        valid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
        break;
      case 'isoDate':
        valid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
        break;
    }

    const result = {
      field: fieldPath,
      status: valid ? 'passed' : 'format_invalid',
      severity: valid ? 'none' : 'warning',
      format: format
    };

    report.checks.formatChecks.push(result);

    if (!valid) {
      report.warnings.push({
        type: 'format_invalid',
        field: fieldPath,
        severity: 'warning',
        message: `${fieldPath} 格式不符合 ${format} 规范`
      });
    }
  }
}

// ============================================
// 转换检查
// ============================================

function checkTransformation(source, target, report) {
  // Meta 层转换
  report.dataTransfer.meta = {
    transferred: target.meta?.name === source.meta?.name,
    items: compareObjectCount(source.meta, target.meta)
  };

  // Identity 层转换
  const sourcePromptLength = source.identity?.systemPrompt?.length || 0;
  const targetPromptLength = target.identity?.systemPrompt?.length || 0;
  report.dataTransfer.identity = {
    transferred: targetPromptLength > 0,
    items: compareObjectCount(source.identity, target.identity),
    charCount: targetPromptLength,
    promptLoss: sourcePromptLength > 0 ? Math.round((sourcePromptLength - targetPromptLength) / sourcePromptLength * 100) : 0
  };

  if (report.dataTransfer.identity.promptLoss > 10) {
    report.warnings.push({
      type: 'prompt_content_loss',
      severity: 'warning',
      message: `系统提示词内容损失 ${report.dataTransfer.identity.promptLoss}%`
    });
    report.summary.dataLoss++;
  }

  // Tools 层转换
  report.dataTransfer.tools = {
    transferred: (target.tools?.mcpServers?.length > 0) ||
                 (target.tools?.apiEndpoints?.length > 0) ||
                 (target.tools?.functions?.length > 0),
    mcpServers: target.tools?.mcpServers?.length || 0,
    apiEndpoints: target.tools?.apiEndpoints?.length || 0,
    functions: target.tools?.functions?.length || 0,
    toolLoss: ((source.tools?.mcpServers?.length || 0) - (target.tools?.mcpServers?.length || 0)) +
              ((source.tools?.apiEndpoints?.length || 0) - (target.tools?.apiEndpoints?.length || 0))
  };

  if (report.dataTransfer.tools.toolLoss > 0) {
    report.warnings.push({
      type: 'tool_transfer_loss',
      severity: 'warning',
      message: `工具配置损失 ${report.dataTransfer.tools.toolLoss} 个`
    });
    report.summary.dataLoss++;
  }

  // Workflow 层转换
  report.dataTransfer.workflow = {
    transferred: (target.workflow?.steps?.length > 0),
    steps: target.workflow?.steps?.length || 0,
    stepLoss: (source.workflow?.steps?.length || 0) - (target.workflow?.steps?.length || 0)
  };

  if (report.dataTransfer.workflow.stepLoss > 0) {
    report.warnings.push({
      type: 'workflow_step_loss',
      severity: 'warning',
      message: `工作流步骤损失 ${report.dataTransfer.workflow.stepLoss} 个`
    });
    report.summary.dataLoss++;
  }

  // Memory 层转换
  report.dataTransfer.memory = {
    transferred: (target.memory?.memoryEntries?.length > 0) ||
                 (target.memory?.longTermMemory?.length > 0),
    entries: target.memory?.memoryEntries?.length || target.memory?.longTermMemory?.length || 0,
    kbRefs: target.memory?.knowledgeBaseRef?.length || 0,
    entryLoss: (source.memory?.memoryEntries?.length || source.memory?.longTermMemory?.length || 0) -
               (target.memory?.memoryEntries?.length || target.memory?.longTermMemory?.length || 0)
  };

  if (report.dataTransfer.memory.entryLoss > 0) {
    report.warnings.push({
      type: 'memory_entry_loss',
      severity: 'warning',
      message: `记忆条目损失 ${report.dataTransfer.memory.entryLoss} 个`
    });
    report.summary.dataLoss++;
  }

  // Skills 层转换
  report.dataTransfer.skills = {
    transferred: target.identity?.skills?.skills?.length > 0,
    skills: target.identity?.skills?.skills?.length || 0,
    capabilities: target.identity?.skills?.capabilities?.length || 0
  };

  // 生成建议
  generateSuggestions(report);
}

// ============================================
// 辅助函数
// ============================================

function getFieldValue(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // 处理数组索引
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2]);
      if (current[key] && Array.isArray(current[key])) {
        current = current[key][index];
      } else {
        return undefined;
      }
    } else {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

function compareObjectCount(source, target) {
  if (!source || !target) return 0;
  const sourceKeys = Object.keys(source).filter(k => source[k] !== undefined && source[k] !== null);
  const targetKeys = Object.keys(target).filter(k => target[k] !== undefined && target[k] !== null);
  return Math.min(sourceKeys.length, targetKeys.length);
}

function countChecks(checks) {
  let total = 0;
  for (const category of Object.values(checks)) {
    total += category.length;
  }
  return total;
}

function countPassed(checks) {
  let passed = 0;
  for (const category of Object.values(checks)) {
    passed += category.filter(c => c.status === 'passed').length;
  }
  return passed;
}

function generateSuggestions(report) {
  // 数据损失建议
  if (report.summary.dataLoss > 0) {
    report.suggestions.push({
      type: 'data_recovery',
      priority: 'high',
      message: '建议检查源平台配置，手动补充损失的数据项'
    });
  }

  // 必须字段缺失建议
  const missingRequired = report.checks.requiredFields.filter(f => f.status === 'missing');
  if (missingRequired.length > 0) {
    report.suggestions.push({
      type: 'field_completion',
      priority: 'high',
      message: `建议补充缺失的必须字段: ${missingRequired.map(f => f.field).join(', ')}`
    });
  }

  // 数组超限建议
  const exceededArrays = report.checks.lengthChecks.filter(c => c.status === 'exceeded');
  if (exceededArrays.length > 0) {
    report.suggestions.push({
      type: 'array_truncate',
      priority: 'medium',
      message: `建议精简超限数组: ${exceededArrays.map(c => c.field).join(', ')}`
    });
  }

  // 系统提示词优化建议
  if (report.dataTransfer.identity?.promptLoss > 10) {
    report.suggestions.push({
      type: 'prompt_optimization',
      priority: 'medium',
      message: '建议检查目标平台提示词格式要求，优化提示词结构'
    });
  }
}

// ============================================
// 报告导出函数
// ============================================

/**
 * 导出完整性报告为指定格式
 * @param {Object} report - 完整性报告对象
 * @param {string} format - 输出格式
 * @returns {string} 格式化报告
 */
function exportReport(report, format = 'markdown') {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);

    case 'markdown':
      return exportReportMarkdown(report);

    case 'yaml':
      return exportReportYAML(report);

    case 'html':
      return exportReportHTML(report);

    default:
      return JSON.stringify(report, null, 2);
  }
}

function exportReportMarkdown(report) {
  let md = `# UAT Integrity Report\n\n`;
  md += `**Report ID**: ${report.id}\n`;
  md += `**Timestamp**: ${report.timestamp}\n`;
  md += `**Source**: ${report.sourcePlatform}\n`;
  md += `**Target**: ${report.targetPlatform}\n\n`;

  md += `## Summary\n\n`;
  md += `| Status | Checks | Passed | Warnings | Errors | Data Loss |\n`;
  md += `|--------|--------|--------|----------|--------|----------|\n`;
  md += `| ${report.summary.status} | ${report.summary.totalChecks} | ${report.summary.passed} | ${report.summary.warnings} | ${report.summary.errors} | ${report.summary.dataLoss} |\n\n`;

  md += `## Data Transfer\n\n`;
  md += `| Layer | Transferred | Items | Loss |\n`;
  md += `|-------|-------------|-------|------|\n`;
  md += `| Meta | ${report.dataTransfer.meta.transferred ? 'Yes' : 'No'} | ${report.dataTransfer.meta.items} | - |\n`;
  md += `| Identity | ${report.dataTransfer.identity.transferred ? 'Yes' : 'No'} | ${report.dataTransfer.identity.items} | ${report.dataTransfer.identity.promptLoss}% |\n`;
  md += `| Tools | ${report.dataTransfer.tools.transferred ? 'Yes' : 'No'} | ${report.dataTransfer.tools.mcpServers + report.dataTransfer.tools.apiEndpoints} | ${report.dataTransfer.tools.toolLoss} |\n`;
  md += `| Workflow | ${report.dataTransfer.workflow.transferred ? 'Yes' : 'No'} | ${report.dataTransfer.workflow.steps} | ${report.dataTransfer.workflow.stepLoss} |\n`;
  md += `| Memory | ${report.dataTransfer.memory.transferred ? 'Yes' : 'No'} | ${report.dataTransfer.memory.entries} | ${report.dataTransfer.memory.entryLoss} |\n`;
  md += `| Skills | ${report.dataTransfer.skills.transferred ? 'Yes' : 'No'} | ${report.dataTransfer.skills.skills} | - |\n\n`;

  if (report.warnings.length > 0) {
    md += `## Warnings\n\n`;
    for (const w of report.warnings.slice(0, REPORT_CONFIG.maxDetailItems)) {
      md += `- **${w.type}**: ${w.message}\n`;
    }
    md += '\n';
  }

  if (report.errors.length > 0) {
    md += `## Errors\n\n`;
    for (const e of report.errors.slice(0, REPORT_CONFIG.maxDetailItems)) {
      md += `- **${e.type}**: ${e.message} (${e.field})\n`;
    }
    md += '\n';
  }

  if (report.suggestions.length > 0) {
    md += `## Suggestions\n\n`;
    for (const s of report.suggestions) {
      md += `- [${s.priority}] ${s.message}\n`;
    }
  }

  return md;
}

function exportReportYAML(report) {
  let yaml = `integrity_report:\n`;
  yaml += `  id: "${report.id}"\n`;
  yaml += `  timestamp: "${report.timestamp}"\n`;
  yaml += `  source: "${report.sourcePlatform}"\n`;
  yaml += `  target: "${report.targetPlatform}"\n`;
  yaml += `  status: ${report.summary.status}\n`;
  yaml += `  checks: ${report.summary.totalChecks}\n`;
  yaml += `  passed: ${report.summary.passed}\n`;
  yaml += `  warnings: ${report.summary.warnings}\n`;
  yaml += `  errors: ${report.summary.errors}\n`;
  yaml += `  data_loss: ${report.summary.dataLoss}\n`;
  return yaml;
}

function exportReportHTML(report) {
  let html = `<html><head><title>UAT Integrity Report</title>`;
  html += `<style>body{font-family:Arial,sans-serif;margin:20px;}`;
  html += `table{border-collapse:collapse;width:100%;}`;
  html += `th,td{border:1px solid #ddd;padding:8px;text-align:left;}`;
  html += `.status-valid{color:green;}.status-warning{color:orange;}.status-error{color:red;}`;
  html += `</style></head><body>`;
  html += `<h1>UAT Integrity Report</h1>`;
  html += `<p>Report ID: ${report.id}</p>`;
  html += `<p>Timestamp: ${report.timestamp}</p>`;
  html += `<h2>Summary</h2>`;
  html += `<p class="status-${report.summary.status}">Status: ${report.summary.status}</p>`;
  html += `<p>Total Checks: ${report.summary.totalChecks}, Passed: ${report.summary.passed}</p>`;
  html += `</body></html>`;
  return html;
}

// ============================================
// 导出模块接口
// ============================================

window.UATIntegrityReport = {
  generateIntegrityReport,
  exportReport,
  getFieldValue,
  INTEGRITY_CHECKS,
  REPORT_CONFIG
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATIntegrityReport;
}