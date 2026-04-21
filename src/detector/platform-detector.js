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