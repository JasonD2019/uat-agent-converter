/**
 * UAT UI Controller - Modern Version
 * Multi-file display, step indicator, ripple effects, modals
 */

// ============================================
// Global State
// ============================================

const UI_STATES = {
  INITIAL: 0,
  UPLOADED: 1,
  PARSED: 2,
  CONVERTED: 3
};

let currentUIState = UI_STATES.INITIAL;
let uploadedFile = null;

// Multi-file state
let allExtractedFiles = {};   // All extracted files (before filtering)
let matchedTemplateFiles = {}; // { templatePath: { content, sourcePath, matched } }
let inputFiles = {};          // { filename: content } - for compatibility
let activeInputFile = '';
let outputFiles = {};         // { filename: content }
let activeOutputFile = '';
let detectedPlatform = '';    // Detected platform type

// Schema cache
let currentSchema = null;
let currentResources = null;

// ============================================
// Platform Signature Files (for detection from file structure)
// ============================================

const PLATFORM_SIGNATURE_FILES = {
  // Hermes: hermes.yaml 或 config.yaml + SOUL.md 组合
  hermes: {
    primary: ['hermes.yaml', 'hermes.yml', '.hermes.yaml', '.hermes.yml'],
    secondary: ['config.yaml', 'config.yml'],
    required: ['SOUL.md', 'soul.md'],
    patterns: ['skills/', 'memories/']
  },

  // OpenClaw: openclaw.json + workspace/ 目录结构
  openclaw: {
    primary: ['openclaw.json'],
    secondary: ['workspace/', 'agents/'],
    required: ['AGENTS.md', 'agents.md'],
    patterns: ['SOUL.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md', 'TOOLS.md', 'USER.md']
  },

  // Cursor: .cursorrules 或 .cursor/ 目录
  cursor: {
    primary: ['.cursorrules'],
    secondary: ['.cursor/'],
    required: [],
    patterns: ['mcp.json', 'mcp_servers.json', 'settings.json']
  },

  // Windsurf: .windsurfrules 或 .windsurf/ 目录
  windsurf: {
    primary: ['.windsurfrules'],
    secondary: ['.windsurf/'],
    required: [],
    patterns: ['mcp.json', 'cascade_flow.json']
  },

  // Claude Code: CLAUDE.md 或 .claude/ 目录
  claude: {
    primary: ['CLAUDE.md', 'claude.md'],
    secondary: ['.claude/'],
    required: [],
    patterns: ['mcp_servers.json', 'settings.json', 'skills/', 'commands/']
  },

  // Dify: dify.yml 或 workflow/ 目录
  dify: {
    primary: ['dify.yml', 'dify.yaml'],
    secondary: ['workflow/', 'app_config/'],
    required: [],
    patterns: ['prompts/', 'knowledge_base/', 'variables.yml', 'nodes.yml', 'edges.yml']
  },

  // FastGPT: fastgpt.json 或 workflow/ + app/ 组合
  fastgpt: {
    primary: ['fastgpt.json'],
    secondary: ['workflow/', 'app/', 'model/'],
    required: [],
    patterns: ['knowledge/', 'prompts/', 'datasets.json', 'variables.json']
  },

  // Codex: AGENTS.md + .codex/ 目录
  codex: {
    primary: ['AGENTS.md', 'agents.md'],
    secondary: ['.codex/'],
    required: [],
    patterns: ['tools.json', 'providers.json', 'skills/', 'scripts/']
  },

  // Flowise: flowise.json + nodes/edges
  flowise: {
    primary: ['flowise.json'],
    secondary: ['nodes/', 'chains/'],
    required: ['edges.json'],
    patterns: ['credentials/', 'ui/', 'variables.json']
  },

  // Copilot: copilot-instructions.md + .github/
  copilot: {
    primary: ['copilot-instructions.md'],
    secondary: ['.github/', '.vscode/'],
    required: [],
    patterns: ['.copilotignore', 'prompts/', 'extensions.json']
  },

  // Zed: rules.md + .zed/ 目录
  zed: {
    primary: ['rules.md', 'zed.md'],
    secondary: ['.zed/'],
    required: [],
    patterns: ['.zedignore', 'settings.json', 'tasks.json', 'languages/', 'prompts/']
  }
};

// ============================================
// Platform Core Config Files (for filtering display)
// ============================================

const PLATFORM_CORE_FILES = {
  hermes: ['config.yaml', 'config.yml', 'SOUL.md', 'soul.md', 'skills/', 'memories/', 'README.md'],

  openclaw: ['openclaw.json', 'AGENTS.md', 'agents.md', 'SOUL.md', 'soul.md', 'IDENTITY.md', 'identity.md', 'USER.md', 'user.md', 'TOOLS.md', 'tools.md', 'MEMORY.md', 'memory.md', 'HEARTBEAT.md', 'heartbeat.md', 'README.md'],

  cursor: ['.cursorrules', '.cursor/rules/', '.cursor/mcp.json', '.cursor/settings.json', 'mcp.json', 'README.md'],

  windsurf: ['.windsurfrules', '.windsurf/rules/', '.windsurf/mcp.json', '.windsurf/settings.json', 'mcp.json', 'README.md'],

  claude: ['CLAUDE.md', 'claude.md', '.claude/settings.json', '.claude/skills/', '.claude/commands/', '.claude/mcp_servers.json', 'mcp_servers.json', 'README.md'],

  dify: ['dify.yml', 'dify.yaml', 'workflow/nodes.yml', 'workflow/edges.yml', 'workflow/variables.yml', 'prompts/', 'app_config/', 'knowledge_base/', 'README.md'],

  fastgpt: ['fastgpt.json', 'workflow/nodes.json', 'workflow/edges.json', 'workflow/variables.json', 'knowledge/', 'prompts/', 'app/', 'model/', 'README.md'],

  codex: ['AGENTS.md', 'agents.md', '.codex/config.json', '.codex/tools.json', '.codex/providers.json', '.codex/skills/', 'scripts/', 'README.md'],

  flowise: ['flowise.json', 'nodes/', 'edges.json', 'chains/', 'credentials/', 'ui/', 'variables.json', 'README.md'],

  copilot: ['copilot-instructions.md', '.github/prompts/', '.github/copilot-instructions.md', '.vscode/settings.json', '.vscode/extensions.json', '.copilotignore', 'README.md'],

  zed: ['rules.md', 'zed.md', '.zed/settings.json', '.zed/tasks.json', '.zed/languages/', '.zed/prompts/', '.zedignore', 'README.md']
};

// ============================================
// Platform Template Files (for display structure, based on research docs)
// ============================================

const PLATFORM_TEMPLATE_FILES = {
  hermes: [
    'config.yaml',
    'SOUL.md',
    'skills/skill_registry.json',
    'skills/mcp_tools.py',
    'skills/api_tools.py',
    'skills/custom_functions.py',
    'memories/memory_export.json',
    'README.md'
  ],

  openclaw: [
    'openclaw.json',
    'workspace/AGENTS.md',
    'workspace/SOUL.md',
    'workspace/IDENTITY.md',
    'workspace/USER.md',
    'workspace/TOOLS.md',
    'workspace/MEMORY.md',
    'workspace/HEARTBEAT.md',
    'README.md'
  ],

  cursor: [
    '.cursorrules',
    '.cursorignore',
    '.cursor/rules/general.md',
    '.cursor/rules/code-style.md',
    '.cursor/rules/frontend.md',
    '.cursor/rules/backend.md',
    '.cursor/rules/tests.md',
    '.cursor/rules/tools.md',
    '.cursor/rules/workflow.md',
    '.cursor/mcp.json',
    '.cursor/settings.json',
    'README.md'
  ],

  windsurf: [
    '.windsurfrules',
    '.windsurfignore',
    '.windsurf/rules/general.md',
    '.windsurf/rules/code-style.md',
    '.windsurf/rules/frontend.md',
    '.windsurf/rules/backend.md',
    '.windsurf/rules/tests.md',
    '.windsurf/rules/tools.md',
    '.windsurf/rules/workflow.md',
    '.windsurf/mcp.json',
    '.windsurf/settings.json',
    'README.md'
  ],

  claude: [
    'CLAUDE.md',
    '.claude/settings.json',
    '.claude/mcp_servers.json',
    '.claude/skills/',
    '.claude/commands/',
    'README.md'
  ],

  dify: [
    'dify.yml',
    'workflow/nodes.yml',
    'workflow/edges.yml',
    'workflow/variables.yml',
    'knowledge_base/references.json',
    'prompts/system_prompt.txt',
    'tools/custom_tools.yml',
    'tools/api_tools.yml',
    'app_config/ui_settings.json',
    'app_config/model_config.json',
    'README.md'
  ],

  fastgpt: [
    'fastgpt.json',
    'workflow/nodes.json',
    'workflow/edges.json',
    'workflow/variables.json',
    'knowledge/datasets.json',
    'knowledge/retrieval_config.json',
    'prompts/system_prompt.json',
    'prompts/chat_config.json',
    'app/appConfig.json',
    'app/uiConfig.json',
    'model/modelConfig.json',
    'model/fallback.json',
    'README.md'
  ],

  codex: [
    'AGENTS.md',
    '.codex/config.json',
    '.codex/tools.json',
    '.codex/providers.json',
    '.codex/skills/',
    'scripts/',
    'README.md'
  ],

  flowise: [
    'flowise.json',
    'nodes/',
    'edges.json',
    'chains/',
    'credentials/',
    'ui/',
    'variables.json',
    'README.md'
  ],

  copilot: [
    'copilot-instructions.md',
    '.github/prompts/',
    '.github/copilot-instructions.md',
    '.vscode/settings.json',
    '.vscode/extensions.json',
    '.copilotignore',
    'README.md'
  ],

  zed: [
    'rules.md',
    '.zed/settings.json',
    '.zed/tasks.json',
    '.zed/languages/',
    '.zed/prompts/',
    '.zedignore',
    'README.md'
  ]
};

// ============================================
// Initialize
// ============================================

function initUIController() {
  // Init i18n
  if (window.UAT_I18N) {
    UAT_I18N.init();
  }

  // Init Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Bind events
  bindDropZoneEvents();
  bindFileListEvents();
  bindButtonEvents();
  bindPlatformSelectorEvents();
  bindModalEvents();
  bindLanguageToggle();
  bindInputPlatformChange();  // New: platform change handler

  // Add ripple to buttons
  document.querySelectorAll('.btn, .platform-btn').forEach(addRipple);

  // Init button states
  updateButtonStates();
  setStep(1);

  console.log('UAT UI Controller initialized');
}

// ============================================
// Language Toggle
// ============================================

function bindLanguageToggle() {
  const langToggle = document.getElementById('langToggle');
  if (!langToggle) return;

  langToggle.addEventListener('click', () => {
    if (window.UAT_I18N) {
      const newLang = UAT_I18N.currentLang === 'en' ? 'zh' : 'en';
      UAT_I18N.setLang(newLang);
      // Update button text
      langToggle.querySelector('.lang-text').textContent = newLang === 'en' ? '中文' : 'EN';
      // Re-init icons
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ============================================
// Input Platform Change (Manual Override)
// ============================================

function bindInputPlatformChange() {
  const platformTag = document.getElementById('inputPlatformTag');
  const platformDropdown = document.getElementById('inputPlatformDropdown');

  if (!platformTag || !platformDropdown) return;

  // Click entire tag to toggle dropdown
  platformTag.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = platformTag.classList.toggle('expanded');
    platformDropdown.style.display = isExpanded ? 'block' : 'none';
  });

  // Handle platform option click
  platformDropdown.querySelectorAll('.platform-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const newPlatform = option.getAttribute('data-platform');
      changePlatformManually(newPlatform);
      platformTag.classList.remove('expanded');
      platformDropdown.style.display = 'none';
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!platformTag.contains(e.target)) {
      platformTag.classList.remove('expanded');
      platformDropdown.style.display = 'none';
    }
  });
}

// Change platform manually and re-match files to template
function changePlatformManually(newPlatform) {
  if (!newPlatform || newPlatform === detectedPlatform) return;

  detectedPlatform = newPlatform;

  // Re-match files to new platform template
  matchedTemplateFiles = matchFilesToTemplate(newPlatform, allExtractedFiles);

  // Populate inputFiles from matched content
  inputFiles = {};
  for (const [templatePath, matchInfo] of Object.entries(matchedTemplateFiles)) {
    if (matchInfo.matched && matchInfo.content) {
      inputFiles[templatePath] = matchInfo.content;
    }
  }

  // Update display
  activeInputFile = Object.keys(inputFiles)[0] || '';
  renderInputFileList();
  showFileViewer('input', activeInputFile, inputFiles[activeInputFile] || '');

  // Update platform tag
  const platformName = window.UATDetector
    ? UATDetector.getPlatformDisplayName(newPlatform)
    : newPlatform.toUpperCase();
  showDetectedPlatform(newPlatform, platformName);

  showToast('Platform changed to: ' + platformName, 'info');
}

// ============================================
// Step Indicator
// ============================================

function setStep(n) {
  currentUIState = n;
  const hints = [
    '',
    'Upload Agent Bundle ZIP to start',
    'Parsing Bundle files...',
    'Schema generated, select target',
    'Conversion complete, download ready'
  ];

  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('step' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
  }

  for (let i = 1; i <= 4; i++) {
    const line = document.getElementById('line' + i);
    if (!line) continue;
    line.classList.remove('done', 'active');
    if (i < n) line.classList.add('done');
    else if (i === n) line.classList.add('active');
  }

  const stepHint = document.getElementById('stepHint');
  if (stepHint && hints[n]) {
    stepHint.textContent = UAT_I18N ? UAT_I18N.t('stepHint' + n) : hints[n];
  }
}

// ============================================
// Ripple Effect
// ============================================

function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ============================================
// Toast
// ============================================

function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;

  if (window.lucide) {
    toast.innerHTML = '<i data-lucide="' + icons[type] + '" style="width:15px;height:15px;color:' + colors[type] + ';flex-shrink:0;"></i><span>' + msg + '</span>';
    container.appendChild(toast);
    lucide.createIcons();
  } else {
    toast.textContent = msg;
    container.appendChild(toast);
  }

  const timer = setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, duration);

  toast.addEventListener('click', () => {
    clearTimeout(timer);
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  });
}

// ============================================
// Drop Zone Events
// ============================================

function bindDropZoneEvents() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');

  if (!dropZone || !fileInput) return;

  // Click to upload
  dropZone.addEventListener('click', () => fileInput.click());
  if (uploadBtn) uploadBtn.addEventListener('click', () => fileInput.click());

  // Drag over
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  // Drag leave
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  // Drop
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handleFileUpload(e.target.files[0]);
    }
  });
}

// ============================================
// File Upload Handler
// ============================================

async function handleFileUpload(file) {
  uploadedFile = file;

  // Show loading
  document.getElementById('inputLoading').style.display = 'flex';
  setStep(2);

  try {
    // Check if ZIP
    if (file.name.endsWith('.zip') || file.name.endsWith('.uat')) {
      if (!window.JSZip) {
        showToast('JSZip library not loaded', 'error');
        document.getElementById('inputLoading').style.display = 'none';
        return;
      }

      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('manifest.json');

      if (manifestFile) {
        const manifest = JSON.parse(await manifestFile.async('string'));
        await parseBundleByType(zip, manifest.bundleType);
      } else {
        // Generic ZIP - extract all text files
        await parseGenericZip(zip);
      }
    } else {
      // Single file
      const content = await readFileContent(file);
      inputFiles = { [file.name]: content };
      activeInputFile = file.name;
      renderInputFileList();
      showFileViewer('input', file.name, content);
      showToast('File uploaded: ' + file.name, 'success');
    }

    document.getElementById('inputLoading').style.display = 'none';

  } catch (error) {
    document.getElementById('inputLoading').style.display = 'none';
    showToast('Upload failed: ' + error.message, 'error');
    console.error('Upload error:', error);
  }
}

// ============================================
// Parse Bundle by Type
// ============================================

async function parseBundleByType(zip, bundleType) {
  const parsers = {
    'Hermes-Agent-Bundle': window.HermesBundle,
    'OpenClaw-Agent-Bundle': window.OpenClawBundle,
    'Cursor-Agent-Bundle': window.CursorBundle,
    'Windsurf-Agent-Bundle': window.WindsurfBundle,
    'Claude-Code-Agent-Bundle': window.ClaudeCodeBundle,
    'Dify-Agent-Bundle': window.DifyBundle,
    'FastGPT-Agent-Bundle': window.FastGPTBundle,
    'Codex-CLI-Agent-Bundle': window.CodexBundle,
    'Flowise-Agent-Bundle': window.FlowiseBundle,
    'GitHub-Copilot-Agent-Bundle': window.CopilotBundle,
    'Zed-Editor-Agent-Bundle': window.ZedBundle
  };

  const parser = parsers[bundleType];
  if (parser && parser.parseBundle) {
    const result = await parser.parseBundle(zip);
    currentSchema = result.schema;

    // Get platform key from bundle type
    detectedPlatform = bundleType.replace('-Agent-Bundle', '').replace('GitHub-', '').replace('Zed-Editor-', '').toLowerCase();

    // Step 1: Extract ALL text files (store for later re-filtering)
    allExtractedFiles = {};
    for (const [path, file] of Object.entries(zip.files)) {
      if (!file.dir && isTextFile(path)) {
        allExtractedFiles[path] = await file.async('string');
      }
    }

    // Step 2: Match files to template structure
    matchedTemplateFiles = matchFilesToTemplate(detectedPlatform, allExtractedFiles);

    // Step 3: Populate inputFiles from matched content
    inputFiles = {};
    for (const [templatePath, matchInfo] of Object.entries(matchedTemplateFiles)) {
      if (matchInfo.matched && matchInfo.content) {
        inputFiles[templatePath] = matchInfo.content;
      }
    }

    // Find first matched file as active
    activeInputFile = Object.keys(inputFiles)[0] || '';
    const activeContent = inputFiles[activeInputFile] || '';

    renderInputFileList();
    showFileViewer('input', activeInputFile, activeContent);

    // Show schema
    showSchema(currentSchema);
    showDetectedPlatform(detectedPlatform);

    // Get platform display name
    const platformName = window.UATDetector
      ? UATDetector.getPlatformDisplayName(detectedPlatform)
      : detectedPlatform.toUpperCase();

    const matchedCount = Object.values(matchedTemplateFiles).filter(f => f.matched).length;
    setStep(3);
    showToast('Bundle: ' + platformName + ' (' + matchedCount + '/' + PLATFORM_TEMPLATE_FILES[detectedPlatform].length + ' matched)', 'success');
  } else {
    await parseGenericZip(zip);
  }
}

// ============================================
// Parse Generic ZIP (No Manifest)
// ============================================

async function parseGenericZip(zip) {
  // Step 1: Extract ALL text files (store for later re-filtering)
  allExtractedFiles = {};
  for (const [path, file] of Object.entries(zip.files)) {
    if (!file.dir && isTextFile(path)) {
      allExtractedFiles[path] = await file.async('string');
    }
  }

  if (Object.keys(allExtractedFiles).length === 0) {
    showToast('No text files found in ZIP', 'error');
    return;
  }

  // Step 2: Detect platform using existing detector (file-based detection)
  detectedPlatform = 'unknown';

  // Try to detect from first file content
  if (window.UATDetector) {
    for (const [path, content] of Object.entries(allExtractedFiles)) {
      const detected = UATDetector.detectPlatformByFilename(path, content);
      if (detected !== 'plain' && detected !== 'unknown') {
        detectedPlatform = detected;
        break;
      }
    }

    // Fallback: detect from combined content
    if (detectedPlatform === 'unknown') {
      const combinedContent = Object.values(allExtractedFiles).join('\n\n');
      detectedPlatform = UATDetector.detectPlatform(combinedContent);
    }
  }

  // Step 3: Match files to template structure
  matchedTemplateFiles = matchFilesToTemplate(detectedPlatform, allExtractedFiles);

  // Populate inputFiles from matched content
  inputFiles = {};
  for (const [templatePath, matchInfo] of Object.entries(matchedTemplateFiles)) {
    if (matchInfo.matched && matchInfo.content) {
      inputFiles[templatePath] = matchInfo.content;
    }
  }

  activeInputFile = Object.keys(inputFiles)[0] || '';

  // Step 4: Generate Schema from matched files (multi-file parsing)
  // 使用 matchedTemplateFiles 而非 allExtractedFiles，路径已标准化
  currentSchema = await generateSchemaFromMatchedFiles(detectedPlatform, matchedTemplateFiles, zip);

  // Get platform display name
  const platformName = window.UATDetector
    ? UATDetector.getPlatformDisplayName(detectedPlatform)
    : detectedPlatform.toUpperCase();

  showDetectedPlatform(detectedPlatform, platformName);
  renderInputFileList();
  showFileViewer('input', activeInputFile, inputFiles[activeInputFile] || '');

  // Show schema if generated
  if (currentSchema) {
    showSchema(currentSchema);
  }

  setStep(3);
  const matchedCount = Object.values(matchedTemplateFiles).filter(f => f.matched).length;
  showToast('ZIP: ' + platformName + ' (' + matchedCount + '/' + (PLATFORM_TEMPLATE_FILES[detectedPlatform]?.length || 0) + ' matched)', 'success');
}

// ============================================
// Generate Schema from Matched Files
// ============================================

async function generateSchemaFromMatchedFiles(platform, matchedFiles, zip) {
  // 方案 C: 从 matchedFiles 构建标准化路径的 extractedFiles
  // 使用模板路径作为 key，Bundle parser 的固定 patterns 能精确匹配
  const standardizedFiles = {};
  for (const [templatePath, matchInfo] of Object.entries(matchedFiles)) {
    if (matchInfo.content) {
      standardizedFiles[templatePath] = matchInfo.content;
    }
  }

  // Try to use Bundle parser for multi-file Schema generation
  const bundleParsers = {
    hermes: window.HermesBundle?.parseHermesBundleFromFiles,
    openclaw: window.OpenClawBundle?.parseOpenClawBundleFromFiles,
    cursor: window.CursorBundle?.parseCursorBundleFromFiles,
    windsurf: window.WindsurfBundle?.parseWindsurfBundleFromFiles,
    claude: window.ClaudeCodeBundle?.parseClaudeCodeBundleFromFiles,
    dify: window.DifyBundle?.parseDifyBundleFromFiles,
    fastgpt: window.FastGPTBundle?.parseFastGPTBundleFromFiles,
    codex: window.CodexBundle?.parseCodexBundleFromFiles,
    flowise: window.FlowiseBundle?.parseFlowiseBundleFromFiles,
    copilot: window.CopilotBundle?.parseCopilotBundleFromFiles,
    zed: window.ZedBundle?.parseZedBundleFromFiles
  };

  const parser = bundleParsers[platform];

  if (parser) {
    // Use Bundle parser with standardized files (template paths as keys)
    try {
      const schema = await parser(standardizedFiles, zip);
      return schema;
    } catch (e) {
      console.warn('Bundle parser failed, fallback to single file:', e.message);
    }
  }

  // Fallback: parse from combined content
  const combinedContent = Object.values(standardizedFiles).join('\n\n---\n\n');
  if (window.UATParser) {
    try {
      const schema = UATParser.runParserPool(combinedContent, platform);
      return schema;
    } catch (e) {
      console.warn('Parser fallback failed:', e.message);
    }
  }

  return null;
}

// ============================================
// Check if file is core config file
// ============================================

function isCoreConfigFile(path, patterns) {
  if (!patterns || patterns.length === 0) return true;

  // Check if path matches any pattern
  for (const pattern of patterns) {
    if (pattern.endsWith('/')) {
      // Directory pattern - check if path starts with it
      if (path.startsWith(pattern) || path.startsWith('./' + pattern)) {
        return true;
      }
    } else {
      // File pattern - exact match or contains
      if (path === pattern || path.endsWith('/' + pattern) || path.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

// ============================================
// Match Files to Template Structure
// ============================================

/**
 * Match uploaded files to platform template structure
 * @param {string} platform - Platform type
 * @param {Object} extractedFiles - { path: content }
 * @returns {Object} { templatePath: { content, sourcePath, matched } }
 */
function matchFilesToTemplate(platform, extractedFiles) {
  const templates = PLATFORM_TEMPLATE_FILES[platform] || [];
  const matchedFiles = {};

  for (const templatePath of templates) {
    const matchedPath = findMatchingFile(templatePath, extractedFiles);

    matchedFiles[templatePath] = {
      content: matchedPath ? extractedFiles[matchedPath] : '',
      sourcePath: matchedPath || null,
      matched: matchedPath !== null
    };
  }

  return matchedFiles;
}

/**
 * Find matching file from extracted files
 * Strategy: 1. Exact match 2. Filename match 3. Include match
 */
function findMatchingFile(templatePath, extractedFiles) {
  const paths = Object.keys(extractedFiles);
  const templateFileName = templatePath.split('/').pop();

  // Skip directory templates (end with /)
  if (templatePath.endsWith('/')) {
    // Check if any file starts with this directory
    const dirMatch = paths.find(p => p.startsWith(templatePath) || p.startsWith('./' + templatePath));
    return dirMatch || null;
  }

  // 1. Exact match
  const exact = paths.find(p => p === templatePath || p.endsWith('/' + templatePath) || p === './' + templatePath);
  if (exact) return exact;

  // 2. Filename match (ignore path)
  const byName = paths.find(p => p.split('/').pop() === templateFileName);
  if (byName) return byName;

  // 3. Include match (case insensitive)
  const byInclude = paths.find(p => p.toLowerCase().includes(templateFileName.toLowerCase()));
  if (byInclude) return byInclude;

  return null;
}

// ============================================
// Show Detected Platform
// ============================================

function showDetectedPlatform(platform, displayName) {
  // Use UATDetector to get display name if not provided
  if (!displayName && window.UATDetector) {
    displayName = UATDetector.getPlatformDisplayName(platform);
  }

  // Platform emoji icons
  const platformIcons = {
    hermes: '🤖',
    openclaw: '🦾',
    cursor: '🔵',
    windsurf: '🌊',
    claude: '💜',
    dify: '💡',
    fastgpt: '⚡',
    flowise: '🔗',
    copilot: '🟩',
    codex: '🟠',
    zed: '🔷'
  };

  const icon = platformIcons[platform] || '📁';
  const tagText = icon + ' ' + (displayName || platform.toUpperCase());

  const platformTag = document.getElementById('inputPlatformTag');
  if (platformTag) {
    // Update platform name text (keep children intact)
    const nameSpan = platformTag.querySelector('.platform-name');
    if (nameSpan) {
      nameSpan.textContent = tagText;
    }
    platformTag.style.display = 'inline-flex';

    // Update dropdown selected state
    const platformDropdown = document.getElementById('inputPlatformDropdown');
    if (platformDropdown) {
      platformDropdown.querySelectorAll('.platform-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-platform') === platform) {
          opt.classList.add('selected');
        }
      });
    }
  }
}

// ============================================
// File Tree Rendering
// ============================================

// State for expanded folders
let expandedFolders = { input: {}, output: {} };

function renderInputFileList() {
  const sidebar = document.getElementById('inputFileList');
  if (!sidebar) return;

  sidebar.innerHTML = '';

  // Use template structure instead of uploaded files
  const templates = PLATFORM_TEMPLATE_FILES[detectedPlatform] || [];

  // Update file count
  const countEl = document.getElementById('inputFileCount');
  if (countEl) {
    const matchedCount = Object.values(matchedTemplateFiles).filter(f => f.matched).length;
    countEl.textContent = matchedCount + '/' + templates.length + ' matched';
    countEl.style.display = templates.length > 0 ? 'inline' : 'none';
  }

  // Build tree from template paths
  const tree = buildFileTree(templates);
  renderTemplateTree(sidebar, tree, 'input');

  // Re-init Lucide icons
  if (window.lucide) lucide.createIcons();
}

function renderOutputFileList() {
  const sidebar = document.getElementById('outputFileList');
  if (!sidebar) return;

  sidebar.innerHTML = '';
  const count = Object.keys(outputFiles).length;

  // Update stats
  const fileCountEl = document.getElementById('outFileCount');
  if (fileCountEl) fileCountEl.textContent = count;

  const totalSize = Object.values(outputFiles).reduce((sum, c) => sum + new Blob([c]).size, 0);
  const sizeEl = document.getElementById('outSize');
  if (sizeEl) sizeEl.textContent = formatSize(totalSize);

  // Build tree structure
  const tree = buildFileTree(Object.keys(outputFiles));
  renderFileTree(sidebar, tree, 'output');

  // Re-init Lucide icons
  if (window.lucide) lucide.createIcons();
}

// Build tree structure from flat paths
function buildFileTree(paths) {
  const tree = { folders: {}, files: [] };

  for (const path of paths) {
    const parts = path.split('/');
    if (parts.length === 1) {
      // Root level file
      tree.files.push(parts[0]);
    } else {
      // Has folders
      const folderName = parts[0];
      if (!tree.folders[folderName]) {
        tree.folders[folderName] = { folders: {}, files: [] };
      }
      addToTree(tree.folders[folderName], parts.slice(1));
    }
  }

  return tree;
}

function addToTree(node, parts) {
  if (parts.length === 1) {
    node.files.push(parts[0]);
  } else {
    const folderName = parts[0];
    if (!node.folders[folderName]) {
      node.folders[folderName] = { folders: {}, files: [] };
    }
    addToTree(node.folders[folderName], parts.slice(1));
  }
}

// Render file tree
function renderFileTree(container, tree, type, basePath = '') {
  // Render folders first
  for (const [folderName, subTree] of Object.entries(tree.folders)) {
    const folderPath = basePath ? basePath + '/' + folderName : folderName;
    const isExpanded = expandedFolders[type][folderPath] !== false; // default expanded

    // Folder item
    const folderEl = document.createElement('div');
    folderEl.className = 'file-tree-item file-tree-folder' + (isExpanded ? '' : ' collapsed');
    folderEl.setAttribute('data-folder', folderPath);
    folderEl.innerHTML =
      '<span class="folder-icon"><i data-lucide="chevron-down" style="width:12px;height:12px;"></i></span>' +
      '<span class="folder-icon"><i data-lucide="folder" style="width:14px;height:14px;"></i></span>' +
      '<span class="folder-name">' + folderName + '</span>';
    folderEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFolder(folderPath, type);
    });
    container.appendChild(folderEl);

    // Children container
    const childrenEl = document.createElement('div');
    childrenEl.className = 'file-tree-children';
    renderFileTree(childrenEl, subTree, type, folderPath);
    container.appendChild(childrenEl);
  }

  // Render files
  for (const fileName of tree.files) {
    const filePath = basePath ? basePath + '/' + fileName : fileName;
    const isActive = (type === 'input' && filePath === activeInputFile) ||
                     (type === 'output' && filePath === activeOutputFile);

    const fileEl = document.createElement('div');
    fileEl.className = 'file-tree-item file-tree-file' + (isActive ? ' active selected' : '');
    fileEl.setAttribute('data-file', filePath);

    // Get file icon based on extension
    const icon = getFileIcon(fileName);
    fileEl.innerHTML =
      '<span class="file-icon"><i data-lucide="' + icon + '" style="width:14px;height:14px;"></i></span>' +
      '<span class="file-name">' + fileName + '</span>';

    fileEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (type === 'input') switchInputFile(filePath);
      else switchOutputFile(filePath);
    });
    container.appendChild(fileEl);
  }
}

// Render template tree with match status
function renderTemplateTree(container, tree, type, basePath = '') {
  // Render folders first
  for (const [folderName, subTree] of Object.entries(tree.folders)) {
    const folderPath = basePath ? basePath + '/' + folderName : folderName;
    const isExpanded = expandedFolders[type][folderPath] !== false;

    const folderEl = document.createElement('div');
    folderEl.className = 'file-tree-item file-tree-folder' + (isExpanded ? '' : ' collapsed');
    folderEl.setAttribute('data-folder', folderPath);
    folderEl.innerHTML =
      '<span class="folder-icon"><i data-lucide="chevron-down" style="width:12px;height:12px;"></i></span>' +
      '<span class="folder-icon"><i data-lucide="folder" style="width:14px;height:14px;"></i></span>' +
      '<span class="folder-name">' + folderName + '</span>';
    folderEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFolder(folderPath, type);
    });
    container.appendChild(folderEl);

    const childrenEl = document.createElement('div');
    childrenEl.className = 'file-tree-children';
    renderTemplateTree(childrenEl, subTree, type, folderPath);
    container.appendChild(childrenEl);
  }

  // Render files with match status
  for (const fileName of tree.files) {
    const filePath = basePath ? basePath + '/' + fileName : fileName;
    const matchInfo = matchedTemplateFiles[filePath] || { matched: false, content: '' };
    const isActive = filePath === activeInputFile;

    // Status icon: ✓ matched, ○ unmatched
    const statusIcon = matchInfo.matched ? '✓' : '○';
    const statusClass = matchInfo.matched ? 'matched' : 'unmatched';

    const fileEl = document.createElement('div');
    fileEl.className = 'file-tree-item file-tree-file' + (isActive ? ' active' : '') + ' ' + statusClass;
    fileEl.setAttribute('data-template', filePath);
    fileEl.setAttribute('data-matched', matchInfo.matched);

    const icon = getFileIcon(fileName);
    fileEl.innerHTML =
      '<span class="match-status">' + statusIcon + '</span>' +
      '<span class="file-icon"><i data-lucide="' + icon + '" style="width:14px;height:14px;"></i></span>' +
      '<span class="file-name">' + fileName + '</span>';

    fileEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (matchInfo.matched) {
        // Show matched content
        activeInputFile = filePath;
        showFileViewer('input', filePath, matchInfo.content);
        // Update selection state
        container.querySelectorAll('.file-tree-file').forEach(el => el.classList.remove('active'));
        fileEl.classList.add('active');
      } else {
        // Open file selector for unmatched template
        openFileSelectorModal(filePath);
      }
    });
    container.appendChild(fileEl);
  }
}

// Toggle folder expand/collapse
function toggleFolder(folderPath, type) {
  expandedFolders[type][folderPath] = expandedFolders[type][folderPath] === false ? true : false;

  // Re-render the tree
  if (type === 'input') {
    const sidebar = document.getElementById('inputFileList');
    if (sidebar) {
      sidebar.innerHTML = '';
      // Use template structure instead of inputFiles
      const templates = PLATFORM_TEMPLATE_FILES[detectedPlatform] || [];
      const tree = buildFileTree(templates);
      renderTemplateTree(sidebar, tree, 'input');
    }
  } else {
    const sidebar = document.getElementById('outputFileList');
    if (sidebar) {
      sidebar.innerHTML = '';
      const tree = buildFileTree(Object.keys(outputFiles));
      renderFileTree(sidebar, tree, 'output');
    }
  }

  // Re-init icons
  if (window.lucide) lucide.createIcons();
}

// Get file icon based on extension
function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    'yaml': 'file-code',
    'yml': 'file-code',
    'json': 'file-json',
    'md': 'file-text',
    'txt': 'file-text',
    'py': 'file-code',
    'js': 'file-code',
    'ts': 'file-code',
    'html': 'file-code',
    'css': 'file-code',
    'toml': 'file-code',
    'xml': 'file-code'
  };
  return icons[ext] || 'file';
}

// ============================================
// File Switching
// ============================================

function switchInputFile(filename) {
  if (!inputFiles[filename]) return;
  activeInputFile = filename;

  // Update tree selection state
  document.querySelectorAll('#inputFileList .file-tree-file').forEach(item => {
    item.classList.remove('active', 'selected');
    if (item.getAttribute('data-file') === filename) {
      item.classList.add('active', 'selected');
    }
  });

  showFileViewer('input', filename, inputFiles[filename]);
}

// ============================================
// File Selector for Unmatched Templates
// ============================================

let currentSelectingTemplate = '';

function openFileSelectorModal(templatePath) {
  currentSelectingTemplate = templatePath;
  const modal = document.getElementById('fileSelectorModal');
  const listEl = document.getElementById('fileSelectorList');
  const titleEl = document.getElementById('targetTemplateName');

  if (!modal || !listEl) return;

  // Set title
  if (titleEl) {
    titleEl.textContent = templatePath.split('/').pop();
  }

  // Populate list with all extracted files
  listEl.innerHTML = '';
  const files = Object.keys(allExtractedFiles);

  if (files.length === 0) {
    listEl.innerHTML = '<div class="file-selector-empty">No uploaded files available</div>';
  } else {
    for (const filePath of files) {
      const itemEl = document.createElement('div');
      itemEl.className = 'file-selector-item';
      itemEl.setAttribute('data-source', filePath);

      const icon = getFileIcon(filePath.split('/').pop());
      itemEl.innerHTML =
        '<span class="file-icon"><i data-lucide="' + icon + '" style="width:14px;height:14px;"></i></span>' +
        '<span class="file-path">' + filePath + '</span>';

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        listEl.querySelectorAll('.file-selector-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');
      });
      listEl.appendChild(itemEl);
    }
  }

  // Show modal
  modal.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function confirmFileSelection() {
  const listEl = document.getElementById('fileSelectorList');
  if (!listEl || !currentSelectingTemplate) return;

  const selected = listEl.querySelector('.file-selector-item.selected');
  if (!selected) {
    showToast('Please select a file', 'error');
    return;
  }

  const sourcePath = selected.getAttribute('data-source');
  const content = allExtractedFiles[sourcePath];

  // Update matched template files
  matchedTemplateFiles[currentSelectingTemplate] = {
    content: content,
    sourcePath: sourcePath,
    matched: true
  };

  // Update inputFiles for compatibility
  inputFiles[currentSelectingTemplate] = content;

  // Re-render file list
  renderInputFileList();

  // Show the matched content
  activeInputFile = currentSelectingTemplate;
  showFileViewer('input', currentSelectingTemplate, content);

  // Close modal
  closeFileSelectorModal();
  showToast('File matched: ' + sourcePath, 'success');
}

function closeFileSelectorModal() {
  const modal = document.getElementById('fileSelectorModal');
  if (modal) modal.classList.remove('open');
  currentSelectingTemplate = '';
}

function skipFileSelection() {
  closeFileSelectorModal();
}

function switchOutputFile(filename) {
  if (!outputFiles[filename]) return;
  activeOutputFile = filename;

  // Update tree selection state
  document.querySelectorAll('#outputFileList .file-tree-file').forEach(item => {
    item.classList.remove('active', 'selected');
    if (item.getAttribute('data-file') === filename) {
      item.classList.add('active', 'selected');
    }
  });

  const preview = document.getElementById('outputPreview');
  if (preview) {
    preview.textContent = outputFiles[filename];
    preview.innerHTML = syntaxHighlight(outputFiles[filename]);
  }

  // Update filename display
  const fileNameEl = document.getElementById('outputFileName');
  if (fileNameEl) {
    // Show just the filename, not full path
    fileNameEl.textContent = filename.split('/').pop();
  }
}

// ============================================
// Show File Viewer
// ============================================

function showFileViewer(type, filename, content) {
  const dropZone = document.getElementById('dropZone');
  const viewer = document.getElementById(type === 'input' ? 'inputViewer' : 'outputViewer');
  const fileNameEl = document.getElementById(type === 'input' ? 'inputFileName' : 'outputFileName');
  const lineCountEl = document.getElementById(type === 'input' ? 'inputLineCount' : null);
  const editor = document.getElementById(type === 'input' ? 'inputArea' : 'outputPreview');

  if (dropZone) dropZone.style.display = 'none';
  if (viewer) viewer.style.display = 'flex';

  // Show just the filename, not full path
  if (fileNameEl) fileNameEl.textContent = filename.split('/').pop();

  if (lineCountEl && content) {
    const lines = content.split('\n').length;
    lineCountEl.textContent = lines + ' lines';
  }

  if (editor) {
    if (type === 'input') {
      editor.value = content || '';
    } else {
      editor.textContent = content || '';
      if (content) editor.innerHTML = syntaxHighlight(content);
    }
  }

  // Re-init Lucide icons
  if (window.lucide) lucide.createIcons();
}

// ============================================
// Schema Display
// ============================================

function showSchema(schema) {
  const emptyEl = document.getElementById('schemaEmpty');
  const previewEl = document.getElementById('schemaPreview');
  const fieldCountEl = document.getElementById('fieldCount');

  if (emptyEl) emptyEl.style.display = 'none';
  if (previewEl) {
    previewEl.style.display = 'block';
    previewEl.textContent = JSON.stringify(schema, null, 2);
    previewEl.innerHTML = syntaxHighlight(JSON.stringify(schema, null, 2));
  }

  // Count fields
  const fieldCount = countSchemaFields(schema);
  if (fieldCountEl) fieldCountEl.textContent = fieldCount + ' fields';
}

function countSchemaFields(obj, depth = 0) {
  if (depth > 2 || !obj || typeof obj !== 'object') return 0;
  let count = Object.keys(obj).length;
  for (const val of Object.values(obj)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      count += countSchemaFields(val, depth + 1);
    }
  }
  return count;
}

// ============================================
// Syntax Highlight
// ============================================

function syntaxHighlight(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) cls = 'json-key';
      else cls = 'json-string';
    } else if (/true|false/.test(match)) cls = 'json-bool';
    else if (/null/.test(match)) cls = 'json-null';
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

// ============================================
// Button Events
// ============================================

function bindButtonEvents() {
  // Parse button
  const parseBtn = document.getElementById('parseBtn');
  if (parseBtn) parseBtn.addEventListener('click', handleParseClick);

  // Convert button
  const convertBtn = document.getElementById('convertBtn');
  if (convertBtn) convertBtn.addEventListener('click', handleConvertClick);

  // Download button
  const bundleBtn = document.getElementById('bundleBtn');
  if (bundleBtn) bundleBtn.addEventListener('click', handleBundleClick);

  // Clear button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', handleClearClick);

  // Copy output
  const copyBtn = document.getElementById('copyOutputBtn');
  if (copyBtn) copyBtn.addEventListener('click', handleCopyClick);

  // Expand output
  const expandBtn = document.getElementById('expandOutputBtn');
  if (expandBtn) expandBtn.addEventListener('click', handleExpandClick);

  // Clear input
  const clearInputBtn = document.getElementById('clearInputBtn');
  if (clearInputBtn) clearInputBtn.addEventListener('click', handleClearClick);
}

// ============================================
// Parse Handler
// ============================================

async function handleParseClick() {
  if (!uploadedFile) {
    showToast('Please upload a file first', 'error');
    return;
  }

  document.getElementById('inputLoading').style.display = 'flex';
  setStep(2);

  try {
    // Use all extracted files for multi-file parsing
    if (Object.keys(allExtractedFiles).length === 0) {
      showToast('No files extracted', 'error');
      document.getElementById('inputLoading').style.display = 'none';
      return;
    }

    // If schema already generated from ZIP upload, skip re-parse
    if (currentSchema && currentSchema.meta?.sourcePlatform !== 'plain') {
      showSchema(currentSchema);
      document.getElementById('inputLoading').style.display = 'none';
      setStep(3);
      updateButtonStates();
      showToast('Schema already generated', 'success');
      return;
    }

    // Re-parse with multi-file Bundle parser
    // 先计算 matchedFiles，标准化路径
    matchedTemplateFiles = matchFilesToTemplate(detectedPlatform, allExtractedFiles);
    currentSchema = await generateSchemaFromMatchedFiles(detectedPlatform, matchedTemplateFiles, null);

    if (!currentSchema) {
      // Fallback to single file parsing
      const content = inputFiles[activeInputFile] || Object.values(allExtractedFiles)[0] || '';
      currentSchema = UATParser.runParserPool(content, detectedPlatform);
    }

    showSchema(currentSchema);

    document.getElementById('inputLoading').style.display = 'none';
    setStep(3);
    updateButtonStates();
    showToast('Schema generated', 'success');
  } catch (error) {
    document.getElementById('inputLoading').style.display = 'none';
    showToast('Parse failed: ' + error.message, 'error');
  }
}

// ============================================
// Convert Handler
// ============================================

async function handleConvertClick() {
  const targetPlatform = getSelectedPlatform();
  if (!targetPlatform) {
    showToast('Please select target platform', 'error');
    return;
  }

  if (!currentSchema) {
    showToast('Please parse first', 'error');
    return;
  }

  document.getElementById('outputLoading').style.display = 'flex';
  setStep(4);

  try {
    // Convert schema to target format
    const encoder = UATEncoder.getEncoder(targetPlatform);
    if (encoder) {
      outputFiles = encoder.encodeToFiles(currentSchema);
      activeOutputFile = Object.keys(outputFiles)[0] || '';

      // Show output viewer
      const emptyEl = document.getElementById('outputEmpty');
      const viewerEl = document.getElementById('outputViewer');
      if (emptyEl) emptyEl.style.display = 'none';
      if (viewerEl) viewerEl.style.display = 'flex';

      renderOutputFileList();
      switchOutputFile(activeOutputFile);

      // Show platform tag
      const tagEl = document.getElementById('outputPlatformTag');
      if (tagEl) {
        tagEl.textContent = targetPlatform.toUpperCase();
        tagEl.style.display = 'inline';
      }

      // Show stats
      document.getElementById('outputStats').style.display = 'flex';
      document.getElementById('copyOutputBtn').style.display = 'flex';
      document.getElementById('expandOutputBtn').style.display = 'flex';

      document.getElementById('outputLoading').style.display = 'none';
      setStep(5);
      updateButtonStates();
      showToast('Converted to ' + targetPlatform, 'success');
    } else {
      document.getElementById('outputLoading').style.display = 'none';
      showToast('Encoder not found for ' + targetPlatform, 'error');
    }
  } catch (error) {
    document.getElementById('outputLoading').style.display = 'none';
    showToast('Convert failed: ' + error.message, 'error');
  }
}

// ============================================
// Download Handler
// ============================================

function handleDownloadClick() {
  if (Object.keys(outputFiles).length === 0) {
    showToast('No output files', 'error');
    return;
  }

  const platform = getSelectedPlatform();
  const filename = 'UAT_' + platform + '_' + activeOutputFile;

  downloadFile(filename, outputFiles[activeOutputFile]);
  showToast('Downloaded: ' + filename, 'success');
}

// ============================================
// Bundle Handler
// ============================================

async function handleBundleClick() {
  if (Object.keys(outputFiles).length === 0) {
    showToast('No output files', 'error');
    return;
  }

  const platform = getSelectedPlatform();
  const filename = 'UAT_' + platform + '_Bundle.zip';

  try {
    const blob = await createBundleZip(outputFiles, platform);
    downloadBlob(filename, blob);
    showToast('Bundle exported: ' + filename, 'success');
  } catch (error) {
    showToast('Bundle failed: ' + error.message, 'error');
  }
}

// ============================================
// Clear Handler
// ============================================

function handleClearClick() {
  // Reset state
  allExtractedFiles = {};
  matchedTemplateFiles = {};
  inputFiles = {};
  outputFiles = {};
  activeInputFile = '';
  activeOutputFile = '';
  currentSchema = null;
  uploadedFile = null;
  detectedPlatform = '';

  // Reset UI
  document.getElementById('dropZone').style.display = 'flex';
  document.getElementById('inputViewer').style.display = 'none';
  document.getElementById('inputFileList').innerHTML = '';
  document.getElementById('inputFileCount').style.display = 'none';
  document.getElementById('inputPlatformTag').style.display = 'none';
  document.getElementById('inputArea').value = '';
  document.getElementById('inputFileName').textContent = '-';
  document.getElementById('inputLineCount').textContent = '0 lines';

  document.getElementById('schemaEmpty').style.display = 'flex';
  document.getElementById('schemaPreview').style.display = 'none';
  document.getElementById('schemaPreview').textContent = '';
  document.getElementById('fieldCount').textContent = '0 fields';

  document.getElementById('outputEmpty').style.display = 'flex';
  document.getElementById('outputViewer').style.display = 'none';
  document.getElementById('outputFileList').innerHTML = '';
  document.getElementById('outputPlatformTag').style.display = 'none';
  document.getElementById('outputStats').style.display = 'none';
  document.getElementById('copyOutputBtn').style.display = 'none';
  document.getElementById('expandOutputBtn').style.display = 'none';

  // Reset platform selection
  document.querySelectorAll('.platform-btn').forEach(btn => btn.classList.remove('selected'));

  setStep(1);
  updateButtonStates();
  showToast('Cleared', 'info');
}

// ============================================
// Copy Handler
// ============================================

async function handleCopyClick() {
  const content = outputFiles[activeOutputFile];
  if (!content) {
    showToast('No content to copy', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    showToast('Copied to clipboard', 'success');
  } catch (e) {
    showToast('Copy failed', 'error');
  }
}

// ============================================
// Expand Handler
// ============================================

function handleExpandClick() {
  const content = outputFiles[activeOutputFile];
  if (!content) return;

  const fullscreenContent = document.getElementById('fullscreenContent');
  if (fullscreenContent) {
    fullscreenContent.textContent = content;
    fullscreenContent.innerHTML = syntaxHighlight(content);
  }

  openModal('fullscreenModal');
}

// ============================================
// Platform Selector
// ============================================

function bindPlatformSelectorEvents() {
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const platform = btn.getAttribute('data-platform');
      showToast('Target: ' + platform, 'info', 2000);

      updateButtonStates();
    });
  });
}

function getSelectedPlatform() {
  const selectedBtn = document.querySelector('.platform-btn.selected');
  return selectedBtn ? selectedBtn.getAttribute('data-platform') : null;
}

// ============================================
// Modal Events
// ============================================

function bindModalEvents() {
  // Fullscreen modal
  bindModalClose('fullscreenModal', ['closeFullscreenBtn', 'closeFullscreen2Btn', 'copyFullscreenBtn']);
  bindModalOverlay('fullscreenModal');

  // Help modal
  bindModalClose('helpModal', ['closeHelpBtn', 'closeHelp2Btn']);
  bindModalOverlay('helpModal');

  // File selector modal
  bindModalClose('fileSelectorModal', ['closeFileSelectorBtn', 'skipFileBtn']);
  bindModalOverlay('fileSelectorModal');

  // Confirm file selection
  const confirmFileBtn = document.getElementById('confirmFileBtn');
  if (confirmFileBtn) confirmFileBtn.addEventListener('click', confirmFileSelection);

  // Help button
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', () => openModal('helpModal'));

  // Copy fullscreen
  const copyFullscreenBtn = document.getElementById('copyFullscreenBtn');
  if (copyFullscreenBtn) {
    copyFullscreenBtn.addEventListener('click', async () => {
      const content = outputFiles[activeOutputFile];
      if (content) {
        await navigator.clipboard.writeText(content);
        showToast('Copied all content', 'success');
      }
    });
  }
}

function bindModalClose(modalId, closeBtnIds) {
  closeBtnIds.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', () => closeModal(modalId));
  });
}

function bindModalOverlay(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modalId);
    });
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// ============================================
// File List Events
// ============================================

function bindFileListEvents() {
  // Input file list clicks handled in renderInputFileList
  // Output file list clicks handled in renderOutputFileList
}

// ============================================
// Button States
// ============================================

function updateButtonStates() {
  const parseBtn = document.getElementById('parseBtn');
  const convertBtn = document.getElementById('convertBtn');
  const bundleBtn = document.getElementById('bundleBtn');

  const hasInput = Object.keys(inputFiles).length > 0;
  const hasSchema = currentSchema !== null;
  const hasTarget = getSelectedPlatform() !== null;
  const hasOutput = Object.keys(outputFiles).length > 0;

  if (parseBtn) parseBtn.disabled = !hasInput;
  if (convertBtn) convertBtn.disabled = !hasSchema || !hasTarget;
  if (bundleBtn) bundleBtn.disabled = !hasOutput;
}

// ============================================
// Utility Functions
// ============================================

function isTextFile(path) {
  const exts = ['.md', '.yml', '.yaml', '.json', '.txt', '.py', '.js', '.ts', '.toml', '.xml', '.html', '.css'];
  return exts.some(ext => path.toLowerCase().endsWith(ext));
}

async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function detectPlatformFromFiles(files) {
  const filenames = Object.keys(files);
  if (filenames.some(f => f.includes('dify'))) return 'dify';
  if (filenames.some(f => f.includes('openclaw'))) return 'openclaw';
  if (filenames.some(f => f.includes('cursor'))) return 'cursor';
  if (filenames.some(f => f.includes('hermes'))) return 'hermes';
  return 'auto';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function createBundleZip(files, platform) {
  if (!window.JSZip) throw new Error('JSZip not loaded');

  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }

  // Add manifest
  zip.file('manifest.json', JSON.stringify({
    bundleType: platform + '-Agent-Bundle',
    created: new Date().toISOString(),
    files: Object.keys(files)
  }));

  return zip.generateAsync({ type: 'blob' });
}

// ============================================
// Export
// ============================================

window.UATUI = {
  initUIController,
  setStep,
  showToast,
  updateButtonStates,
  handleFileUpload,
  inputFiles,
  outputFiles,
  currentSchema,
  detectedPlatform
};

// ============================================
// Auto Init
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initUIController();
});