#!/usr/bin/env node
/**
 * UAT CLI 测试脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI_PATH = './src/cli/uat-cli.js';
const TEMP_DIR = './test-cli-temp';

// 创建临时目录
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 测试结果统计
let passed = 0;
let failed = 0;

function runTest(name, cmd, expect) {
  console.log(`\n测试: ${name}`);
  console.log(`命令: ${cmd}`);

  try {
    const output = execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() });

    if (output.includes(expect)) {
      console.log('✅ 通过');
      passed++;
      return { success: true, output };
    } else {
      console.log('❌ 失败: 输出不匹配');
      console.log(`期望包含: ${expect}`);
      console.log(`实际输出:\n${output.slice(0, 200)}`);
      failed++;
      return { success: false, output };
    }
  } catch (err) {
    console.log(`❌ 失败: ${err.message}`);
    if (err.stdout) console.log(`输出: ${err.stdout.slice(0, 200)}`);
    if (err.stderr) console.log(`错误: ${err.stderr.slice(0, 200)}`);
    failed++;
    return { success: false, error: err };
  }
}

// ============================================
// 测试用例
// ============================================

console.log('========================================');
console.log('UAT CLI 测试');
console.log('========================================');

// 测试 1: help 命令
runTest(
  'help 命令',
  `node ${CLI_PATH} help`,
  'UAT CLI'
);

// 测试 2: platforms 命令
runTest(
  'platforms 命令',
  `node ${CLI_PATH} platforms`,
  'dify'
);

// 测试 3: 使用 OpenClaw 格式的测试数据
// OpenClaw 检测关键词: 'Identity:', 'Soul:', '# Identity', '# Soul'
const testOpenClawConfig = `
# Identity
你是 OpenClaw 测试 Agent，专注于帮助用户完成编程任务。

# Soul
你的使命是提供高质量的代码建议和技术支持。
性格：专业、耐心、友好。

# Skill
擅长：编程、调试、代码审查。

# Tools
- 代码生成
- 错误分析
- 测试建议
`;

const testConfigPath = path.join(TEMP_DIR, 'openclaw-test.md');
fs.writeFileSync(testConfigPath, testOpenClawConfig);

// 测试 4: detect 命令
runTest(
  'detect 命令',
  `node ${CLI_PATH} detect --input ${testConfigPath}`,
  'openclaw'
);

// 测试 5: parse 命令
const schemaPath = path.join(TEMP_DIR, 'schema.json');
runTest(
  'parse 命令',
  `node ${CLI_PATH} parse --input ${testConfigPath} --platform openclaw --output ${schemaPath}`,
  'Schema'
);

// 测试 6: 检查 schema 文件是否生成
if (fs.existsSync(schemaPath)) {
  console.log('\n测试: Schema 文件生成');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  try {
    const schema = JSON.parse(schemaContent);
    // 检查基本结构（meta 或 core 存在即可）
    if (schema.meta || schema.core || schema.identity) {
      console.log('✅ 通过: Schema 结构正确');
      passed++;
    } else {
      console.log('❌ 失败: Schema 结构不完整');
      console.log(`Schema keys: ${Object.keys(schema).join(', ')}`);
      failed++;
    }
  } catch (e) {
    console.log('❌ 失败: Schema JSON 解析失败');
    failed++;
  }
} else {
  console.log('\n❌ 失败: Schema 文件未生成');
  failed++;
}

// 测试 7: convert 命令
const outputDir = path.join(TEMP_DIR, 'output');
runTest(
  'convert 命令',
  `node ${CLI_PATH} convert --schema ${schemaPath} --target cursor --output-dir ${outputDir}`,
  '转换成功'
);

// 测试 8: 检查输出文件是否生成
if (fs.existsSync(outputDir)) {
  console.log('\n测试: 输出文件生成');
  const files = fs.readdirSync(outputDir);
  if (files.length > 0) {
    console.log(`✅ 通过: 生成了 ${files.length} 个文件`);
    console.log(`  文件列表: ${files.join(', ')}`);
    passed++;
  } else {
    console.log('❌ 失败: 未生成输出文件');
    failed++;
  }
} else {
  console.log('\n❌ 失败: 输出目录未创建');
  failed++;
}

// 清理临时目录
console.log('\n清理临时文件...');
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
console.log('✅ 清理完成');

// ============================================
// 测试结果
// ============================================

console.log('\n========================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}