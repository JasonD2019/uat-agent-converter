/**
 * UAT 多平台解析器集群 v2.0 - Parser Pool Enhanced
 * 模块5：各平台原始配置 → UAT-Schema v2.0 完整解析
 */

// ============================================
// 解析器统一调度器
// ============================================

function runParserPool(cleanText, platformCode) {
  const schema = UATCore.createEmptyUATSchema();

  switch (platformCode) {
    case 'dify':
      parseDifyDSLEnhanced(cleanText, schema);
      break;
    case 'openclaw':
      parseOpenClawEnhanced(cleanText, schema);
      break;
    case 'claude':
      parseClaudeSkillEnhanced(cleanText, schema);
      break;
    case 'fastgpt':
      parseFastGPTEnhanced(cleanText, schema);
      break;
    case 'flowise':
      parseFlowiseEnhanced(cleanText, schema);
      break;
    // 新增平台
    case 'hermes':
      parseHermesYAML(cleanText, schema);
      break;
    case 'cursor':
      parseCursorRules(cleanText, schema);
      break;
    case 'windsurf':
      parseWindsurfRules(cleanText, schema);
      break;
    case 'copilot':
      parseCopilotInstructions(cleanText, schema);
      break;
    case 'codex':
      parseCodexAgents(cleanText, schema);
      break;
    case 'zed':
      parseZedRules(cleanText, schema);
      break;
    default:
      parsePlainText(cleanText, schema);
  }

  UATCore.fillSchemaDefaultValues(schema);

  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('解析结果结构不合法');
  }

  return schema;
}

// ============================================
// 解析器1：Dify DSL YAML 解析器（增强版）
// ============================================

function parseDifyDSLEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'dify';

  try {
    // 基础信息
    schema.meta.name = extractYAMLValue(text, 'name') || 'Dify Agent';
    schema.meta.description = extractYAMLValue(text, 'description') || '';

    // 系统提示词
    schema.identity.systemPrompt = extractDifySystemPrompt(text);

    // 模型配置
    schema.modelConfig.model = extractYAMLValue(text, 'model') || extractYAMLValue(text, 'name', 'model:') || 'gpt-4';
    schema.modelConfig.temperature = parseFloat(extractYAMLValue(text, 'temperature')) || 0.7;
    schema.modelConfig.maxTokens = parseInt(extractYAMLValue(text, 'max_tokens')) || 4096;

    // 解析工作流节点
    parseDifyWorkflowNodes(text, schema);

    // 解析知识库引用（仅ID）
    parseDifyKnowledgeBase(text, schema);

    // 解析工具配置
    parseDifyTools(text, schema);

  } catch (error) {
    console.warn('Dify 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

function parseDifyWorkflowNodes(text, schema) {
  const nodesMatch = text.match(/nodes:\s*\n([\s\S]*?)(?=\n\s*edges:|\n[a-zA-Z_]|\n\n|$)/);
  const edgesMatch = text.match(/edges:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);

  if (!nodesMatch) return;

  const nodesBlock = nodesMatch[1];
  const edgesBlock = edgesMatch ? edgesMatch[1] : '';

  // 解析边映射
  const edgeMap = parseDifyEdges(edgesBlock);

  // 解析节点
  const nodeRegex = /-\s*id:\s*['"]?([^'":\n]+)['"]?\s*\n([\s\S]*?)(?=\n\s*-\s*id:|$)/g;
  let match;

  while ((match = nodeRegex.exec(nodesBlock)) !== null) {
    const nodeId = match[1].trim();
    const nodeBody = match[2];

    const nodeType = extractYAMLValueFromBlock(nodeBody, 'type') || '';
    const nodeTitle = extractYAMLValueFromBlock(nodeBody, 'title') || nodeId;

    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = nodeId;
    step.name = nodeTitle;
    step.type = mapDifyNodeType(nodeType);
    step.content = extractNodeContent(nodeBody, nodeType);
    step.nextStepId = edgeMap[nodeId]?.default || '';

    // 条件节点详情
    if (nodeType === 'if-else' || nodeType === 'question-classifier') {
      step.conditions = parseDifyConditionsFromNode(nodeBody, edgeMap[nodeId]);
    }

    // 循环节点详情
    if (nodeType === 'iteration') {
      step.loopConfig = {
        iterateOver: extractYAMLValueFromBlock(nodeBody, 'iter_variable') || '',
        variableName: extractYAMLValueFromBlock(nodeBody, 'item_variable') || 'item',
        maxIterations: parseInt(extractYAMLValueFromBlock(nodeBody, 'max_iterations')) || 100,
        breakCondition: extractYAMLValueFromBlock(nodeBody, 'break_condition') || ''
      };
      step.nextStepId = edgeMap[nodeId]?.iterationEnd || '';
    }

    // 错误处理
    const errorAction = extractYAMLValueFromBlock(nodeBody, 'action', 'error_handling:');
    if (errorAction) {
      step.onError = {
        action: errorAction,
        retryCount: parseInt(extractYAMLValueFromBlock(nodeBody, 'retry_count', 'error_handling:')) || 0,
        fallbackStepId: extractYAMLValueFromBlock(nodeBody, 'fallback_node', 'error_handling:') || ''
      };
    }

    schema.workflow.steps.push(step);
  }
}

function parseDifyEdges(edgesBlock) {
  const edgeMap = {};

  if (!edgesBlock) return edgeMap;

  const edgeRegex = /-\s*source:\s*['"]?([^'":\n]+)['"]?\s*\n\s*target:\s*['"]?([^'":\n]+)['"]?/g;
  let match;

  while ((match = edgeRegex.exec(edgesBlock)) !== null) {
    const source = match[1].trim();
    const target = match[2].trim();

    if (!edgeMap[source]) edgeMap[source] = {};
    edgeMap[source].default = target;
  }

  // 解析带 source_handle 的边（条件分支）
  const condEdgeRegex = /-\s*source:\s*['"]?([^'":\n]+)['"]?\s*\n\s*source_handle:\s*['"]?([^'":\n]+)['"]?\s*\n\s*target:\s*['"]?([^'":\n]+)['"]?/g;
  while ((match = condEdgeRegex.exec(edgesBlock)) !== null) {
    const source = match[1].trim();
    const handle = match[2].trim();
    const target = match[3].trim();

    if (!edgeMap[source]) edgeMap[source] = {};
    edgeMap[source][handle] = target;
  }

  return edgeMap;
}

function parseDifyConditionsFromNode(nodeBody, edgeMap) {
  const conditions = [];

  // 条件配置块
  const condMatch = nodeBody.match(/conditions:\s*\n([\s\S]*?)(?=\n\s*\w+:|\n\n|$)/);
  if (condMatch) {
    const condBlock = condMatch[1];
    const condItemRegex = /-\s*variable:\s*['"]?([^'":\n]+)['"]?\s*\n\s*operator:\s*['"]?([^'":\n]+)['"]?\s*\n\s*value:\s*['"]?([^'":\n]+)['"]?/g;
    let match;

    while ((match = condItemRegex.exec(condBlock)) !== null) {
      conditions.push({
        variable: match[1].trim(),
        operator: match[2].trim(),
        value: match[3].trim(),
        targetStepId: '',
        priority: 0
      });
    }
  }

  // 从 edge 映射获取 target
  if (edgeMap) {
    for (const cond of conditions) {
      if (edgeMap.true) cond.targetStepId = edgeMap.true;
    }
    // 默认分支
    if (edgeMap.false || edgeMap.default) {
      conditions.push({
        variable: '',
        operator: 'default',
        value: '',
        targetStepId: edgeMap.false || edgeMap.default,
        priority: -1
      });
    }
  }

  return conditions;
}

function parseDifyKnowledgeBase(text, schema) {
  const kbId = extractYAMLValue(text, 'knowledge_base_id');
  if (kbId) {
    schema.memory.knowledgeBaseRef.push({
      id: kbId,
      name: extractYAMLValue(text, 'knowledge_base_name') || 'Knowledge Base',
      platform: 'dify'
    });
  }

  // 多知识库
  const kbMatch = text.match(/knowledge_bases:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);
  if (kbMatch) {
    const kbBlock = kbMatch[1];
    const kbItemRegex = /-\s*id:\s*['"]?([^'":\n]+)['"]?\s*\n\s*name:\s*['"]?([^'":\n]+)['"]?/g;
    let match;

    while ((match = kbItemRegex.exec(kbBlock)) !== null) {
      schema.memory.knowledgeBaseRef.push({
        id: match[1].trim(),
        name: match[2].trim(),
        platform: 'dify'
      });
    }
  }
}

function parseDifyTools(text, schema) {
  // MCP 工具
  const mcpMatch = text.match(/mcp_servers:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);
  if (mcpMatch) {
    const mcpBlock = mcpMatch[1];
    const mcpItemRegex = /-\s*(?:name|id):\s*['"]?([^'":\n]+)['"]?\s*\n([\s\S]*?)(?=\n\s*-\s*|\n[a-zA-Z_]|\n\n|$)/g;
    let match;

    while ((match = mcpItemRegex.exec(mcpBlock)) !== null) {
      const name = match[1].trim();
      const configBlock = match[2];

      const mcp = UATCore.createEmptyMCPServer();
      mcp.id = name;
      mcp.name = name;
      mcp.url = extractYAMLValueFromBlock(configBlock, 'url') || '';
      mcp.config.command = extractYAMLValueFromBlock(configBlock, 'command') || '';

      schema.tools.mcpServers.push(mcp);
    }
  }

  // API 工具
  const apiMatch = text.match(/api_tools:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n\n|$)/);
  if (apiMatch) {
    const apiBlock = apiMatch[1];
    const apiItemRegex = /-\s*id:\s*['"]?([^'":\n]+)['"]?\s*\n([\s\S]*?)(?=\n\s*-\s*|\n[a-zA-Z_]|\n\n|$)/g;
    let match;

    while ((match = apiItemRegex.exec(apiBlock)) !== null) {
      const id = match[1].trim();
      const configBlock = match[2];

      const api = UATCore.createEmptyAPIEndpoint();
      api.id = id;
      api.name = extractYAMLValueFromBlock(configBlock, 'name') || id;
      api.method = extractYAMLValueFromBlock(configBlock, 'method') || 'POST';
      api.url = extractYAMLValueFromBlock(configBlock, 'url') || '';

      schema.tools.apiEndpoints.push(api);
    }
  }
}

function mapDifyNodeType(difyType) {
  const typeMap = {
    'start': 'prompt',
    'end': 'end',
    'llm': 'prompt',
    'knowledge-retrieval': 'api',
    'http-request': 'api',
    'if-else': 'condition',
    'question-classifier': 'condition',
    'iteration': 'loop',
    'parallel': 'parallel',
    'variable-aggregator': 'function',
    'variable-setter': 'function',
    'template-transform': 'function',
    'code': 'function'
  };
  return typeMap[difyType] || 'prompt';
}

function extractNodeContent(nodeBody, nodeType) {
  if (nodeType === 'llm' || nodeType === 'start') {
    return extractYAMLValueFromBlock(nodeBody, 'prompt_template') || '';
  }
  if (nodeType === 'http-request') {
    const url = extractYAMLValueFromBlock(nodeBody, 'url') || '';
    const method = extractYAMLValueFromBlock(nodeBody, 'method') || 'POST';
    return JSON.stringify({ url, method });
  }
  return '';
}

// ============================================
// 解析器2：FastGPT JSON 解析器（增强版）
// ============================================

function parseFastGPTEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'fastgpt';

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    schema.identity.systemPrompt = text;
    return;
  }

  // 应用配置
  if (data.appConfig) {
    schema.meta.name = data.appConfig.name || 'FastGPT Agent';
    schema.meta.description = data.appConfig.intro || '';
  }

  // 对话配置
  if (data.chatConfig) {
    schema.identity.systemPrompt = data.chatConfig.systemPrompt || '';
    schema.identity.role = data.chatConfig.role || 'assistant';
  }

  // 模型配置
  if (data.modelConfig) {
    schema.modelConfig.model = data.modelConfig.model || 'gpt-4';
    schema.modelConfig.temperature = data.modelConfig.temperature || 0.7;
    schema.modelConfig.maxTokens = data.modelConfig.maxTokens || 4096;
    schema.modelConfig.topP = data.modelConfig.topP || 1;

    if (data.modelConfig.frequencyPenalty) {
      schema.modelConfig.advanced.frequencyPenalty = data.modelConfig.frequencyPenalty;
    }
    if (data.modelConfig.presencePenalty) {
      schema.modelConfig.advanced.presencePenalty = data.modelConfig.presencePenalty;
    }
  }

  // 工作流节点
  if (data.workflow?.nodes) {
    parseFastGPTWorkflowNodes(data.workflow, schema);
  }

  // 知识库引用
  if (data.datasets) {
    for (const ds of data.datasets) {
      schema.memory.knowledgeBaseRef.push({
        id: ds.id || '',
        name: ds.name || 'Dataset',
        platform: 'fastgpt'
      });
    }
  }

  // 插件工具
  if (data.plugins) {
    for (const plugin of data.plugins) {
      const api = UATCore.createEmptyAPIEndpoint();
      api.id = plugin.id || UATCore.generateUUID();
      api.name = plugin.name || '';
      api.method = plugin.method || 'POST';
      api.url = plugin.url || '';
      api.headers = plugin.headers || {};

      if (plugin.authType) {
        api.auth.type = plugin.authType;
      }

      schema.tools.apiEndpoints.push(api);
    }
  }
}

function parseFastGPTWorkflowNodes(workflow, schema) {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  // 构建边映射
  const edgeMap = {};
  for (const edge of edges) {
    const source = edge.source;
    if (!edgeMap[source]) edgeMap[source] = [];
    edgeMap[source].push({
      target: edge.target,
      conditionType: edge.conditionType
    });
  }

  for (const node of nodes) {
    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = node.nodeId || node.id;
    step.name = node.name || node.nodeName || '';
    step.type = mapFastGPTNodeType(node.type);
    step.content = node.inputs?.prompt || node.inputs?.text || '';

    // 条件节点
    if (node.type === 'ifElseNode' && node.inputs?.conditions) {
      for (const cond of node.inputs.conditions) {
        step.conditions.push({
          variable: cond.variable || '',
          operator: cond.operator || 'equals',
          value: cond.value || '',
          targetStepId: cond.targetNodeId || '',
          priority: 0
        });
      }
    }

    // 循环节点
    if (node.type === 'loopNode' && node.inputs) {
      step.loopConfig = {
        iterateOver: node.inputs.array || '',
        variableName: node.inputs.itemName || 'item',
        maxIterations: node.inputs.maxIterations || 100,
        breakCondition: node.inputs.breakCondition || ''
      };
    }

    // API节点
    if (node.type === 'httpRequest468' || node.inputs?.url) {
      step.type = 'api';
      step.content = JSON.stringify({
        url: node.inputs?.url || '',
        method: node.inputs?.method || 'POST',
        headers: node.inputs?.headers || {},
        body: node.inputs?.body || {}
      });
    }

    // 连接
    if (edgeMap[step.stepId]) {
      const firstEdge = edgeMap[step.stepId][0];
      step.nextStepId = firstEdge.target;
    }

    schema.workflow.steps.push(step);
  }
}

function mapFastGPTNodeType(type) {
  const typeMap = {
    'userGuide': 'prompt',
    'questionInput': 'prompt',
    'chatNode': 'prompt',
    'datasetSearchNode': 'api',
    'httpRequest468': 'api',
    'ifElseNode': 'condition',
    'loopNode': 'loop',
    'variableUpdateNode': 'function',
    'answerNode': 'end',
    'pluginInput': 'api'
  };
  return typeMap[type] || 'prompt';
}

// ============================================
// 解析器3：Flowise JSON 解析器（增强版）
// ============================================

function parseFlowiseEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'flowise';

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    schema.identity.systemPrompt = text;
    return;
  }

  schema.meta.name = data.name || data.flowName || 'Flowise Flow';
  schema.meta.description = data.description || '';

  if (!data.nodes) return;

  // 解析节点
  for (const node of data.nodes) {
    const nodeData = node.data || {};

    // AI节点提取系统提示词和模型配置
    if (node.type === 'ChatOpenAI' || node.type === 'LLMChain') {
      if (!schema.identity.systemPrompt) {
        schema.identity.systemPrompt = nodeData.systemPrompt || '';
      }

      schema.modelConfig.model = nodeData.modelName || nodeData.model || 'gpt-4';
      schema.modelConfig.temperature = parseFloat(nodeData.temperature) || 0.7;
      schema.modelConfig.maxTokens = parseInt(nodeData.maxTokens) || 4096;
    }

    // 工作流步骤
    const step = UATCore.createEmptyWorkflowStep();
    step.stepId = node.id;
    step.name = nodeData.label || nodeData.name || '';
    step.type = mapFlowiseNodeType(node.type);
    step.content = '';

    // PromptTemplate节点
    if (node.type === 'PromptTemplate') {
      step.content = nodeData.template || '';

      // 提取变量
      if (nodeData.promptVariables) {
        for (const v of nodeData.promptVariables) {
          schema.identity.promptVariables.push({
            name: v.name || v,
            type: 'string',
            default: v.default || ''
          });
        }
      }
    }

    // 条件节点
    if (node.type === 'IfCondition') {
      step.conditions.push({
        variable: nodeData.variableName || '',
        operator: nodeData.conditionType || 'equals',
        value: nodeData.value || '',
        targetStepId: '',
        priority: 0
      });
    }

    // HTTP节点作为工具
    if (node.type === 'HTTPRequest') {
      const api = UATCore.createEmptyAPIEndpoint();
      api.id = node.id;
      api.name = nodeData.label || 'HTTP Request';
      api.method = nodeData.method || 'GET';
      api.url = nodeData.url || '';
      api.headers = nodeData.headers || {};

      schema.tools.apiEndpoints.push(api);

      step.type = 'api';
      step.content = JSON.stringify({ url: nodeData.url, method: nodeData.method });
    }

    schema.workflow.steps.push(step);
  }

  // 解析边
  if (data.edges) {
    for (const edge of data.edges) {
      const sourceStep = schema.workflow.steps.find(s => s.stepId === edge.source);
      if (sourceStep) {
        if (edge.sourceHandle) {
          // 条件分支
          if (edge.sourceHandle.includes('true') && sourceStep.conditions.length > 0) {
            sourceStep.conditions[0].targetStepId = edge.target;
          } else if (edge.sourceHandle.includes('false')) {
            sourceStep.conditions.push({
              variable: '',
              operator: 'false',
              value: '',
              targetStepId: edge.target,
              priority: -1
            });
          }
        } else {
          sourceStep.nextStepId = edge.target;
        }
      }
    }
  }
}

function mapFlowiseNodeType(type) {
  const typeMap = {
    'ChatOpenAI': 'prompt',
    'LLMChain': 'prompt',
    'ConversationChain': 'prompt',
    'PromptTemplate': 'prompt',
    'HTTPRequest': 'api',
    'IfCondition': 'condition',
    'Loop': 'loop',
    'Agent': 'prompt',
    'BufferMemory': 'function',
    'VectorStore': 'api'
  };
  return typeMap[type] || 'prompt';
}

// ============================================
// 解析器4：Claude Skill 解析器（增强版）
// ============================================

function parseClaudeSkillEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'claude';

  try {
    if (text.startsWith('---')) {
      const headerEnd = text.indexOf('---', 3);
      if (headerEnd > 0) {
        const yamlHeader = text.slice(3, headerEnd).trim();
        const bodyContent = text.slice(headerEnd + 3).trim();

        // 解析 YAML 头部
        schema.meta.name = extractYAMLValue(yamlHeader, 'name') || 'Claude Skill';
        schema.meta.description = extractYAMLValue(yamlHeader, 'description') || '';
        schema.modelConfig.model = extractYAMLValue(yamlHeader, 'model') || 'claude-3-opus';

        // 正文作为系统提示词
        schema.identity.systemPrompt = bodyContent;

        // 提取 Prompt 变量
        schema.identity.promptVariables = UATCore.extractPromptVariables(bodyContent);

        // 解析 MCP 配置
        parseClaudeMCPConfig(yamlHeader, schema);
      }
    } else {
      schema.identity.systemPrompt = text;
      schema.meta.name = 'Claude Skill';
    }

  } catch (error) {
    console.warn('Claude 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

function parseClaudeMCPConfig(yamlHeader, schema) {
  const mcpMatch = yamlHeader.match(/mcpServers:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]|\n---|$)/);
  if (!mcpMatch) return;

  const mcpBlock = mcpMatch[1];
  const lines = mcpBlock.split('\n');

  let currentServer = null;

  for (const line of lines) {
    // 服务器声明
    if (line.match(/^  -\s+[\w_-]+:/)) {
      if (currentServer) schema.tools.mcpServers.push(currentServer);

      const nameMatch = line.match(/^  -\s+([\w_-]+):/);
      const name = nameMatch[1];
      currentServer = UATCore.createEmptyMCPServer();
      currentServer.id = name;
      currentServer.name = name;
    }

    // 配置项
    if (currentServer && line.match(/^      \w+:/)) {
      const keyMatch = line.match(/^      (\w+):\s*['"]?([^'"]*)['"]?/);
      if (keyMatch) {
        const key = keyMatch[1];
        const value = keyMatch[2].trim();

        if (key === 'url') currentServer.url = value;
        if (key === 'command') currentServer.config.command = value;
        if (key === 'transport') currentServer.config.transport = value;

        if (key === 'args') {
          try {
            currentServer.config.args = JSON.parse(value || '[]');
          } catch(e) { currentServer.config.args = []; }
        }

        if (key === 'env') {
          try {
            currentServer.config.env = JSON.parse(value || '{}');
          } catch(e) { currentServer.config.env = {}; }
        }
      }
    }
  }

  if (currentServer) schema.tools.mcpServers.push(currentServer);
}

// ============================================
// 解析器5：OpenClaw Markdown 解析器（增强版）
// ============================================

function parseOpenClawEnhanced(text, schema) {
  schema.meta.sourcePlatform = 'openclaw';

  try {
    // Identity 块
    const identityMatch = text.match(/#?\s*Identity\s*\n([\s\S]*?)(?=\n#|\nSoul|\nSkill|\n\n|$)/i);
    if (identityMatch) {
      const identityBlock = identityMatch[1];
      schema.identity.role = extractMarkdownSection(identityBlock, 'Role');
      schema.identity.systemPrompt = extractMarkdownSection(identityBlock, 'System Prompt') ||
                                      extractMarkdownSection(identityBlock, 'Prompt') ||
                                      identityBlock.trim();

      // 提取名称
      const nameMatch = identityBlock.match(/Name:\s*['"]?([^'":\n]+)['"]?/i);
      if (nameMatch) schema.meta.name = nameMatch[1].trim();
    }

    // Soul 块（全局约束）
    const soulMatch = text.match(/#?\s*Soul\s*\n([\s\S]*?)(?=\n#|\nSkill|\n\n|$)/i);
    if (soulMatch) {
      const soulBlock = soulMatch[1];
      const constraints = soulBlock.split(/\n\n+/).filter(s => s.trim());
      schema.identity.constraints = constraints;
    }

    // Skill 块（工作流步骤）
    const skillMatch = text.match(/#?\s*Skill[s]?\s*\n([\s\S]*?)(?=\n#|\n\n|$)/i);
    if (skillMatch) {
      const skillBlock = skillMatch[1];
      const skills = skillBlock.split(/\n##\s+/).filter(s => s.trim());

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        const name = skill.split('\n')[0].trim();

        const step = UATCore.createEmptyWorkflowStep();
        step.stepId = `skill_${i}`;
        step.name = name;
        step.type = 'prompt';
        step.content = skill.trim();
        step.nextStepId = i < skills.length - 1 ? `skill_${i + 1}` : '';

        schema.workflow.steps.push(step);
      }
    }

    // Model 配置
    const modelMatch = text.match(/Model:\s*([a-zA-Z0-9_-]+)/i);
    if (modelMatch) schema.modelConfig.model = modelMatch[1];

    // Prompt 变量
    schema.identity.promptVariables = UATCore.extractPromptVariables(schema.identity.systemPrompt);

  } catch (error) {
    console.warn('OpenClaw 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

// ============================================
// 解析器6：通用纯文本解析器
// ============================================

function parsePlainText(text, schema) {
  schema.meta.sourcePlatform = 'plain';
  schema.identity.systemPrompt = text;
  schema.meta.name = 'Plain Text Agent';
  schema.meta.description = '从纯文本导入';

  schema.identity.promptVariables = UATCore.extractPromptVariables(text);
}

// ============================================
// 辅助函数
// ============================================

function extractYAMLValue(text, key, parentKey = null) {
  if (parentKey) {
    const parentMatch = text.match(new RegExp(`${parentKey}[\\s]*\\n([\\s\\S]*?)(?=\\n\\w+:|$)`));
    if (parentMatch) {
      return extractYAMLValueFromBlock(parentMatch[1], key);
    }
    return null;
  }

  const regex = new RegExp(`${key}:\\s*['"]?([^'":\\n]+)['"]?`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractYAMLValueFromBlock(block, key, parentKey = null) {
  if (parentKey) {
    const parentMatch = block.match(new RegExp(`${parentKey}[\\s]*\\n([\\s\\S]*?)(?=\\n\\s*\\w+:|$)`));
    if (parentMatch) {
      return extractYAMLValueFromBlock(parentMatch[1], key);
    }
    return null;
  }

  const regex = new RegExp(`(?:^|\\n)\\s*${key}:\\s*['"]?([^'":\\n]+)['"]?`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function extractDifySystemPrompt(text) {
  const promptMatch = text.match(/prompt_template:\s*['"]([^'"]+)['"]/i);
  if (promptMatch) return promptMatch[1];

  const sysMatch = text.match(/system_prompt:\s*['"]([^'"]+)['"]/i);
  if (sysMatch) return sysMatch[1];

  return '';
}

function extractMarkdownSection(text, heading) {
  const regex = new RegExp(`#?\\s*${heading}\\s*\\n([^\\n]+(?:\\n[^#\\n]+)*)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// ============================================
// 解析器7：Hermes YAML 解析器（新增）
// ============================================

function parseHermesYAML(text, schema) {
  schema.meta.sourcePlatform = 'hermes';

  try {
    // 提取版本
    const version = extractYAMLValue(text, 'hermes_version');

    // Agent 块
    const agentMatch = text.match(/agent:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (agentMatch) {
      const agentBlock = agentMatch[1];
      schema.meta.name = extractYAMLValueFromBlock(agentBlock, 'name') || 'Hermes Agent';
      schema.meta.description = extractYAMLValueFromBlock(agentBlock, 'description') || '';
      schema.identity.role = extractYAMLValueFromBlock(agentBlock, 'role') || 'assistant';
    }

    // Model 块
    const modelMatch = text.match(/model:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (modelMatch) {
      const modelBlock = modelMatch[1];
      schema.modelConfig.model = extractYAMLValueFromBlock(modelBlock, 'name') ||
                                  extractYAMLValueFromBlock(modelBlock, 'provider') || 'gpt-4';
      schema.modelConfig.temperature = parseFloat(extractYAMLValueFromBlock(modelBlock, 'temperature')) || 0.7;
      schema.modelConfig.maxTokens = parseInt(extractYAMLValueFromBlock(modelBlock, 'max_tokens')) || 4096;
    }

    // Prompt 块
    const promptMatch = text.match(/prompt:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (promptMatch) {
      const promptBlock = promptMatch[1];
      schema.identity.systemPrompt = extractYAMLValueFromBlock(promptBlock, 'system') || '';

      // 约束列表
      const constraintsMatch = promptBlock.match(/constraints:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (constraintsMatch) {
        const constraintLines = constraintsMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        for (const line of constraintLines) {
          const c = line.replace(/^-\s*/, '').trim();
          if (c) schema.identity.constraints.push(c);
        }
      }
    }

    // Tools 块：Functions
    const toolsMatch = text.match(/tools:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (toolsMatch) {
      const toolsBlock = toolsMatch[1];

      // Functions
      const functionsMatch = toolsBlock.match(/functions:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (functionsMatch) {
        parseHermesFunctions(functionsMatch[1], schema);
      }

      // MCP Servers
      const mcpMatch = toolsBlock.match(/mcp_servers:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
      if (mcpMatch) {
        parseHermesMCPServers(mcpMatch[1], schema);
      }
    }

    // Workflow 块
    const workflowMatch = text.match(/workflow:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (workflowMatch) {
      parseHermesWorkflow(workflowMatch[1], schema);
    }

    // Memory 块
    const memoryMatch = text.match(/memory:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
    if (memoryMatch) {
      const memoryBlock = memoryMatch[1];
      const memType = extractYAMLValueFromBlock(memoryBlock, 'type');
      if (memType === 'conversation') {
        schema.memory.sessionMemory.enabled = true;
        schema.memory.sessionMemory.maxMessages = parseInt(extractYAMLValueFromBlock(memoryBlock, 'max_history')) || 50;
      }
    }

  } catch (error) {
    console.warn('Hermes 解析警告:', error.message);
    schema.identity.systemPrompt = text;
    schema.meta.name = 'Hermes Agent';
  }
}

function parseHermesFunctions(block, schema) {
  const lines = block.split('\n');
  let currentFn = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s*name:/)) {
      if (currentFn) schema.tools.functions.push(currentFn);
      currentFn = {
        id: UATCore.generateUUID(),
        name: '',
        description: '',
        code: '',
        inputs: [],
        outputs: []
      };
      currentFn.name = line.replace(/^\s*-\s*name:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }

    if (currentFn && line.match(/^\s*description:/)) {
      currentFn.description = line.replace(/^\s*description:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }

    // Parameters 解析（简化）
    if (currentFn && line.match(/^\s*parameters:/)) {
      // 简化处理，不解析完整参数结构
    }
  }

  if (currentFn) schema.tools.functions.push(currentFn);
}

function parseHermesMCPServers(block, schema) {
  const lines = block.split('\n');
  let currentServer = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s*name:/)) {
      if (currentServer) schema.tools.mcpServers.push(currentServer);
      const name = line.replace(/^\s*-\s*name:\s*['"]?([^'"]+)['"]?/, '$1').trim();
      currentServer = UATCore.createEmptyMCPServer();
      currentServer.id = name;
      currentServer.name = name;
    }

    if (currentServer && line.match(/^\s*url:/)) {
      currentServer.url = line.replace(/^\s*url:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }
  }

  if (currentServer) schema.tools.mcpServers.push(currentServer);
}

function parseHermesWorkflow(block, schema) {
  const stepsMatch = block.match(/steps:\s*\n([\s\S]*?)(?=\n\s*\w+:|$)/);
  if (!stepsMatch) return;

  const stepsBlock = stepsMatch[1];
  const lines = stepsBlock.split('\n');

  let currentStep = null;
  let prevStepId = '';

  for (const line of lines) {
    if (line.match(/^\s*-\s*id:/)) {
      if (currentStep) {
        if (prevStepId) {
          // 连接上一个步骤
          const prevStep = schema.workflow.steps.find(s => s.stepId === prevStepId);
          if (prevStep) prevStep.nextStepId = currentStep.stepId;
        }
        schema.workflow.steps.push(currentStep);
        prevStepId = currentStep.stepId;
      }

      currentStep = UATCore.createEmptyWorkflowStep();
      currentStep.stepId = line.replace(/^\s*-\s*id:\s*['"]?([^'"]+)['"]?/, '$1').trim();
    }

    if (currentStep) {
      if (line.match(/^\s*type:/)) {
        currentStep.type = mapHermesStepType(line.replace(/^\s*type:\s*['"]?([^'"]+)['"]?/, '$1').trim());
      }
      if (line.match(/^\s*action:/)) {
        currentStep.content = line.replace(/^\s*action:\s*['"]?([^'"]+)['"]?/, '$1').trim();
      }
      if (line.match(/^\s*tool:/)) {
        const toolName = line.replace(/^\s*tool:\s*['"]?([^'"]+)['"]?/, '$1').trim();
        currentStep.type = 'api';
        currentStep.content = `Use tool: ${toolName}`;
      }
    }
  }

  if (currentStep) schema.workflow.steps.push(currentStep);
}

function mapHermesStepType(hermesType) {
  const typeMap = {
    'prompt': 'prompt',
    'tool': 'api',
    'condition': 'condition',
    'loop': 'loop',
    'end': 'end'
  };
  return typeMap[hermesType] || 'prompt';
}

// ============================================
// 解析器8：Cursor Rules 解析器（新增）
// ============================================

function parseCursorRules(text, schema) {
  schema.meta.sourcePlatform = 'cursor';
  schema.meta.name = 'Cursor Rules Agent';

  // 纯文本作为系统提示词
  schema.identity.systemPrompt = text;

  // 提取规则分类
  const sections = text.split(/^#\s+/m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    if (title && content) {
      // 提取规则项
      const rules = content.match(/^-\s+.+/gm) || [];
      for (const rule of rules) {
        schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
      }
    }
  }

  // 提取 Prompt 变量
  schema.identity.promptVariables = UATCore.extractPromptVariables(text);
}

// ============================================
// 解析器9：Windsurf Rules 解析器（新增）
// ============================================

function parseWindsurfRules(text, schema) {
  schema.meta.sourcePlatform = 'windsurf';
  schema.meta.name = 'Windsurf Rules Agent';

  // 与 Cursor 类似
  schema.identity.systemPrompt = text;

  // 提取规则
  const rules = text.match(/^-\s+.+/gm) || [];
  for (const rule of rules) {
    schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
  }

  // 提取标题作为分类
  const headings = text.match(/^##\s+.+/gm) || [];
  for (const h of headings) {
    const category = h.replace(/^##\s*/, '').trim();
    schema.identity.constraints.push(`Category: ${category}`);
  }
}

// ============================================
// 解析器10：GitHub Copilot 解析器（新增）
// ============================================

function parseCopilotInstructions(text, schema) {
  schema.meta.sourcePlatform = 'copilot';
  schema.meta.name = 'Copilot Instructions Agent';

  // Markdown 格式
  schema.identity.systemPrompt = text;

  // 提取 Markdown 标题作为分类
  const headings = text.match(/^##\s+.+/gm) || [];
  for (const h of headings) {
    const category = h.replace(/^##\s*/, '').trim();
    schema.identity.constraints.push(`Section: ${category}`);
  }

  // 提取规则项
  const rules = text.match(/^-\s+.+/gm) || [];
  for (const rule of rules) {
    schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
  }
}

// ============================================
// 解析器11：Codex CLI 解析器（新增）
// ============================================

function parseCodexAgents(text, schema) {
  schema.meta.sourcePlatform = 'codex';

  try {
    if (text.startsWith('---')) {
      const headerEnd = text.indexOf('---', 3);
      if (headerEnd > 0) {
        const yamlHeader = text.slice(3, headerEnd).trim();
        const bodyContent = text.slice(headerEnd + 3).trim();

        schema.meta.name = extractYAMLValue(yamlHeader, 'name') || 'Codex Agent';
        schema.meta.description = extractYAMLValue(yamlHeader, 'description') || '';
        schema.identity.systemPrompt = bodyContent;

        // 简化工具声明
        const toolsMatch = yamlHeader.match(/tools:\s*\n([\s\S]*?)(?=\n\w+:|$)/);
        if (toolsMatch) {
          const toolLines = toolsMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
          for (const line of toolLines) {
            const toolName = line.replace(/^-\s*/, '').trim();
            schema.tools.functions.push({
              id: toolName,
              name: toolName,
              description: `Built-in ${toolName} capability`,
              code: '',
              inputs: [],
              outputs: []
            });
          }
        }
      }
    } else {
      schema.identity.systemPrompt = text;
      schema.meta.name = 'Codex Agent';
    }
  } catch (error) {
    console.warn('Codex 解析警告:', error.message);
    schema.identity.systemPrompt = text;
  }
}

// ============================================
// 解析器12：Zed Editor 解析器（新增）
// ============================================

function parseZedRules(text, schema) {
  schema.meta.sourcePlatform = 'zed';
  schema.meta.name = 'Zed Rules Agent';

  // Markdown 格式
  schema.identity.systemPrompt = text;

  // 提取规则
  const rules = text.match(/^-\s+.+/gm) || [];
  for (const rule of rules) {
    schema.identity.constraints.push(rule.replace(/^-\s*/, '').trim());
  }
}

// ============================================
// 导出模块接口（更新）
// ============================================

window.UATParser = {
  runParserPool,
  parseDifyDSLEnhanced,
  parseFastGPTEnhanced,
  parseFlowiseEnhanced,
  parseClaudeSkillEnhanced,
  parseOpenClawEnhanced,
  parseHermesYAML,
  parseCursorRules,
  parseWindsurfRules,
  parseCopilotInstructions,
  parseCodexAgents,
  parseZedRules,
  parsePlainText
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATParser;
}