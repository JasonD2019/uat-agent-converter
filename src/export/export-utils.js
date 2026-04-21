/**
 * UAT 文件导出 & 浏览器 IO 工具库 - Export Utils
 * 模块7：文件打包、下载、剪贴板、格式化
 */

// ============================================
// 文件后缀映射
// ============================================

const PLATFORM_EXTENSIONS = {
  'dify': '.yml',
  'openclaw': '.md',
  'claude': '.md',
  'fastgpt': '.json',
  'flowise': '.json',
  'hermes': '.zip',
  'cursor': '.cursorrules',
  'windsurf': '.windsurfrules',
  'copilot': '.md',
  'codex': '.md',
  'zed': '.md',
  'plain': '.txt'
};

const PLATFORM_DISPLAY_NAMES = {
  'dify': 'Dify',
  'openclaw': 'OpenClaw',
  'claude': 'Claude',
  'fastgpt': 'FastGPT',
  'flowise': 'Flowise',
  'hermes': 'Hermes',
  'cursor': 'Cursor',
  'windsurf': 'Windsurf',
  'copilot': 'Copilot',
  'codex': 'Codex',
  'zed': 'Zed',
  'plain': 'Text'
};

// ============================================
// 核心导出函数
// ============================================

/**
 * 统一入口：导出 Agent 文件
 * @param {string} platformCode - 平台编码
 * @param {string} content - 编码器输出内容
 * @param {string} customName - 自定义文件名（可选）
 */
function exportAgentFile(platformCode, content, customName = null) {
  const filename = customName || generateExportFileName(platformCode);
  downloadFile(content, filename);
}

/**
 * 导出并复制到剪贴板
 * @param {string} platformCode - 平台编码
 * @param {string} content - 编码器输出内容
 */
async function exportAndCopy(platformCode, content) {
  // 先复制
  await copyToClipboard(content);
  // 再下载
  exportAgentFile(platformCode, content);
}

// ============================================
// 文件名生成
// ============================================

/**
 * 自动生成规范文件名
 * @param {string} platformCode - 平台编码
 * @param {Object} schema - Schema 对象（可选，用于提取名称）
 * @returns {string} 文件名
 */
function generateExportFileName(platformCode, schema = null) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');

  const platform = PLATFORM_DISPLAY_NAMES[platformCode] || 'Agent';
  const ext = getPlatformExtension(platformCode);

  // 如果有 Schema，尝试使用 Agent 名称
  let agentName = 'Agent';
  if (schema && schema.meta && schema.meta.name) {
    agentName = sanitizeFileName(schema.meta.name);
  }

  return `UAT_${agentName}_${platform}_${dateStr}_${timeStr}${ext}`;
}

/**
 * 获取平台文件后缀
 * @param {string} platformCode - 平台编码
 * @returns {string} 文件后缀
 */
function getPlatformExtension(platformCode) {
  return PLATFORM_EXTENSIONS[platformCode] || '.txt';
}

/**
 * 清理文件名（移除非法字符）
 * @param {string} name - 原始名称
 * @returns {string} 安全文件名
 */
function sanitizeFileName(name) {
  if (!name) return 'Agent';
  // 移除 Windows/Linux 不允许的字符
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50); // 限制长度
}

// ============================================
// 文件下载核心实现
// ============================================

/**
 * 文本转 Blob + 浏览器自动下载
 * @param {string} content - 文本内容
 * @param {string} filename - 文件名
 */
function downloadFile(content, filename) {
  // 1. 强制 UTF-8 编码，添加 BOM 防止 Excel/编辑器乱码
  const bom = '\uFEFF'; // UTF-8 BOM
  const blobContent = bom + content;
  const blob = new Blob([blobContent], { type: 'text/plain;charset=utf-8' });

  // 2. 生成临时 URL
  const url = URL.createObjectURL(blob);

  // 3. 创建隐藏 a 标签
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  a.style.position = 'fixed';
  a.style.top = '0';
  a.style.left = '0';

  // 4. 触发下载
  document.body.appendChild(a);
  a.click();

  // 5. 延迟销毁临时对象（确保下载完成）
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * 批量下载多个文件
 * @param {Array<{platform: string, content: string}>} files - 文件列表
 */
function downloadMultipleFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // 延迟下载，避免浏览器阻止
    setTimeout(() => {
      exportAgentFile(file.platform, file.content);
    }, i * 200);
  }
}

// ============================================
// 剪贴板操作
// ============================================

/**
 * 一键复制到剪贴板（带降级方案）
 * @param {string} content - 文本内容
 * @returns {Promise<boolean>} 是否成功
 */
async function copyToClipboard(content) {
  // 现代浏览器方案
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (err) {
      console.warn('Clipboard API 失败，尝试降级方案:', err);
    }
  }

  // 降级方案：使用 execCommand
  return copyWithExecCommand(content);
}

/**
 * execCommand 降级复制方案
 * @param {string} content - 文本内容
 * @returns {boolean} 是否成功
 */
function copyWithExecCommand(content) {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  textarea.setAttribute('readonly', '');

  document.body.appendChild(textarea);

  try {
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    document.body.removeChild(textarea);
    console.warn('execCommand 复制失败:', err);
    return false;
  }
}

// ============================================
// 内容格式化
// ============================================

/**
 * 格式化 JSON 内容（美化输出）
 * @param {string} jsonString - JSON 字符串
 * @returns {string} 格式化后的 JSON
 */
function formatJSON(jsonString) {
  try {
    const obj = JSON.parse(jsonString);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return jsonString;
  }
}

/**
 * 格式化 YAML 内容（基础美化）
 * @param {string} yamlString - YAML 字符串
 * @returns {string} 格式化后的 YAML
 */
function formatYAML(yamlString) {
  // 基础格式化：统一缩进
  const lines = yamlString.split('\n');
  return lines.map(line => {
    // 保持原有缩进，仅清理多余空格
    return line.trimRight();
  }).join('\n');
}

/**
 * 格式化 Markdown 内容
 * @param {string} markdownString - Markdown 字符串
 * @returns {string} 格式化后的 Markdown
 */
function formatMarkdown(markdownString) {
  // 基础格式化：统一换行
  return markdownString
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

// ============================================
// 批量导出（生成所有平台格式）
// ============================================

/**
 * 批量生成所有平台格式
 * @param {Object} schema - UAT Schema
 * @returns {Array<{platform: string, content: string, filename: string}>} 所有平台输出
 */
function generateAllPlatformOutputs(schema) {
  const outputs = [];
  const platforms = ['dify', 'openclaw', 'claude', 'fastgpt', 'flowise', 'plain'];

  for (const platform of platforms) {
    try {
      const content = UATEncoder.runEncoderPool(schema, platform);
      const filename = generateExportFileName(platform, schema);
      outputs.push({
        platform,
        content,
        filename
      });
    } catch (err) {
      console.warn(`生成 ${platform} 格式失败:`, err);
    }
  }

  return outputs;
}

// ============================================
// 导出统计信息
// ============================================

/**
 * 获取导出统计信息
 * @param {string} content - 导出内容
 * @returns {Object} 统计信息
 */
function getExportStats(content) {
  return {
    characters: content.length,
    lines: content.split('\n').length,
    bytes: new Blob([content]).size,
    sizeFormatted: formatFileSize(new Blob([content]).size)
  };
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节大小
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// 导出模块接口
// ============================================

window.UATExport = {
  exportAgentFile,
  exportAndCopy,
  generateExportFileName,
  getPlatformExtension,
  sanitizeFileName,
  downloadFile,
  downloadMultipleFiles,
  copyToClipboard,
  formatJSON,
  formatYAML,
  formatMarkdown,
  generateAllPlatformOutputs,
  getExportStats,
  formatFileSize,
  PLATFORM_EXTENSIONS,
  PLATFORM_DISPLAY_NAMES
};