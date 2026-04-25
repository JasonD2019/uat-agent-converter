# Changelog

All notable changes to this project will be documented in this file.

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