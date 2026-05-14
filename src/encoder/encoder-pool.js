/**
 * UAT Encoder Pool - 编码器调度器（精简版）
 * 仅负责调度，实际编码由各平台 Bundle 完成
 *
 * v2.1 重构说明：
 * - 删除冗余编码函数（与 Bundle 重复）
 * - 统一调用 Bundle.encodeToFiles() 确保输出完整
 * - 保持向后兼容，runEncoderPool 返回主文件内容
 */

// ============================================
// 编码器统一调度器
// ============================================

function runEncoderPool(schema, targetPlatform) {
  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('Schema 结构不合法');
  }

  // 获取目标 Bundle
  const bundles = {
    dify: window.DifyBundle,
    openclaw: window.OpenClawBundle,
    hermes: window.HermesBundle,
    cursor: window.CursorBundle,
    windsurf: window.WindsurfBundle,
    claude: window.ClaudeCodeBundle,
    fastgpt: window.FastGPTBundle,
    flowise: window.FlowiseBundle,
    copilot: window.CopilotBundle,
    codex: window.CodexBundle,
    zed: window.ZedBundle
  };

  const bundle = bundles[targetPlatform];
  if (!bundle) {
    throw new Error(`不支持的平台: ${targetPlatform}`);
  }

  // 调用 Bundle 的 encodeToFiles 获取完整文件结构
  const files = bundle.encodeToFiles(schema);

  // 返回主文件内容（向后兼容单文件输出场景）
  const mainFile = Object.keys(files)[0];
  return files[mainFile] || '';
}

// ============================================
// 辅助函数：获取所有文件（新增）
// ============================================

function runEncoderPoolGetFiles(schema, targetPlatform) {
  if (!UATCore.checkSchemaValid(schema)) {
    throw new Error('Schema 结构不合法');
  }

  const bundles = {
    dify: window.DifyBundle,
    openclaw: window.OpenClawBundle,
    hermes: window.HermesBundle,
    cursor: window.CursorBundle,
    windsurf: window.WindsurfBundle,
    claude: window.ClaudeCodeBundle,
    fastgpt: window.FastGPTBundle,
    flowise: window.FlowiseBundle,
    copilot: window.CopilotBundle,
    codex: window.CodexBundle,
    zed: window.ZedBundle
  };

  const bundle = bundles[targetPlatform];
  if (!bundle) {
    throw new Error(`不支持的平台: ${targetPlatform}`);
  }

  return bundle.encodeToFiles(schema);
}

// ============================================
// 导出模块接口
// ============================================

window.UATEncoderLegacy = {
  runEncoderPool,
  runEncoderPoolGetFiles
};

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.UATEncoderLegacy;
}