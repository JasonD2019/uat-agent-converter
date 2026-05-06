# Changelog

All notable changes to this project will be documented in this file.

## [v1.3.0] - 2026-05-06

### 🎯 Production Deployment: Bundle + Skill Overhaul

### Added - K-Series Production Bundle

- **K1: Bundle Packaging Script** (`scripts/build-bundle.js`)
  - UMD wrapper for Node.js and browser compatibility
  - Core module bundling (~13 files, ~200KB)
  - Automatic module dependency ordering
  - Global alias linking for source compatibility

- **K2: Bundle CLI Entry** (`src/cli/bundle-cli.js`)
  - Lightweight CLI for Skill execution
  - Commands: parse, convert, detect, platforms
  - File and content input support
  - Direct module references for early execution

- **K3: Core Bundle** (`dist/uat-bundle.js`)
  - Standalone executable bundle (~206KB)
  - Dynamic loading via WebFetch from GitHub Pages
  - Cached in `.uat-temp/` for reuse
  - Full parse/convert/detect functionality

### Changed - Skill Overhaul

- **Dynamic Bundle Loading** - WebFetch from GitHub Pages
- **One-Command Installation** - "安装UAT skill" auto-downloads
- **Cached Bundle** - Reuse without repeated downloads
- **Clear Platform Guidance** - Cloud platforms use Web UI
- **Updated Skill Definition** - Complete workflow rewrite

### Added - Web UI Integration

- **SDK Download Button** - Download bundle.js directly
- **Copy Skill Command Button** - Copy "安装 UAT skill" command
- **Installation Guide** - `docs/UAT-SKILL-GUIDE.md`

### Documentation

- `docs/UAT-SKILL-GUIDE.md` - Installation and usage guide
- `README.md` - Skill section added
- `index.html` - SDK download buttons

### Deployment

- Bundle hosted on GitHub Pages (`dist/uat-bundle.js`)
- Skill definition hosted on GitHub Pages
- End-to-end validation completed

---

## [v1.2.0] - 2026-04-25

### 🎯 Phase 3: Output Encoding & MCP Preservation

### Added - G-Series Output Encoders

- **G1: Memory Encoder** (`src/encoder/memory-encoder.js`)
  - Encode memoryEntries for all platforms
  - YAML format: Dify, Hermes
  - JSON format: FastGPT, Flowise, OpenClaw
  - JSON code block: Claude, Zed
  - Markdown table: Codex
  - Markdown list: Cursor, Windsurf, Copilot

- **G2: Knowledge Encoder** (`src/encoder/knowledge-encoder.js`)
  - Encode knowledgeBaseContent for A/B platforms
  - Dify YAML format with datasets
  - FastGPT JSON format with datasets/documents
  - OpenClaw JSON + Markdown separation
  - Hermes YAML + Markdown separation
  - CSV export format

- **G3: Skills Encoder** (`src/encoder/skills-encoder.js`)
  - Encode skillsLayer for all platforms
  - Hermes YAML with full attributes
  - OpenClaw SKILLS.md independent file
  - Codex AGENTS.md Skills section
  - Markdown list/table formats
  - Category grouping and level stars

- **Bundle Integration** - Modified 11 Bundle files
  - Added encoder helper functions to each Bundle
  - Integrated memory/knowledge/skills encoding calls
  - OpenClaw: Added SKILLS.md file output
  - Hermes: Added skills.yaml output
  - All bundles: memoryEntries encoding support

### Added - H-Series MCP Preservation

- **MCP Encoder** (`src/encoder/mcp-encoder.js`)
  - Complete MCP configuration preservation
  - Environment variable sanitization (secrets marked)
  - Migration hints per platform
  - Platform-specific output formats:
    - Claude: settings.json mcpServers format
    - Cursor/Windsurf: mcp.json format
    - OpenClaw: JSON with migration notes
    - Hermes: YAML server list
    - Zed: settings.json mcp_servers
  - Migration report generation

### Added - I-Series CLI Batch Processing

- **Batch Detect** - `uat detect --input-dir <path>`
  - Recursive directory scanning
  - File pattern matching (*.yaml,*.json,*.md)
  - Platform distribution statistics
  - Confidence display for each file

- **Batch Parse** - `uat parse --input-dir <path>`
  - Multi-file parsing to Schema
  - Optional platform specification
  - Output directory for schemas
  - Pack KB/Skills during batch parse

- **Batch Convert** - `uat convert --schema-dir <path>`
  - Multi-schema conversion
  - Parallel processing support
  - Output directory structure
  - Sanitization option

- **New Parameters**
  - `--input-dir <path>` - Input directory
  - `--schema-dir <path>` - Schema directory
  - `--output-dir <path>` - Output directory
  - `--recursive` - Recursive subdirectory scan
  - `--pattern <glob>` - File matching pattern
  - `--parallel <n>` - Parallel processing count

### Added - J-Series UI Controller Extension

- **Pack KB Button** - UI integration for knowledge packager
- **Pack Skills Button** - UI integration for skills packager
- **Sanitize Toggle** - Toggle for secrets sanitization
- **Integrity Report Button** - Generate and display integrity report
- **Report Preview** - Visual integrity report in Schema panel

### Changed

- **CLI Version** - Updated to v1.2.0
- **Help Documentation** - Added batch processing examples
- **index.html** - Added encoder script references
- **test-node.js** - 157 tests passing

## [v1.1.0] - 2026-04-27

### 🎯 Phase 2: Data Migration & CLI Optimization

### Added - F-Series Data Migration

- **F1: Schema Extensions** - Extended UAT-Schema with structured data layers
  - `memoryEntries` array for structured memory with type, priority, source metadata
  - `knowledgeBaseContent` for packing knowledge base files for cross-platform transfer
  - `skills` layer for skills inference and capabilities declaration

- **F1: Knowledge Packager** (`src/bundle/knowledge-packager.js`)
  - Pack knowledge base references into embedded content
  - Support datasets, documents, Q&A pairs, rules formats
  - Export to JSON, YAML, Markdown, CSV formats

- **F2/F3: Unified Memory Parser** (`src/parser/memory-parser.js`)
  - Unified memory parsing for 11 platforms
  - Platform classification: A-class (JSON), B-class (embedded), C-class (Markdown)
  - Support JSON code blocks, Markdown tables, Markdown lists formats
  - Auto-detect memory sections from platform configs

- **F4: Skills Packager** (`src/bundle/skills-packager.js`)
  - Infer skills from system prompts and constraints
  - Extract capabilities from tools (MCP/API/Functions)
  - Infer specializations from workflow steps
  - Support 5 skill categories: programming, analysis, communication, tool, domain

- **F5: Secrets Sanitizer** (`src/guard/secrets-sanitizer.js`)
  - Detect sensitive information: API keys, passwords, tokens, OAuth secrets
  - Support detection patterns: AWS credentials, database URLs, private keys
  - Sanitization strategies: mask, remove, placeholder
  - Schema and output file sanitization

- **F6: Integrity Report** (`src/export/integrity-report.js`)
  - Generate conversion integrity reports
  - Track required fields, range values, array lengths, field types
  - Data transfer statistics per layer (meta, identity, tools, workflow, memory, skills)
  - Export formats: JSON, Markdown, YAML, HTML

### Added - E-Series CLI Optimization

- **E1: Direct Content Input** - `--content` parameter for parsing without file
- **E2: Error Code System** - Unified error codes (100-599) with fix suggestions
- **E3: Temp File Cleanup** - Auto cleanup `.uat-temp` on exit
- **E4: Detection Confidence** - `--confidence` shows platform detection percentage
- **E5: Output Validation** - `--validate` checks output format validity

### CLI New Commands & Parameters

```bash
# New integrity command
uat integrity --schema file.json --format markdown

# New parameters
--pack-kb        Pack knowledge base content
--pack-skills    Pack skills information
--sanitize       Sanitize sensitive info (API keys, passwords)
--sanitize-strategy  Strategy: mask | remove | placeholder
--integrity      Generate integrity report after conversion
--format         Report format: json | markdown | yaml | html
```

### Changed

- Updated `src/cli/uat-cli.js` to v1.2 with F-series parameters
- Updated `src/parser/parser-pool.js` to integrate memory-parser
- Updated `src/core/schema.js` `longTermMemory` from string to array format

### Tests

- 107 Parse/Convert/Migration tests passing
- Cross-platform conversion tests for all 11 platforms
- Memory migration validation tests
- Knowledge base migration tests

### Documentation

- Updated README.md with F-series features and architecture
- Added CLI parameters documentation table

---

## [v1.0.0] - 2026-04-20

### Initial Release

- 12 platform support (Dify, OpenClaw, Hermes, Cursor, Windsurf, Claude, FastGPT, Flowise, Copilot, Codex, Zed)
- Bidirectional conversion between all platforms
- UAT-Schema v2.0 unified intermediate format
- Auto platform detection
- Bundle ZIP upload/download
- Web interface (GitHub Pages)
- CLI tool (Node.js)
- Claude Code Skill support
- i18n (English/Chinese)

---

## Version Planning

| Version | Target Date | Focus |
|---------|-------------|-------|
| v1.2.0 | TBD | MCP Server integration, Batch conversion |
| v1.3.0 | TBD | Workflow visual editor, Schema diff tool |