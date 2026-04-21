/**
 * UAT Encoder Registry - 编码器注册表
 * 调度各平台 Bundle 的编码方法
 */

/**
 * UATEncoder 类 - 平台编码器
 * 支持多文件输出用于 UI 预览和 ZIP 打包
 */
class UATEncoder {
  constructor(platform) {
    this.platform = platform;
  }

  /**
   * 将 Schema 转换为平台文件结构
   * @param {Object} schema - UAT-Schema v2.0
   * @returns {Object} { path: content }
   */
  encodeToFiles(schema) {
    const encoders = {
      openclaw: window.OpenClawBundle?.encodeOpenClawToFiles,
      hermes: window.HermesBundle?.encodeHermesToFiles,
      cursor: window.CursorBundle?.encodeCursorToFiles,
      windsurf: window.WindsurfBundle?.encodeWindsurfToFiles,
      claude: window.ClaudeCodeBundle?.encodeClaudeToFiles,
      dify: window.DifyBundle?.encodeDifyToFiles,
      fastgpt: window.FastGPTBundle?.encodeFastGPTToFiles,
      codex: window.CodexBundle?.encodeCodexToFiles,
      flowise: window.FlowiseBundle?.encodeFlowiseToFiles,
      copilot: window.CopilotBundle?.encodeCopilotToFiles,
      zed: window.ZedBundle?.encodeZedToFiles
    };

    const encoder = encoders[this.platform];
    if (encoder) {
      return encoder(schema);
    }

    // Fallback: 单文件格式
    return { 'agent.txt': JSON.stringify(schema, null, 2) };
  }

  /**
   * 静态方法：获取平台编码器
   * @param {string} platform - 目标平台
   * @returns {UATEncoder} 编码器实例
   */
  static getEncoder(platform) {
    return new UATEncoder(platform);
  }
}

// ============================================
// 导出模块接口
// ============================================

window.UATEncoder = UATEncoder;

// Node.js 导出（双环境兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UATEncoder;
}

// 向后兼容：从 encoder-pool.js 导入原有函数（如果存在）
if (window.UATEncoderLegacy) {
  UATEncoder.runEncoderPool = window.UATEncoderLegacy.runEncoderPool;
  UATEncoder.encodeDifyYAMLEnhanced = window.UATEncoderLegacy.encodeDifyYAMLEnhanced;
  UATEncoder.encodeFastGPTEnhanced = window.UATEncoderLegacy.encodeFastGPTEnhanced;
  UATEncoder.encodeFlowiseEnhanced = window.UATEncoderLegacy.encodeFlowiseEnhanced;
  UATEncoder.encodeClaudeSkillEnhanced = window.UATEncoderLegacy.encodeClaudeSkillEnhanced;
  UATEncoder.encodeOpenClawEnhanced = window.UATEncoderLegacy.encodeOpenClawEnhanced;
  UATEncoder.encodeHermesYAML = window.UATEncoderLegacy.encodeHermesYAML;
  UATEncoder.encodeCursorRules = window.UATEncoderLegacy.encodeCursorRules;
  UATEncoder.encodeWindsurfRules = window.UATEncoderLegacy.encodeWindsurfRules;
  UATEncoder.encodeCopilotInstructions = window.UATEncoderLegacy.encodeCopilotInstructions;
  UATEncoder.encodeCodexAgents = window.UATEncoderLegacy.encodeCodexAgents;
  UATEncoder.encodeZedRules = window.UATEncoderLegacy.encodeZedRules;
  UATEncoder.encodePlainTextEnhanced = window.UATEncoderLegacy.encodePlainTextEnhanced;
  UATEncoder.addKnowledgeBaseNote = window.UATEncoderLegacy.addKnowledgeBaseNote;
}