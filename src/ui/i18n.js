/**
 * UAT Internationalization Module - i18n
 * English / Chinese support
 */

const UAT_I18N = {
  currentLang: 'en',

  translations: {
    en: {
      // Header
      title: 'UAT Agent Converter',
      subtitle: 'Cross-Platform AI Agent Config Converter',
      badge: 'Local · Offline · Secure',
      platformCount: '12 Platforms',

      // Steps
      step1: 'Upload ZIP',
      step2: 'Parse Files',
      step3: 'Generate Schema',
      step4: 'Select Target',
      step5: 'Export',
      stepHint1: 'Upload Agent Bundle ZIP to start',
      stepHint2: 'Parsing Bundle files...',
      stepHint3: 'Schema generated, select target',
      stepHint4: 'Conversion complete, download ready',
      stepHintUpload: 'Upload Agent Bundle ZIP to start',

      // Panels
      inputTitle: 'Source Files',
      schemaTitle: 'UAT Schema',
      outputTitle: 'Output Files',

      // Dropzone
      dropzoneText: 'Drag ZIP or click to upload',
      dropzoneHint: 'Supports .zip, .uat Bundle files',

      // Empty states
      schemaEmptyTitle: 'Schema Pending',
      schemaEmptyHint: 'Parse Bundle to generate schema',
      outputEmptyTitle: 'Waiting for Conversion',
      outputEmptyHint: 'Select target platform to convert',

      // Stats
      statFiles: 'Files:',
      statSize: 'Size:',
      statCompat: 'Compat:',
      statTime: 'Time:',
      lines: 'lines',
      files: 'files',

      // Footer
      targetLabel: 'Target',
      parseBtn: 'Parse',
      convertBtn: 'Convert',
      bundleBtn: 'Bundle ZIP',
      clearBtn: 'Clear',

      // Modal
      fullscreenTitle: 'Fullscreen Preview',
      helpTitle: 'Help Guide',
      helpStep1: '1. Upload Agent Bundle ZIP file (supports Hermes, OpenClaw, Cursor, etc.)',
      helpStep2: '2. View parsed files and auto-generated Schema',
      helpStep3: '3. Select target platform for conversion',
      helpStep4: '4. Download converted config or Bundle ZIP',
      helpNote: 'All processing runs locally - no data uploaded to server.',
      closeBtn: 'Close',
      copyAllBtn: 'Copy All',
      gotItBtn: 'Got it',

      // Toast
      toastParseSuccess: 'Schema generated',
      toastConvertSuccess: 'Converted successfully',
      toastCopySuccess: 'Copied to clipboard',
      toastDownloadSuccess: 'Downloaded',
      toastBundleSuccess: 'Bundle exported',
      toastClearSuccess: 'Cleared',
      toastUploadSuccess: 'File uploaded',
      toastParseError: 'Parse failed',
      toastConvertError: 'Convert failed',
      toastNoContent: 'Please upload a file first',
      toastNoTarget: 'Please select target platform',

      // Platform names
      platforms: {
        dify: 'Dify',
        openclaw: 'OpenClaw',
        claude: 'Claude',
        cursor: 'Cursor',
        windsurf: 'Windsurf',
        hermes: 'Hermes',
        fastgpt: 'FastGPT',
        flowise: 'Flowise',
        copilot: 'Copilot',
        codex: 'Codex',
        zed: 'Zed'
      }
    },

    zh: {
      // Header
      title: 'UAT Agent 转换器',
      subtitle: '跨平台 AI Agent 配置转换器',
      badge: '本地离线 · 数据安全',
      platformCount: '12 个平台',

      // Steps
      step1: '上传 ZIP',
      step2: '解析文件',
      step3: '生成 Schema',
      step4: '选择目标',
      step5: '导出',
      stepHint1: '上传 Agent Bundle ZIP 开始',
      stepHint2: '正在解析 Bundle 文件...',
      stepHint3: 'Schema 已生成，请选择目标',
      stepHint4: '转换完成，可下载',
      stepHintUpload: '上传 Agent Bundle ZIP 开始',

      // Panels
      inputTitle: '源文件',
      schemaTitle: 'UAT Schema',
      outputTitle: '输出文件',

      // Dropzone
      dropzoneText: '拖拽 ZIP 或点击上传',
      dropzoneHint: '支持 .zip, .uat Bundle 文件',

      // Empty states
      schemaEmptyTitle: 'Schema 待生成',
      schemaEmptyHint: '解析 Bundle 生成 Schema',
      outputEmptyTitle: '等待转换',
      outputEmptyHint: '选择目标平台进行转换',

      // Stats
      statFiles: '文件:',
      statSize: '大小:',
      statCompat: '兼容:',
      statTime: '耗时:',
      lines: '行',
      files: '个文件',

      // Footer
      targetLabel: '目标',
      parseBtn: '解析',
      convertBtn: '转换',
      bundleBtn: 'Bundle ZIP',
      clearBtn: '清空',

      // Modal
      fullscreenTitle: '全屏预览',
      helpTitle: '帮助指南',
      helpStep1: '1. 上传 Agent Bundle ZIP 文件（支持 Hermes、OpenClaw、Cursor 等）',
      helpStep2: '2. 查看解析的文件和自动生成的 Schema',
      helpStep3: '3. 选择目标平台进行转换',
      helpStep4: '4. 下载转换后的配置或 Bundle ZIP',
      helpNote: '所有处理均在本地运行，不上传数据到服务器。',
      closeBtn: '关闭',
      copyAllBtn: '复制全部',
      gotItBtn: '知道了',

      // Toast
      toastParseSuccess: 'Schema 已生成',
      toastConvertSuccess: '转换成功',
      toastCopySuccess: '已复制到剪贴板',
      toastDownloadSuccess: '已下载',
      toastBundleSuccess: 'Bundle 已导出',
      toastClearSuccess: '已清空',
      toastUploadSuccess: '文件已上传',
      toastParseError: '解析失败',
      toastConvertError: '转换失败',
      toastNoContent: '请先上传文件',
      toastNoTarget: '请选择目标平台',

      // Platform names
      platforms: {
        dify: 'Dify',
        openclaw: 'OpenClaw',
        claude: 'Claude',
        cursor: 'Cursor',
        windsurf: 'Windsurf',
        hermes: 'Hermes',
        fastgpt: 'FastGPT',
        flowise: 'Flowise',
        copilot: 'Copilot',
        codex: 'Codex',
        zed: 'Zed'
      }
    }
  },

  /**
   * Get translation text
   */
  t(key) {
    const lang = this.currentLang;
    const translation = this.translations[lang];

    if (translation && translation[key]) {
      return translation[key];
    }

    // Fallback to English
    if (this.translations.en[key]) {
      return this.translations.en[key];
    }

    return key;
  },

  /**
   * Set language
   */
  setLang(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      this.updateUI();
      localStorage.setItem('uat-lang', lang);
    }
  },

  /**
   * Get current language
   */
  getLang() {
    return this.currentLang;
  },

  /**
   * Initialize language from localStorage
   */
  init() {
    const savedLang = localStorage.getItem('uat-lang');
    if (savedLang && this.translations[savedLang]) {
      this.currentLang = savedLang;
    } else {
      this.currentLang = 'en';
    }
    this.updateUI();
  },

  /**
   * Update UI text
   */
  updateUI() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.translations[this.currentLang][key]) {
        el.textContent = this.t(key);
      }
    });

    // Update language toggle button
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      const langText = langToggle.querySelector('.lang-text');
      if (langText) {
        langText.textContent = this.currentLang === 'en' ? '中文' : 'EN';
      }
    }

    // Re-init Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  /**
   * Get toast message
   */
  getToast(key, extra = '') {
    return this.t(key) + extra;
  },

  /**
   * Get platform name
   */
  getPlatformName(platformKey) {
    return this.translations[this.currentLang].platforms[platformKey] || platformKey;
  }
};

// Export
window.UAT_I18N = UAT_I18N;