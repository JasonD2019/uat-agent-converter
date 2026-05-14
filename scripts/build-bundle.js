#!/usr/bin/env node
/**
 * UAT Bundle Builder - Packages core modules into standalone UMD bundle
 *
 * Usage: node scripts/build-bundle.js
 * Output: dist/uat-bundle.js (~180KB)
 */

const fs = require('fs');
const path = require('path');

// Source files in dependency order
// Note: Excludes export-utils.js (UI-only, not needed for CLI)
// Note: Excludes bundle-manager.js (UI-only, ZIP packaging)
const sourceFiles = [
  // Schema Layer
  'src/core/schema.js',
  'src/core/schema-extensions.js',

  // Detection Layer
  'src/detector/platform-detector.js',

  // Parser Layer
  'src/parser/parser-pool.js',
  'src/parser/memory-parser.js',

  // Encoder Layer
  'src/encoder/encoder-pool.js',
  'src/encoder/encoder-registry.js',
  'src/encoder/memory-encoder.js',
  'src/encoder/knowledge-encoder.js',
  'src/encoder/skills-encoder.js',
  'src/encoder/mcp-encoder.js',

  // Utility Layer
  'src/bundle/bundle-base.js',

  // Platform Bundles (all 11 platforms)
  'src/bundle/openclaw-bundle.js',
  'src/bundle/hermes-bundle.js',
  'src/bundle/cursor-bundle.js',
  'src/bundle/windsurf-bundle.js',
  'src/bundle/claude-code-bundle.js',
  'src/bundle/dify-bundle.js',
  'src/bundle/fastgpt-bundle.js',
  'src/bundle/flowise-bundle.js',
  'src/bundle/copilot-bundle.js',
  'src/bundle/codex-bundle.js',
  'src/bundle/zed-bundle.js',

  // CLI Entry
  'src/cli/bundle-cli.js'
];

/**
 * Process single source file for bundling
 * - Remove project-specific require() statements (local modules)
 * - Keep Node.js built-in requires (fs, path, etc.)
 * - Keep function definitions intact
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Node.js built-in modules to preserve
  const builtins = ['fs', 'path', 'crypto', 'http', 'https', 'util', 'stream', 'events', 'buffer', 'url', 'os', 'child_process'];

  // Remove module loading try-catch blocks for local modules only
  // These blocks try to load local modules like '../core/schema.js' etc.
  const moduleLoadingPattern = /try\s*\{[\s\S]*?require\s*\(\s*path\.resolve[\s\S]*?\}\s*catch\s*\(\s*e\s*\)\s*\{[\s\S]*?\}/g;
  content = content.replace(moduleLoadingPattern, '');

  // Remove require statements for LOCAL modules (relative paths)
  // Pattern: require('./...') or require('../...') or require(path.resolve(...))
  content = content.replace(/const\s+[\w]+\s*=\s*require\s*\(\s*['"][.\/][^'"]*['"]\s*\);?\n?/g, '');
  content = content.replace(/let\s+[\w]+\s*=\s*require\s*\(\s*['"][.\/][^'"]*['"]\s*\);?\n?/g, '');
  content = content.replace(/[\w]+\s*=\s*require\s*\(\s*['"][.\/][^'"]*['"]\s*\);?\n?/g, '');
  content = content.replace(/require\s*\(\s*path\.resolve[\s\S]*?\);?\n?/g, '');

  // Remove "if typeof UATCore === 'undefined'" blocks that contain local requires
  content = content.replace(/}?\s*else\s+if\s*\(\s*typeof\s+\w+\s*===\s*'undefined'\s*\)\s*\{[\s\S]*?require[\s\S]*?\}/g, '');

  // Clean up empty blocks
  content = content.replace(/try\s*\{\s*\}\s*catch\s*\(\s*e\s*\)\s*\{[\s\S]*?\}/g, '');
  content = content.replace(/else\s+if\s*\([^)]*\)\s*\{\s*\}/g, '');

  // Remove module.exports at file level (handled by UMD wrapper)
  content = content.replace(/^module\.exports\s*=\s*.*;\n?/gm, '');

  // Clean up multiple consecutive empty lines
  content = content.replace(/\n{3,}/g, '\n\n');

  return content;
}

/**
 * Build the complete UMD bundle
 */
function buildBundle() {
  const outputDir = path.join(__dirname, '..', 'dist');

  // Create dist directory if not exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // UMD wrapper header
  let bundleContent = `(function(root, factory) {
  // UMD wrapper - supports Node.js and browser
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.UATBundle = factory();
  }
})(typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this, function() {

'use strict';

// Create window object for Node.js compatibility
if (typeof window === 'undefined') {
  global.window = {};
}

// ============================================
// Global module aliases (for source compatibility)
// Source files reference these globals directly
// Note: Do NOT declare class/function names here - they are defined in source files
// ============================================
var UATCore;
var UATSchemaExtensions;
var UATDetector;
var UATParser;
var BundleBase;
var runParserPool;
var runEncoderPool;

// Platform Bundle aliases
var OpenClawBundle;
var HermesBundle;
var CursorBundle;
var WindsurfBundle;
var ClaudeCodeBundle;
var DifyBundle;
var FastGPTBundle;
var FlowiseBundle;
var CopilotBundle;
var CodexBundle;
var ZedBundle;

`;

  // Merge source files
  let filesProcessed = 0;
  for (const srcFile of sourceFiles) {
    const filePath = path.join(__dirname, '..', srcFile);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Skipping missing file: ${srcFile}`);
      continue;
    }

    bundleContent += `\n// ===== ${srcFile} =====\n`;
    bundleContent += processFile(filePath);
    filesProcessed++;

    // Add global alias assignment after each module
    // This ensures bare global references work in the bundle
    if (srcFile === 'src/core/schema.js') {
      bundleContent += `\n// Link global alias\nUATCore = window.UATCore;\n`;
    } else if (srcFile === 'src/core/schema-extensions.js') {
      bundleContent += `\n// Link global alias\nUATSchemaExtensions = window.UATSchemaExtensions;\n`;
    } else if (srcFile === 'src/detector/platform-detector.js') {
      bundleContent += `\n// Link global alias\nUATDetector = window.UATDetector;\n`;
    } else if (srcFile === 'src/parser/parser-pool.js') {
      bundleContent += `\n// Link global alias\nUATParser = window.UATParser;\nrunParserPool = window.UATParser.runParserPool;\n`;
    } else if (srcFile === 'src/encoder/encoder-pool.js') {
      bundleContent += `\n// Link global alias\nrunEncoderPool = window.runEncoderPool;\n`;
    } else if (srcFile === 'src/encoder/encoder-registry.js') {
      bundleContent += `\n// UATEncoder class defined above and exported to window.UATEncoder\n`;
    } else if (srcFile === 'src/bundle/bundle-base.js') {
      bundleContent += `\n// Link global alias\nBundleBase = window.BundleBase;\n`;
    } else if (srcFile === 'src/bundle/openclaw-bundle.js') {
      bundleContent += `\n// Link global alias\nOpenClawBundle = window.OpenClawBundle;\n`;
    } else if (srcFile === 'src/bundle/hermes-bundle.js') {
      bundleContent += `\n// Link global alias\nHermesBundle = window.HermesBundle;\n`;
    } else if (srcFile === 'src/bundle/cursor-bundle.js') {
      bundleContent += `\n// Link global alias\nCursorBundle = window.CursorBundle;\n`;
    } else if (srcFile === 'src/bundle/windsurf-bundle.js') {
      bundleContent += `\n// Link global alias\nWindsurfBundle = window.WindsurfBundle;\n`;
    } else if (srcFile === 'src/bundle/claude-code-bundle.js') {
      bundleContent += `\n// Link global alias\nClaudeCodeBundle = window.ClaudeCodeBundle;\n`;
    } else if (srcFile === 'src/bundle/dify-bundle.js') {
      bundleContent += `\n// Link global alias\nDifyBundle = window.DifyBundle;\n`;
    } else if (srcFile === 'src/bundle/fastgpt-bundle.js') {
      bundleContent += `\n// Link global alias\nFastGPTBundle = window.FastGPTBundle;\n`;
    } else if (srcFile === 'src/bundle/flowise-bundle.js') {
      bundleContent += `\n// Link global alias\nFlowiseBundle = window.FlowiseBundle;\n`;
    } else if (srcFile === 'src/bundle/copilot-bundle.js') {
      bundleContent += `\n// Link global alias\nCopilotBundle = window.CopilotBundle;\n`;
    } else if (srcFile === 'src/bundle/codex-bundle.js') {
      bundleContent += `\n// Link global alias\nCodexBundle = window.CodexBundle;\n`;
    } else if (srcFile === 'src/bundle/zed-bundle.js') {
      bundleContent += `\n// Link global alias\nZedBundle = window.ZedBundle;\n`;
    }
  }

  // UMD wrapper footer with API exports
  bundleContent += `

// ===== Bundle API Exports =====
return {
  /**
   * Parse config content to UAT-Schema
   * @param {string} content - Config file content
   * @param {string} [platform] - Source platform (auto-detect if omitted)
   * @returns {Object} UAT-Schema v2.0 JSON
   */
  parse: function(content, platform) {
    if (!platform) {
      platform = window.UATDetector?.detectPlatform?.(content) || 'plain';
    }
    return window.UATParser?.runParserPool?.(content, platform) || null;
  },

  /**
   * Convert UAT-Schema to target platform
   * @param {Object} schema - UAT-Schema v2.0 JSON
   * @param {string} target - Target platform name
   * @returns {Object|string} Platform config output
   */
  convert: function(schema, target) {
    return window.UATEncoder?.runEncoderPool?.(schema, target) || null;
  },

  /**
   * Detect platform from config content
   * @param {string} content - Config file content
   * @returns {Object} { platform, confidence }
   */
  detect: function(content) {
    const platform = window.UATDetector?.detectPlatform?.(content) || 'plain';
    const confidence = platform === 'plain' ? 0 : 0.8;
    return { platform, confidence };
  },

  /**
   * Run CLI commands (Node.js only)
   * @param {Array} args - Command line arguments
   */
  runCLI: function(args) {
    if (typeof process !== 'undefined' && window.runBundleCLI) {
      window.runBundleCLI(args || process.argv.slice(2));
    }
  },

  // Module references for advanced use
  UATCore: window.UATCore,
  UATDetector: window.UATDetector,
  UATParser: window.UATParser,
  UATSchemaExtensions: window.UATSchemaExtensions,
  UATEncoder: window.UATEncoder,

  // Platform Bundle references
  OpenClawBundle: window.OpenClawBundle,
  HermesBundle: window.HermesBundle,
  CursorBundle: window.CursorBundle,
  WindsurfBundle: window.WindsurfBundle,
  ClaudeCodeBundle: window.ClaudeCodeBundle,
  DifyBundle: window.DifyBundle,
  FastGPTBundle: window.FastGPTBundle,
  FlowiseBundle: window.FlowiseBundle,
  CopilotBundle: window.CopilotBundle,
  CodexBundle: window.CodexBundle,
  ZedBundle: window.ZedBundle,

  supportedPlatforms: ['dify', 'openclaw', 'hermes', 'cursor', 'windsurf', 'claude', 'fastgpt', 'flowise', 'copilot', 'codex', 'zed', 'plain']
};

});
`;

  // Write bundle file
  const outputPath = path.join(outputDir, 'uat-bundle.js');
  fs.writeFileSync(outputPath, bundleContent, 'utf-8');

  const sizeKB = Math.round(bundleContent.length / 1024);
  console.log(`✅ Bundle generated: ${outputPath}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Files processed: ${filesProcessed}/${sourceFiles.length}`);

  return outputPath;
}

// Execute build
buildBundle();