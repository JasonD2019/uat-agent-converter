# UAT Agent Converter

> Cross-Platform AI Agent Config Converter | 跨平台 AI Agent 配置转换器

**[中文文档](README_CN.md)** | **English** | **[🚀 Start Converting](https://jasond2019.github.io/uat-agent-converter/)**

[![GitHub](https://img.shields.io/badge/GitHub-JasonD2019/uat--agent--converter-blue?logo=github)](https://github.com/JasonD2019/uat-agent-converter)
[![Live Demo](https://img.shields.io/badge/Demo-GitHub%20Pages-green?logo=github)](https://jasond2019.github.io/uat-agent-converter/)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platforms](https://img.shields.io/badge/platforms-12-green.svg)
![Version](https://img.shields.io/badge/version-1.3.1-purple.svg)

**Local · Offline · Secure** — All processing runs locally, no data uploaded to any server.

---

## Quick Start

### Option 1: Agent Auto-Conversion 🤖

For Claude Code, Cursor, Windsurf, Codex, Copilot users.

**Step 1: Install Skill**
```
Please download uat-import skill from https://jasond2019.github.io/uat-agent-converter/.claude/skills/uat-import/skill.md
```

**Step 2: Execute Conversion**
```
Convert Dify agent to Cursor
Convert ./dify.yml to Windsurf
Convert ./hermes/config.yaml to Claude
```

Agent automatically: Reads config → Detects platform → Parses to Schema → Converts → Saves files

> **Note**: Cloud platform users (Dify, FastGPT, Flowise) should use Option 2.

### Option 2: Web Manual Conversion 🧑

For all users, no installation required.

**Visit**: [https://jasond2019.github.io/uat-agent-converter/](https://jasond2019.github.io/uat-agent-converter/)

**Workflow**:
1. Upload config file or Bundle ZIP
2. View parsed results and UAT-Schema
3. Select target platform
4. Download converted output

**Download SDK**: Click "Download SDK Bundle" button on the page (~200KB standalone file)

---

## Features

- **12 Platform Support** — Convert between Dify, OpenClaw, Hermes, Cursor, Windsurf, Claude Code, FastGPT, Flowise, Copilot, Codex, Zed, and more
- **Bidirectional Conversion** — Parse any platform's agent bundle and convert to any other platform
- **Bundle ZIP Support** — Upload/Download complete agent bundles with all files
- **UAT-Schema v2.0** — Unified intermediate schema for cross-platform mapping
- **Auto Platform Detection** — Automatically detect source platform from uploaded files
- **Real-time Preview** — View parsed files and generated schema instantly
- **i18n Support** — English/Chinese interface
- **CLI & Skill Support** — Command-line tool and AI assistant skill for batch conversion

### Data Migration (v1.1.0 F-Series)

| Feature | Description |
|---------|-------------|
| **memoryEntries** | Structured memory entries with type, priority, source metadata |
| **knowledgeBaseContent** | Pack knowledge base files for cross-platform transfer |
| **skills Layer** | Skills inference from prompts and tools configuration |
| **Secrets Sanitizer** | Detect and sanitize API keys, passwords, tokens |
| **Integrity Report** | Track data completeness across platform conversion |

## Supported Platforms

| Platform | Format | Parse | Encode | Bundle |
|----------|--------|-------|--------|--------|
| **Dify** | YAML DSL | ✅ | ✅ | ✅ |
| **OpenClaw** | JSON + MD | ✅ | ✅ | ✅ |
| **Hermes** | YAML + MD | ✅ | ✅ | ✅ |
| **Cursor** | .cursorrules | ✅ | ✅ | ✅ |
| **Windsurf** | .windsurfrules | ✅ | ✅ | ✅ |
| **Claude Code** | CLAUDE.md + settings | ✅ | ✅ | ✅ |
| **FastGPT** | JSON | ✅ | ✅ | ✅ |
| **Flowise** | JSON | ✅ | ✅ | ✅ |
| **Copilot** | .github/copilot-instructions.md | ✅ | ✅ | ✅ |
| **Codex** | AGENTS.md | ✅ | ✅ | ✅ |
| **Zed** | rules.md + settings.json | ✅ | ✅ | ✅ |

---

## UAT-Schema v2.0

The unified intermediate schema that bridges all platforms:

```json
{
  "meta": {
    "name": "Agent Name",
    "description": "Agent description",
    "version": "1.0.0",
    "author": "Author",
    "tags": ["tag1", "tag2"],
    "license": "MIT"
  },
  "core": {
    "identity": "Agent identity description",
    "soul": "Agent soul/mission statement",
    "persona": {
      "name": "Persona name",
      "role": "Role description",
      "style": "Communication style",
      "traits": ["trait1", "trait2"]
    },
    "knowledgeBaseRef": ["kb1.md", "kb2.md"],
    "longTermMemory": "Memory string content",
    "userPreferences": "User preference settings"
  },
  "behavior": {
    "workflow": [
      { "step": "Step name", "type": "action", "content": "Step content" }
    ],
    "triggers": ["trigger1", "trigger2"],
    "heartbeat": { "interval": "1h", "actions": ["action1"] }
  },
  "tools": [
    { "name": "Tool name", "type": "function", "description": "Tool desc", "schema": {} }
  ],
  "communication": {
    "style": "professional",
    "tone": "friendly",
    "formats": ["markdown", "json"]
  },
  "runtime": {
    "model": "gpt-4",
    "provider": "openai",
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

## Project Architecture

```
UAT/
├── index.html              # Main entry point
├── styles.css              # UI styles
├── test-node.js            # Node.js test suite
│
├── src/
│   ├── core/
│   │   ├── schema.js       # UAT-Schema v2.0 definition
│   │   └── schema-extensions.js  # F1: memoryEntries, knowledgeBaseContent, skills
│   │
│   ├── input/
│   │   └── input-utils.js  # File upload/ZIP handling
│   │
│   ├── detector/
│   │   └── platform-detector.js  # Auto platform detection
│   │
│   ├── parser/
│   │   ├── parser-pool.js  # Parser dispatcher
│   │   └── memory-parser.js  # F2/F3: Unified memory parsing (11 platforms)
│   │
│   ├── encoder/
│   │   ├── encoder-pool.js      # Legacy encoder functions
│   │   └── encoder-registry.js  # Encoder dispatcher (UATEncoder)
│   │
│   ├── bundle/                  # Platform-specific modules
│   │   ├── bundle-base.js       # Shared utilities
│   │   ├── knowledge-packager.js  # F1: Knowledge base packing
│   │   ├── skills-packager.js     # F4: Skills inference & packing
│   │   ├── openclaw-bundle.js   # OpenClaw: parse + encode + create
│   │   ├── hermes-bundle.js     # Hermes: parse + encode + create
│   │   ├── cursor-bundle.js     # Cursor: parse + encode + create
│   │   ├── windsurf-bundle.js   # Windsurf: parse + encode + create
│   │   ├── claude-code-bundle.js # Claude Code: parse + encode + create
│   │   ├── dify-bundle.js       # Dify: parse + encode + create
│   │   ├── fastgpt-bundle.js    # FastGPT: parse + encode + create
│   │   ├── flowise-bundle.js    # Flowise: parse + encode + create
│   │   ├── copilot-bundle.js    # Copilot: parse + encode + create
│   │   ├── codex-bundle.js      # Codex: parse + encode + create
│   │   └── zed-bundle.js        # Zed: parse + encode + create
│   │
│   ├── export/
│   │   ├── export-utils.js # ZIP export utilities
│   │   └── integrity-report.js  # F6: Integrity report generation
│   │
│   ├── ui/
│   │   ├── i18n.js         # Internationalization (EN/ZH)
│   │   └── ui-controller.js # UI interaction controller
│   │
│   ├── guard/
│   │   └── secrets-sanitizer.js  # F5: Secrets detection & sanitization
│   │
│   └── cli/
│       └── uat-cli.js      # CLI v1.1.0 (E/F-series parameters)
│
└── README.md               # This file
```

### Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `schema.js` | UAT-Schema v2.0 definition and validation |
| `schema-extensions.js` | Extended structures: memoryEntries, knowledgeBaseContent, skills |
| `platform-detector.js` | Detect platform from file signatures |
| `parser-pool.js` | Dispatch to correct parser based on platform |
| `memory-parser.js` | Unified memory parsing for 11 platforms (A/B/C formats) |
| `encoder-registry.js` | Dispatch to correct encoder via `UATEncoder.encodeToFiles()` |
| `bundle/*.js` | Complete platform implementation: parse + encode + bundle |
| `knowledge-packager.js` | Pack/unpack knowledge base content for transfer |
| `skills-packager.js` | Infer and pack skills from prompts/tools |
| `secrets-sanitizer.js` | Detect API keys, passwords, tokens; sanitize output |
| `integrity-report.js` | Generate conversion integrity reports |
| `uat-cli.js` | CLI v1.1.0 with E/F-series parameters |
| `ui-controller.js` | Handle UI events, coordinate parse/convert flow |

## Technology Stack

- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **UI**: CSS3 with modern layout (flexbox, grid)
- **Icons**: Lucide Icons
- **ZIP Handling**: JSZip (browser) / Node.js fs (testing)
- **Fonts**: Inter, JetBrains Mono
- **Testing**: Node.js native test runner

## Adding a New Platform

To add support for a new platform:

1. Create `src/bundle/newplatform-bundle.js`:
   ```javascript
   // Parse functions
   function parseNewPlatformConfig(content) { ... }
   
   // Encode functions
   function encodeNewPlatformMain(schema) { ... }
   
   // Bundle entry point
   function encodeNewPlatformToFiles(schema) {
     return {
       'config.json': encodeNewPlatformMain(schema),
       // ... other files
     };
   }
   
   // Export
   window.NewPlatformBundle = {
     parseNewPlatformConfig,
     encodeNewPlatformMain,
     encodeNewPlatformToFiles,
     createNewPlatformBundle
   };
   ```

2. Add to `platform-detector.js` detection rules

3. Add to `parser-pool.js` parser mapping

4. Add to `encoder-registry.js` encoder mapping

5. Add UI button in `index.html`

6. Add i18n translations in `src/ui/i18n.js`

7. Add tests in `test-node.js`

## Security Features

- **Network Guard**: Blocks all external requests (fetch/XHR/WebSocket) in production
- **Sensitive Filter**: Auto-detects and filters API keys, tokens, passwords
- **Memory Cleanup**: Clears all cached data on page close
- **Error Handling**: Global exception capture with friendly error messages

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the need for interoperable AI agent configurations
- Built with the goal of local-first, privacy-preserving tools
- Thanks to all platform developers for their open formats

---

**Made with ❤️ for the AI Agent community**