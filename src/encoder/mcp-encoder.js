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