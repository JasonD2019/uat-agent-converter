# UAT Agent Converter v1.1.0 Release Notes

## 🎉 Release Highlights

UAT Agent Converter v1.1.0 introduces comprehensive **Data Migration Support** for AI agent configurations, enabling seamless transfer of memory, knowledge base, and skills across 12 platforms.

## 📦 What's New

### F-Series: Data Migration Features

| Feature | Description |
|---------|-------------|
| **memoryEntries** | Structured memory entries with type (fact/preference/skill/context), priority, source metadata |
| **knowledgeBaseContent** | Pack knowledge base files for cross-platform transfer |
| **skills Layer** | Automatic skills inference from prompts and tools configuration |
| **Secrets Sanitizer** | Detect and sanitize API keys, passwords, tokens before export |
| **Integrity Report** | Track data completeness across platform conversion |

### E-Series: CLI Experience Improvements

| Feature | Description |
|---------|-------------|
| **--content** | Parse content directly without file |
| **Error Codes** | Unified error codes (E100-E599) with fix suggestions |
| **--confidence** | Show platform detection confidence percentage |
| **--validate** | Validate output format after conversion |
| **Temp Cleanup** | Auto cleanup `.uat-temp` directory |

## 🛠️ Supported Platforms (12)

- **Dify** - YAML DSL format
- **OpenClaw** - JSON + Markdown
- **Hermes** - YAML + Markdown
- **Cursor** - .cursorrules
- **Windsurf** - .windsurfrules
- **Claude Code** - CLAUDE.md + settings.json
- **FastGPT** - JSON workflow
- **Flowise** - JSON flow
- **GitHub Copilot** - copilot-instructions.md
- **Codex** - AGENTS.md
- **Zed** - rules.md + settings.json

## 🔧 CLI Usage Examples

```bash
# Parse with knowledge/skills packing
uat parse --input openclaw.json --pack-kb --pack-skills

# Convert with sanitization and integrity report
uat convert --schema schema.json --target claude --sanitize --integrity

# Generate standalone integrity report
uat integrity --schema schema.json --format markdown

# Detect platform with confidence
uat detect --input config.yaml --confidence
```

## 📊 Test Results

- **107 Parse/Convert/Migration tests** passing
- **Cross-platform conversion** validated for all 11×11 combinations
- **Memory migration** verified for structured formats
- **Knowledge base** transfer validated

## 📁 New Files Added

- `src/core/schema-extensions.js` - Extended Schema structures
- `src/parser/memory-parser.js` - Unified memory parsing
- `src/bundle/knowledge-packager.js` - Knowledge base packing
- `src/bundle/skills-packager.js` - Skills inference & packing
- `src/guard/secrets-sanitizer.js` - Sensitive info detection
- `src/export/integrity-report.js` - Integrity report generation
- `CHANGELOG.md` - Version history

## 🔗 Links

- **Live Demo**: https://jasond2019.github.io/uat-agent-converter/
- **GitHub**: https://github.com/JasonD2019/uat-agent-converter
- **Issues**: https://github.com/JasonD2019/uat-agent-converter/issues

## 🙏 Acknowledgments

Thanks to all platform developers for their open formats, and the AI Agent community for feedback and suggestions.

---

**Full Changelog**: [CHANGELOG.md](CHANGELOG.md)