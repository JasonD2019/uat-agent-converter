#!/usr/bin/env node
/**
 * UAT CLI - Agent Config Converter Command Line Interface v1.1
 *
 * Usage:
 *   node uat-cli.js parse --input <file> [--platform <name>]
 *   node uat-cli.js parse --content <string> [--platform <name>]
 *   node uat-cli.js convert --schema <file> --target <platform>
 *   node uat-cli.js platforms
 *   node uat-cli.js detect --input <file>
 *   node uat-cli.js detect --content <string>
 */

const fs = require('fs');
const path = require('path');

// ============================================
// Error Codes (E2)
// ============================================

const ErrorCodes = {
  // 输入相关错误 (100-199)
  INPUT_MISSING: { code: 100, message: '缺少输入参数' },
  INPUT_FILE_NOT_FOUND: { code: 101, message: '输入文件不存在' },
  INPUT_EMPTY: { code: 102, message: '输入内容为空' },
  INPUT_PARSE_ERROR: { code: 103, message: '输入内容解析失败' },

  // 平台相关错误 (200-299)
  PLATFORM_NOT_DETECTED: { code: 200, message: '无法自动检测平台' },
  PLATFORM_NOT_SUPPORTED: { code: 201, message: '不支持的平台' },
  PLATFORM_TARGET_MISSING: { code: 202, message: '缺少目标平台参数' },

  // Schema 相关错误 (300-399)
  SCHEMA_FILE_NOT_FOUND: { code: 300, message: 'Schema 文件不存在' },
  SCHEMA_PARSE_ERROR: { code: 301, message: 'Schema JSON 解析失败' },
  SCHEMA_INVALID: { code: 302, message: 'Schema 结构不合法' },

  // 转换相关错误 (400-499)
  CONVERT_FAILED: { code: 400, message: '转换失败' },
  CONVERT_OUTPUT_EMPTY: { code: 401, message: '输出为空' },

  // 输出相关错误 (500-599)
  OUTPUT_WRITE_FAILED: { code: 500, message: '输出文件写入失败' },
  OUTPUT_VALIDATION_FAILED: { code: 501, message: '输出格式校验失败' }
};

/**
 * 输出错误信息（带错误码）
 */
function showError(errorInfo, extra = '') {
  console.error(`❌ [E${errorInfo.code}] ${errorInfo.message}`);
  if (extra) console.error(`   ${extra}`);
}

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
  '../core/schema-extensions.js',    // F1: Schema扩展
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
  '../bundle/knowledge-packager.js',  // F1: 知识库打包
  '../bundle/skills-packager.js',     // F4: 技能打包
  '../detector/platform-detector.js',
  '../parser/parser-pool.js',
  '../parser/memory-parser.js',       // F2/F3: 记忆解析
  '../encoder/encoder-pool.js',
  '../encoder/encoder-registry.js',
  '../guard/secrets-sanitizer.js',    // F5: 敏感信息清理
  '../export/integrity-report.js'     // F6: 完整性报告
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
global.UATSchemaExtensions = window.UATSchemaExtensions;
global.UATMemoryParser = window.UATMemoryParser;
global.UATKnowledgePackager = window.UATKnowledgePackager;
global.UATSkillsPackager = window.UATSkillsPackager;
global.UATSecretsSanitizer = window.UATSecretsSanitizer;
global.UATIntegrityReport = window.UATIntegrityReport;

// ============================================
// Temp Files Tracking (E3)
// ============================================

const tempFiles = [];
const TEMP_DIR = path.join(process.cwd(), '.uat-temp');

/**
 * 创建临时文件
 */
function createTempFile(content, suffix = '.tmp') {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  const tempPath = path.join(TEMP_DIR, `input_${Date.now()}${suffix}`);
  fs.writeFileSync(tempPath, content);
  tempFiles.push(tempPath);
  return tempPath;
}

/**
 * 清理所有临时文件 (E3)
 */
function cleanupTempFiles() {
  if (tempFiles.length > 0) {
    for (const file of tempFiles) {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        // 忽略删除失败
      }
    }
    tempFiles.length = 0;
  }

  // 清理临时目录（如果为空）
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const remaining = fs.readdirSync(TEMP_DIR);
      if (remaining.length === 0) {
        fs.rmSync(TEMP_DIR, { recursive: true });
      }
    }
  } catch (e) {
    // 忽略
  }
}

// 程序退出时自动清理 (E3)
process.on('exit', cleanupTempFiles);
process.on('SIGINT', () => {
  cleanupTempFiles();
  process.exit(0);
});

// ============================================
// Platform Detection with Confidence (E4)
// ============================================

/**
 * 平台检测置信度计算
 * @param {string} content 输入内容
 * @returns {Object} { platform, confidence }
 */
function detectPlatformWithConfidence(content) {
  const result = {
    platform: 'plain',
    confidence: 0,
    matches: []
  };

  // 各平台检测规则和权重
  const platformRules = [
    { name: 'dify', patterns: ['dify_version', 'app:', 'nodes:', 'edges:'], weight: 1 },
    { name: 'openclaw', patterns: ['# Identity', '# Soul', '# Skill', 'Name:'], weight: 1.2 },
    { name: 'hermes', patterns: ['hermes_version', 'agent:', 'model:', 'soul:'], weight: 1.1 },
    { name: 'cursor', patterns: ['.cursorrules', '# Rules', '## Code', '- Always'], weight: 0.9 },
    { name: 'windsurf', patterns: ['.windsurfrules', '## Identity', '## Workflow'], weight: 0.9 },
    { name: 'claude', patterns: ['---', 'name:', 'description:', '# Instructions'], weight: 0.8 },
    { name: 'fastgpt', patterns: ['appConfig', 'chatConfig', 'workflow', '"nodes":'], weight: 1.3 },
    { name: 'flowise', patterns: ['"nodes":', '"edges":', 'ChatOpenAI', 'LLMChain'], weight: 1.2 },
    { name: 'copilot', patterns: ['# GitHub Copilot', '## Instructions', 'Core Principles'], weight: 0.8 },
    { name: 'codex', patterns: ['# Agent Identity', '## Skills', '## Memory', 'AGENTS.md'], weight: 0.9 },
    { name: 'zed', patterns: ['# Zed', '## Rules', '## Settings', '## Identity'], weight: 0.9 }
  ];

  // 检测每个平台
  for (const rule of platformRules) {
    let matchCount = 0;
    for (const pattern of rule.patterns) {
      if (content.includes(pattern)) {
        matchCount++;
        result.matches.push({ platform: rule.name, pattern, matched: true });
      }
    }

    if (matchCount > 0) {
      const score = (matchCount / rule.patterns.length) * rule.weight;
      if (score > result.confidence) {
        result.confidence = score;
        result.platform = rule.name;
      }
    }
  }

  // 使用内置检测器进行验证
  const detected = window.UATDetector?.detectPlatform?.(content);
  if (detected && detected !== 'plain') {
    // 如果内置检测器结果不同，降低置信度但优先使用内置结果
    if (detected !== result.platform) {
      result.confidence *= 0.5;
      result.platform = detected;
    } else {
      // 一致时提高置信度
      result.confidence = Math.min(result.confidence + 0.2, 1);
    }
  }

  // 置信度阈值处理
  if (result.confidence < 0.3) {
    result.confidence = 0;
    result.platform = 'plain';
  }

  return result;
}

// ============================================
// Output Validation (E5)
// ============================================

/**
 * 验证输出文件
 * @param {Object} files 输出文件集合 { path: content }
 * @param {string} target 目标平台
 * @returns {Object} { valid, errors }
 */
function validateOutput(files, target) {
  const result = {
    valid: true,
    errors: [],
    fileCount: Object.keys(files).length
  };

  // 基本检查
  if (result.fileCount === 0) {
    result.valid = false;
    result.errors.push('输出文件为空');
    return result;
  }

  // 平台特定检查
  const requiredPatterns = {
    dify: ['dify_version'],
    openclaw: ['# Identity', '# Soul'],
    hermes: ['hermes_version'],
    cursor: ['# Cursor'],
    windsurf: ['# Windsurf'],
    claude: ['---', '# Instructions'],
    fastgpt: ['"appConfig"', '"chatConfig"'],
    flowise: ['"nodes"', '"edges"'],
    copilot: ['# GitHub Copilot'],
    codex: ['---', 'name:'],
    zed: ['# Zed']
  };

  const patterns = requiredPatterns[target] || [];

  for (const [filePath, content] of Object.entries(files)) {
    // 检查文件不为空
    if (!content || content.trim().length === 0) {
      result.errors.push(`文件 ${filePath} 内容为空`);
      result.valid = false;
      continue;
    }

    // 检查平台特征模式
    for (const pattern of patterns) {
      if (!content.includes(pattern)) {
        result.errors.push(`文件 ${filePath} 缺少平台特征: ${pattern}`);
        // 不标记为无效，只是警告
      }
    }
  }

  return result;
}

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
UAT CLI - Agent Config Converter v1.2 (F系列优化)

用法:
  uat parse --input <file> [--platform <name>]     解析配置文件生成 Schema
  uat parse --content <string> [--platform <name>] 直接解析内容字符串 (E1)
  uat convert --schema <file> --target <platform>  转换 Schema 到目标平台
  uat platforms                                    列出支持的平台
  uat detect --input <file>                        自动检测文件平台
  uat detect --content <string>                    直接检测内容平台 (E1)
  uat integrity --schema <file>                    生成完整性报告 (F6)
  uat help                                         显示帮助

选项:
  --input <path>          输入文件路径
  --content <string>      直接传入内容字符串 (E1 新增)
  --platform <name>       源平台名称（可选，默认自动检测）
  --schema <path>         Schema JSON 文件路径
  --target <platform>     目标平台名称
  --output <path>         输出文件路径
  --output-dir <path>     输出目录
  --validate              校验输出格式 (E5 新增)
  --confidence            显示检测置信度 (E4 新增)
  --integrity             生成完整性报告 (F6 新增)
  --pack-kb               打包知识库内容 (F1 新增)
  --pack-skills           打包技能信息 (F4 新增)
  --sanitize              清理敏感信息 (F5 新增)
  --sanitize-strategy     清理策略: mask | remove | placeholder (默认 mask)
  --format                报告格式: json | markdown | yaml | html (默认 markdown)

新增功能:
  Phase 2 E系列: --content, 错误码, 临时清理, 检测置信度, 输出校验
  Phase 2 F系列: 知识库打包, 记忆结构化, 技能打包, 敏感清理, 完整性报告

示例:
  uat parse --input dify.yaml --platform dify
  uat parse --content "dify_version: 0.1" --platform dify --pack-kb
  uat parse --input config.json                          # 自动检测平台
  uat convert --schema schema.json --target cursor --validate --sanitize
  uat detect --input config.yaml --confidence
  uat integrity --schema schema.json --format markdown

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
  const contentDirect = args.content; // E1: 直接内容
  const platform = args.platform;
  const outputPath = args.output;
  const showConfidence = args.confidence; // E4
  const packKB = args['pack-kb']; // F1
  const packSkills = args['pack-skills']; // F4
  const sanitize = args.sanitize; // F5
  const sanitizeStrategy = args['sanitize-strategy'] || 'mask'; // F5

  // E1: 支持 --content 直接传入内容
  let content;
  let sourceLabel;

  if (contentDirect) {
    // 直接传入内容
    content = contentDirect;
    sourceLabel = 'content string';
  } else if (inputPath) {
    // 从文件读取
    if (!fs.existsSync(inputPath)) {
      showError(ErrorCodes.INPUT_FILE_NOT_FOUND, inputPath);
      process.exit(ErrorCodes.INPUT_FILE_NOT_FOUND.code);
    }
    content = fs.readFileSync(inputPath, 'utf-8');
    sourceLabel = inputPath;
  } else {
    showError(ErrorCodes.INPUT_MISSING, '请提供 --input 或 --content 参数');
    process.exit(ErrorCodes.INPUT_MISSING.code);
  }

  // 检查内容不为空
  if (!content || content.trim().length === 0) {
    showError(ErrorCodes.INPUT_EMPTY);
    process.exit(ErrorCodes.INPUT_EMPTY.code);
  }

  // 自动检测平台（如果未指定）
  let detectedPlatform = platform;
  let detectionResult = null;

  if (!detectedPlatform) {
    detectionResult = detectPlatformWithConfidence(content);
    detectedPlatform = detectionResult.platform;

    if (showConfidence) {
      console.log('🔍 检测详情:');
      console.log(`  平台: ${detectedPlatform}`);
      console.log(`  置信度: ${(detectionResult.confidence * 100).toFixed(1)}%`);
      if (detectionResult.matches.length > 0) {
        console.log('  匹配模式:');
        detectionResult.matches.slice(0, 5).forEach(m => {
          console.log(`    - ${m.platform}: "${m.pattern}"`);
        });
      }
    } else {
      console.log(`🔍 自动检测平台: ${detectedPlatform}`);
    }

    if (detectedPlatform === 'plain') {
      showError(ErrorCodes.PLATFORM_NOT_DETECTED, '请使用 --platform 手动指定');
      showPlatformsBrief();
      process.exit(ErrorCodes.PLATFORM_NOT_DETECTED.code);
    }
  }

  // 执行解析
  try {
    const schema = window.UATParser?.runParserPool?.(content, detectedPlatform);

    if (!schema) {
      showError(ErrorCodes.INPUT_PARSE_ERROR, '无法生成 Schema');
      process.exit(ErrorCodes.INPUT_PARSE_ERROR.code);
    }

    // F1: 知识库打包
    if (packKB && window.UATKnowledgePackager) {
      console.log('📦 打包知识库...');
      const kbResult = window.UATKnowledgePackager.packKnowledgeBase(schema);
      if (kbResult.packed) {
        console.log(`  ✓ 数据集: ${kbResult.stats.datasets}`);
        console.log(`  ✓ 文档: ${kbResult.stats.documents}`);
        console.log(`  ✓ Q&A: ${kbResult.stats.qaPairs}`);
        if (kbResult.warnings.length > 0) {
          kbResult.warnings.forEach(w => console.log(`  ⚠ ${w}`));
        }
      } else {
        console.log('  ⚠ 未找到知识库内容');
      }
    }

    // F4: 技能打包
    if (packSkills && window.UATSkillsPackager) {
      console.log('🎯 打包技能...');
      const skillsResult = window.UATSkillsPackager.packSkills(schema);
      if (skillsResult.packed) {
        console.log(`  ✓ 技能: ${skillsResult.stats.skills}`);
        console.log(`  ✓ 能力: ${skillsResult.stats.capabilities}`);
        console.log(`  ✓ 专业化: ${skillsResult.stats.specializations}`);
        if (skillsResult.stats.inferredSkills > 0) {
          console.log(`  ✓ 推断技能: ${skillsResult.stats.inferredSkills}`);
        }
      } else {
        console.log('  ⚠ 未找到技能信息');
      }
    }

    // F5: 敏感信息清理
    if (sanitize && window.UATSecretsSanitizer) {
      console.log('🔐 检查敏感信息...');
      const sanitizeResult = window.UATSecretsSanitizer.sanitizeSecrets(schema, {
        strategy: sanitizeStrategy
      });
      if (sanitizeResult.stats.total > 0) {
        console.log(`  ✓ 检测到 ${sanitizeResult.stats.total} 个敏感项`);
        console.log(`  ✓ 使用 ${sanitizeStrategy} 策略清理`);
        // 更新 schema 为清理后的版本
        Object.assign(schema, sanitizeResult.sanitized);
      } else {
        console.log('  ✓ 未检测到敏感信息');
      }
    }

    // 输出结果
    const schemaJson = JSON.stringify(schema, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, schemaJson);
      console.log(`✅ Schema 已保存到: ${outputPath}`);
    } else {
      console.log('✅ 解析成功');
      console.log(`来源: ${sourceLabel}`);
      console.log(`平台: ${detectedPlatform}`);
      console.log('Schema:');
      console.log(schemaJson);
    }

    return schema;

  } catch (err) {
    showError(ErrorCodes.INPUT_PARSE_ERROR, err.message);
    process.exit(ErrorCodes.INPUT_PARSE_ERROR.code);
  }
}

/**
 * 转换 Schema 到目标平台
 */
function convertCommand(args) {
  const schemaPath = args.schema;
  const target = args.target;
  const outputDir = args['output-dir'] || process.cwd();
  const shouldValidate = args.validate; // E5
  const sanitize = args.sanitize; // F5
  const sanitizeStrategy = args['sanitize-strategy'] || 'mask'; // F5
  const generateIntegrity = args.integrity; // F6
  const format = args.format || 'markdown'; // F6

  if (!schemaPath) {
    showError(ErrorCodes.INPUT_MISSING, '请提供 --schema 参数');
    process.exit(ErrorCodes.INPUT_MISSING.code);
  }

  if (!target) {
    showError(ErrorCodes.PLATFORM_TARGET_MISSING);
    showPlatformsBrief();
    process.exit(ErrorCodes.PLATFORM_TARGET_MISSING.code);
  }

  // 读取 Schema
  let schema;
  try {
    if (!fs.existsSync(schemaPath)) {
      showError(ErrorCodes.SCHEMA_FILE_NOT_FOUND, schemaPath);
      process.exit(ErrorCodes.SCHEMA_FILE_NOT_FOUND.code);
    }
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(schemaContent);
  } catch (err) {
    showError(ErrorCodes.SCHEMA_PARSE_ERROR, err.message);
    process.exit(ErrorCodes.SCHEMA_PARSE_ERROR.code);
  }

  // F5: 敏感信息清理（清理源 Schema）
  if (sanitize && window.UATSecretsSanitizer) {
    console.log('🔐 检查源 Schema 敏感信息...');
    const sanitizeResult = window.UATSecretsSanitizer.sanitizeSecrets(schema, {
      strategy: sanitizeStrategy
    });
    if (sanitizeResult.stats.total > 0) {
      console.log(`  ✓ 检测到 ${sanitizeResult.stats.total} 个敏感项`);
      console.log(`  ✓ 使用 ${sanitizeStrategy} 策略清理`);
      schema = sanitizeResult.sanitized;
    } else {
      console.log('  ✓ 未检测到敏感信息');
    }
  }

  // 执行转换
  try {
    const encoder = window.UATEncoder?.getEncoder?.(target);
    if (!encoder) {
      showError(ErrorCodes.PLATFORM_NOT_SUPPORTED, target);
      showPlatformsBrief();
      process.exit(ErrorCodes.PLATFORM_NOT_SUPPORTED.code);
    }

    const files = encoder.encodeToFiles?.(schema);

    if (!files || Object.keys(files).length === 0) {
      showError(ErrorCodes.CONVERT_OUTPUT_EMPTY);
      process.exit(ErrorCodes.CONVERT_OUTPUT_EMPTY.code);
    }

    // F5: 输出文件敏感信息清理
    if (sanitize && window.UATSecretsSanitizer) {
      console.log('🔐 检查输出文件敏感信息...');
      let totalSanitized = 0;
      for (const [filePath, content] of Object.entries(files)) {
        const detected = window.UATSecretsSanitizer.detectSecretsInText(content);
        if (detected.length > 0) {
          files[filePath] = window.UATSecretsSanitizer.sanitizeText(content, sanitizeStrategy, '[REDACTED]');
          totalSanitized += detected.length;
        }
      }
      if (totalSanitized > 0) {
        console.log(`  ✓ 清理输出文件中 ${totalSanitized} 个敏感项`);
      } else {
        console.log('  ✓ 输出文件无敏感信息');
      }
    }

    // E5: 输出格式校验
    if (shouldValidate) {
      const validation = validateOutput(files, target);
      console.log('📋 输出校验:');
      console.log(`  文件数量: ${validation.fileCount}`);

      if (validation.errors.length > 0) {
        console.log('  ⚠️  警告:');
        validation.errors.forEach(err => console.log(`    - ${err}`));
      }

      if (validation.valid) {
        console.log('  ✅ 输出格式有效');
      } else {
        showError(ErrorCodes.OUTPUT_VALIDATION_FAILED);
        process.exit(ErrorCodes.OUTPUT_VALIDATION_FAILED.code);
      }
    }

    // 输出结果
    console.log('✅ 转换成功');
    console.log(`目标: ${target}`);
    console.log(`输出目录: ${outputDir}`);
    console.log('生成文件:');

    Object.entries(files).forEach(([filePath, content]) => {
      const fullPath = path.join(outputDir, filePath);
      const lineCount = content.split('\n').length;

      // 保目录存在
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入文件
      try {
        fs.writeFileSync(fullPath, content);
        console.log(`  ✓ ${filePath} (${lineCount} lines)`);
      } catch (err) {
        showError(ErrorCodes.OUTPUT_WRITE_FAILED, `${filePath}: ${err.message}`);
      }
    });

    console.log(`\n共 ${Object.keys(files).length} 个文件已保存`);

    // F6: 生成完整性报告
    if (generateIntegrity && window.UATIntegrityReport) {
      console.log('\n📊 生成完整性报告...');
      const report = window.UATIntegrityReport.generateIntegrityReport(schema);
      const reportContent = window.UATIntegrityReport.exportReport(report, format);

      const reportFileName = `integrity-report.${format === 'markdown' ? 'md' : format}`;
      const reportPath = path.join(outputDir, reportFileName);
      fs.writeFileSync(reportPath, reportContent);
      console.log(`  ✓ 完整性报告: ${reportFileName}`);
      console.log(`    状态: ${report.summary.status}, 数据损失: ${report.summary.dataLoss}`);
    }

    return files;

  } catch (err) {
    showError(ErrorCodes.CONVERT_FAILED, err.message);
    process.exit(ErrorCodes.CONVERT_FAILED.code);
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
  const contentDirect = args.content; // E1
  const showConfidence = args.confidence; // E4

  // E1: 支持 --content
  let content;

  if (contentDirect) {
    content = contentDirect;
  } else if (inputPath) {
    if (!fs.existsSync(inputPath)) {
      showError(ErrorCodes.INPUT_FILE_NOT_FOUND, inputPath);
      process.exit(ErrorCodes.INPUT_FILE_NOT_FOUND.code);
    }
    content = fs.readFileSync(inputPath, 'utf-8');
  } else {
    showError(ErrorCodes.INPUT_MISSING, '请提供 --input 或 --content 参数');
    process.exit(ErrorCodes.INPUT_MISSING.code);
  }

  // E4: 使用增强检测
  const detection = detectPlatformWithConfidence(content);

  console.log('✅ 检测结果:');
  console.log(`  平台: ${detection.platform}`);

  if (showConfidence) {
    console.log(`  置信度: ${(detection.confidence * 100).toFixed(1)}%`);

    if (detection.matches.length > 0) {
      console.log('  匹配特征:');
      detection.matches.slice(0, 10).forEach(m => {
        console.log(`    - [${m.platform}] "${m.pattern}"`);
      });
    }
  }

  if (detection.platform === 'plain') {
    console.log('');
    console.log('⚠️  提示: 未检测到特定平台格式');
    console.log('可能原因:');
    console.log('  - 配置格式不标准');
    console.log('  - 缺少平台特征字段');
    console.log('请使用 --platform 手动指定');
    showPlatformsBrief();
  }
}

/**
 * 显示平台列表（错误提示用）
 */
function showPlatformsBrief() {
  console.log('支持的平台: dify, openclaw, hermes, cursor, windsurf, claude, fastgpt, flowise, copilot, codex, zed');
}

// ============================================
// F6: 完整性报告命令
// ============================================

/**
 * 生成完整性报告
 */
function integrityCommand(args) {
  const schemaPath = args.schema;
  const format = args.format || 'markdown';
  const outputPath = args.output;

  if (!schemaPath) {
    showError(ErrorCodes.INPUT_MISSING, '请提供 --schema 参数');
    process.exit(ErrorCodes.INPUT_MISSING.code);
  }

  // 读取 Schema
  let schema;
  try {
    if (!fs.existsSync(schemaPath)) {
      showError(ErrorCodes.SCHEMA_FILE_NOT_FOUND, schemaPath);
      process.exit(ErrorCodes.SCHEMA_FILE_NOT_FOUND.code);
    }
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(schemaContent);
  } catch (err) {
    showError(ErrorCodes.SCHEMA_PARSE_ERROR, err.message);
    process.exit(ErrorCodes.SCHEMA_PARSE_ERROR.code);
  }

  // 生成完整性报告
  try {
    console.log('📊 生成完整性报告...');

    if (!window.UATIntegrityReport) {
      showError(ErrorCodes.CONVERT_FAILED, '完整性报告模块未加载');
      process.exit(ErrorCodes.CONVERT_FAILED.code);
    }

    const report = window.UATIntegrityReport.generateIntegrityReport(schema);
    const reportContent = window.UATIntegrityReport.exportReport(report, format);

    console.log('');
    console.log('📋 报告摘要:');
    console.log(`  状态: ${report.summary.status}`);
    console.log(`  检查项: ${report.summary.totalChecks}`);
    console.log(`  通过: ${report.summary.passed}`);
    console.log(`  警告: ${report.summary.warnings}`);
    console.log(`  错误: ${report.summary.errors}`);
    console.log(`  数据损失: ${report.summary.dataLoss}`);

    if (report.warnings.length > 0) {
      console.log('');
      console.log('⚠️  警告详情:');
      report.warnings.slice(0, 5).forEach(w => {
        console.log(`  - ${w.message}`);
      });
    }

    if (report.errors.length > 0) {
      console.log('');
      console.log('❌ 错误详情:');
      report.errors.slice(0, 5).forEach(e => {
        console.log(`  - ${e.message}`);
      });
    }

    if (report.suggestions.length > 0) {
      console.log('');
      console.log('💡 建议:');
      report.suggestions.forEach(s => {
        console.log(`  - [${s.priority}] ${s.message}`);
      });
    }

    // 输出完整报告
    if (outputPath) {
      fs.writeFileSync(outputPath, reportContent);
      console.log('');
      console.log(`✅ 报告已保存到: ${outputPath}`);
    } else {
      console.log('');
      console.log('---');
      console.log(reportContent);
    }

    // 根据状态决定退出码
    if (report.summary.status === 'error') {
      process.exit(1);
    }

  } catch (err) {
    showError(ErrorCodes.CONVERT_FAILED, err.message);
    process.exit(ErrorCodes.CONVERT_FAILED.code);
  }
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

    case 'integrity':
      integrityCommand(options);
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