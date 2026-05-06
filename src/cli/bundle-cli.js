/**
 * UAT Bundle CLI - Lightweight CLI entry for standalone bundle
 *
 * Supports: parse, convert, detect, platforms commands
 * Designed for dynamic loading via Skill's WebFetch mechanism
 */

// ============================================
// CLI Argument Parser
// ============================================

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] && args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

// ============================================
// Command Handlers
// ============================================

function handleParse(options) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;

  let content = options.content;

  // Read from file if --input provided
  if (!content && options.input && fs) {
    try {
      content = fs.readFileSync(options.input, 'utf-8');
    } catch (e) {
      console.error(`❌ Cannot read file: ${options.input}`);
      return;
    }
  }

  if (!content) {
    console.error('❌ Missing input. Use --content <string> or --input <file>');
    showHelp();
    return;
  }

  const platform = options.platform || window.UATDetector?.detectPlatform?.(content) || 'plain';
  const result = window.UATParser?.runParserPool?.(content, platform);

  if (result) {
    if (options.output && fs) {
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      console.log(`✅ Schema saved to: ${options.output}`);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } else {
    console.error('❌ Parse failed. Check input format.');
  }
}

function handleConvert(options) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;

  let schema = options.schema;

  // Parse schema from string or file
  if (typeof schema === 'string') {
    try {
      schema = JSON.parse(schema);
    } catch (e) {
      // Maybe it's a file path
      if (fs && options.schema) {
        try {
          const content = fs.readFileSync(options.schema, 'utf-8');
          schema = JSON.parse(content);
        } catch (e2) {
          console.error('❌ Invalid schema JSON');
          return;
        }
      }
    }
  }

  const target = options.target;
  if (!target) {
    console.error('❌ Missing --target platform');
    showHelp();
    return;
  }

  const result = window.UATEncoder?.runEncoderPool?.(schema, target);

  if (result) {
    const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
    console.log(output);
  } else {
    console.error('❌ Convert failed. Check schema and target platform.');
  }
}

function handleDetect(options) {
  const fs = typeof require !== 'undefined' ? require('fs') : null;

  let content = options.content;

  if (!content && options.input && fs) {
    try {
      content = fs.readFileSync(options.input, 'utf-8');
    } catch (e) {
      console.error(`❌ Cannot read file: ${options.input}`);
      return;
    }
  }

  if (!content) {
    console.error('❌ Missing input content');
    return;
  }

  const platform = window.UATDetector?.detectPlatform?.(content) || 'plain';
  // Simple confidence: check if we detected a specific platform vs plain
  const confidence = platform === 'plain' ? 0 : 0.8;
  console.log(`Platform: ${platform}`);
  console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
}

function showPlatforms() {
  const platforms = window.UATBundle?.supportedPlatforms ||
    ['dify', 'openclaw', 'hermes', 'cursor', 'windsurf', 'claude', 'fastgpt', 'flowise', 'copilot', 'codex', 'zed', 'plain'];
  console.log('Supported platforms:');
  platforms.forEach(p => console.log(`  - ${p}`));
}

function showHelp() {
  console.log(`
UAT Bundle CLI - Agent Config Converter

Usage:
  node uat-bundle.js parse --content <string> [--platform <name>]
  node uat-bundle.js parse --input <file> [--platform <name>] [--output <schema.json>]
  node uat-bundle.js convert --schema <json|file> --target <platform>
  node uat-bundle.js detect --content <string>
  node uat-bundle.js detect --input <file>
  node uat-bundle.js platforms

Examples:
  node uat-bundle.js detect --content "dify_version: 0.1"
  node uat-bundle.js parse --input dify.yml --platform dify
  node uat-bundle.js convert --schema schema.json --target cursor

Supported platforms: dify, openclaw, hermes, cursor, windsurf, claude, fastgpt, flowise, copilot, codex, zed
`);
}

// ============================================
// CLI Entry Point
// ============================================

function runBundleCLI(args) {
  const command = args[0];
  const options = parseArgs(args.slice(1));

  switch (command) {
    case 'parse':
      handleParse(options);
      break;
    case 'convert':
      handleConvert(options);
      break;
    case 'detect':
      handleDetect(options);
      break;
    case 'platforms':
      showPlatforms();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) {
        console.error(`❌ Unknown command: ${command}`);
      }
      showHelp();
  }
}

// ============================================
// Exports
// ============================================

window.runBundleCLI = runBundleCLI;

// Node.js auto-execute when bundle is run directly
if (typeof process !== 'undefined' && process.argv && process.argv.length > 2) {
  runBundleCLI(process.argv.slice(2));
}