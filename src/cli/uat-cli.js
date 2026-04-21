#!/usr/bin/env node
/**
 * UAT CLI - Agent Config Converter Command Line Interface
 *
 * Usage:
 *   node uat-cli.js parse --input <file> [--platform <name>]
 *   node uat-cli.js convert --schema <file> --target <platform>
 *   node uat-cli.js platforms
 *   node uat-cli.js detect --input <file>
 */

const fs = require('fs');
const path = require('path');

// ============================================
// 加载核心模块（Node.js 适配）
// ============================================

// 创建全局 window 对象（Node.js 环境）
if (typeof window === 'undefined') {
  global.window = {};
}

// 加载模块顺序（按依赖关系）
const modulePaths = [
  '../core/schema.js',
  '../bundle/bundle-base.js',
  '../bundle/bundle-manager.js',
  '../bundle/openclaw-bundle.js',
  '../bundle/hermes-bundle.js',
  '../bundle/cursor-bundle.js',
  '../bundle/windsurf-bundle.js',
  '../bundle/claude-code-bundle.js',
  '../bundle/dify-bundle.js',
  '../bundle/fastgpt-bundle.js',
  '../bundle/flowise-bundle.js',
  '../bundle/codex-bundle.js',
  '../bundle/copilot-bundle.js',
  '../bundle/zed-bundle.js',
  '../detector/platform-detector.js',
  '../parser/parser-pool.js',
  '../encoder/encoder-pool.js',
  '../encoder/encoder-registry.js'
];

// 加载每个模块
modulePaths.forEach(modPath => {
  require(path.resolve(__dirname, modPath));
});

// 将关键模块暴露为全局（bundle 文件依赖这些）
global.UATCore = window.UATCore;
global.BundleBase = window.BundleBase;
global.UATDetector = window.UATDetector;
global.UATParser = window.UATParser;
global.UATEncoder = window.UATEncoder;

// ============================================
// CLI 参数解析
// ============================================

function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      result[key] = value;
      if (value !== true) i++;
    } else {
      result._.push(args[i]);
    }
  }
  return result;
}

function showHelp() {
  console.log(`
UAT CLI - Agent Config Converter v1.0

用法:
  uat parse --input <file> [--platform <name>]  解析配置生成 Schema
  uat convert --schema <file> --target <platform> 转换 Schema 到目标平台
  uat platforms                                  列出支持的平台
  uat detect --input <file>                      自动检测平台
  uat help                                       显示帮助

选项:
  --input <path>          输入文件路径
  --platform <name>       源平台名称（可选，默认自动检测）
  --schema <path>         Schema JSON 文件路径
  --target <platform>     目标平台名称
  --output <path>         输出文件路径
  --output-dir <path>     输出目录

示例:
  uat parse --input dify.yaml --platform dify
  uat parse --input config.json                          # 自动检测平台
  uat convert --schema schema.json --target cursor
  uat convert --schema schema.json --target claude --output-dir ./output

支持平台: dify, openclaw, hermes, cursor, windsurf, claude, fastgpt, flowise, copilot, codex, zed

项目地址: https://github.com/JasonD2019/uat-agent-converter
在线演示: https://jasond2019.github.io/uat-agent-converter/
`);
}

// ============================================
// 命令实现
// ============================================

/**
 * 解析配置文件生成 UAT-Schema
 */
function parseCommand(args) {
  const inputPath = args.input;
  const platform = args.platform;
  const outputPath = args.output;

  if (!inputPath) {
    console.error('❌ 错误: 请提供 --input 参数');
    process.exit(1);
  }

  // 读取输入内容
  let content;
  let actualPath = inputPath;

  if (fs.existsSync(inputPath)) {
    content = fs.readFileSync(inputPath, 'utf-8');
  } else {
    // 可能是直接提供的内容（用于 skill 调用）
    content = inputPath;
    // 写入临时文件
    const tempDir = path.join(process.cwd(), '.uat-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    actualPath = path.join(tempDir, 'input.tmp');
    fs.writeFileSync(actualPath, content);
  }

  // 自动检测平台（如果未指定）
  let detectedPlatform = platform;
  if (!detectedPlatform) {
    const detection = window.UATDetector?.detectPlatform?.(content);
    if (detection) {
      detectedPlatform = detection;  // detectPlatform 返回字符串
      console.log(`🔍 自动检测平台: ${detectedPlatform}`);
    } else {
      console.error('❌ 无法自动检测平台，请使用 --platform 指定');
      showPlatformsBrief();
      process.exit(1);
    }
  }

  // 执行解析
  try {
    const schema = window.UATParser?.runParserPool?.(detectedPlatform, content);

    if (!schema) {
      console.error('❌ 解析失败: 无法生成 Schema');
      process.exit(1);
    }

    // 输出结果
    const schemaJson = JSON.stringify(schema, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, schemaJson);
      console.log(`✅ Schema 已保存到: ${outputPath}`);
    } else {
      console.log('✅ 解析成功');
      console.log(`平台: ${detectedPlatform}`);
      console.log('Schema:');
      console.log(schemaJson);
    }

    return schema;

  } catch (err) {
    console.error(`❌ 解析失败: ${err.message}`);
    process.exit(1);
  }
}

/**
 * 转换 Schema 到目标平台
 */
function convertCommand(args) {
  const schemaPath = args.schema;
  const target = args.target;
  const outputDir = args['output-dir'] || process.cwd();

  if (!schemaPath) {
    console.error('❌ 错误: 请提供 --schema 参数');
    process.exit(1);
  }

  if (!target) {
    console.error('❌ 错误: 请提供 --target 参数');
    process.exit(1);
  }

  // 读取 Schema
  let schema;
  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(schemaContent);
  } catch (err) {
    console.error(`❌ Schema 文件读取失败: ${err.message}`);
    process.exit(1);
  }

  // 执行转换
  try {
    const encoder = window.UATEncoder?.getEncoder?.(target);
    if (!encoder) {
      console.error(`❌ 不支持的平台: ${target}`);
      showPlatformsBrief();
      process.exit(1);
    }

    const files = encoder.encodeToFiles?.(schema);

    if (!files || Object.keys(files).length === 0) {
      console.error('❌ 转换失败: 无法生成文件');
      process.exit(1);
    }

    // 输出结果
    console.log('✅ 转换成功');
    console.log(`目标: ${target}`);
    console.log(`输出目录: ${outputDir}`);
    console.log('生成文件:');

    Object.entries(files).forEach(([filePath, content]) => {
      const fullPath = path.join(outputDir, filePath);
      const lineCount = content.split('\n').length;

      // 确保目录存在
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入文件
      fs.writeFileSync(fullPath, content);
      console.log(`  ✓ ${filePath} (${lineCount} lines)`);
    });

    console.log(`\n共 ${Object.keys(files).length} 个文件已保存`);

    return files;

  } catch (err) {
    console.error(`❌ 转换失败: ${err.message}`);
    process.exit(1);
  }
}

/**
 * 列出支持的平台
 */
function platformsCommand() {
  console.log('');
  console.log('支持的平台:');
  console.log('');

  const platforms = [
    { name: 'dify', format: 'YAML DSL', emoji: '💡' },
    { name: 'openclaw', format: 'JSON + MD', emoji: '🦾' },
    { name: 'hermes', format: 'YAML + MD', emoji: '🤖' },
    { name: 'cursor', format: '.cursorrules', emoji: '🔵' },
    { name: 'windsurf', format: '.windsurfrules', emoji: '🌊' },
    { name: 'claude', format: 'CLAUDE.md + settings', emoji: '💜' },
    { name: 'fastgpt', format: 'JSON', emoji: '⚡' },
    { name: 'flowise', format: 'JSON', emoji: '🔗' },
    { name: 'copilot', format: 'copilot-instructions.md', emoji: '🟩' },
    { name: 'codex', format: 'AGENTS.md', emoji: '🟠' },
    { name: 'zed', format: 'rules.md + settings.json', emoji: '🔷' }
  ];

  platforms.forEach(p => {
    console.log(`  ${p.emoji} ${p.name.padEnd(12)} ${p.format}`);
  });

  console.log('');
  console.log('用法示例:');
  console.log('  uat parse --input config.yaml --platform dify');
  console.log('  uat convert --schema schema.json --target cursor');
  console.log('');
}

/**
 * 自动检测平台
 */
function detectCommand(args) {
  const inputPath = args.input;

  if (!inputPath) {
    console.error('❌ 错误: 请提供 --input 参数');
    process.exit(1);
  }

  let content;
  if (fs.existsSync(inputPath)) {
    content = fs.readFileSync(inputPath, 'utf-8');
  } else {
    content = inputPath;
  }

  const detection = window.UATDetector?.detectPlatform?.(content);

  if (detection) {
    console.log('✅ 检测结果:');
    console.log(`  平台: ${detection}`);  // detectPlatform 返回字符串
  } else {
    console.log('❌ 无法检测平台');
    console.log('');
    console.log('可能原因:');
    console.log('  - 配置格式不标准');
    console.log('  - 缺少平台特征字段');
    console.log('  - 请使用 --platform 手动指定');
  }
}

/**
 * 显示平台列表（错误提示用）
 */
function showPlatformsBrief() {
  console.log('支持的平台: dify, openclaw, hermes, cursor, windsurf, claude, fastgpt, flowise, copilot, codex, zed');
}

// ============================================
// 主入口
// ============================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  switch (command) {
    case 'parse':
      parseCommand(options);
      break;

    case 'convert':
      convertCommand(options);
      break;

    case 'platforms':
    case 'list':
      platformsCommand();
      break;

    case 'detect':
      detectCommand(options);
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      showHelp();
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();