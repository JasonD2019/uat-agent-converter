/**
 * UAT 全局安全拦截 & 异常兜底 & 状态管理 - Guard & Exception
 * 模块8：完整版安全防护、异常捕获、状态管理
 */

// ============================================
// 全局状态定义
// ============================================

const GLOBAL_STATES = {
  INITIAL: 0,      // 初始空状态
  INPUTTED: 1,     // 已输入原始内容
  PARSED: 2,       // 已解析内核完成
  CONVERTED: 3     // 已转换完成可下载
};

let globalState = GLOBAL_STATES.INITIAL;

// ============================================
// 安全拦截初始化
// ============================================

/**
 * 初始化全局安全防护（生产模式）
 * @param {boolean} production - 是否启用严格模式
 */
function initGuard(production = false) {
  if (production) {
    // 生产模式：启用网络拦截
    initNetworkGuard();
  }

  // 初始化全局异常捕获
  initGlobalExceptionHandler();

  // 初始化内存安全监控
  initMemoryGuard();

  console.log('UAT Guard 安全模块已加载', production ? '(生产模式)' : '(开发模式)');
}

// ============================================
// 网络请求拦截（生产模式启用）
// ============================================

/**
 * 初始化网络请求拦截器
 * 禁止所有外发请求，确保数据不泄露
 */
function initNetworkGuard() {
  // 拦截 fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    console.warn('[Guard] fetch 请求已被拦截:', url);
    // 返回空响应，阻止请求
    return Promise.reject(new Error('网络请求被禁止：所有数据仅本地处理'));
  };

  // 拦截 XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    console.warn('[Guard] XMLHttpRequest 已被禁用');
    throw new Error('XMLHttpRequest 被禁止：所有数据仅本地处理');
  };

  // 拦截 WebSocket
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.warn('[Guard] WebSocket 已被禁用:', url);
    throw new Error('WebSocket 被禁止：所有数据仅本地处理');
  };

  // 拦截 Image 加载（防止追踪像素）
  const originalImage = window.Image;
  window.Image = function() {
    const img = new originalImage();
    const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
    Object.defineProperty(img, 'src', {
      set: function(value) {
        if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
          console.warn('[Guard] 外部图片加载被拦截:', value);
          return;
        }
        originalSrcSetter.call(this, value);
      }
    });
    return img;
  };
}

// ============================================
// 全局异常捕获
// ============================================

/**
 * 初始化全局异常捕获器
 */
function initGlobalExceptionHandler() {
  // 捕获 JavaScript 运行时错误
  window.onerror = function(message, source, lineno, colno, error) {
    handleGlobalError({
      type: 'runtime',
      message,
      source,
      lineno,
      colno,
      error
    });
    return true; // 阻止默认错误处理
  };

  // 捕获 Promise 未处理的 rejection
  window.addEventListener('unhandledrejection', function(event) {
    handleGlobalError({
      type: 'promise',
      message: event.reason?.message || 'Promise rejection',
      error: event.reason
    });
    event.preventDefault();
  });

  // 捕获资源加载错误
  window.addEventListener('error', function(event) {
    if (event.target !== window) {
      handleGlobalError({
        type: 'resource',
        message: `资源加载失败: ${event.target?.src || event.target?.href}`,
        target: event.target
      });
    }
  }, true);
}

/**
 * 全局错误处理器
 * @param {Object} errorInfo - 错误信息
 */
function handleGlobalError(errorInfo) {
  // 开发环境：输出详细日志
  console.warn('[Guard] 全局异常捕获:', errorInfo);

  // 根据错误类型决定处理方式
  const errorLevel = classifyError(errorInfo);

  switch (errorLevel) {
    case 'critical':
      // 严重错误：重置页面
      showFriendlyError('系统遇到严重问题，已自动重置');
      resetAllState();
      break;
    case 'warning':
      // 警告级错误：友好提示
      showFriendlyError('操作遇到小问题，已自动处理');
      break;
    case 'info':
      // 信息级：静默处理
      break;
  }
}

/**
 * 错误分级
 * @param {Object} errorInfo - 错误信息
 * @returns {string} 错误级别
 */
function classifyError(errorInfo) {
  const criticalKeywords = ['SyntaxError', 'TypeError', 'ReferenceError'];
  const message = errorInfo.message || '';

  for (const keyword of criticalKeywords) {
    if (message.includes(keyword)) {
      return 'critical';
    }
  }

  if (errorInfo.type === 'resource') {
    return 'warning';
  }

  return 'info';
}

// ============================================
// 异常兜底与友好提示
// ============================================

/**
 * 显示友好错误提示（不暴露技术细节）
 * @param {string} message - 提示消息
 * @param {string} type - 类型：error/warning/success
 */
function showFriendlyError(message, type = 'error') {
  if (window.UATUI && window.UATUI.showToast) {
    window.UATUI.showToast(message, type);
  } else {
    // 降级方案：创建临时提示
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      z-index: 9999;
      font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }
}

/**
 * 安全执行包装器（带异常捕获和兜底）
 * @param {Function} fn - 待执行函数
 * @param {string} context - 执行上下文描述
 * @param {Function} fallback - 失败时的兜底函数
 * @returns {any} 执行结果
 */
function safeExecute(fn, context = '', fallback = null) {
  try {
    const result = fn();
    return result;
  } catch (error) {
    console.warn(`[Guard] ${context} 执行异常:`, error.message);

    // 显示友好提示
    showFriendlyError(`${context}失败，已自动处理`);

    // 执行兜底方案
    if (fallback) {
      try {
        return fallback();
      } catch (fallbackError) {
        console.warn('[Guard] 兜底方案也失败:', fallbackError.message);
      }
    }

    return null;
  }
}

/**
 * 安全执行异步函数
 * @param {Function} fn - 异步函数
 * @param {string} context - 执行上下文
 * @param {Function} fallback - 失败兜底
 * @returns {Promise<any>}
 */
async function safeExecuteAsync(fn, context = '', fallback = null) {
  try {
    const result = await fn();
    return result;
  } catch (error) {
    console.warn(`[Guard] ${context} 异步执行异常:`, error.message);
    showFriendlyError(`${context}失败，已自动处理`);

    if (fallback) {
      try {
        return await fallback();
      } catch (fallbackError) {
        console.warn('[Guard] 异步兜底失败:', fallbackError.message);
      }
    }

    return null;
  }
}

// ============================================
// 敏感内容检测与过滤
// ============================================

/**
 * 检查并过滤敏感密钥（增强版）
 * @param {string} text - 待检查文本
 * @returns {string} 清洗后文本
 */
function guardCheckSensitiveContent(text) {
  if (!text) return '';

  // 增强的密钥匹配模式
  const patterns = [
    // OpenAI API Key
    /sk-[a-zA-Z0-9]{48}/gi,
    /sk-[a-zA-Z0-9]{20,}/gi,

    // Anthropic API Key
    /sk-ant-[a-zA-Z0-9-]{20,}/gi,

    // AWS Access Key
    /AKIA[a-zA-Z0-9]{16}/gi,

    // Google API Key
    /AIza[a-zA-Z0-9_-]{35}/gi,

    // JWT Token
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,

    // Generic API Key patterns
    /api[_-]?key[_-]?[a-zA-Z0-9]*['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_-]{20,}/gi,
    /secret[_-]?key[_-]?[a-zA-Z0-9]*['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_-]{20,}/gi,
    /access[_-]?key[_-]?[a-zA-Z0-9]*['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_-]{20,}/gi,
    /private[_-]?key[_-]?[a-zA-Z0-9]*['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_-]{20,}/gi,
    /token[_-]?[a-zA-Z0-9]*['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_-]{20,}/gi,

    // Password patterns
    /password['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_-]{8,}/gi,

    // Authorization header
    /Authorization['"]?\s*[=:]\s*['"]?[Bb]earer\s+[a-zA-Z0-9_-]{20,}/gi,

    // Base64 encoded potential secrets
    /[a-zA-Z0-9+/]{40,}={0,2}/gi
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '***REDACTED***');
  }

  return cleaned;
}

/**
 * 检测是否包含敏感内容
 * @param {string} text - 待检查文本
 * @returns {boolean} 是否包含敏感内容
 */
function hasSensitiveContent(text) {
  if (!text) return false;

  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/gi,
    /AKIA[a-zA-Z0-9]{16}/gi,
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*/gi,
    /api[_-]?key/i,
    /secret[_-]?key/i,
    /password/i,
    /token/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

// ============================================
// 内存安全管理
// ============================================

/**
 * 初始化内存安全监控
 */
function initMemoryGuard() {
  // 监听页面关闭，清理内存
  window.addEventListener('beforeunload', function() {
    cleanupMemory();
  });

  // 监听页面刷新
  window.addEventListener('unload', function() {
    cleanupMemory();
  });
}

/**
 * 清理内存数据
 */
function cleanupMemory() {
  // 清空全局状态
  globalState = GLOBAL_STATES.INITIAL;

  // 清空 localStorage 和 sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    // 忽略清理异常
  }

  console.log('[Guard] 内存数据已清理');
}

/**
 * 重置所有状态
 */
function resetAllState() {
  cleanupMemory();

  // 重置 UI
  if (window.UATUI && window.UATUI.resetAllUI) {
    window.UATUI.resetAllUI();
  }

  showFriendlyError('已重置所有状态', 'success');
}

// ============================================
// 状态管理
// ============================================

/**
 * 更新全局状态
 * @param {number} newState - 新状态码
 */
function updateGlobalState(newState) {
  const oldState = globalState;
  globalState = newState;

  console.log(`[Guard] 状态变更: ${oldState} → ${newState}`);

  // 触发状态变化回调
  onStateChange(oldState, newState);
}

/**
 * 获取当前状态
 * @returns {number} 当前状态码
 */
function getCurrentState() {
  return globalState;
}

/**
 * 状态变化回调
 * @param {number} oldState - 旧状态
 * @param {number} newState - 新状态
 */
function onStateChange(oldState, newState) {
  // 状态回滚检测
  if (newState < oldState) {
    console.log('[Guard] 状态已回滚，清理下游数据');
  }
}

// ============================================
// 合规边界检查
// ============================================

/**
 * 检查是否违反合规边界
 * @param {string} platform - 平台编码
 * @param {string} action - 操作类型
 * @returns {boolean} 是否合规
 */
function checkCompliance(platform, action) {
  // 围墙平台禁止列表
  const blockedPlatforms = ['coze', 'bailian', 'yuanqi'];

  if (blockedPlatforms.includes(platform.toLowerCase())) {
    if (action === 'parse_workflow') {
      showFriendlyError('围墙平台仅支持 Prompt 提取，不解析工作流');
      return false;
    }
  }

  return true;
}

// ============================================
// 导出模块接口
// ============================================

window.UATGuard = {
  initGuard,
  initNetworkGuard,
  initGlobalExceptionHandler,
  handleGlobalError,
  showFriendlyError,
  safeExecute,
  safeExecuteAsync,
  guardCheckSensitiveContent,
  hasSensitiveContent,
  initMemoryGuard,
  cleanupMemory,
  resetAllState,
  updateGlobalState,
  getCurrentState,
  checkCompliance,
  GLOBAL_STATES
};

// 自动初始化（开发模式）
document.addEventListener('DOMContentLoaded', () => {
  initGuard(false);
});