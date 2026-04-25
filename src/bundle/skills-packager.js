/**
 * UAT Skills Packager v1.0 - F4 技能打包器
 * 将技能信息打包到 Schema，支持跨平台传递
 */

// ============================================
// 技能打包配置
// ============================================

const SKILLS_PACK_CONFIG = {
  maxSkills: 50,               // 最大技能数量
  maxCapabilities: 20,         // 最大能力声明数量
  includeExamples: true,       // 是否包含示例
  includeDependencies: true,   // 是否包含依赖关系
  categorization: 'auto'       // 分类方式：auto | manual | none
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
// 技能分类映射
// ============================================

const SKILL_CATEGORIES = {
  programming: {
    keywords: ['code', 'programming', 'develop', 'write', 'implement', 'debug', 'refactor'],
    skills: ['javascript', 'python', 'typescript', 'go', 'rust', 'java', 'c++', 'sql']
  },
  analysis: {
    keywords: ['analyze', 'review', 'examine', 'investigate', 'diagnose', 'evaluate'],
    skills: ['data-analysis', 'code-review', 'performance-analysis', 'security-review']
  },
  communication: {
    keywords: ['explain', 'describe', 'document', 'write', 'translate', 'summarize'],
    skills: ['documentation', 'translation', 'summarization', 'explanation']
  },
  tool: {
    keywords: ['use', 'operate', 'execute', 'run', 'manage', 'configure'],
    skills: ['cli', 'docker', 'git', 'npm', 'database', 'api']
  },
  domain: {
    keywords: ['domain', 'specialize', 'expert', 'field', 'area', 'industry'],
    skills: ['finance', 'healthcare', 'legal', 'education', 'engineering']
  }
};

// ============================================
// 技能打包入口函数
// ============================================

/**
 * 打包技能信息到 Schema
 * @param {Object} schema - UAT-Schema
 * @param {Object} options - 打包选项
 * @returns {Object} { packed: boolean, stats: Object, warnings: [] }
 */
function packSkills(schema, options = {}) {
  const result = {
    packed: false,
    stats: {
      skills: 0,
      capabilities: 0,
      specializations: 0,
      inferredSkills: 0
    },
    warnings: [],
    errors: []
  };

  // 合并配置
  const config = { ...SKILLS_PACK_CONFIG, ...options };

  // 检查 Schema 结构
  if (!schema.identity) {
    result.errors.push('Schema 缺少 identity 层');
    return result;
  }

  // 初始化 skills layer
  if (!schema.identity.skills) {
    schema.identity.skills = getSchemaExtensions().createEmptySkillsLayer();
  }

  const skillsLayer = schema.identity.skills;

  // 从系统提示词推断技能
  if (config.categorization === 'auto' && schema.identity.systemPrompt) {
    const inferred = inferSkillsFromPrompt(schema.identity.systemPrompt);
    for (const skill of inferred) {
      if (!skillsLayer.skills.find(s => s.name === skill.name)) {
        skillsLayer.skills.push(skill);
        result.stats.skills++;
        result.stats.inferredSkills++;
      }
    }
  }

  // 从约束提取技能
  if (schema.identity.constraints && schema.identity.constraints.length > 0) {
    for (const constraint of schema.identity.constraints) {
      const skill = extractSkillFromConstraint(constraint);
      if (skill && !skillsLayer.skills.find(s => s.name === skill.name)) {
        skillsLayer.skills.push(skill);
        result.stats.skills++;
      }
    }
  }

  // 从记忆条目提取技能
  if (schema.memory?.memoryEntries) {
    for (const entry of schema.memory.memoryEntries) {
      if (entry.type === 'skill') {
        const skill = getSchemaExtensions().createEmptySkillEntry();
        skill.id = entry.id || getUATCore().generateUUID();
        skill.name = entry.content || entry.category || '';
        skill.category = entry.category || 'unknown';
        skill.description = entry.metadata?.description || '';
        skill.learnedFrom = entry.source || 'imported';

        if (!skillsLayer.skills.find(s => s.name === skill.name)) {
          skillsLayer.skills.push(skill);
          result.stats.skills++;
        }
      }
    }
  }

  // 从工具推断能力
  if (schema.tools) {
    const capabilities = inferCapabilitiesFromTools(schema.tools);
    for (const cap of capabilities) {
      if (!skillsLayer.capabilities.find(c => c.name === cap.name)) {
        skillsLayer.capabilities.push(cap);
        result.stats.capabilities++;
      }
    }
  }

  // 从工作流推断专业技能
  if (schema.workflow?.steps && schema.workflow.steps.length > 0) {
    const specializations = inferSpecializationsFromWorkflow(schema.workflow);
    for (const spec of specializations) {
      if (!skillsLayer.specializations.find(s => s.domain === spec.domain)) {
        skillsLayer.specializations.push(spec);
        result.stats.specializations++;
      }
    }
  }

  // 检查数量限制
  if (skillsLayer.skills.length > config.maxSkills) {
    result.warnings.push(`技能数量 ${skillsLayer.skills.length} 超过限制 ${config.maxSkills}`);
    skillsLayer.skills = skillsLayer.skills.slice(0, config.maxSkills);
  }

  if (skillsLayer.capabilities.length > config.maxCapabilities) {
    result.warnings.push(`能力数量 ${skillsLayer.capabilities.length} 超过限制 ${config.maxCapabilities}`);
    skillsLayer.capabilities = skillsLayer.capabilities.slice(0, config.maxCapabilities);
  }

  result.packed = result.stats.skills > 0 ||
                   result.stats.capabilities > 0 ||
                   result.stats.specializations > 0;

  return result;
}

// ============================================
// 技能推断函数
// ============================================

/**
 * 从系统提示词推断技能
 * @param {string} prompt - 系统提示词
 * @returns {Array} 技能列表
 */
function inferSkillsFromPrompt(prompt) {
  const skills = [];
  const promptLower = prompt.toLowerCase();

  // 检查每个技能分类
  for (const [category, data] of Object.entries(SKILL_CATEGORIES)) {
    // 检查关键词
    for (const keyword of data.keywords) {
      if (promptLower.includes(keyword)) {
        // 匹配具体技能
        for (const skillName of data.skills) {
          if (promptLower.includes(skillName.toLowerCase())) {
            const skill = getSchemaExtensions().createEmptySkillEntry();
            skill.id = getUATCore().generateUUID();
            skill.name = skillName;
            skill.category = category;
            skill.level = inferSkillLevel(prompt, skillName);
            skill.description = `从系统提示词推断: ${category} 类技能`;
            skill.learnedFrom = 'inferred';

            if (!skills.find(s => s.name === skillName)) {
              skills.push(skill);
            }
          }
        }
      }
    }
  }

  return skills;
}

/**
 * 推断技能等级
 */
function inferSkillLevel(prompt, skillName) {
  const promptLower = prompt.toLowerCase();
  const skillLower = skillName.toLowerCase();

  if (promptLower.includes(`expert ${skillLower}`) ||
      promptLower.includes(`${skillLower} expert`) ||
      promptLower.includes(`advanced ${skillLower}`)) {
    return 'expert';
  }

  if (promptLower.includes(`proficient ${skillLower}`) ||
      promptLower.includes(`skilled ${skillLower}`)) {
    return 'advanced';
  }

  if (promptLower.includes(`basic ${skillLower}`) ||
      promptLower.includes(`beginner ${skillLower}`)) {
    return 'beginner';
  }

  return 'intermediate';
}

/**
 * 从约束提取技能
 */
function extractSkillFromConstraint(constraint) {
  // 尝试解析技能格式约束
  // 例如: "编程语言: JavaScript, Python" 或 "擅长: 前端开发"
  const skillPatterns = [
    /编程语言[:\s]+(.+)/i,
    /擅长[:\s]+(.+)/i,
    /技能[:\s]+(.+)/i,
    /专业领域[:\s]+(.+)/i,
    /language[:\s]+(.+)/i,
    /skill[:\s]+(.+)/i
  ];

  for (const pattern of skillPatterns) {
    const match = constraint.match(pattern);
    if (match) {
      const skillList = match[1].split(/[,\s]+/).filter(s => s.trim());

      if (skillList.length > 0) {
        const skill = getSchemaExtensions().createEmptySkillEntry();
        skill.id = getUATCore().generateUUID();
        skill.name = skillList[0].trim();
        skill.category = 'programming';
        skill.description = `从约束提取: ${constraint}`;
        skill.learnedFrom = 'constraint';

        return skill;
      }
    }
  }

  return null;
}

/**
 * 从工具配置推断能力
 */
function inferCapabilitiesFromTools(tools) {
  const capabilities = [];

  // MCP 工具推断能力
  if (tools.mcpServers && tools.mcpServers.length > 0) {
    for (const mcp of tools.mcpServers) {
      const cap = getSchemaExtensions().createEmptyCapability();
      cap.id = getUATCore().generateUUID();
      cap.name = `MCP: ${mcp.name || mcp.id}`;
      cap.description = `使用 MCP 工具 ${mcp.name || mcp.id}`;
      cap.enabled = mcp.enabled !== false;

      capabilities.push(cap);
    }
  }

  // API 工具推断能力
  if (tools.apiEndpoints && tools.apiEndpoints.length > 0) {
    for (const api of tools.apiEndpoints) {
      const cap = getSchemaExtensions().createEmptyCapability();
      cap.id = getUATCore().generateUUID();
      cap.name = `API: ${api.name || api.id}`;
      cap.description = `调用 API ${api.name || api.id}`;
      cap.enabled = true;

      capabilities.push(cap);
    }
  }

  // 内置函数推断能力
  if (tools.functions && tools.functions.length > 0) {
    for (const fn of tools.functions) {
      const cap = getSchemaExtensions().createEmptyCapability();
      cap.id = getUATCore().generateUUID();
      cap.name = `Function: ${fn.name || fn.id}`;
      cap.description = fn.description || `使用内置函数 ${fn.name}`;
      cap.enabled = true;

      capabilities.push(cap);
    }
  }

  return capabilities;
}

/**
 * 从工作流推断专业化领域
 */
function inferSpecializationsFromWorkflow(workflow) {
  const specializations = [];
  const keywords = new Set();

  // 提取步骤内容关键词
  if (workflow.steps) {
    for (const step of workflow.steps) {
      if (step.content) {
        // 提取可能的领域关键词
        const domainKeywords = extractDomainKeywords(step.content);
        domainKeywords.forEach(k => keywords.add(k));
      }
    }
  }

  // 转换为专业化声明
  for (const keyword of keywords) {
    const spec = getSchemaExtensions().createEmptySpecialization();
    spec.id = getUATCore().generateUUID();
    spec.domain = keyword;
    spec.expertiseLevel = 60; // 默认中等专业水平
    spec.keywords = [keyword];
    spec.relatedSkills = [];

    specializations.push(spec);
  }

  return specializations;
}

/**
 * 提取领域关键词
 */
function extractDomainKeywords(content) {
  const keywords = [];
  const contentLower = content.toLowerCase();

  const domainPatterns = [
    'web', 'frontend', 'backend', 'fullstack',
    'mobile', 'desktop', 'cloud', 'devops',
    'data', 'ml', 'ai', 'security',
    'testing', 'documentation', 'api', 'database'
  ];

  for (const pattern of domainPatterns) {
    if (contentLower.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  return keywords;
}

// ============================================
// 技能解包函数
// ============================================

/**
 * 从 Schema 提取技能信息
 * @param {Object} schema - UAT-Schema
 * @returns {Object} { skills: [], capabilities: [], specializations: [] }
 */
function unpackSkills(schema) {
  const result = {
    skills: [],
    capabilities: [],
    specializations: []
  };

  if (!schema.identity?.skills) {
    return result;
  }

  const skillsLayer = schema.identity.skills;

  // 复制技能列表
  for (const skill of skillsLayer.skills || []) {
    result.skills.push({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      level: skill.level,
      description: skill.description
    });
  }

  // 复制能力列表
  for (const cap of skillsLayer.capabilities || []) {
    result.capabilities.push({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      enabled: cap.enabled
    });
  }

  // 复制专业化列表
  for (const spec of skillsLayer.specializations || []) {
    result.specializations.push({
      id: spec.id,
      domain: spec.domain,
      expertiseLevel: spec.expertiseLevel
    });
  }

  return result;
}

// ============================================
// 技能导出函数
// ============================================

/**
 * 导出技能为特定格式
 * @param {Object} schema - UAT-Schema
 * @param {string} format - 输出格式
 * @returns {string} 格式化内容
 */
function exportSkills(schema, format = 'json') {
  if (!schema.identity?.skills) {
    return '';
  }

  const skillsLayer = schema.identity.skills;

  switch (format) {
    case 'json':
      return JSON.stringify(skillsLayer, null, 2);

    case 'yaml':
      return exportSkillsYAML(skillsLayer);

    case 'markdown':
      return exportSkillsMarkdown(skillsLayer);

    case 'list':
      return exportSkillsList(skillsLayer);

    default:
      return JSON.stringify(skillsLayer, null, 2);
  }
}

function exportSkillsYAML(skillsLayer) {
  let yaml = 'skills:\n';

  if (skillsLayer.skills?.length > 0) {
    yaml += '  skills:\n';
    for (const skill of skillsLayer.skills) {
      yaml += `    - name: "${skill.name}"\n`;
      yaml += `      category: ${skill.category}\n`;
      yaml += `      level: ${skill.level}\n`;
      yaml += `      description: "${getUATCore().escapeYAMLString(skill.description)}"\n`;
    }
  }

  if (skillsLayer.capabilities?.length > 0) {
    yaml += '  capabilities:\n';
    for (const cap of skillsLayer.capabilities) {
      yaml += `    - name: "${cap.name}"\n`;
      yaml += `      enabled: ${cap.enabled}\n`;
    }
  }

  if (skillsLayer.specializations?.length > 0) {
    yaml += '  specializations:\n';
    for (const spec of skillsLayer.specializations) {
      yaml += `    - domain: "${spec.domain}"\n`;
      yaml += `      expertise_level: ${spec.expertiseLevel}\n`;
    }
  }

  return yaml;
}

function exportSkillsMarkdown(skillsLayer) {
  let md = '# Skills\n\n';

  if (skillsLayer.skills?.length > 0) {
    md += '## Skills\n\n';
    md += '| Name | Category | Level | Description |\n';
    md += '|------|----------|-------|-------------|\n';
    for (const skill of skillsLayer.skills) {
      md += `| ${skill.name} | ${skill.category} | ${skill.level} | ${skill.description || ''} |\n`;
    }
    md += '\n';
  }

  if (skillsLayer.capabilities?.length > 0) {
    md += '## Capabilities\n\n';
    for (const cap of skillsLayer.capabilities) {
      md += `- ${cap.name} (${cap.enabled ? 'enabled' : 'disabled'})\n`;
    }
    md += '\n';
  }

  if (skillsLayer.specializations?.length > 0) {
    md += '## Specializations\n\n';
    for (const spec of skillsLayer.specializations) {
      md += `- ${spec.domain} (${spec.expertiseLevel}%)\n`;
    }
  }

  return md;
}

function exportSkillsList(skillsLayer) {
  let list = 'Skills: ';

  if (skillsLayer.skills?.length > 0) {
    list += skillsLayer.skills.map(s => s.name).join(', ');
  }

  return list;
}

// ============================================
// 导出模块接口
// ============================================

window.UATSkillsPackager = {
  packSkills,
  inferSkillsFromPrompt,
  extractSkillFromConstraint,
  inferCapabilitiesFromTools,
  inferSpecializationsFromWorkflow,
  unpackSkills,
  exportSkills,
  SKILL_CATEGORIES,
  SKILLS_PACK_CONFIG
};

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATSkillsPackager;
}