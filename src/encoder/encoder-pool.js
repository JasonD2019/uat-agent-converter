/**
 * UAT 多平台编码器集群 v2.0 - Encoder Pool Enhanced
 * 模块6：UAT-Schema v2.0 → 各平台原生格式完整编码
 */

// ============================================
// 编码器统一调度器
// ============================================

function runEncoderPool(schema, targetPlatform) {
  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('Schema 结构不合法');
  }

  let output = '';

  switch (targetPlatform) {
    case 'dify':
      output = encodeDifyYAMLEnhanced(schema);
      break;
    case 'openclaw':
      output = encodeOpenClawEnhanced(schema);
      break;
    case 'claude':
      output = encodeClaudeSkillEnhanced(schema);
      break;
    case 'fastgpt':
      output = encodeFastGPTEnhanced(schema);
      break;
    case 'flowise':
      output = encodeFlowiseEnhanced(schema);
      break;
    // 新增平台
    case 'hermes':
      output = encodeHermesYAML(schema);
      break;
    case 'cursor':
      output = encodeCursorRules(schema);
      break;
    case 'windsurf':
      output = encodeWindsurfRules(schema);
      break;
    case 'copilot':
      output = encodeCopilotInstructions(schema);
      break;
    case 'codex':
      output = encodeCodexAgents(schema);
      break;
    case 'zed':
      output = encodeZedRules(schema);
      break;
    default:
      output = encodePlainTextEnhanced(schema);
  }

  // 添加知识库提示（如果有引用）
  output = addKnowledgeBaseNote(output, schema);

  return output;
}

// ============================================
// 编码器1：Dify YAML DSL 编码器（增强版）
// ============================================

function encodeDifyYAMLEnhanced(schema) {
  const lines = [];

  // 头部
  lines.push('dify_version: "0.1"');
  lines.push('');

  // 应用信息
  lines.push('app:');
  lines.push(`  name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  lines.push(`  description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  lines.push('  mode: "workflow"');
  lines.push('');

  // 模型配置
  lines.push('model:');
  lines.push(`  provider: openai`);
  lines.push(`  name: "${schema.modelConfig.model}"`);
  lines.push(`  temperature: ${schema.modelConfig.temperature}`);
  lines.push(`  max_tokens: ${schema.modelConfig.maxTokens}`);
  if (schema.modelConfig.topP !== 1) {
    lines.push(`  top_p: ${schema.modelConfig.topP}`);
  }
  lines.push('');

  // 工作流
  lines.push('workflow:');
  lines.push('  graph:');
  lines.push('    nodes:');

  // Start节点
  lines.push('      - id: "start_node"');
  lines.push('        type: "start"');
  lines.push('        data:');
  lines.push(`          title: "开始"`);
  if (schema.identity.systemPrompt) {
    lines.push(`          prompt_template: "${UATCore.escapeYAMLString(schema.identity.systemPrompt)}"`);
  }
  lines.push('');

  // 工作流步骤
  for (const step of schema.workflow.steps) {
    encodeDifyWorkflowStep(lines, step, schema);
  }

  // End节点
  lines.push('      - id: "end_node"');
  lines.push('        type: "end"');
  lines.push('        data:');
  lines.push(`          title: "结束"`);
  lines.push('');

  // 边
  lines.push('    edges:');

  // Start到第一个节点
  if (schema.workflow.steps.length > 0) {
    lines.push('      - source: "start_node"');
    lines.push(`        target: "${schema.workflow.steps[0].stepId}"`);
  } else {
    lines.push('      - source: "start_node"');
    lines.push('        target: "end_node"');
  }

  // 步骤连接
  for (const step of schema.workflow.steps) {
    if (step.nextStepId) {
      lines.push(`      - source: "${step.stepId}"`);
      lines.push(`        target: "${step.nextStepId}"`);
    }

    // 条件分支边
    for (const cond of step.conditions) {
      if (cond.targetStepId && cond.operator !== 'default') {
        lines.push(`      - source: "${step.stepId}"`);
        lines.push(`        source_handle: "${cond.operator === 'false' ? 'false' : 'true'}"`);
        lines.push(`        target: "${cond.targetStepId}"`);
      }
    }
  }
  lines.push('');

  // 知识库引用
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    lines.push('knowledge_bases:');
    for (const kb of schema.memory.knowledgeBaseRef) {
      lines.push(`  - id: "${kb.id}"`);
      lines.push(`    name: "${UATCore.escapeYAMLString(kb.name)}"`);
    }
    lines.push('');
  }

  // MCP工具
  if (schema.tools.mcpServers?.length > 0) {
    lines.push('mcp_servers:');
    for (const mcp of schema.tools.mcpServers) {
      lines.push(`  - name: "${UATCore.escapeYAMLString(mcp.name)}"`);
      if (mcp.url) lines.push(`    url: "${mcp.url}"`);
      if (mcp.config?.command) lines.push(`    command: "${mcp.config.command}"`);
      if (mcp.config?.args?.length > 0) {
        lines.push(`    args: [${mcp.config.args.map(a => `"${a}"`).join(', ')}]`);
      }
    }
    lines.push('');
  }

  // API工具
  if (schema.tools.apiEndpoints?.length > 0) {
    lines.push('api_tools:');
    for (const api of schema.tools.apiEndpoints) {
      lines.push(`  - id: "${api.id}"`);
      lines.push(`    name: "${UATCore.escapeYAMLString(api.name)}"`);
      lines.push(`    method: "${api.method}"`);
      lines.push(`    url: "${api.url}"`);

      if (api.headers && Object.keys(api.headers).length > 0) {
        lines.push('    headers:');
        for (const [k, v] of Object.entries(api.headers)) {
          lines.push(`      ${k}: "${v}"`);
        }
      }

      if (api.auth?.type !== 'none') {
        lines.push(`    auth_type: "${api.auth.type}"`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function encodeDifyWorkflowStep(lines, step, schema) {
  lines.push(`      - id: "${step.stepId}"`);
  lines.push(`        type: "${mapStepToDifyType(step.type)}"`);
  lines.push('        data:');
  lines.push(`          title: "${UATCore.escapeYAMLString(step.name)}"`);

  // Prompt节点
  if (step.type === 'prompt' && step.content) {
    lines.push('          model:');
    lines.push(`            name: "${schema.modelConfig.model}"`);
    lines.push(`            temperature: ${schema.modelConfig.temperature}`);
    lines.push(`          prompt_template: "${UATCore.escapeYAMLString(step.content)}"`);
  }

  // 条件节点
  if (step.type === 'condition' && step.conditions?.length > 0) {
    lines.push('          conditions:');
    for (const cond of step.conditions) {
      if (cond.operator !== 'default' && cond.operator !== 'false') {
        lines.push(`            - variable: "${cond.variable}"`);
        lines.push(`              operator: "${cond.operator}"`);
        lines.push(`              value: "${UATCore.escapeYAMLString(cond.value)}"`);
      }
    }

    // 默认分支
    const defaultCond = step.conditions.find(c => c.operator === 'default' || c.priority < 0);
    if (defaultCond) {
      lines.push(`          default_target_node: "${defaultCond.targetStepId}"`);
    }
  }

  // 循环节点
  if (step.type === 'loop' && step.loopConfig) {
    lines.push(`          iter_variable: "${step.loopConfig.iterateOver}"`);
    lines.push(`          item_variable: "${step.loopConfig.variableName}"`);
    lines.push(`          max_iterations: ${step.loopConfig.maxIterations}`);
    if (step.loopConfig.breakCondition) {
      lines.push(`          break_condition: "${UATCore.escapeYAMLString(step.loopConfig.breakCondition)}"`);
    }
  }

  // API节点
  if (step.type === 'api' && step.content) {
    try {
      const apiConfig = JSON.parse(step.content);
      lines.push(`          url: "${apiConfig.url}"`);
      lines.push(`          method: "${apiConfig.method || 'POST'}"`);
      if (apiConfig.headers) {
        lines.push('          headers:');
        for (const [k, v] of Object.entries(apiConfig.headers)) {
          lines.push(`            ${k}: "${v}"`);
        }
      }
    } catch(e) {
      lines.push(`          url: ""`);
    }
  }

  // 错误处理
  if (step.onError?.action) {
    lines.push('          error_handling:');
    lines.push(`            action: "${step.onError.action}"`);
    if (step.onError.retryCount > 0) {
      lines.push(`            retry_count: ${step.onError.retryCount}`);
    }
  }

  lines.push('');
}

function mapStepToDifyType(stepType) {
  const typeMap = {
    'prompt': 'llm',
    'condition': 'if-else',
    'loop': 'iteration',
    'parallel': 'parallel',
    'api': 'http-request',
    'function': 'variable-setter',
    'end': 'end'
  };
  return typeMap[stepType] || 'llm';
}

// ============================================
// 编码器2：FastGPT JSON 编码器（增强版）
// ============================================

function encodeFastGPTEnhanced(schema) {
  const data = {
    version: "1.0",
    appConfig: {
      name: schema.meta.name,
      intro: schema.meta.description,
      type: schema.workflow.steps.length > 0 ? "workflow" : "chat",
      modules: []
    },
    chatConfig: {
      systemPrompt: schema.identity.systemPrompt,
      role: schema.identity.role || "assistant"
    },
    modelConfig: {
      model: schema.modelConfig.model,
      temperature: schema.modelConfig.temperature,
      maxTokens: schema.modelConfig.maxTokens,
      topP: schema.modelConfig.topP,
      frequencyPenalty: schema.modelConfig.advanced?.frequencyPenalty || 0,
      presencePenalty: schema.modelConfig.advanced?.presencePenalty || 0
    },
    workflow: {
      nodes: [],
      edges: []
    },
    datasets: [],
    plugins: []
  };

  // 工作流节点
  for (const step of schema.workflow.steps) {
    const node = {
      nodeId: step.stepId,
      name: step.name,
      type: mapStepToFastGPTType(step.type),
      inputs: {},
      outputs: []
    };

    if (step.type === 'prompt') {
      node.inputs = {
        prompt: step.content,
        model: schema.modelConfig.model,
        temperature: schema.modelConfig.temperature
      };
    }

    if (step.type === 'condition') {
      node.type = 'ifElseNode';
      node.inputs = {
        conditions: step.conditions.map(c => ({
          variable: c.variable,
          operator: c.operator,
          value: c.value,
          targetNodeId: c.targetStepId
        }))
      };
    }

    if (step.type === 'loop') {
      node.type = 'loopNode';
      node.inputs = {
        array: step.loopConfig?.iterateOver || '',
        itemName: step.loopConfig?.variableName || 'item',
        maxIterations: step.loopConfig?.maxIterations || 100
      };
    }

    if (step.type === 'api') {
      node.type = 'httpRequest468';
      try {
        const apiConfig = JSON.parse(step.content || '{}');
        node.inputs = {
          url: apiConfig.url || '',
          method: apiConfig.method || 'POST',
          headers: apiConfig.headers || {},
          body: apiConfig.body || {}
        };
      } catch(e) {
        node.inputs = { url: '', method: 'POST' };
      }
    }

    if (step.onError?.action) {
      node.inputs.errorAction = step.onError.action;
    }

    data.workflow.nodes.push(node);
  }

  // 边
  for (const step of schema.workflow.steps) {
    if (step.nextStepId) {
      data.workflow.edges.push({
        source: step.stepId,
        target: step.nextStepId
      });
    }

    for (const cond of step.conditions) {
      if (cond.targetStepId) {
        data.workflow.edges.push({
          source: step.stepId,
          target: cond.targetStepId,
          conditionType: cond.operator
        });
      }
    }
  }

  // 知识库引用
  for (const kb of schema.memory.knowledgeBaseRef) {
    data.datasets.push({
      id: kb.id,
      name: kb.name
    });
  }

  // API工具
  for (const api of schema.tools.apiEndpoints) {
    data.plugins.push({
      id: api.id,
      name: api.name,
      method: api.method,
      url: api.url,
      headers: api.headers,
      authType: api.auth?.type || 'none',
      retryCount: api.errorHandling?.retryCount || 3
    });
  }

  return JSON.stringify(data, null, 2);
}

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

// ============================================
// 编码器3：Flowise JSON 编码器（增强版）
// ============================================

function encodeFlowiseEnhanced(schema) {
  const data = {
    id: UATCore.generateUUID(),
    name: schema.meta.name,
    description: schema.meta.description,
    nodes: [],
    edges: []
  };

  // 主AI节点
  const mainNodeId = UATCore.generateUUID();
  data.nodes.push({
    id: mainNodeId,
    type: "ChatOpenAI",
    position: { x: 100, y: 100 },
    data: {
      label: "AI Assistant",
      systemPrompt: schema.identity.systemPrompt,
      modelName: schema.modelConfig.model,
      temperature: schema.modelConfig.temperature,
      maxTokens: schema.modelConfig.maxTokens
    }
  });

  // 工作流步骤
  let prevNodeId = mainNodeId;
  let x = 100;

  for (const step of schema.workflow.steps) {
    const nodeId = step.stepId || UATCore.generateUUID();
    x += 250;

    const node = {
      id: nodeId,
      type: mapStepToFlowiseType(step.type),
      position: { x, y: 100 },
      data: {
        label: step.name
      }
    };

    if (step.type === 'prompt' && step.content) {
      node.type = 'PromptTemplate';
      node.data.template = step.content;
    }

    if (step.type === 'condition') {
      node.type = 'IfCondition';
      node.data.variableName = step.conditions[0]?.variable || '';
      node.data.conditionType = step.conditions[0]?.operator || 'equals';
      node.data.value = step.conditions[0]?.value || '';
    }

    if (step.type === 'api') {
      node.type = 'HTTPRequest';
      try {
        const apiConfig = JSON.parse(step.content || '{}');
        node.data.url = apiConfig.url;
        node.data.method = apiConfig.method || 'GET';
        node.data.headers = apiConfig.headers;
      } catch(e) {}
    }

    data.nodes.push(node);

    // 边
    data.edges.push({
      id: UATCore.generateUUID(),
      source: prevNodeId,
      target: nodeId,
      sourceHandle: "output",
      targetHandle: "input"
    });

    prevNodeId = nodeId;
  }

  // API工具节点
  let y = 200;
  for (const api of schema.tools.apiEndpoints) {
    const apiNodeId = api.id || UATCore.generateUUID();

    data.nodes.push({
      id: apiNodeId,
      type: "HTTPRequest",
      position: { x: 100, y },
      data: {
        label: api.name,
        method: api.method,
        url: api.url,
        headers: api.headers
      }
    });

    y += 100;
  }

  return JSON.stringify(data, null, 2);
}

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

// ============================================
// 编码器4：Claude Skill 编码器（增强版）
// ============================================

function encodeClaudeSkillEnhanced(schema) {
  const sections = [];

  // YAML头部
  sections.push('---');
  sections.push(`name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  sections.push(`description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  sections.push(`model: "${schema.modelConfig.model}"`);

  // MCP工具
  if (schema.tools.mcpServers?.length > 0) {
    sections.push('mcpServers:');
    for (const mcp of schema.tools.mcpServers) {
      sections.push(`  - ${mcp.id}:`);
      if (mcp.url) sections.push(`      url: "${mcp.url}"`);
      if (mcp.config?.command) sections.push(`      command: "${mcp.config.command}"`);
      if (mcp.config?.args?.length > 0) {
        sections.push(`      args: [${mcp.config.args.map(a => `"${a}"`).join(', ')}]`);
      }
      if (mcp.config?.env && Object.keys(mcp.config.env).length > 0) {
        sections.push('      env:');
        for (const [k, v] of Object.entries(mcp.config.env)) {
          sections.push(`        ${k}: "${v}"`);
        }
      }
      if (mcp.config?.transport) {
        sections.push(`      transport: "${mcp.config.transport}"`);
      }
    }
  }

  sections.push('---');
  sections.push('');

  // 指令正文
  sections.push('# Instructions');
  sections.push('');
  sections.push(schema.identity.systemPrompt);
  sections.push('');

  // Prompt变量
  if (schema.identity.promptVariables?.length > 0) {
    sections.push('## Variables');
    sections.push('');
    for (const v of schema.identity.promptVariables) {
      sections.push(`- {{${v.name}}}: ${v.type}${v.default ? ` (default: ${v.default})` : ''}`);
    }
    sections.push('');
  }

  // 工作流
  if (schema.workflow.steps?.length > 0) {
    sections.push('# Workflow');
    sections.push('');

    for (const step of schema.workflow.steps) {
      sections.push(`## ${step.name}`);
      sections.push('');
      sections.push(`Type: ${step.type}`);
      sections.push(`ID: ${step.stepId}`);
      sections.push('');

      if (step.content) {
        sections.push(step.content);
        sections.push('');
      }

      if (step.type === 'condition' && step.conditions?.length > 0) {
        sections.push('**Conditions:**');
        for (const cond of step.conditions) {
          if (cond.operator !== 'default') {
            sections.push(`- If ${cond.variable} ${cond.operator} "${cond.value}" → ${cond.targetStepId}`);
          }
        }
        sections.push('');
      }

      if (step.type === 'loop' && step.loopConfig?.iterateOver) {
        sections.push('**Loop Configuration:**');
        sections.push(`- Iterate: ${step.loopConfig.iterateOver}`);
        sections.push(`- Variable: ${step.loopConfig.variableName}`);
        sections.push(`- Max: ${step.loopConfig.maxIterations}`);
        sections.push('');
      }
    }
  }

  return sections.join('\n');
}

// ============================================
// 编码器5：OpenClaw Markdown 编码器（增强版）
// ============================================

function encodeOpenClawEnhanced(schema) {
  const sections = [];

  // Identity块
  sections.push('# Identity');
  sections.push('');
  sections.push(`Name: ${schema.meta.name}`);
  sections.push('');

  if (schema.identity.role) {
    sections.push(`Role: ${schema.identity.role}`);
    sections.push('');
  }

  sections.push('## System Prompt');
  sections.push('');
  sections.push(schema.identity.systemPrompt);
  sections.push('');

  // Prompt变量
  if (schema.identity.promptVariables?.length > 0) {
    sections.push('## Variables');
    sections.push('');
    for (const v of schema.identity.promptVariables) {
      sections.push(`- {{${v.name}}}: ${v.default || 'empty'}`);
    }
    sections.push('');
  }

  // Soul块（约束）
  sections.push('# Soul');
  sections.push('');
  if (schema.identity.constraints?.length > 0) {
    for (const constraint of schema.identity.constraints) {
      sections.push(constraint);
      sections.push('');
    }
  }
  if (schema.identity.outputRules?.length > 0) {
    sections.push('## Output Rules');
    sections.push('');
    for (const rule of schema.identity.outputRules) {
      sections.push(`- ${rule}`);
    }
    sections.push('');
  }

  // Skills块（工作流）
  sections.push('# Skills');
  sections.push('');
  if (schema.workflow.steps?.length > 0) {
    for (const step of schema.workflow.steps) {
      sections.push(`## ${step.name}`);
      sections.push('');
      sections.push(`Type: ${step.type}`);
      sections.push('');

      if (step.content) {
        sections.push(step.content);
        sections.push('');
      }

      // 条件
      if (step.type === 'condition' && step.conditions?.length > 0) {
        sections.push('Conditions:');
        for (const cond of step.conditions) {
          sections.push(`- ${cond.variable} ${cond.operator} "${cond.value}" → ${cond.targetStepId}`);
        }
        sections.push('');
      }

      // 循环
      if (step.type === 'loop' && step.loopConfig?.iterateOver) {
        sections.push(`Loop: ${step.loopConfig.iterateOver} as ${step.loopConfig.variableName}`);
        sections.push('');
      }
    }
  } else {
    sections.push('[No skills defined]');
    sections.push('');
  }

  // Model配置
  sections.push('# Model');
  sections.push('');
  sections.push(`model: ${schema.modelConfig.model}`);
  sections.push(`temperature: ${schema.modelConfig.temperature}`);
  sections.push(`max_tokens: ${schema.modelConfig.maxTokens}`);
  sections.push('');

  // 工具
  if (schema.tools.mcpServers?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    sections.push('# Tools');
    sections.push('');

    for (const mcp of schema.tools.mcpServers) {
      sections.push(`## MCP: ${mcp.name}`);
      sections.push(`- ID: ${mcp.id}`);
      if (mcp.url) sections.push(`- URL: ${mcp.url}`);
      sections.push('');
    }

    for (const api of schema.tools.apiEndpoints) {
      sections.push(`## API: ${api.name}`);
      sections.push(`- Method: ${api.method}`);
      sections.push(`- URL: ${api.url}`);
      sections.push('');
    }
  }

  return sections.join('\n');
}

// ============================================
// 编码器6：纯文本编码器（增强版）
// ============================================

function encodePlainTextEnhanced(schema) {
  let output = '';

  if (schema.meta.name) {
    output += `# ${schema.meta.name}\n\n`;
  }

  if (schema.meta.description) {
    output += `${schema.meta.description}\n\n`;
  }

  output += schema.identity.systemPrompt || '';

  return output;
}

// ============================================
// 辅助函数：添加知识库提示
// ============================================

function addKnowledgeBaseNote(output, schema) {
  if (schema.memory.knowledgeBaseRef?.length > 0) {
    const noteLines = [
      '',
      '',
      '# ========== 知识库配置提示 ==========',
      '# 以下知识库引用需在目标平台重新配置:',
    ];

    for (const kb of schema.memory.knowledgeBaseRef) {
      noteLines.push(`# - ${kb.name} (原ID: ${kb.id}, 来源: ${kb.platform || 'unknown'})`);
    }

    noteLines.push('# ==========================================');

    return output + noteLines.join('\n');
  }

  return output;
}

// ============================================
// 编码器7：Hermes YAML 编码器（新增）
// ============================================

function encodeHermesYAML(schema) {
  const lines = [];

  // 版本头部
  lines.push('hermes_version: "1.0"');
  lines.push('');

  // Agent 块
  lines.push('agent:');
  lines.push(`  name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  lines.push(`  description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  lines.push(`  role: "${schema.identity.role || 'assistant'}"`);
  lines.push('');

  // Model 块
  lines.push('model:');
  lines.push(`  provider: "${extractModelProvider(schema.modelConfig.model)}"`);
  lines.push(`  name: "${schema.modelConfig.model}"`);
  lines.push(`  temperature: ${schema.modelConfig.temperature}`);
  lines.push(`  max_tokens: ${schema.modelConfig.maxTokens}`);
  if (schema.modelConfig.topP !== 1) {
    lines.push(`  top_p: ${schema.modelConfig.topP}`);
  }
  lines.push('');

  // Prompt 块
  lines.push('prompt:');
  lines.push(`  system: "${UATCore.escapeYAMLString(schema.identity.systemPrompt)}"`);

  if (schema.identity.constraints?.length > 0) {
    lines.push('  constraints:');
    for (const c of schema.identity.constraints) {
      lines.push(`    - "${UATCore.escapeYAMLString(c)}"`);
    }
  }
  lines.push('');

  // Tools 块
  if (schema.tools.functions?.length > 0 || schema.tools.mcpServers?.length > 0) {
    lines.push('tools:');

    // Functions
    if (schema.tools.functions?.length > 0) {
      lines.push('  functions:');
      for (const fn of schema.tools.functions) {
        lines.push(`    - name: "${fn.name}"`);
        if (fn.description) {
          lines.push(`      description: "${UATCore.escapeYAMLString(fn.description)}"`);
        }
        if (fn.inputs?.length > 0) {
          lines.push('      parameters:');
          for (const input of fn.inputs) {
            lines.push(`        ${input.name}: { type: "${input.type}" }`);
          }
        }
      }
    }

    // MCP Servers
    if (schema.tools.mcpServers?.length > 0) {
      lines.push('  mcp_servers:');
      for (const mcp of schema.tools.mcpServers) {
        lines.push(`    - name: "${mcp.name}"`);
        if (mcp.url) {
          lines.push(`      url: "${mcp.url}"`);
        }
      }
    }
    lines.push('');
  }

  // Workflow 块
  if (schema.workflow.steps?.length > 0) {
    lines.push('workflow:');
    lines.push('  steps:');

    for (let i = 0; i < schema.workflow.steps.length; i++) {
      const step = schema.workflow.steps[i];
      lines.push(`    - id: "${step.stepId}"`);
      lines.push(`      type: "${mapStepToHermesType(step.type)}"`);

      if (step.type === 'prompt' && step.content) {
        lines.push(`      action: "${UATCore.escapeYAMLString(step.content)}"`);
      }

      if (step.type === 'api') {
        // 尝试解析工具名称
        const toolMatch = step.content?.match(/Use tool: (.+)/);
        if (toolMatch) {
          lines.push(`      tool: "${toolMatch[1]}"`);
        }
      }

      if (step.type === 'condition' && step.conditions?.length > 0) {
        lines.push('      conditions:');
        for (const cond of step.conditions) {
          if (cond.operator !== 'default') {
            lines.push(`        - variable: "${cond.variable}"`);
            lines.push(`          operator: "${cond.operator}"`);
            lines.push(`          value: "${UATCore.escapeYAMLString(cond.value)}"`);
            lines.push(`          target: "${cond.targetStepId}"`);
          }
        }
      }
    }
    lines.push('');
  }

  // Memory 块
  lines.push('memory:');
  lines.push(`  type: "${schema.memory.sessionMemory?.enabled ? 'conversation' : 'none'}"`);
  if (schema.memory.sessionMemory?.enabled) {
    lines.push(`  max_history: ${schema.memory.sessionMemory.maxMessages || 50}`);
  }
  lines.push('');

  return lines.join('\n');
}

function extractModelProvider(modelName) {
  if (modelName.includes('gpt') || modelName.includes('o1')) return 'openai';
  if (modelName.includes('claude')) return 'anthropic';
  if (modelName.includes('gemini')) return 'google';
  if (modelName.includes('llama') || modelName.includes('mistral')) return 'open-source';
  return 'openai';
}

function mapStepToHermesType(stepType) {
  const typeMap = {
    'prompt': 'prompt',
    'api': 'tool',
    'condition': 'condition',
    'loop': 'loop',
    'parallel': 'parallel',
    'function': 'tool',
    'end': 'end'
  };
  return typeMap[stepType] || 'prompt';
}

// ============================================
// 编码器8：Cursor Rules 编码器（新增）
// ============================================

function encodeCursorRules(schema) {
  const lines = [];

  // 头部注释
  lines.push('# Cursor Rules');
  lines.push('# Generated by UAT Converter');
  lines.push('');

  // 项目名称
  if (schema.meta.name) {
    lines.push(`# Project: ${schema.meta.name}`);
    lines.push('');
  }

  // 系统提示词（转换为规则格式）
  if (schema.identity.systemPrompt) {
    lines.push('## General Guidelines');
    lines.push('');

    // 将提示词转换为规则列表
    const sentences = schema.identity.systemPrompt.split(/[。\n]/).filter(s => s.trim());
    for (const sentence of sentences) {
      if (sentence.trim()) {
        lines.push(`- ${sentence.trim()}`);
      }
    }
    lines.push('');
  }

  // 约束规则
  if (schema.identity.constraints?.length > 0) {
    lines.push('## Code Rules');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    lines.push('## Output Rules');
    lines.push('');
    for (const r of schema.identity.outputRules) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  // 模型偏好（Cursor 支持）
  lines.push('## Model Preferences');
  lines.push('');
  lines.push(`- Prefer model: ${schema.modelConfig.model}`);
  lines.push(`- Temperature: ${schema.modelConfig.temperature}`);
  lines.push('');

  return lines.join('\n');
}

// ============================================
// 编码器9：Windsurf Rules 编码器（新增）
// ============================================

function encodeWindsurfRules(schema) {
  const lines = [];

  lines.push('# Windsurf Rules');
  lines.push('# Generated by UAT Converter');
  lines.push('');

  lines.push('## Code Guidelines');
  lines.push('');

  if (schema.identity.systemPrompt) {
    const sentences = schema.identity.systemPrompt.split(/[。\n]/).filter(s => s.trim());
    for (const sentence of sentences) {
      lines.push(`- ${sentence.trim()}`);
    }
    lines.push('');
  }

  if (schema.identity.constraints?.length > 0) {
    lines.push('## Additional Rules');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// 编码器10：GitHub Copilot 编码器（新增）
// ============================================

function encodeCopilotInstructions(schema) {
  const lines = [];

  lines.push('# GitHub Copilot Instructions');
  lines.push('');
  lines.push('This file provides instructions for GitHub Copilot to follow when generating code.');
  lines.push('');

  // 通用指南
  lines.push('## General Guidelines');
  lines.push('');
  if (schema.identity.systemPrompt) {
    lines.push(schema.identity.systemPrompt);
    lines.push('');
  }

  // 代码风格
  if (schema.identity.constraints?.length > 0) {
    lines.push('## Code Style');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  // 输出规则
  if (schema.identity.outputRules?.length > 0) {
    lines.push('## Output Guidelines');
    lines.push('');
    for (const r of schema.identity.outputRules) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  // 模型建议
  lines.push('## Model Suggestions');
  lines.push('');
  lines.push(`- Recommended model: ${schema.modelConfig.model}`);
  lines.push('');

  return lines.join('\n');
}

// ============================================
// 编码器11：Codex CLI 编码器（新增）
// ============================================

function encodeCodexAgents(schema) {
  const sections = [];

  // YAML 头部
  sections.push('---');
  sections.push(`name: "${UATCore.escapeYAMLString(schema.meta.name)}"`);
  sections.push(`description: "${UATCore.escapeYAMLString(schema.meta.description)}"`);
  sections.push(`model: "${schema.modelConfig.model}"`);

  // 工具声明（简化版）
  if (schema.tools.functions?.length > 0 || schema.tools.apiEndpoints?.length > 0) {
    sections.push('tools:');
    for (const fn of schema.tools.functions) {
      sections.push(`  - ${fn.name}`);
    }
    for (const api of schema.tools.apiEndpoints) {
      sections.push(`  - ${api.name}`);
    }
  }

  sections.push('---');
  sections.push('');

  // 正文指令
  sections.push('# Instructions');
  sections.push('');
  sections.push(schema.identity.systemPrompt);
  sections.push('');

  // 工作流
  if (schema.workflow.steps?.length > 0) {
    sections.push('# Workflow');
    sections.push('');
    for (const step of schema.workflow.steps) {
      sections.push(`## ${step.name}`);
      sections.push('');
      sections.push(`Type: ${step.type}`);
      if (step.content) {
        sections.push(step.content);
      }
      sections.push('');
    }
  }

  return sections.join('\n');
}

// ============================================
// 编码器12：Zed Editor 编码器（新增）
// ============================================

function encodeZedRules(schema) {
  const lines = [];

  lines.push('# Zed Editor Rules');
  lines.push('# Generated by UAT Converter');
  lines.push('');

  // 系统提示词
  if (schema.identity.systemPrompt) {
    lines.push('## Guidelines');
    lines.push('');
    lines.push(schema.identity.systemPrompt);
    lines.push('');
  }

  // 约束
  if (schema.identity.constraints?.length > 0) {
    lines.push('## Rules');
    lines.push('');
    for (const c of schema.identity.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// 导出模块接口（向后兼容）
// ============================================

// 注意：UATEncoder 类已在 encoder-registry.js 中定义
// 此处仅导出原有函数接口以保持向后兼容

window.UATEncoderLegacy = {
  runEncoderPool,
  encodeDifyYAMLEnhanced,
  encodeFastGPTEnhanced,
  encodeFlowiseEnhanced,
  encodeClaudeSkillEnhanced,
  encodeOpenClawEnhanced,
  encodeHermesYAML,
  encodeCursorRules,
  encodeWindsurfRules,
  encodeCopilotInstructions,
  encodeCodexAgents,
  encodeZedRules,
  encodePlainTextEnhanced,
  addKnowledgeBaseNote
};