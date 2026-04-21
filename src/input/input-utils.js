/**
 * UAT 输入工具模块 - Input Utils
 * 模块2：文件读取、文本清洗、统一输入归一化
 */

// ============================================
// 子模块1：读取本地文件
// ============================================

/**
 * 读取本地文件为纯文本
 * @param {File} file - 浏览器上传的 File 对象
 * @returns {Promise<string>} 文件完整文本内容
 */
function readFileToText(file) {
  return new Promise((resolve, reject) => {
    // 检查文件类型
    const validExtensions = ['.md', '.yml', '.yaml', '.json'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      reject(new Error('文件格式不支持，请上传 md/yml/json 文件'));
      return;
    }

    // 强制 UTF-8 编码读取
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (!content || content.length === 0) {
        reject(new Error('文件内容为空'));
      } else {
        resolve(content);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

// ============================================
// 子模块2：读取粘贴文本
// ============================================

/**
 * 从 UI 文本框获取粘贴内容
 * @returns {string} 原始粘贴文本（仅去首尾空白）
 */
function getRawInputText() {
  const textarea = document.getElementById('inputArea');
  if (!textarea) return '';
  const content = textarea.value || '';
  return content.trim();
}

// ============================================
// 子模块3：文本清洗标准化
// ============================================

/**
 * 清洗脏数据，标准化文本
 * @param {string} rawText - 原始文本
 * @returns {string} 标准化纯净文本
 */
function cleanRawContent(rawText) {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. 统一换行符（Windows \r\n → \n，Mac \r → \n）
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  // 2. 去除不可见控制字符（保留换行\n和制表符\t）
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. 去除多余连续空行（超过2个换行 → 2个）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 4. 去除行尾多余空格和制表符
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');

  // 5. 去除全角空格（转为半角）
  cleaned = cleaned.replace(/\u3000/g, ' ');

  // 6. 去除首尾多余换行和空格
  cleaned = cleaned.trim();

  return cleaned;
}

// ============================================
// 子模块4：统一入口
// ============================================

/**
 * 统一入口：获取标准化输入内容
 * @param {File|null} uploadedFile - 上传的文件（可选）
 * @returns {Promise<{success: boolean, content: string, error?: string}>}
 */
async function getStandardInputContent(uploadedFile) {
  try {
    let rawText = '';

    if (uploadedFile) {
      // 有上传文件 → 读文件
      rawText = await readFileToText(uploadedFile);
    } else {
      // 无上传文件 → 读粘贴文本
      rawText = getRawInputText();
    }

    // 检查是否为空
    if (!rawText || rawText.trim().length === 0) {
      return { success: false, content: '', error: '请输入 Agent 配置内容' };
    }

    // 清洗并返回
    const cleanedContent = cleanRawContent(rawText);
    return { success: true, content: cleanedContent };

  } catch (error) {
    return { success: false, content: '', error: error.message };
  }
}

// ============================================
// 文件大小格式化辅助函数
// ============================================

/**
 * 格式化文件大小显示
 * @param {number} bytes - 文件字节大小
 * @returns {string} 格式化后的大小字符串
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

window.UATInput = {
  readFileToText,
  getRawInputText,
  cleanRawContent,
  getStandardInputContent,
  formatFileSize
};