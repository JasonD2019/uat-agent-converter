/**
 * UAT Skills Encoder v1.0 - G系列 skillsLayer编码器
 * 支持多种输出格式：YAML、JSON、Markdown列表、表格
 */

// ============================================
// 全局模块引用辅助
// ============================================

function getUATCore() {
  return typeof UATCore !== 'undefined' ? UATCore : window.UATCore;
}

// ============================================
// skillsLayer → YAML格式 (Dify/Hermes)
// ============================================

/**
 * 编码skillsLayer为Dify YAML格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} YAML字符串
 */
function encodeSkillsToDifyYAML(skills) {
  if (!skills || !skills.skills?.length) return '';

  let yaml = 'skills:\n';

  skills.skills.forEach(skill => {
    yaml += `  - name: "${escapeYAMLString(skill.name || 'Skill')}"\n`;
    yaml += `    description: "${escapeYAMLString(skill.description || '')}"\n`;
    if (skill.category) yaml += `    category: ${skill.category}\n`;
    if (skill.level) yaml += `    level: ${skill.level}\n`;
  });

  return yaml;
}

/**
 * 编码skillsLayer为Hermes YAML格式（带完整属性）
 * @param {Object} skills - skillsLayer对象
 * @returns {string} YAML字符串
 */
function encodeSkillsToHermesYAML(skills) {
  if (!skills || !skills.skills?.length) return '';

  let yaml = 'skills:\n';

  skills.skills.forEach(skill => {
    yaml += `  - id: "${skill.id || getUATCore().generateUUID()}"\n`;
    yaml += `    name: "${escapeYAMLString(skill.name || 'Skill')}"\n`;
    yaml += `    category: ${skill.category || 'general'}\n`;
    yaml += `    level: ${skill.level || 1}\n`;
    if (skill.description) yaml += `    description: "${escapeYAMLString(skill.description)}"\n`;
    if (skill.source) yaml += `    source: ${skill.source}\n`;
    if (skill.confidence) yaml += `    confidence: ${skill.confidence}\n`;
  });

  return yaml;
}

// ============================================
// skillsLayer → JSON格式 (FastGPT/Flowise/OpenClaw)
// ============================================

/**
 * 编码skillsLayer为FastGPT JSON格式
 * @param {Object} skills - skillsLayer对象
 * @returns {Object} FastGPT skills配置
 */
function encodeSkillsToFastGPTJSON(skills) {
  if (!skills) return { skills: [] };

  return {
    skills: skills.skills?.map(skill => ({
      id: skill.id || getUATCore().generateUUID(),
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || '',
      enabled: skill.enabled !== false
    })) || []
  };
}

/**
 * 编码skillsLayer为Flowise JSON格式
 * @param {Object} skills - skillsLayer对象
 * @returns {Object} Flowise skills配置
 */
function encodeSkillsToFlowiseJSON(skills) {
  if (!skills) return {};

  return {
    skills: skills.skills?.map(skill => ({
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || ''
    })) || []
  };
}

/**
 * 编码skillsLayer为OpenClaw JSON格式
 * @param {Object} skills - skillsLayer对象
 * @returns {Object} OpenClaw skills配置
 */
function encodeSkillsToOpenClawJSON(skills) {
  if (!skills) return { skills: [] };

  return {
    skills: skills.skills?.map(skill => ({
      id: skill.id || getUATCore().generateUUID(),
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || '',
      source: skill.source || 'inferred',
      createdAt: skill.createdAt || new Date().toISOString()
    })) || [],
    inferenceMetadata: skills.inferenceMetadata || {
      source: 'parser',
      confidence: 0.8,
      inferredAt: new Date().toISOString()
    }
  };
}

// ============================================
// skillsLayer → Markdown格式 (OpenClaw/Codex/Cursor)
// ============================================

/**
 * 编码skillsLayer为Markdown列表格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown内容
 */
function encodeSkillsToMarkdownList(skills) {
  if (!skills || !skills.skills?.length) return '';

  // 按类别分组
  const grouped = {};
  skills.skills.forEach(skill => {
    const category = skill.category || 'general';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(skill);
  });

  let md = '## Skills\n\n';

  Object.entries(grouped).forEach(([category, items]) => {
    const categoryName = getCategoryDisplayName(category);
    md += `### ${categoryName}\n\n`;

    items.forEach(skill => {
      const levelStars = getLevelStars(skill.level || 1);
      md += `- **${skill.name || 'Skill'}** ${levelStars}\n`;
      if (skill.description) {
        md += `  ${skill.description}\n`;
      }
    });

    md += '\n';
  });

  return md;
}

/**
 * 编码skillsLayer为简单列表格式（别名）
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown列表内容
 */
function encodeSkillsToList(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';

  skills.skills.forEach(skill => {
    md += `- **${skill.name || 'Skill'}**: ${skill.description || 'No description'}\n`;
  });

  return md;
}

/**
 * 编码skillsLayer为Markdown表格格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown表格
 */
function encodeSkillsToMarkdownTable(skills) {
  if (!skills || !skills.skills?.length) return '';

  let table = '## Skills\n\n';
  table += '| Name | Category | Level | Description |\n';
  table += '|------|----------|-------|-------------|\n';

  skills.skills.forEach(skill => {
    const name = skill.name || 'Skill';
    const category = getCategoryDisplayName(skill.category || 'general');
    const level = skill.level || 1;
    const desc = (skill.description || '').substring(0, 50);
    table += `| ${name} | ${category} | ${level} | ${desc} |\n`;
  });

  return table;
}

/**
 * 编码skillsLayer为SKILLS.md格式（OpenClaw专用）
 * @param {Object} skills - skillsLayer对象
 * @returns {string} SKILLS.md完整内容
 */
function encodeSkillsToOpenClawMD(skills) {
  if (!skills || !skills.skills?.length) {
    return '# Skills\n\nNo skills defined.\n';
  }

  let md = '# Skills\n\n';
  md += 'Agent capabilities and expertise areas.\n\n';

  // 总览统计
  const stats = getSkillsStats(skills);
  md += `**Total Skills**: ${stats.total}\n`;
  md += `**Categories**: ${stats.categories}\n\n`;

  md += encodeSkillsToMarkdownTable(skills);

  // 详细说明
  md += '\n## Details\n\n';

  skills.skills.forEach(skill => {
    md += `### ${skill.name || 'Skill'}\n\n`;
    md += `- **Category**: ${getCategoryDisplayName(skill.category || 'general')}\n`;
    md += `- **Level**: ${skill.level || 1}/5\n`;
    if (skill.description) {
      md += `- **Description**: ${skill.description}\n`;
    }
    if (skill.source) {
      md += `- **Source**: ${skill.source}\n`;
    }
    md += '\n';
  });

  return md;
}

/**
 * 编码skillsLayer为Codex AGENTS.md skills章节
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown Skills章节
 */
function encodeSkillsToCodexMD(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';
  md += 'The agent possesses the following capabilities:\n\n';

  skills.skills.forEach(skill => {
    md += `- **${skill.name || 'Skill'}** (${skill.category || 'general'})\n`;
    if (skill.description) {
      md += `  ${skill.description}\n`;
    }
  });

  return md;
}

/**
 * 编码skillsLayer为Cursor/Windsurf rules格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown Skills章节
 */
function encodeSkillsToCursorRules(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';

  skills.skills.forEach(skill => {
    md += `- ${skill.name || 'Skill'}: ${skill.description || 'No description'}\n`;
  });

  return md;
}

// ============================================
// skillsLayer → Claude/Zed JSON Block格式
// ============================================

/**
 * 编码skillsLayer为JSON代码块格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown JSON代码块
 */
function encodeSkillsToJSONBlock(skills) {
  if (!skills) return '';

  const skillsObj = {
    skills: skills.skills?.map(skill => ({
      id: skill.id || getUATCore().generateUUID(),
      name: skill.name || 'Skill',
      category: skill.category || 'general',
      level: skill.level || 1,
      description: skill.description || '',
      source: skill.source || 'inferred'
    })) || [],
    inferenceMetadata: skills.inferenceMetadata || {}
  };

  return '```json\n' + JSON.stringify(skillsObj, null, 2) + '\n```';
}

/**
 * 编码skillsLayer为Claude SKILLS.md格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} SKILLS.md内容
 */
function encodeSkillsToClaudeMD(skills) {
  if (!skills || !skills.skills?.length) {
    return '# Skills\n\nNo skills defined.\n';
  }

  let md = '# Skills\n\n';
  md += 'Agent capabilities derived from configuration.\n\n';
  md += encodeSkillsToJSONBlock(skills);

  return md;
}

// ============================================
// skillsLayer → Copilot Instructions格式
// ============================================

/**
 * 编码skillsLayer为Copilot instructions格式
 * @param {Object} skills - skillsLayer对象
 * @returns {string} Markdown Skills章节
 */
function encodeSkillsToCopilotInstructions(skills) {
  if (!skills || !skills.skills?.length) return '';

  let md = '## Skills\n\n';
  md += 'I have expertise in:\n\n';

  skills.skills.forEach(skill => {
    md += `- ${skill.name || 'Skill'}\n`;
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
 * 获取类别显示名称
 */
function getCategoryDisplayName(category) {
  const names = {
    programming: 'Programming',
    analysis: 'Analysis',
    communication: 'Communication',
    tool: 'Tool Usage',
    domain: 'Domain Knowledge',
    general: 'General'
  };
  return names[category] || category;
}

/**
 * 获取等级星号表示
 */
function getLevelStars(level) {
  const maxLevel = 5;
  const normalizedLevel = Math.min(Math.max(level, 1), maxLevel);
  return '★'.repeat(normalizedLevel) + '☆'.repeat(maxLevel - normalizedLevel);
}

/**
 * 获取技能统计信息
 */
function getSkillsStats(skills) {
  if (!skills || !skills.skills) {
    return { total: 0, categories: 0 };
  }

  const categories = new Set(skills.skills.map(s => s.category || 'general'));
  return {
    total: skills.skills.length,
    categories: categories.size
  };
}

/**
 * 合并多个来源的技能
 * @param {Array} skillsArrays - 多个skills数组
 * @returns {Object} 合并后的skillsLayer
 */
function mergeSkills(skillsArrays) {
  const allSkills = [];
  const seen = new Set();

  skillsArrays.forEach(skills => {
    if (skills && skills.skills) {
      skills.skills.forEach(skill => {
        const key = `${skill.category || 'general'}:${skill.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          allSkills.push(skill);
        }
      });
    }
  });

  return {
    skills: allSkills,
    inferenceMetadata: {
      source: 'merged',
      confidence: 0.9,
      inferredAt: new Date().toISOString()
    }
  };
}

// ============================================
// 统一调度函数
// ============================================

/**
 * 根据平台编码skillsLayer
 * @param {Object} skills - skillsLayer对象
 * @param {string} platform - 目标平台
 * @param {string} format - 输出格式 (json/yaml/md)
 * @returns {string|Object} 编码结果
 */
function encodeSkillsForPlatform(skills, platform, format = 'auto') {
  const encoders = {
    // A类：内嵌格式
    dify: { func: encodeSkillsToDifyYAML, format: 'yaml' },
    hermes: { func: encodeSkillsToHermesYAML, format: 'yaml' },
    fastgpt: { func: encodeSkillsToFastGPTJSON, format: 'json' },
    flowise: { func: encodeSkillsToFlowiseJSON, format: 'json' },

    // B类：JSON+MD分离
    openclaw: { func: encodeSkillsToOpenClawJSON, format: 'json', mdFunc: encodeSkillsToOpenClawMD },
    codex: { func: encodeSkillsToMarkdownTable, format: 'md' },

    // C类：Markdown格式
    cursor: { func: encodeSkillsToCursorRules, format: 'md' },
    windsurf: { func: encodeSkillsToCursorRules, format: 'md' },
    claude: { func: encodeSkillsToClaudeMD, format: 'md' },
    copilot: { func: encodeSkillsToCopilotInstructions, format: 'md' },
    zed: { func: encodeSkillsToJSONBlock, format: 'md' }
  };

  const encoder = encoders[platform];
  if (!encoder) {
    // 默认：Markdown列表
    return encodeSkillsToMarkdownList(skills);
  }

  return encoder.func(skills);
}

/**
 * 获取平台的MD格式编码器（用于B类平台）
 * @param {string} platform - 平台名称
 * @returns {Function|null} MD编码函数
 */
function getSkillsEncoderMD(platform) {
  const encoders = {
    openclaw: encodeSkillsToOpenClawMD,
    codex: encodeSkillsToCodexMD
  };

  return encoders[platform] || encodeSkillsToMarkdownList;
}

// ============================================
// 导出模块接口
// ============================================

window.UATSkillsEncoder = {
  // YAML格式
  encodeSkillsToDifyYAML,
  encodeSkillsToHermesYAML,

  // JSON格式
  encodeSkillsToFastGPTJSON,
  encodeSkillsToFlowiseJSON,
  encodeSkillsToOpenClawJSON,

  // Markdown格式
  encodeSkillsToMarkdownList,
  encodeSkillsToList,
  encodeSkillsToMarkdownTable,
  encodeSkillsToOpenClawMD,
  encodeSkillsToCodexMD,
  encodeSkillsToCursorRules,
  encodeSkillsToClaudeMD,
  encodeSkillsToCopilotInstructions,

  // JSON代码块
  encodeSkillsToJSONBlock,

  // 统一调度
  encodeSkillsForPlatform,
  getSkillsEncoderMD,

  // 辅助函数
  escapeYAMLString,
  getCategoryDisplayName,
  getLevelStars,
  getSkillsStats,
  mergeSkills
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATSkillsEncoder;
}