/**
 * UAT Secrets Sanitizer v1.0 - F5 敏感信息检测与清理
 * 检测并清理 Schema 中的敏感信息（密钥、密码等）
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

// ============================================
// 敏感信息检测规则
// ============================================

const SECRET_PATTERNS = {
  // API Keys
  apiKeyPatterns: [
    /api[_-]?key[_-]?\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /apikey\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /api_secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi
  ],

  // Bearer Tokens
  bearerTokenPatterns: [
    /bearer[_-]?token\s*[:=]\s*['"]?[a-zA-Z0-9_.-]{30,}['"]?/gi,
    /access[_-]?token\s*[:=]\s*['"]?[a-zA-Z0-9_.-]{30,}['"]?/gi,
    /auth[_-]?token\s*[:=]\s*['"]?[a-zA-Z0-9_.-]{30,}['"]?/gi
  ],

  // Passwords
  passwordPatterns: [
    /password\s*[:=]\s*['"]?[^\s'"<>]{8,}['"]?/gi,
    /passwd\s*[:=]\s*['"]?[^\s'"<>]{8,}['"]?/gi,
    /pwd\s*[:=]\s*['"]?[^\s'"<>]{8,}['"]?/gi
  ],

  // OAuth Secrets
  oauthPatterns: [
    /client[_-]?secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /oauth[_-]?secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /consumer[_-]?secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi
  ],

  // Private Keys
  privateKeyPatterns: [
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
    /private[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9+/=_-]{40,}['"]?/gi
  ],

  // Database URLs with credentials
  dbUrlPatterns: [
    /mysql:\/\/[^:]+:([^@]+)@/gi,
    /postgres:\/\/[^:]+:([^@]+)@/gi,
    /mongodb:\/\/[^:]+:([^@]+)@/gi,
    /redis:\/\/[^:]+:([^@]+)@/gi
  ],

  // AWS Credentials
  awsPatterns: [
    /AKIA[0-9A-Z]{16}/gi,  // AWS Access Key ID
    /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9/+=]{40}['"]?/gi
  ],

  // Generic Secrets
  genericSecretPatterns: [
    /secret[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /token\s*[:=]\s*['"]?[a-zA-Z0-9_.-]{30,}['"]?/gi
  ],

  // Environment Variables (common patterns)
  envVarPatterns: [
    /env\s*[:=]\s*\{[^}]*api[_-]?key[^}]*\}/gi,
    /env\s*[:=]\s*\{[^}]*secret[^}]*\}/gi,
    /env\s*[:=]\s*\{[^}]*password[^}]*\}/gi
  ]
};

// ============================================
// 检测结果字段
// ============================================

const SECRET_FIELDS = [
  'tools.apiEndpoints[].auth.apiKey',
  'tools.apiEndpoints[].auth.token',
  'tools.apiEndpoints[].headers.Authorization',
  'tools.apiEndpoints[].headers.X-API-Key',
  'tools.mcpServers[].config.env',
  'modelConfig.apiKey',
  'identity.constraints',  // 可能包含密钥信息
  'memory.longTermMemory[].content',  // 可能包含记忆中的密钥
  'memory.memoryEntries[].content'
];

// ============================================
// 检测与清理入口函数
// ============================================

/**
 * 检测并清理 Schema 中的敏感信息
 * @param {Object} schema - UAT-Schema
 * @param {Object} options - 清理选项
 * @returns {Object} { detected: [], sanitized: Object, stats: Object }
 */
function sanitizeSecrets(schema, options = {}) {
  const result = {
    detected: [],
    sanitized: {},
    stats: {
      apiKeys: 0,
      tokens: 0,
      passwords: 0,
      privateKeys: 0,
      dbUrls: 0,
      awsCreds: 0,
      envVars: 0,
      total: 0
    },
    warnings: []
  };

  // 默认清理策略
  const strategy = options.strategy || 'mask'; // mask | remove | placeholder | keep
  const placeholder = options.placeholder || '[REDACTED]';

  // 深度克隆 Schema 以避免修改原对象
  const sanitizedSchema = JSON.parse(JSON.stringify(schema));

  // 检测工具层
  if (sanitizedSchema.tools) {
    sanitizeTools(sanitizedSchema.tools, strategy, placeholder, result);
  }

  // 检测 MCP 配置
  if (sanitizedSchema.tools?.mcpServers) {
    sanitizeMCPServers(sanitizedSchema.tools.mcpServers, strategy, placeholder, result);
  }

  // 检测模型配置
  if (sanitizedSchema.modelConfig) {
    sanitizeModelConfig(sanitizedSchema.modelConfig, strategy, placeholder, result);
  }

  // 检测约束内容
  if (sanitizedSchema.identity?.constraints) {
    sanitizeConstraints(sanitizedSchema.identity.constraints, strategy, placeholder, result);
  }

  // 检测记忆内容
  if (sanitizedSchema.memory) {
    sanitizeMemory(sanitizedSchema.memory, strategy, placeholder, result);
  }

  // 检测系统提示词
  if (sanitizedSchema.identity?.systemPrompt) {
    const promptResult = detectSecretsInText(sanitizedSchema.identity.systemPrompt);
    if (promptResult.length > 0) {
      for (const secret of promptResult) {
        result.detected.push({
          field: 'identity.systemPrompt',
          type: secret.type,
          pattern: secret.pattern,
          original: secret.match,
          action: 'masked'
        });
        result.stats.total++;
      }
      sanitizedSchema.identity.systemPrompt = sanitizeText(sanitizedSchema.identity.systemPrompt, strategy, placeholder);
    }
  }

  result.sanitized = sanitizedSchema;
  result.stats.total = result.stats.apiKeys + result.stats.tokens + result.stats.passwords +
                        result.stats.privateKeys + result.stats.dbUrls + result.stats.awsCreds + result.stats.envVars;

  if (result.stats.total > 0) {
    result.warnings.push(`发现 ${result.stats.total} 个敏感信息项，已使用 ${strategy} 策略处理`);
  }

  return result;
}

// ============================================
// 工具层清理
// ============================================

function sanitizeTools(tools, strategy, placeholder, result) {
  if (!tools.apiEndpoints) return;

  for (let i = 0; i < tools.apiEndpoints.length; i++) {
    const api = tools.apiEndpoints[i];

    // auth.apiKey
    if (api.auth?.apiKey && api.auth.apiKey.trim() !== '') {
      result.detected.push({
        field: `tools.apiEndpoints[${i}].auth.apiKey`,
        type: 'apiKey',
        original: api.auth.apiKey,
        action: strategy
      });
      result.stats.apiKeys++;
      api.auth.apiKey = applyStrategy(api.auth.apiKey, strategy, placeholder);
    }

    // auth.token
    if (api.auth?.token && api.auth.token.trim() !== '') {
      result.detected.push({
        field: `tools.apiEndpoints[${i}].auth.token`,
        type: 'bearerToken',
        original: api.auth.token,
        action: strategy
      });
      result.stats.tokens++;
      api.auth.token = applyStrategy(api.auth.token, strategy, placeholder);
    }

    // headers.Authorization
    if (api.headers?.Authorization) {
      result.detected.push({
        field: `tools.apiEndpoints[${i}].headers.Authorization`,
        type: 'bearerToken',
        original: api.headers.Authorization,
        action: strategy
      });
      result.stats.tokens++;
      api.headers.Authorization = applyStrategy(api.headers.Authorization, strategy, placeholder);
    }

    // headers.X-API-Key
    if (api.headers?.['X-API-Key'] || api.headers?.['x-api-key']) {
      const key = api.headers['X-API-Key'] || api.headers['x-api-key'];
      result.detected.push({
        field: `tools.apiEndpoints[${i}].headers.X-API-Key`,
        type: 'apiKey',
        original: key,
        action: strategy
      });
      result.stats.apiKeys++;
      if (api.headers['X-API-Key']) {
        api.headers['X-API-Key'] = applyStrategy(key, strategy, placeholder);
      } else {
        api.headers['x-api-key'] = applyStrategy(key, strategy, placeholder);
      }
    }
  }
}

// ============================================
// MCP 配置清理
// ============================================

function sanitizeMCPServers(mcpServers, strategy, placeholder, result) {
  for (let i = 0; i < mcpServers.length; i++) {
    const mcp = mcpServers[i];

    if (mcp.config?.env && typeof mcp.config.env === 'object') {
      const env = mcp.config.env;
      for (const [key, value] of Object.entries(env)) {
        if (isSecretKey(key) && typeof value === 'string' && value.trim() !== '') {
          result.detected.push({
            field: `tools.mcpServers[${i}].config.env.${key}`,
            type: 'envVar',
            original: value,
            action: strategy
          });
          result.stats.envVars++;
          env[key] = applyStrategy(value, strategy, placeholder);
        }
      }
    }
  }
}

// ============================================
// 模型配置清理
// ============================================

function sanitizeModelConfig(modelConfig, strategy, placeholder, result) {
  if (modelConfig.apiKey && modelConfig.apiKey.trim() !== '') {
    result.detected.push({
      field: 'modelConfig.apiKey',
      type: 'apiKey',
      original: modelConfig.apiKey,
      action: strategy
    });
    result.stats.apiKeys++;
    modelConfig.apiKey = applyStrategy(modelConfig.apiKey, strategy, placeholder);
  }
}

// ============================================
// 约束内容清理
// ============================================

function sanitizeConstraints(constraints, strategy, placeholder, result) {
  for (let i = 0; i < constraints.length; i++) {
    const secrets = detectSecretsInText(constraints[i]);
    if (secrets.length > 0) {
      for (const secret of secrets) {
        result.detected.push({
          field: `identity.constraints[${i}]`,
          type: secret.type,
          pattern: secret.pattern,
          original: secret.match,
          action: 'masked'
        });
        result.stats.total++;
      }
      constraints[i] = sanitizeText(constraints[i], strategy, placeholder);
    }
  }
}

// ============================================
// 记忆内容清理
// ============================================

function sanitizeMemory(memory, strategy, placeholder, result) {
  // longTermMemory
  if (memory.longTermMemory && Array.isArray(memory.longTermMemory)) {
    for (let i = 0; i < memory.longTermMemory.length; i++) {
      const mem = memory.longTermMemory[i];
      if (typeof mem.content === 'string') {
        const secrets = detectSecretsInText(mem.content);
        if (secrets.length > 0) {
          for (const secret of secrets) {
            result.detected.push({
              field: `memory.longTermMemory[${i}].content`,
              type: secret.type,
              original: secret.match,
              action: 'masked'
            });
          }
          mem.content = sanitizeText(mem.content, strategy, placeholder);
        }
      }
    }
  }

  // memoryEntries
  if (memory.memoryEntries && Array.isArray(memory.memoryEntries)) {
    for (let i = 0; i < memory.memoryEntries.length; i++) {
      const entry = memory.memoryEntries[i];
      if (entry.content) {
        const secrets = detectSecretsInText(entry.content);
        if (secrets.length > 0) {
          for (const secret of secrets) {
            result.detected.push({
              field: `memory.memoryEntries[${i}].content`,
              type: secret.type,
              original: secret.match,
              action: 'masked'
            });
          }
          entry.content = sanitizeText(entry.content, strategy, placeholder);
        }
      }
    }
  }

  // userPreference
  if (memory.userPreference) {
    const secrets = detectSecretsInText(memory.userPreference);
    if (secrets.length > 0) {
      memory.userPreference = sanitizeText(memory.userPreference, strategy, placeholder);
    }
  }
}

// ============================================
// 文本检测与清理
// ============================================

/**
 * 检测文本中的敏感信息
 * @param {string} text - 待检测文本
 * @returns {Array} 检测结果列表
 */
function detectSecretsInText(text) {
  const detected = [];

  for (const [type, patterns] of Object.entries(SECRET_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          detected.push({
            type: type.replace('Patterns', ''),
            pattern: pattern.source,
            match: match
          });
        }
      }
    }
  }

  return detected;
}

/**
 * 清理文本中的敏感信息
 * @param {string} text - 待清理文本
 * @param {string} strategy - 清理策略
 * @param {string} placeholder - 占位符
 * @returns {string} 清理后的文本
 */
function sanitizeText(text, strategy, placeholder) {
  let sanitized = text;

  for (const patterns of Object.values(SECRET_PATTERNS)) {
    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        return applyStrategy(match, strategy, placeholder);
      });
    }
  }

  return sanitized;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 应用清理策略
 */
function applyStrategy(value, strategy, placeholder) {
  switch (strategy) {
    case 'mask':
      // 部分遮蔽，保留前4位和后4位
      if (typeof value === 'string' && value.length > 8) {
        return value.slice(0, 4) + '****' + value.slice(-4);
      }
      return '****';

    case 'remove':
      return '';

    case 'placeholder':
      return placeholder;

    case 'keep':
      return value;

    default:
      return placeholder;
  }
}

/**
 * 判断是否为敏感键名
 */
function isSecretKey(keyName) {
  const secretKeyPatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /passwd/i,
    /token/i,
    /auth/i,
    /credential/i,
    /private[_-]?key/i,
    /access[_-]?key/i
  ];

  for (const pattern of secretKeyPatterns) {
    if (pattern.test(keyName)) {
      return true;
    }
  }

  return false;
}

/**
 * 生成检测报告
 */
function generateSanitizationReport(result) {
  let report = '# Secrets Sanitization Report\n\n';

  report += `## Statistics\n\n`;
  report += `- API Keys: ${result.stats.apiKeys}\n`;
  report += `- Tokens: ${result.stats.tokens}\n`;
  report += `- Passwords: ${result.stats.passwords}\n`;
  report += `- Private Keys: ${result.stats.privateKeys}\n`;
  report += `- DB URLs: ${result.stats.dbUrls}\n`;
  report += `- AWS Credentials: ${result.stats.awsCreds}\n`;
  report += `- Environment Variables: ${result.stats.envVars}\n`;
  report += `- **Total**: ${result.stats.total}\n\n`;

  if (result.detected.length > 0) {
    report += `## Detected Secrets\n\n`;
    report += '| Field | Type | Action |\n';
    report += '|-------|------|--------|\n';
    for (const secret of result.detected.slice(0, 20)) {
      report += `| ${secret.field} | ${secret.type} | ${secret.action} |\n`;
    }
  }

  return report;
}

// ============================================
// 导出模块接口
// ============================================

window.UATSecretsSanitizer = {
  sanitizeSecrets,
  detectSecretsInText,
  sanitizeText,
  isSecretKey,
  applyStrategy,
  generateSanitizationReport,
  SECRET_PATTERNS,
  SECRET_FIELDS
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATSecretsSanitizer;
}