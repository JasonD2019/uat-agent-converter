/**
 * UAT Node.js 测试脚本 - 验证核心逻辑
 */

// 模拟浏览器环境
global.window = {};
global.document = {
  addEventListener: () => {},
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, removeChild: () => {} }),
  getElementById: () => null,
  body: { appendChild: () => {}, removeChild: () => {} }
};
global.navigator = { clipboard: {} };
global.localStorage = { clear: () => {}, getItem: () => null, setItem: () => {} };
global.sessionStorage = { clear: () => {}, getItem: () => null, setItem: () => {} };
global.HTMLImageElement = { prototype: {} };
global.URL = { createObjectURL: () => '', revokeObjectURL: () => {} };
global.Blob = class Blob { constructor(parts) { this.parts = parts; this.size = parts.length; } };

require('./src/core/schema.js');
// 将 window.UATCore 也暴露为全局 UATCore（模拟浏览器行为）
global.UATCore = window.UATCore;

require('./src/input/input-utils.js');
global.UATInput = window.UATInput;

require('./src/detector/platform-detector.js');
global.UATDetector = window.UATDetector;

require('./src/parser/parser-pool.js');
global.UATParser = window.UATParser;

require('./src/encoder/encoder-pool.js');
global.UATEncoderLegacy = window.UATEncoderLegacy;

require('./src/export/export-utils.js');
global.UATExport = window.UATExport;

require('./src/guard/guard.js');
global.UATGuard = window.UATGuard;

// Bundle Base 共用工具
require('./src/bundle/bundle-base.js');
global.BundleBase = window.BundleBase;

require('./src/bundle/bundle-manager.js');
global.UATBundle = window.UATBundle;

require('./src/bundle/hermes-bundle.js');
global.HermesBundle = window.HermesBundle;

require('./src/bundle/openclaw-bundle.js');
global.OpenClawBundle = window.OpenClawBundle;

require('./src/bundle/cursor-bundle.js');
global.CursorBundle = window.CursorBundle;

require('./src/bundle/windsurf-bundle.js');
global.WindsurfBundle = window.WindsurfBundle;

require('./src/bundle/claude-code-bundle.js');
global.ClaudeCodeBundle = window.ClaudeCodeBundle;

require('./src/bundle/dify-bundle.js');
global.DifyBundle = window.DifyBundle;

require('./src/bundle/fastgpt-bundle.js');
global.FastGPTBundle = window.FastGPTBundle;

require('./src/bundle/codex-bundle.js');
global.CodexBundle = window.CodexBundle;

require('./src/bundle/flowise-bundle.js');
global.FlowiseBundle = window.FlowiseBundle;

require('./src/bundle/copilot-bundle.js');
global.CopilotBundle = window.CopilotBundle;

require('./src/bundle/zed-bundle.js');
global.ZedBundle = window.ZedBundle;

// Encoder Registry (after bundle modules)
require('./src/encoder/encoder-registry.js');
global.UATEncoder = window.UATEncoder;

// 测试工具函数
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected "${expected}", got "${actual}"`);
  }
}

function assertContains(text, substring, msg) {
  if (!text.includes(substring)) {
    throw new Error(`${msg}: "${substring}" not found`);
  }
}

function assertTrue(value, msg) {
  if (!value) {
    throw new Error(`${msg}: expected true, got false`);
  }
}

console.log('\n========================================');
console.log('UAT 功能验证测试 - Node.js 版');
console.log('========================================\n');

// ========== 测试1：模块加载 ==========
console.log('\n【测试1】模块加载验证');

test('UATCore 已加载', () => assertTrue(window.UATCore, 'UATCore'));
test('UATInput 已加载', () => assertTrue(window.UATInput, 'UATInput'));
test('UATDetector 已加载', () => assertTrue(window.UATDetector, 'UATDetector'));
test('UATParser 已加载', () => assertTrue(window.UATParser, 'UATParser'));
test('UATEncoder 已加载', () => assertTrue(window.UATEncoder, 'UATEncoder'));
test('UATExport 已加载', () => assertTrue(window.UATExport, 'UATExport'));
test('UATGuard 已加载', () => assertTrue(window.UATGuard, 'UATGuard'));
test('UATBundle 已加载', () => assertTrue(window.UATBundle, 'UATBundle'));
test('HermesBundle 已加载', () => assertTrue(window.HermesBundle, 'HermesBundle'));
test('OpenClawBundle 已加载', () => assertTrue(window.OpenClawBundle, 'OpenClawBundle'));
test('CursorBundle 已加载', () => assertTrue(window.CursorBundle, 'CursorBundle'));
test('WindsurfBundle 已加载', () => assertTrue(window.WindsurfBundle, 'WindsurfBundle'));
test('ClaudeCodeBundle 已加载', () => assertTrue(window.ClaudeCodeBundle, 'ClaudeCodeBundle'));
test('DifyBundle 已加载', () => assertTrue(window.DifyBundle, 'DifyBundle'));
test('FastGPTBundle 已加载', () => assertTrue(window.FastGPTBundle, 'FastGPTBundle'));
test('CodexBundle 已加载', () => assertTrue(window.CodexBundle, 'CodexBundle'));
test('FlowiseBundle 已加载', () => assertTrue(window.FlowiseBundle, 'FlowiseBundle'));
test('CopilotBundle 已加载', () => assertTrue(window.CopilotBundle, 'CopilotBundle'));
test('ZedBundle 已加载', () => assertTrue(window.ZedBundle, 'ZedBundle'));

// ========== 测试2：Schema 核心 ==========
console.log('\n【测试2】Schema 核心功能');

test('创建空白 Schema', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  assertTrue(schema.meta, 'meta 层存在');
  assertTrue(schema.identity, 'identity 层存在');
  assertTrue(schema.tools, 'tools 层存在');
  assertTrue(schema.workflow, 'workflow 层存在');
  assertTrue(schema.memory, 'memory 层存在');
  assertTrue(schema.modelConfig, 'modelConfig 层存在');
});

test('Schema 校验通过', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  assertTrue(window.UATCore.checkSchemaValid(schema), 'Schema 校验');
});

test('Schema 默认值补全', () => {
  const schema = { meta: {}, identity: {}, tools: {}, workflow: {}, memory: {}, modelConfig: {} };
  window.UATCore.fillSchemaDefaultValues(schema);
  assertEqual(schema.modelConfig.temperature, 0.7, '默认温度');
  assertEqual(schema.modelConfig.maxTokens, 4096, '默认 maxTokens');
});

// ========== 测试3：平台检测 ==========
console.log('\n【测试3】平台检测');

test('检测 Dify 格式', () => {
  const text = 'dify_version: "0.1"\napp:\n  name: "Test"';
  assertEqual(window.UATDetector.detectPlatform(text), 'dify', 'Dify 检测');
});

test('检测 OpenClaw 格式', () => {
  const text = '# Identity\nName: Agent\n# Soul\nConstraints';
  assertEqual(window.UATDetector.detectPlatform(text), 'openclaw', 'OpenClaw 检测');
});

test('检测 Claude 格式', () => {
  const text = '---\nname: "Skill"\n---\n# Instructions';
  assertEqual(window.UATDetector.detectPlatform(text), 'claude', 'Claude 检测');
});

test('检测 FastGPT 格式', () => {
  const text = '{"appConfig": {"name": "Test"}, "chatConfig": {}';
  assertEqual(window.UATDetector.detectPlatform(text), 'fastgpt', 'FastGPT 检测');
});

test('检测 Flowise 格式', () => {
  const text = '{"name": "Flow", "nodes": [], "edges": []}';
  assertEqual(window.UATDetector.detectPlatform(text), 'flowise', 'Flowise 检测');
});

test('检测纯文本格式', () => {
  const text = 'You are a helpful assistant.';
  assertEqual(window.UATDetector.detectPlatform(text), 'plain', '纯文本检测');
});

test('检测 Hermes 格式', () => {
  const text = 'hermes_version: "1.0"\nagent:\n  name: "Test"';
  assertEqual(window.UATDetector.detectPlatform(text), 'hermes', 'Hermes 检测');
});

test('检测 Cursor 格式', () => {
  const text = '# Rules\n\n- Always use TypeScript\n- Follow best practices';
  assertEqual(window.UATDetector.detectPlatform(text), 'cursor', 'Cursor 检测');
});

test('检测 Windsurf 格式', () => {
  // Windsurf 和 Cursor 格式相同，检测逻辑共享
  const text = '# Windsurf Rules\n\n## Code Guidelines\n\n- Use ES modules';
  // 注：Windsurf 和 Cursor 使用相同的检测逻辑，可能被检测为 cursor
  // 这是预期的，因为两者格式一致，需要文件名区分
  const detected = window.UATDetector.detectPlatform(text);
  assertTrue(detected === 'cursor' || detected === 'windsurf', 'Windsurf/Cursor 检测');
});

// ========== 测试4：解析器 ==========
console.log('\n【测试4】解析器功能');

test('纯文本解析', () => {
  const text = 'You are a helpful assistant.';
  const schema = window.UATParser.runParserPool(text, 'plain');
  assertEqual(schema.identity.systemPrompt, text, '系统提示词');
});

test('FastGPT JSON 解析', () => {
  const text = '{"appConfig": {"name": "MyAgent"}, "chatConfig": {"systemPrompt": "Hello"}}';
  const schema = window.UATParser.runParserPool(text, 'fastgpt');
  assertEqual(schema.meta.name, 'MyAgent', '名称提取');
  assertEqual(schema.identity.systemPrompt, 'Hello', '提示词提取');
});

test('Dify YAML 解析', () => {
  const text = 'dify_version: "0.1"\napp:\n  name: "DifyBot"\n  description: "Test"';
  const schema = window.UATParser.runParserPool(text, 'dify');
  assertEqual(schema.meta.name, 'DifyBot', '名称提取');
});

test('Flowise JSON 解析', () => {
  const text = '{"name": "MyFlow", "nodes": [{"id": "n1", "data": {"label": "Start"}}]}';
  const schema = window.UATParser.runParserPool(text, 'flowise');
  assertEqual(schema.meta.name, 'MyFlow', '名称提取');
  assertTrue(schema.workflow.steps.length > 0, '节点提取');
});

test('OpenClaw Markdown 解析', () => {
  const text = '# Identity\nName: OpenClawBot\n\n## System Prompt\nYou are helpful.';
  const schema = window.UATParser.runParserPool(text, 'openclaw');
  assertEqual(schema.meta.name, 'OpenClawBot', '名称提取');
});

// ========== 测试5：编码器 ==========
console.log('\n【测试5】编码器功能');

test('Dify YAML 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestAgent';
  schema.identity.systemPrompt = 'Hello';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'dify');
  assertContains(output, 'dify_version', '版本头');
  assertContains(output, 'TestAgent', '名称');
});

test('OpenClaw Markdown 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestAgent';
  schema.identity.systemPrompt = 'Hello';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'openclaw');
  assertContains(output, '# Identity', 'Identity 块');
  assertContains(output, '# Soul', 'Soul 块');
});

test('Claude Skill 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestAgent';
  schema.identity.systemPrompt = 'Hello';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'claude');
  assertContains(output, '---', 'YAML 头');
  assertContains(output, '# Instructions', '指令块');
});

test('FastGPT JSON 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestAgent';
  schema.identity.systemPrompt = 'Hello';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'fastgpt');
  assertContains(output, '"appConfig"', 'appConfig');
  assertContains(output, '"chatConfig"', 'chatConfig');
});

test('Flowise JSON 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestAgent';
  schema.identity.systemPrompt = 'Hello';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'flowise');
  assertContains(output, '"nodes"', 'nodes 数组');
  assertContains(output, '"edges"', 'edges 数组');
});

test('纯文本编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.systemPrompt = 'Hello World';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'plain');
  assertContains(output, 'Hello World', '提示词');
});

test('Hermes YAML 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'HermesAgent';
  schema.identity.systemPrompt = 'Hello Hermes';
  schema.modelConfig.model = 'claude-3-opus';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'hermes');
  assertContains(output, 'hermes_version', '版本头');
  assertContains(output, 'HermesAgent', '名称');
});

test('Cursor Rules 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CursorBot';
  schema.identity.systemPrompt = 'Use TypeScript';
  schema.identity.constraints = ['Always type check', 'Use strict mode'];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'cursor');
  assertContains(output, '## General Guidelines', '标题');
  assertContains(output, 'TypeScript', '内容');
});

test('Windsurf Rules 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'WindsurfBot';
  schema.identity.systemPrompt = 'Use clean code';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.UATEncoder.runEncoderPool(schema, 'windsurf');
  assertContains(output, '## Code Guidelines', '标题');
});

// ========== 测试6：完整转换链路 ==========
console.log('\n【测试6】完整转换链路');

test('FastGPT → Dify 转换', () => {
  const input = '{"appConfig": {"name": "CrossPlatform"}, "chatConfig": {"systemPrompt": "Test"}}';
  const platform = window.UATDetector.detectPlatform(input);
  assertEqual(platform, 'fastgpt', '检测平台');

  const schema = window.UATParser.runParserPool(input, platform);
  assertEqual(schema.meta.name, 'CrossPlatform', '解析成功');

  const output = window.UATEncoder.runEncoderPool(schema, 'dify');
  assertContains(output, 'dify_version', '编码成功');
  assertContains(output, 'CrossPlatform', '名称保留');
});

test('OpenClaw → Claude 转换', () => {
  const input = '# Identity\nName: SourceAgent\n\n## System Prompt\nOriginal prompt';
  const platform = window.UATDetector.detectPlatform(input);
  assertEqual(platform, 'openclaw', '检测平台');

  const schema = window.UATParser.runParserPool(input, platform);
  assertEqual(schema.meta.name, 'SourceAgent', '解析成功');

  const output = window.UATEncoder.runEncoderPool(schema, 'claude');
  assertContains(output, '---', 'Claude 格式');
  assertContains(output, 'SourceAgent', '名称保留');
});

test('Dify → FastGPT 转换', () => {
  const input = 'dify_version: "0.1"\napp:\n  name: "DifySource"';
  const platform = window.UATDetector.detectPlatform(input);
  assertEqual(platform, 'dify', '检测平台');

  const schema = window.UATParser.runParserPool(input, platform);
  assertEqual(schema.meta.name, 'DifySource', '解析成功');

  const output = window.UATEncoder.runEncoderPool(schema, 'fastgpt');
  assertContains(output, '"appConfig"', 'FastGPT 格式');
  assertContains(output, 'DifySource', '名称保留');
});

// ========== 测试7：安全模块 ==========
console.log('\n【测试7】安全模块');

test('敏感内容过滤 - API Key', () => {
  const text = 'api_key: sk-abc123def456ghi789jkl012mno345pqr678';
  const cleaned = window.UATGuard.guardCheckSensitiveContent(text);
  assertContains(cleaned, '***REDACTED***', '已过滤');
});

test('敏感内容过滤 - JWT', () => {
  const text = 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
  const cleaned = window.UATGuard.guardCheckSensitiveContent(text);
  assertContains(cleaned, '***REDACTED***', '已过滤');
});

test('安全执行包装器', () => {
  const result = window.UATGuard.safeExecute(() => 42, 'Test');
  assertEqual(result, 42, '正常执行');
});

test('异常兜底', () => {
  const result = window.UATGuard.safeExecute(
    () => { throw new Error('fail'); },
    'Test',
    () => 'fallback'
  );
  assertEqual(result, 'fallback', '兜底执行');
});

test('敏感内容检测', () => {
  const hasSensitive = window.UATGuard.hasSensitiveContent('sk-abc123def456ghi789jkl012mno');
  assertTrue(hasSensitive, '检测到敏感内容');
});

// ========== 测试8：导出模块 ==========
console.log('\n【测试8】导出模块');

test('文件名生成', () => {
  const filename = window.UATExport.generateExportFileName('dify');
  assertContains(filename, 'UAT_', '前缀');
  assertContains(filename, 'Dify', '平台名');
  assertContains(filename, '.yml', '后缀');
});

test('平台扩展名', () => {
  assertEqual(window.UATExport.getPlatformExtension('dify'), '.yml', 'Dify 后缀');
  assertEqual(window.UATExport.getPlatformExtension('fastgpt'), '.json', 'FastGPT 后缀');
  assertEqual(window.UATExport.getPlatformExtension('claude'), '.md', 'Claude 后缀');
});

test('文件名清理', () => {
  const clean = window.UATExport.sanitizeFileName('Test<>:"/\\|?*Agent');
  assertEqual(clean, 'TestAgent', '非法字符移除');
});

test('文件大小格式化', () => {
  assertEqual(window.UATExport.formatFileSize(0), '0 B', '0字节');
  assertContains(window.UATExport.formatFileSize(1024), 'KB', 'KB单位');
});

// ========== 测试9：Hermes Bundle 模块 ==========
console.log('\n【测试9】Hermes Bundle 模块');

test('Hermes Provider 提取', () => {
  const provider1 = window.HermesBundle.extractHermesProvider('gpt-4');
  assertEqual(provider1, 'openai', 'OpenAI Provider');
  const provider2 = window.HermesBundle.extractHermesProvider('claude-3-opus');
  assertEqual(provider2, 'anthropic', 'Anthropic Provider');
  const provider3 = window.HermesBundle.extractHermesProvider('gemini-pro');
  assertEqual(provider3, 'google', 'Google Provider');
});

test('Hermes Base URL', () => {
  const url1 = window.HermesBundle.getHermesBaseUrl('openai');
  assertEqual(url1, 'https://api.openai.com/v1', 'OpenAI URL');
  const url2 = window.HermesBundle.getHermesBaseUrl('anthropic');
  assertEqual(url2, 'https://api.anthropic.com', 'Anthropic URL');
});

test('Hermes Config YAML 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestHermes';
  schema.modelConfig.model = 'gpt-4';
  schema.modelConfig.temperature = 0.8;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.HermesBundle.encodeHermesConfigYAML(schema);
  assertContains(output, 'hermes_version', '版本头');
  assertContains(output, 'provider: "openai"', 'Provider');
  assertContains(output, 'temperature: 0.8', '温度');
});

test('Hermes SOUL.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'SoulAgent';
  schema.identity.systemPrompt = 'You are helpful.';
  schema.identity.role = 'Assistant';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.HermesBundle.encodeHermesSoulMD(schema);
  assertContains(output, '# SoulAgent', '标题');
  assertContains(output, '## Role', 'Role 部分');
  assertContains(output, '## System Prompt', 'System Prompt 部分');
});

test('Hermes .env.example 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.HermesBundle.encodeHermesEnvExample(schema);
  assertContains(output, 'OPENAI_API_KEY', 'OpenAI Key');
  assertContains(output, '.env', '提示复制');
});

test('Hermes README 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'ReadmeAgent';
  schema.modelConfig.model = 'claude-3-opus';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.HermesBundle.encodeHermesReadme(schema);
  assertContains(output, '# ReadmeAgent', '标题');
  assertContains(output, 'Installation', '安装说明');
  assertContains(output, 'claude-3-opus', '模型名');
});

// ========== 测试10：OpenClaw Bundle 模块 ==========
console.log('\n【测试10】OpenClaw Bundle 模块');

test('OpenClaw Provider 提取', () => {
  const provider1 = window.OpenClawBundle.extractOpenClawProvider('gpt-4');
  assertEqual(provider1, 'openai', 'OpenAI Provider');
  const provider2 = window.OpenClawBundle.extractOpenClawProvider('claude-3-opus');
  assertEqual(provider2, 'anthropic', 'Anthropic Provider');
  const provider3 = window.OpenClawBundle.extractOpenClawProvider('gemini-pro');
  assertEqual(provider3, 'google', 'Google Provider');
});

test('OpenClaw Base URL', () => {
  const url1 = window.OpenClawBundle.getOpenClawBaseUrl('openai');
  assertEqual(url1, 'https://api.openai.com/v1', 'OpenAI URL');
  const url2 = window.OpenClawBundle.getOpenClawBaseUrl('anthropic');
  assertEqual(url2, 'https://api.anthropic.com', 'Anthropic URL');
});

test('OpenClaw Config JSON 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'TestOpenClaw';
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawConfigJSON(schema);
  assertContains(output, 'openclaw', '配置标识');
  assertContains(output, 'openai/gpt-4', '模型');
  assertContains(output, 'gateway', '网关');
});

test('OpenClaw AGENTS.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'AgentsBot';
  schema.identity.systemPrompt = 'Hello';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawAgentsMD(schema);
  assertContains(output, '# AGENTS.md', '标题');
  assertContains(output, 'Loading Sequence', '加载顺序');
  assertContains(output, 'SOUL.md', 'SOUL引用');
});

test('OpenClaw SOUL.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'SoulBot';
  schema.identity.systemPrompt = 'Be helpful';
  schema.identity.constraints = ['No harmful content', 'Be polite'];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawSoulMD(schema);
  assertContains(output, '# SOUL.md', '标题');
  assertContains(output, 'Core Principles', '核心原则');
  assertContains(output, 'Constraints', '约束');
});

test('OpenClaw IDENTITY.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'IdentityBot';
  schema.identity.role = 'Assistant';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawIdentityMD(schema);
  assertContains(output, '# IDENTITY.md', '标题');
  assertContains(output, 'IdentityBot', '名称');
  assertContains(output, 'Role', '角色');
});

test('OpenClaw TOOLS.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'ToolsBot';
  schema.tools.mcpServers = [{ id: 'mcp1', name: 'filesystem', url: 'local' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawToolsMD(schema);
  assertContains(output, '# TOOLS.md', '标题');
  assertContains(output, 'Built-in Tools', '内置工具');
  assertContains(output, 'filesystem', 'MCP引用');
});

test('OpenClaw MEMORY.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'MemoryBot';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawMemoryMD(schema);
  assertContains(output, '# MEMORY.md', '标题');
  assertContains(output, 'Long-term Memory', '长期记忆');
});

test('OpenClaw HEARTBEAT.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'HeartbeatBot';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawHeartbeatMD(schema);
  assertContains(output, '# HEARTBEAT.md', '标题');
  assertContains(output, 'Automation Tasks', '自动化任务');
});

test('OpenClaw USER.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'UserBot';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawUserMD(schema);
  assertContains(output, '# USER.md', '标题');
  assertContains(output, 'Preferences', '偏好');
});

test('OpenClaw .env.example 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawEnvExample(schema);
  assertContains(output, 'OPENAI_API_KEY', 'OpenAI Key');
  assertContains(output, '.env', '提示');
});

test('OpenClaw README 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'ReadmeOpenClaw';
  schema.modelConfig.model = 'claude-3-opus';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.OpenClawBundle.encodeOpenClawReadme(schema);
  assertContains(output, '# ReadmeOpenClaw', '标题');
  assertContains(output, 'Bundle Contents', '内容说明');
  assertContains(output, 'Installation', '安装说明');
  assertContains(output, '7-file', '7文件架构');
});

// ========== 测试11：Cursor Bundle 模块 ==========
console.log('\n【测试11】Cursor Bundle 模块');

test('Cursor .cursorrules 主规则编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CursorBot';
  schema.identity.systemPrompt = 'Be helpful and accurate';
  schema.identity.constraints = ['No harmful code', 'Always test changes'];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesMain(schema);
  assertContains(output, '# Cursor Rules', '标题');
  assertContains(output, 'Core Behavior', '核心行为');
  assertContains(output, 'Hard Constraints', '硬约束');
});

test('Cursor .cursorignore 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorIgnore(schema);
  assertContains(output, 'node_modules/', 'node排除');
  assertContains(output, '.env', '环境变量排除');
  assertContains(output, 'dist/', '构建排除');
});

test('Cursor general.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.systemPrompt = 'Write clean code';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesGeneral(schema);
  assertContains(output, '# General Rules', '标题');
  assertContains(output, 'Guidelines', '指南');
  assertContains(output, 'Best Practices', '最佳实践');
});

test('Cursor code-style.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesCodeStyle(schema);
  assertContains(output, '# Code Style Rules', '标题');
  assertContains(output, 'General Style', '通用风格');
  assertContains(output, 'Functions', '函数规则');
});

test('Cursor frontend.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesFrontend(schema);
  assertContains(output, '# Frontend Rules', '标题');
  assertContains(output, 'Component Guidelines', '组件指南');
  assertContains(output, 'src/frontend/**', '路径匹配');
});

test('Cursor backend.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesBackend(schema);
  assertContains(output, '# Backend Rules', '标题');
  assertContains(output, 'API Design', 'API设计');
  assertContains(output, 'Security', '安全');
});

test('Cursor tests.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesTests(schema);
  assertContains(output, '# Testing Rules', '标题');
  assertContains(output, 'Test Structure', '测试结构');
  assertContains(output, '*.test.*', '测试文件匹配');
});

test('Cursor tools.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.tools.mcpServers = [{ id: 'fs', name: 'filesystem', url: 'local' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesTools(schema);
  assertContains(output, '# Tool Usage Rules', '标题');
  assertContains(output, 'MCP Tools', 'MCP工具');
  assertContains(output, 'filesystem', 'MCP引用');
});

test('Cursor workflow.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.workflow.steps = [{ stepId: 's1', name: 'Plan', type: 'prompt' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorRulesWorkflow(schema);
  assertContains(output, '# Workflow Rules', '标题');
  assertContains(output, 'Task Flow', '任务流');
  assertContains(output, 'Plan', '步骤名');
});

test('Cursor mcp.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.tools.mcpServers = [{
    id: 'test',
    name: 'test-server',
    url: 'http://localhost:3000',
    config: { command: 'node', args: ['server.js'] }
  }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorMCPJSON(schema);
  assertContains(output, 'mcpServers', 'MCP配置');
  assertContains(output, 'test-server', '服务器名');
  assertContains(output, 'command', '命令字段');
});

test('Cursor settings.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'claude-sonnet-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorSettingsJSON(schema);
  assertContains(output, 'cursor.ai', 'AI设置');
  assertContains(output, 'cursor.rules', '规则设置');
  assertContains(output, 'claude-sonnet-4', '模型名');
});

test('Cursor .env.example 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.tools.mcpServers = [{
    id: 'api',
    name: 'api-server',
    config: { env: { API_KEY: 'xxx' } }
  }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorEnvExample(schema);
  assertContains(output, 'API_KEY', '密钥引用');
  assertContains(output, '.env', '环境提示');
});

test('Cursor README 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CursorReadmeBot';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CursorBundle.encodeCursorReadme(schema);
  assertContains(output, '# CursorReadmeBot', '标题');
  assertContains(output, '.cursorrules', '规则文件');
  assertContains(output, '.cursor/rules/', '规则目录');
  assertContains(output, 'mcp.json', 'MCP配置');
});

// ========== 测试12：Dify Bundle 模块 ==========
console.log('\n【测试12】Dify Bundle 模块');

test('Dify Provider 提取', () => {
  const provider1 = window.DifyBundle.extractDifyProvider?.('gpt-4');
  assertEqual(provider1, 'openai', 'OpenAI Provider');
  const provider2 = window.DifyBundle.extractDifyProvider?.('claude-3-opus');
  assertEqual(provider2, 'anthropic', 'Anthropic Provider');
  const provider3 = window.DifyBundle.extractDifyProvider?.('gemini-pro');
  assertEqual(provider3, 'google', 'Google Provider');
});

test('Dify dify.yml 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'DifyAgent';
  schema.modelConfig.model = 'gpt-4';
  schema.modelConfig.temperature = 0.8;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyYML?.(schema);
  assertContains(output, 'dify_version', '版本头');
  assertContains(output, 'DifyAgent', '名称');
  assertContains(output, 'provider: openai', 'Provider');
  assertContains(output, 'temperature: 0.8', '温度');
});

test('Dify workflow/nodes.yml 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'DifyNodes';
  schema.workflow.steps = [{ stepId: 's1', name: 'Process', type: 'task' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyNodesYML?.(schema);
  assertContains(output, 'Workflow Nodes Definition', '标题');
  assertContains(output, 'start_node', '开始节点');
  assertContains(output, 'llm_node', 'LLM节点');
  assertContains(output, 'end_node', '结束节点');
});

test('Dify workflow/edges.yml 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.workflow.steps = [{ stepId: 's1', name: 'Step1', type: 'task' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyEdgesYML?.(schema);
  assertContains(output, 'Workflow Edges Definition', '标题');
  assertContains(output, 'source:', '源节点');
  assertContains(output, 'target:', '目标节点');
});

test('Dify workflow/variables.yml 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.promptVariables = [{ name: 'user_input', type: 'string', default: '' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyVariablesYML?.(schema);
  assertContains(output, 'Workflow Variables', '标题');
  assertContains(output, 'user_input', '变量名');
});

test('Dify knowledge_base/references.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.memory.knowledgeBaseRef = [{ id: 'kb1', name: 'DocsKB', type: 'external' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyKBReferences?.(schema);
  assertContains(output, 'datasets', '数据集');
  assertContains(output, 'kb1', '知识库ID');
  assertContains(output, 'DocsKB', '知识库名称');
});

test('Dify prompts/system_prompt.txt 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.systemPrompt = 'You are a helpful Dify agent.';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifySystemPrompt?.(schema);
  assertContains(output, 'helpful Dify agent', '系统提示词');
});

test('Dify app_config/ui_settings.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'DifyUI';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyUISettings?.(schema);
  assertContains(output, 'display_name', '显示名');
  assertContains(output, 'DifyUI', '名称');
  assertContains(output, 'opening_statement', '开场白');
});

test('Dify app_config/model_config.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'claude-3-opus';
  schema.modelConfig.temperature = 0.5;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyModelConfig?.(schema);
  assertContains(output, 'provider', 'Provider');
  assertContains(output, 'anthropic', 'Anthropic');
  assertContains(output, 'temperature', '温度');
});

test('Dify README.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'DifyReadme';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.DifyBundle.encodeDifyReadme?.(schema);
  assertContains(output, '# DifyReadme', '标题');
  assertContains(output, 'dify.yml', '主配置');
  assertContains(output, 'workflow/', '工作流目录');
  assertContains(output, 'Import Steps', '导入步骤');
});

// ========== 测试13：FastGPT Bundle 模块 ==========
console.log('\n【测试13】FastGPT Bundle 模块');

test('FastGPT Provider 提取', () => {
  const provider1 = window.FastGPTBundle.extractFastGPTProvider?.('gpt-4');
  assertEqual(provider1, 'openai', 'OpenAI Provider');
  const provider2 = window.FastGPTBundle.extractFastGPTProvider?.('claude-3-opus');
  assertEqual(provider2, 'anthropic', 'Anthropic Provider');
  const provider3 = window.FastGPTBundle.extractFastGPTProvider?.('deepseek-chat');
  assertEqual(provider3, 'deepseek', 'DeepSeek Provider');
});

test('FastGPT fastgpt.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FastGPTAgent';
  schema.modelConfig.model = 'gpt-4';
  schema.modelConfig.temperature = 0.8;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTMainJSON?.(schema);
  assertContains(output, 'version', '版本');
  assertContains(output, 'FastGPTAgent', '名称');
  assertContains(output, 'provider', 'Provider');
});

test('FastGPT workflow/nodes.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FastGPTNodes';
  schema.workflow.steps = [{ stepId: 's1', name: 'Process', type: 'task' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTNodesJSON?.(schema);
  assertContains(output, 'nodes', '节点数组');
  assertContains(output, 'node_start', '开始节点');
  assertContains(output, 'node_ai_chat', 'AI节点');
  assertContains(output, 'node_end', '结束节点');
});

test('FastGPT workflow/edges.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.workflow.steps = [{ stepId: 's1', name: 'Step1', type: 'task' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTEdgesJSON?.(schema);
  assertContains(output, 'edges', '边数组');
  assertContains(output, 'source', '源');
  assertContains(output, 'target', '目标');
});

test('FastGPT workflow/variables.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.promptVariables = [{ name: 'user_input', type: 'string', default: '' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTVariablesJSON?.(schema);
  assertContains(output, 'globalVariables', '全局变量');
  assertContains(output, 'user_input', '变量名');
});

test('FastGPT knowledge/datasets.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.memory.knowledgeBaseRef = [{ id: 'kb1', name: 'DocsKB', type: 'external' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTDatasetsJSON?.(schema);
  assertContains(output, 'datasets', '数据集');
  assertContains(output, 'kb1', '知识库ID');
  assertContains(output, 'vectorModel', '向量模型');
});

test('FastGPT prompts/system_prompt.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.systemPrompt = 'You are a helpful FastGPT agent.';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTSystemPromptJSON?.(schema);
  assertContains(output, 'systemPrompt', '系统提示词');
  assertContains(output, 'helpful FastGPT', '内容');
});

test('FastGPT prompts/chat_config.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTChatConfigJSON?.(schema);
  assertContains(output, 'welcomeText', '欢迎语');
  assertContains(output, 'suggestedQuestions', '建议问题');
});

test('FastGPT app/appConfig.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FastGPTApp';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTAppConfigJSON?.(schema);
  assertContains(output, 'FastGPTApp', '名称');
  assertContains(output, 'workflow', '类型');
});

test('FastGPT app/uiConfig.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FastGPTUI';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTUIConfigJSON?.(schema);
  assertContains(output, 'avatar', '头像');
  assertContains(output, 'theme', '主题');
  assertContains(output, 'showHistory', '历史显示');
});

test('FastGPT model/modelConfig.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'deepseek-chat';
  schema.modelConfig.temperature = 0.5;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTModelConfigJSON?.(schema);
  assertContains(output, 'provider', 'Provider');
  assertContains(output, 'deepseek', 'DeepSeek');
  assertContains(output, 'maxTokens', '最大Token');
});

test('FastGPT model/fallback.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTFallbackJSON?.(schema);
  assertContains(output, 'fallbackChain', '降级链');
  assertContains(output, 'claude', 'Claude降级');
  assertContains(output, 'deepseek', 'DeepSeek降级');
});

test('FastGPT README.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FastGPTReadme';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FastGPTBundle.encodeFastGPTReadme?.(schema);
  assertContains(output, '# FastGPTReadme', '标题');
  assertContains(output, 'Import Steps', '导入步骤');
  assertContains(output, 'Node Types', '节点类型');
});

// ========== 测试14：Codex CLI Bundle 模块 ==========
console.log('\n【测试14】Codex CLI Bundle 模块');

test('Codex AGENTS.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CodexAgent';
  schema.modelConfig.model = 'gpt-4';
  schema.identity.systemPrompt = 'You are a helpful Codex assistant.';
  schema.identity.constraints = ['No harmful code', 'Always test'];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexAgentsMD?.(schema);
  assertContains(output, '---', 'YAML头');
  assertContains(output, 'name: "CodexAgent"', '名称');
  assertContains(output, 'model: "gpt-4"', '模型');
  assertContains(output, '# Instructions', '指令');
  assertContains(output, '## Constraints', '约束');
});

test('Codex .codex/config.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CodexConfig';
  schema.modelConfig.model = 'gpt-4-turbo';
  schema.modelConfig.temperature = 0.8;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexConfigJSON?.(schema);
  assertContains(output, 'version', '版本');
  assertContains(output, 'agentName', 'Agent名');
  assertContains(output, 'gpt-4-turbo', '模型');
  assertContains(output, 'approvalMode', '审批模式');
});

test('Codex .codex/tools.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.tools.apiEndpoints = [{ name: 'custom_api', url: 'https://api.example.com' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexToolsJSON?.(schema);
  assertContains(output, 'filesystem', '文件系统工具');
  assertContains(output, 'terminal', '终端工具');
  assertContains(output, 'web_search', '搜索工具');
  assertContains(output, 'custom_api', '自定义API');
});

test('Codex .codex/providers.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexProvidersJSON?.(schema);
  assertContains(output, 'openai', 'OpenAI');
  assertContains(output, 'azure', 'Azure');
  assertContains(output, 'ollama', 'Ollama');
  assertContains(output, 'apiKeyEnv', 'API密钥环境变量');
});

test('Codex skills/code-review.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexSkillCodeReview?.(schema);
  assertContains(output, '---', 'YAML头');
  assertContains(output, 'Code Review Skill', '技能名');
  assertContains(output, '# Instructions', '指令');
  assertContains(output, 'Type safety', '类型安全');
});

test('Codex skills/testing.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexSkillTesting?.(schema);
  assertContains(output, '---', 'YAML头');
  assertContains(output, 'Testing Skill', '技能名');
  assertContains(output, 'unit tests', '单元测试');
});

test('Codex scripts/setup.sh 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexSetupScript?.(schema);
  assertContains(output, '#!/bin/bash', 'Shell头');
  assertContains(output, 'Installing Codex CLI', '安装');
  assertContains(output, 'gpt-4', '模型');
});

test('Codex scripts/run.sh 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexRunScript?.(schema);
  assertContains(output, '#!/bin/bash', 'Shell头');
  assertContains(output, 'codex --agent', '运行命令');
});

test('Codex .codexignore 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexIgnore?.(schema);
  assertContains(output, 'node_modules/', 'node排除');
  assertContains(output, '.env', '环境变量排除');
  assertContains(output, 'dist/', '构建排除');
});

test('Codex .env.example 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexEnvExample?.(schema);
  assertContains(output, 'OPENAI_API_KEY', 'OpenAI密钥');
  assertContains(output, 'AZURE_OPENAI_URL', 'Azure URL');
  assertContains(output, 'gpt-4', '默认模型');
});

test('Codex README.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CodexReadme';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CodexBundle.encodeCodexReadme?.(schema);
  assertContains(output, '# CodexReadme', '标题');
  assertContains(output, 'AGENTS.md', 'Agent文件');
  assertContains(output, 'Installation', '安装说明');
  assertContains(output, 'CLI Commands', 'CLI命令');
});

// ========== 测试15：Flowise Bundle 模块 ==========
console.log('\n【测试15】Flowise Bundle 模块');

test('Flowise LLM类型提取', () => {
  const type1 = window.FlowiseBundle.extractFlowiseLLMType?.('gpt-4');
  assertEqual(type1, 'OpenAI', 'OpenAI类型');
  const type2 = window.FlowiseBundle.extractFlowiseLLMType?.('claude-3-opus');
  assertEqual(type2, 'Anthropic', 'Anthropic类型');
});

test('Flowise flowise.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FlowiseAgent';
  schema.modelConfig.model = 'gpt-4';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseMainJSON?.(schema);
  assertContains(output, 'FlowiseAgent', '名称');
  assertContains(output, 'ChatFlow', '类型');
  assertContains(output, 'gpt-4', '模型');
});

test('Flowise nodes/node_configs.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FlowiseNodes';
  schema.identity.systemPrompt = 'You are helpful.';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseNodeConfigsJSON?.(schema);
  assertContains(output, 'nodes', '节点数组');
  assertContains(output, 'LLMChain', 'LLM Chain节点');
  assertContains(output, 'PromptTemplate', '提示模板');
});

test('Flowise edges.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.memory.knowledgeBaseRef = [{ id: 'kb1', name: 'DocsKB' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseEdgesJSON?.(schema);
  assertContains(output, 'edges', '边数组');
  assertContains(output, 'sourceHandle', '源Handle');
  assertContains(output, 'targetHandle', '目标Handle');
});

test('Flowise variables.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.identity.promptVariables = [{ name: 'user_input', type: 'string' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseVariablesJSON?.(schema);
  assertContains(output, 'globalVariables', '全局变量');
});

test('Flowise credentials.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseCredentialsJSON?.(schema);
  assertContains(output, 'credentialTypes', '凭据类型');
  assertContains(output, 'OpenAI', 'OpenAI凭据');
  assertContains(output, 'Pinecone', 'Pinecone凭据');
});

test('Flowise chains/llm_chain.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'gpt-4';
  schema.identity.systemPrompt = 'Help users.';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseLLMChainJSON?.(schema);
  assertContains(output, 'LLMChain', 'Chain名称');
  assertContains(output, 'BufferMemory', '内存');
  assertContains(output, 'PromptTemplate', '提示模板');
});

test('Flowise chains/retrieval_chain.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseRetrievalChainJSON?.(schema);
  assertContains(output, 'RetrievalChain', 'Chain名称');
  assertContains(output, 'VectorStoreRetriever', '检索器');
  assertContains(output, 'Pinecone', '向量存储');
});

test('Flowise ui/theme.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseThemeJSON?.(schema);
  assertContains(output, 'theme', '主题');
  assertContains(output, 'colors', '颜色');
  assertContains(output, 'nodeStyles', '节点样式');
});

test('Flowise ui/layout.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.tools.functions = [{ name: 'calc', description: 'calculator' }];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseLayoutJSON?.(schema);
  assertContains(output, 'positions', '位置数组');
  assertContains(output, 'node_llm', 'LLM节点位置');
  assertContains(output, 'viewport', '视口');
});

test('Flowise .env.example 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseEnvExample?.(schema);
  assertContains(output, 'OPENAI_API_KEY', 'OpenAI密钥');
  assertContains(output, 'PINECONE_API_KEY', 'Pinecone密钥');
  assertContains(output, 'FLOWISE_PORT', '端口');
});

test('Flowise README.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'FlowiseReadme';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.FlowiseBundle.encodeFlowiseReadme?.(schema);
  assertContains(output, '# FlowiseReadme', '标题');
  assertContains(output, 'Import Steps', '导入步骤');
  assertContains(output, 'LangChain Components', 'LangChain组件');
});

// ========== 测试16：GitHub Copilot Bundle 模块 ==========
console.log('\n【测试16】GitHub Copilot Bundle 模块');

test('Copilot copilot-instructions.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CopilotAgent';
  schema.identity.systemPrompt = 'You are a helpful Copilot assistant.';
  schema.identity.constraints = ['No harmful code', 'Always test'];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotInstructionsMD?.(schema);
  assertContains(output, '# GitHub Copilot Instructions', '标题');
  assertContains(output, 'CopilotAgent', '名称');
  assertContains(output, '## Constraints', '约束');
});

test('Copilot .github/prompts/code-generation.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotPromptCodeGeneration?.(schema);
  assertContains(output, '# Code Generation Prompt', '标题');
  assertContains(output, 'Template', '模板');
});

test('Copilot .github/prompts/review.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotPromptReview?.(schema);
  assertContains(output, '# Code Review Prompt', '标题');
  assertContains(output, 'Critical', '严重级别');
});

test('Copilot .github/prompts/test.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotPromptTest?.(schema);
  assertContains(output, '# Test Generation Prompt', '标题');
  assertContains(output, 'describe', '测试结构');
});

test('Copilot .github/prompts/refactor.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotPromptRefactor?.(schema);
  assertContains(output, '# Refactor Prompt', '标题');
  assertContains(output, 'Preserve', '保留行为');
});

test('Copilot .vscode/settings.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.temperature = 0.8;
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotVSCodeSettings?.(schema);
  assertContains(output, 'github.copilot.enable', 'Copilot启用');
  assertContains(output, 'temperature', '温度');
});

test('Copilot .vscode/extensions.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotVSCodeExtensions?.(schema);
  assertContains(output, 'GitHub.copilot', 'Copilot扩展');
  assertContains(output, 'recommendations', '推荐');
});

test('Copilot .copilotignore 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotIgnore?.(schema);
  assertContains(output, 'node_modules/', 'node排除');
  assertContains(output, '.env', '环境变量排除');
});

test('Copilot vscode-copilot-settings.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CopilotSettings';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotSettingsJSON?.(schema);
  assertContains(output, 'CopilotSettings', '名称');
  assertContains(output, 'enableInlineSuggestions', '内联建议');
});

test('Copilot README.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'CopilotReadme';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.CopilotBundle.encodeCopilotReadme?.(schema);
  assertContains(output, '# CopilotReadme', '标题');
  assertContains(output, '@workspace', 'Chat命令');
});

// ========== 测试17：Zed Editor Bundle 模块 ==========
console.log('\n【测试17】Zed Editor Bundle 模块');

test('Zed Provider 提取', () => {
  const provider1 = window.ZedBundle.extractZedProvider?.('claude-3-opus');
  assertEqual(provider1, 'anthropic', 'Anthropic Provider');
  const provider2 = window.ZedBundle.extractZedProvider?.('gpt-4');
  assertEqual(provider2, 'openai', 'OpenAI Provider');
  const provider3 = window.ZedBundle.extractZedProvider?.('llama2');
  assertEqual(provider3, 'ollama', 'Ollama Provider');
});

test('Zed rules.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'ZedAgent';
  schema.identity.systemPrompt = 'You are a helpful Zed assistant.';
  schema.identity.constraints = ['No unsafe code', 'Handle errors'];
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedRulesMD?.(schema);
  assertContains(output, '# Zed AI Assistant Rules', '标题');
  assertContains(output, 'ZedAgent', '名称');
  assertContains(output, '## Constraints', '约束');
});

test('Zed .zed/settings.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.modelConfig.model = 'claude-3-opus';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedSettingsJSON?.(schema);
  assertContains(output, 'assistant', 'AI助手');
  assertContains(output, 'anthropic', 'Anthropic');
  assertContains(output, 'claude-3-opus', '模型');
});

test('Zed .zed/tasks.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedTasksJSON?.(schema);
  assertContains(output, 'tasks', '任务数组');
  assertContains(output, 'Build', '构建任务');
  assertContains(output, 'Test', '测试任务');
});

test('Zed .zed/languages/rust.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedLanguageRust?.(schema);
  assertContains(output, 'Rust Language Rules', '标题');
  assertContains(output, 'Result', 'Result类型');
});

test('Zed .zed/languages/python.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedLanguagePython?.(schema);
  assertContains(output, 'Python Language Rules', '标题');
  assertContains(output, 'PEP 8', 'PEP8');
});

test('Zed .zed/languages/typescript.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedLanguageTypeScript?.(schema);
  assertContains(output, 'TypeScript Language Rules', '标题');
  assertContains(output, 'strict mode', '严格模式');
});

test('Zed .zed/context/files.json 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedContextFiles?.(schema);
  assertContains(output, 'always_include', '始终包含');
  assertContains(output, 'rules.md', '规则文件');
});

test('Zed .zed/prompts/explain.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedPromptExplain?.(schema);
  assertContains(output, 'Explain Code Prompt', '标题');
  assertContains(output, '{{language}}', '语言变量');
});

test('Zed .zed/prompts/refactor.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedPromptRefactor?.(schema);
  assertContains(output, 'Refactor Prompt', '标题');
  assertContains(output, 'Improve readability', '可读性');
});

test('Zed .zed/prompts/test.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedPromptTest?.(schema);
  assertContains(output, 'Test Generation Prompt', '标题');
  assertContains(output, 'edge cases', '边缘情况');
});

test('Zed .zedignore 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedIgnore?.(schema);
  assertContains(output, 'node_modules/', 'node排除');
  assertContains(output, '.env', '环境变量');
});

test('Zed README.md 编码', () => {
  const schema = window.UATCore.createEmptyUATSchema();
  schema.meta.name = 'ZedReadme';
  window.UATCore.fillSchemaDefaultValues(schema);
  const output = window.ZedBundle.encodeZedReadme?.(schema);
  assertContains(output, '# ZedReadme', '标题');
  assertContains(output, 'Keyboard Shortcuts', '快捷键');
  assertContains(output, 'Cmd+Shift+E', 'Mac快捷键');
});

// ========== 测试总结 ==========
console.log('\n========================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log('========================================\n');

if (failed === 0) {
  console.log('🎉 所有测试通过！UAT 项目功能正常。\n');
} else {
  console.log('⚠️ 存在失败的测试，请检查相关模块。\n');
}

process.exit(failed === 0 ? 0 : 1);