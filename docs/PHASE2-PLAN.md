# UAT 阶段二计划：测试验证与能力优化

## 一、当前状态回顾

### 阶段一已完成

| 项目 | 状态 | 说明 |
|------|------|------|
| Web 版本 | ✅ 已上线 | https://jasond2019.github.io/uat-agent-converter/ |
| CLI 工具 | ✅ 已实现 | `src/cli/uat-cli.js` |
| Skill 定义 | ✅ 已创建 | `.claude/skills/uat-import/skill.md` |
| 双环境导出 | ✅ 已改造 | 11 Bundle + 4 Core 模块 |
| 原有测试 | ✅ 157 通过 | `test-node.js` |
| CLI 测试 | ✅ 7 通过 | `test-cli.js` |
| README 双语 | ✅ 已更新 | To Human / To Agent 结构 |
| GitHub 仓库 | ✅ 已推送 | https://github.com/JasonD2019/uat-agent-converter |

---

## 二、阶段二目标

**三大目标**：
1. **验证转换能力** - 确保所有平台解析/编码正常工作
2. **优化用户体验** - 提升 CLI/Skill 易用性
3. **增强数据迁移** - 解决记忆/知识库/Skills 等数据迁移缺失问题

---

## 三、现有实现问题分析

### 3.1 CLI/Skill 体验问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 缺少批量转换 | 无法一次处理多个文件 | ⭐⭐ |
| 缺少直接内容输入 | 必须提供文件路径，不够灵活 | ⭐⭐⭐ |
| 缺少进度提示 | 大文件转换时用户无反馈 | ⭐⭐ |
| 缺少输出校验 | 无法验证生成文件正确性 | ⭐⭐ |
| 错误信息不友好 | 用户难以定位问题 | ⭐⭐⭐ |
| 临时文件未清理 | `.uat-temp` 目录残留 | ⭐⭐ |

### 3.2 数据迁移问题（核心痛点）

| 问题 | 当前状态 | 影响 | 优先级 |
|------|----------|------|--------|
| **知识库内容丢失** | 仅保留引用 ID，内容不打包 | 用户需重新上传知识库 | ⭐⭐⭐ |
| **长期记忆不完整** | 字符串格式，部分内容丢失 | 记忆条目无法完整迁移 | ⭐⭐⭐ |
| **用户偏好格式简单** | 字符串格式，缺乏结构化 | 跨平台兼容差 | ⭐⭐ |
| **Skills/工作流缺失** | 部分平台不支持技能迁移 | 工具能力丢失 | ⭐⭐⭐ |
| **MCP 密钥被移除** | 安全考虑，但需重新配置 | 用户需手动重新配置 | ⭐⭐ |

### 3.3 数据迁移问题详情

**问题 1: 知识库内容丢失**
```javascript
// bundle-manager.js 第 37-40 行
knowledgeBases: {
  note: "知识库内容暂不传递，仅保留ID引用",  // 问题所在
  refCount: schema.memory.knowledgeBaseRef?.length || 0,
  refs: schema.memory.knowledgeBaseRef || []
}
```

**问题 2: 长期记忆格式**
```javascript
// schema.js 第 47-48 行
memory: {
  longTermMemory: "",      // 仅字符串，不结构化
  userPreference: "",      // 仅字符串，不结构化
  knowledgeBaseRef: []     // 仅引用，无内容
}
```

**问题 3: 工具配置保留**
```javascript
// 当前 MCP 配置密钥被移除
// 用户需在目标平台重新填写密钥
```

---

## 四、测试方案

### 4.1 测试范围

| 测试类型 | 数量 | 说明 |
|----------|------|------|
| Parse 测试 | 11 | 每个源平台解析一次 → Schema |
| Convert 测试 | 11 | Schema → 每个目标平台编码一次 |
| Skill 调用测试 | 5 | 通过 AI 助手触发转换 |
| 数据迁移测试 | 11 | 验证记忆/知识库/Skills 迁移完整性 |
| **总计** | **38** | 覆盖所有平台能力 |

### 4.2 测试流程

```
Phase 1: 准备测试数据
  创建 11 个源平台配置文件（含记忆/知识库/Skills）→ test/fixtures/
                    ↓
Phase 2: Parse 测试
  11 个源文件 → 解析 → Schema（验证解析能力）
  检查: longTermMemory, knowledgeBaseRef, tools 是否完整
                    ↓
Phase 3: Convert 测试
  合并 Schema → 统一测试 Schema → 11 目标平台
  检查: 输出文件是否包含记忆/知识库/Skills 配置
                    ↓
Phase 4: Skill 调用测试
  通过 Claude Code 触发转换，验证 Skill 工作流
                    ↓
Phase 5: 数据迁移验证
  对比转换前后数据完整性：
  ✓ 知识库引用数量是否一致
  ✓ 记忆条目是否完整保留
  ✓ 工具/Skills 配置是否完整
  ✓ 用户偏好是否迁移
```

### 4.3 测试文件清单

| 平台 | 文件名 | 格式 | 必含数据 |
|------|--------|------|----------|
| Dify | `dify-agent.yaml` | YAML DSL | 知识库引用 + 工作流 |
| OpenClaw | `openclaw-config.json` | JSON + MD | 长期记忆 + 日记忆 |
| Hermes | `hermes-config.yaml` | YAML + MD | 记忆文件 + 技能 |
| Cursor | `.cursorrules` | MD | 规则 + 记忆提示 |
| Windsurf | `.windsurfrules` | MD | 规则 + 工作流 |
| Claude | `CLAUDE.md` | MD + JSON | Skills + MCP 配置 |
| FastGPT | `fastgpt-config.json` | JSON | 知识库 + 工作流节点 |
| Flowise | `flowise-config.json` | JSON | Vector Store + 工作流 |
| Copilot | `copilot-instructions.md` | MD | 指令 + 代码风格 |
| Codex | `AGENTS.md` | MD | Skills + 工具定义 |
| Zed | `zed-rules.md` | MD + JSON | 规则 + 任务配置 |

### 4.4 验收标准

| 标准 | 要求 |
|------|------|
| Parse 成功率 | 11/11 = 100% |
| Convert 成成功率 | 11/11 = 100% |
| Skill 调用成功率 | 5/5 = 100% |
| 输出格式有效 | 所有生成文件可解析 |
| **数据完整性** | 记忆/知识库/Skills 引用数量一致 |

---

## 五、能力优化方案

### 5.1 体验优化（E 系列）

| 编号 | 优化点 | 实现方案 | 预估工作量 |
|------|--------|----------|------------|
| E1 | **直接内容输入** | CLI 新增 `--content` 参数，无需文件 | 0.5h |
| E2 | **错误信息优化** | 细化错误类型，提供修复建议 | 0.5h |
| E3 | **临时文件自动清理** | 转换完成后自动删除 `.uat-temp` | 0.2h |
| E4 | **平台检测置信度** | 返回检测结果置信度百分比 | 0.3h |
| E5 | **输出格式校验** | 生成后自动验证 YAML/JSON/MD 格式 | 0.5h |

### 5.2 数据迁移优化（F 系列）- 阶段二重点

| 编号 | 优化点 | 实现方案 | 预估工作量 | 优先级 |
|------|--------|----------|------------|--------|
| F1 | **知识库内容打包** | Bundle 时包含知识库原始文件 | 2h | ⭐⭐⭐ |
| F2 | **长期记忆结构化** | 将字符串改为结构化数组 | 1h | ⭐⭐⭐ |
| F3 | **记忆条目解析增强** | 各平台解析时提取记忆条目 | 1h | ⭐⭐⭐ |
| F4 | **Skills 目录打包** | 支持 skills/ 目录打包和解析 | 2h | ⭐⭐⭐ |
| F5 | **工具配置完整保留** | MCP/API 配置完整保留（敏感信息脱敏提示） | 1h | ⭐⭐ |
| F6 | **数据完整性校验** | 转换前后数据完整性对比报告 | 1h | ⭐⭐ |

### 5.3 数据迁移优化详情

#### F1: 知识库内容打包

**当前问题**：
- `knowledgeBaseRef` 仅存储 ID 引用
- 知识库原始文件（.md/.txt）未打包
- 用户需在目标平台重新上传

**优化方案**：
```javascript
// 新增 schema.memory.knowledgeBaseContent
memory: {
  longTermMemory: "",
  userPreference: "",
  knowledgeBaseRef: [],       // 引用列表（保留）
  knowledgeBaseContent: []     // 新增：知识库内容数组
}

// knowledgeBaseContent 结构
{
  id: "kb-001",
  name: "产品文档",
  type: "md",
  content: "# 产品文档内容...",  // 原始内容
  sourcePath: "knowledge/product.md",
  size: 2048,
  checksum: "abc123"
}
```

**Bundle 打包时**：
- 将知识库文件打包到 `knowledge/` 目录
- manifest.json 记录知识库清单
- 解析时还原到 `knowledgeBaseContent`

**实现位置**：
- `src/core/schema.js` - 扩展 Schema 结构
- `src/bundle/bundle-manager.js` - 打包知识库文件
- 各平台 bundle 解析函数 - 提取知识库内容

#### F2: 长期记忆结构化

**当前问题**：
- `longTermMemory` 是字符串
- 记忆条目格式不统一
- 跨平台兼容性差

**优化方案**：
```javascript
// 新增 schema.memory.memoryEntries
memory: {
  longTermMemory: "",          // 保留字符串格式（向后兼容）
  memoryEntries: [],           // 新增：结构化记忆条目
  userPreference: "",
  knowledgeBaseRef: [],
  knowledgeBaseContent: []
}

// memoryEntries 结构
{
  id: "mem-001",
  type: "fact",               // fact | event | preference | skill
  category: "user-info",      // 分类
  content: "用户偏好使用中文",  // 内容
  importance: 0.8,            // 重要程度 0-1
  createdAt: "2024-01-01",
  source: "conversation",     // 来源
  tags: ["preference", "language"]
}
```

#### F3: 记忆条目解析增强

**优化方案**：
各平台解析时提取记忆条目到结构化格式：

| 平台 | 记忆来源 | 解析方式 |
|------|----------|----------|
| OpenClaw | `MEMORY.md` + 日记忆 | 提取 `### 标题` 格式条目 |
| Hermes | `memory_export.json` | 解析 JSON 结构 |
| Claude | `CLAUDE.md` 记忆部分 | 提取记忆段落 |
| Dify | 知识库节点 | 提取向量库内容 |
| FastGPT | 知识库配置 | 提取数据集信息 |

#### F4: Skills 目录打包

**当前问题**：
- 部分平台有 Skills/工具定义
- 转换时 Skills 可能丢失
- 无法完整迁移工具能力

**优化方案**：
```javascript
// 新增 schema.skills
skills: {
  definitions: [],            // Skills 定义列表
  mcpConfigs: [],             // MCP 配置（脱敏）
  apiEndpoints: [],           // API 端点配置
  customFunctions: []         // 自定义函数
}

// skill definition 结构
{
  id: "skill-001",
  name: "code-review",
  description: "代码审查技能",
  trigger: "review code",
  workflow: [...],            // 工作流步骤
  toolsRequired: ["mcp-git", "api-github"],
  enabled: true
}
```

**Bundle 打包时**：
- 将 Skills 文件打包到 `skills/` 目录
- MCP 配置脱敏（密钥用 `***` 替换，提示用户填写）

#### F5: 工具配置完整保留

**优化方案**：
```javascript
// MCP 配置脱敏处理
{
  id: "mcp-001",
  name: "GitHub MCP",
  type: "stdio",
  command: "mcp-github",
  args: [],
  env: {
    GITHUB_TOKEN: "***需要配置***",  // 脱敏 + 提示
    GITHUB_REPO: "user/repo"         // 非敏感保留
  },
  _secretsHint: "请在目标平台配置 GITHUB_TOKEN"  // 配置提示
}
```

#### F6: 数据完整性校验

**优化方案**：
转换完成后生成完整性报告：

```javascript
// 转换报告结构
{
  source: {
    platform: "openclaw",
    knowledgeRefCount: 3,
    memoryEntries: 15,
    skillsCount: 5,
    mcpCount: 2
  },
  target: {
    platform: "cursor",
    knowledgeRefCount: 3,      // 对比
    memoryEntries: 15,         // 对比
    skillsCount: 5,            // 对比
    mcpCount: 2                // 对比
  },
  integrity: {
    knowledgeRef: "✓ 一致",
    memory: "✓ 一致",
    skills: "⚠ 2 个 Skills 需手动配置",
    mcp: "⚠ 密钥需重新填写"
  },
  warnings: [
    "知识库内容已打包，需在目标平台解压配置",
    "MCP 密钥已脱敏，请手动填写 GITHUB_TOKEN"
  ]
}
```

---

## 六、实施计划

### 6.1 总体时间安排

| 任务 | 预估时间 | 说明 |
|------|----------|------|
| 测试准备 + 执行 | 2h | Phase 1-5 测试 |
| 体验优化（E 系列） | 2h | E1-E5 实现 |
| 数据迁移优化（F 系列） | 7h | F1-F6 实现 |
| 测试验证 | 1h | 确保优化不影响原有功能 |
| 文档更新 + 推送 | 0.5h | README、CHANGELOG |
| **总计** | **12.5h** | 约 2-3 天 |

### 6.2 分阶段执行

#### 阶段 2.1: 测试验证（Day 1）

```
上午（2h）
├── Phase 1: 创建 11 个测试文件 (30min)
├── Phase 2: Parse 测试 (45min)
├── Phase 3: Convert 测试 (45min)
└── 记录测试结果，识别数据迁移问题

下午（1h）
├── Phase 4: Skill 调用测试 (30min)
├── Phase 5: 数据迁移验证 (30min)
└── 整理测试报告
```

#### 阶段 2.2: 体验优化（Day 2 上午）

```
上午（2h）
├── E1: 直接内容输入 (30min)
├── E2: 错误信息优化 (30min)
├── E3: 临时文件自动清理 (15min)
├── E4: 平台检测置信度 (20min)
├── E5: 输出格式校验 (30min)
└── 优化后测试验证 (35min)
```

#### 阶段 2.3: 数据迁移优化（Day 2-3）

```
Day 2 下午（3h）
├── F1: 知识库内容打包 (2h)
├── F2: 长期记忆结构化 (1h)
└── 测试验证

Day 3 上午（4h）
├── F3: 记忆条目解析增强 (1h)
├── F4: Skills 目录打包 (2h)
├── F5: 工具配置完整保留 (1h)
└── 测试验证

Day 3 下午（1h）
├── F6: 数据完整性校验 (1h)
├── 全量测试验证 (30min)
└── 文档更新推送 (30min)
```

---

## 七、具体实现方案

### E1: 直接内容输入

**实现位置**：`src/cli/uat-cli.js`

```javascript
// 新增内容参数处理
function parseCommand(args) {
  let content;
  if (args.content) {
    content = args.content;  // 直接使用内容
  } else if (args.input) {
    content = fs.readFileSync(args.input, 'utf-8');
  } else {
    console.error('❌ 请提供 --input 或 --content');
    process.exit(1);
  }
  // ...
}
```

### E2: 错误信息优化

**错误码定义**：

| 错误类型 | 错误码 | 信息 | 修复建议 |
|----------|--------|------|----------|
| 格式错误 | E001 | YAML 解析失败 | 检查 YAML 格式，确保缩进正确 |
| 缺少字段 | E002 | 缺少必填字段 | 添加缺失字段 |
| 平台不匹配 | E003 | 内容不匹配指定平台 | 使用 --platform 指定正确平台 |
| 文件不存在 | E004 | 文件不存在 | 检查文件路径 |
| Schema 无效 | E005 | Schema 格式无效 | 检查 JSON 格式 |

### E3-E5: 其他体验优化

详见前文描述。

### F1: 知识库内容打包实现

**修改文件**：
1. `src/core/schema.js` - 新增 `knowledgeBaseContent` 字段
2. `src/bundle/bundle-manager.js` - 打包知识库文件
3. 各平台 bundle 解析函数 - 提取知识库内容

**核心代码**：

```javascript
// bundle-manager.js 新增
async function packKnowledgeBase(schema, zip) {
  if (schema.memory.knowledgeBaseContent?.length > 0) {
    zip.folder('knowledge');
    for (const kb of schema.memory.knowledgeBaseContent) {
      const filename = kb.sourcePath || `knowledge/${kb.id}.${kb.type}`;
      zip.file(filename, kb.content);
    }
    
    // 记录清单
    const kbManifest = {
      count: schema.memory.knowledgeBaseContent.length,
      items: schema.memory.knowledgeBaseContent.map(kb => ({
        id: kb.id,
        name: kb.name,
        path: filename,
        size: kb.size,
        checksum: kb.checksum
      }))
    };
    zip.file('knowledge/manifest.json', JSON.stringify(kbManifest, null, 2));
  }
}

// 解析时还原
function unpackKnowledgeBase(zip, schema) {
  const kbFolder = zip.folder('knowledge');
  if (kbFolder) {
    const manifest = JSON.parse(zip.file('knowledge/manifest.json')?.async('string'));
    for (const item of manifest.items) {
      const content = zip.file(item.path)?.async('string');
      schema.memory.knowledgeBaseContent.push({
        id: item.id,
        name: item.name,
        content: content,
        size: item.size,
        sourcePath: item.path
      });
    }
  }
}
```

### F2-F6: 其他数据迁移优化

详见前文描述。

---

## 八、风险与应对

| 集险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| Parse 失败 | 中 | 高 | 检查解析器逻辑，修复字段映射 |
| Convert 格式错误 | 中 | 中 | 验证编码函数，调整输出格式 |
| Skill 调用异常 | 低 | 中 | 检查 CLI 参数传递，优化 Skill 定义 |
| 数据迁移不完整 | 中 | 高 | 增加完整性校验，提供迁移报告 |
| 优化引入新 Bug | 中 | 高 | 优化后运行全量测试验证 |
| Schema 结构变更影响兼容性 | 中 | 中 | 保留原有字段，新增字段向后兼容 |

---

## 九、成功指标

| 指标 | 当前 | 阶段二目标 | 验收标准 |
|------|------|------------|----------|
| Parse 成功率 | 未测 | 100% | 11/11 通过 |
| Convert 成功率 | 未测 | 100% | 11/11 通过 |
| Skill 可用性 | 未测 | 100% | 5/5 通过 |
| **知识库迁移率** | 0% | 100% | 内容完整打包 |
| **记忆迁移率** | 50% | 95% | 条目完整保留 |
| **Skills 迁移率** | 0% | 90% | 定义完整保留 |
| 错误信息质量 | 低 | 高 | 提供修复建议 |
| 用户输入方式 | 文件 | 文件+内容 | 双模式支持 |

---

## 十、28号上线排期（04-25 ~ 04-28）

### 10.1 总体时间框架

| 目标 | 上线日期 | 工作开始 | 可用天数 |
|------|----------|----------|----------|
| **阶段二发布 v1.1.0** | 2026-04-28 | 2026-04-25 | **4 天** |

### 10.2 每日里程碑

| 日期 | 里程碑 | 主要交付 |
|------|--------|----------|
| **04-25（周五）** | 测试验证 + 体验优化 | 11 测试文件 + E1-E5 |
| **04-26（周六）** | 数据迁移核心 | F1-F4 实现 |
| **04-27（周日）** | 数据迁移完成 + 文档 | F5-F6 + README/CHANGELOG |
| **04-28（周一）** | 正式上线 | GitHub + Pages + v1.1.0 Tag |

### 10.3 详细日程安排

#### Day 1: 04-25（周五）- 测试验证 + 体验优化

| 时间 | 任务 | 预估 |
|------|------|------|
| 09:00-09:30 | Phase 1: 创建 11 测试文件 | 30min |
| 09:30-10:15 | Phase 2: Parse 测试 | 45min |
| 10:15-11:00 | Phase 3: Convert 测试 | 45min |
| 11:00-11:30 | Phase 4-5: Skill + 数据验证 | 30min |
| 14:00-14:30 | E1: `--content` 参数 | 30min |
| 14:30-15:00 | E2: 错误码系统 | 30min |
| 15:00-15:15 | E3: 临时清理 | 15min |
| 15:15-15:35 | E4: 检测置信度 | 20min |
| 15:35-16:05 | E5: 格式校验 | 30min |
| 16:05-16:35 | E 系列测试验证 | 30min |

**交付物**: test/fixtures/ + E1-E5 完成

---

#### Day 2: 04-26（周六）- 数据迁移核心

| 时间 | 任务 | 预估 |
|------|------|------|
| 09:00-11:00 | F1: 知识库内容打包 | 2h |
| 11:00-12:00 | F2: 期记忆结构化 | 1h |
| 14:00-15:00 | F3: 记忆条目解析增强 | 1h |
| 15:00-17:00 | F4: Skills 目录打包 | 2h |
| 17:00-17:30 | F1-F4 测试验证 | 30min |

**交付物**: F1-F4 完成 + Schema 扩展

---

#### Day 3: 04-27（周日）- 数据迁移完成 + 文档

| 时间 | 任务 | 预估 |
|------|------|------|
| 09:00-10:00 | F5: 工具配置完整保留 | 1h |
| 10:00-11:00 | F6: 数据完整性校验 | 1h |
| 11:00-12:00 | 全量测试验证 | 1h |
| 14:00-14:30 | README 更新 | 30min |
| 14:30-14:50 | CHANGELOG 更新 | 20min |
| 14:50-15:00 | 版本号 v1.1.0 | 10min |
| 15:00-16:00 | Bug 修复缓冲 | 1h |
| 16:00-16:30 | Git commit（预发布） | 30min |

**交付物**: F5-F6 完成 + 文档 + 预发布 commit

---

#### Day 4: 04-28（周一）- 正式上线

| 时间 | 任务 | 预估 |
|------|------|------|
| 09:00-09:30 | 最终验证测试 | 30min |
| 09:30-09:40 | Git push | 10min |
| 09:40-10:00 | GitHub Pages 验证 | 20min |
| 10:00-10:30 | 发布说明撰写 | 30min |
| 10:30-11:00 | 创建 v1.1.0 Tag | 30min |

**交付物**: GitHub v1.1.0 + Pages 正常

---

### 10.4 缓冲时间分配

| 缓冲项 | 时间 | 分配位置 |
|--------|------|----------|
| 测试问题修复 | 1h | 04-27 下午 |
| 数据迁移复杂 | 1h | 04-26 晚间 |
| 文档补充 | 0.5h | 04-27 下午 |
| **总计缓冲** | **2.5h** | 分布在 Day 2-3 |

### 10.5 工作量统计

| 日期 | 工作量 | 主要内容 |
|------|--------|----------|
| 04-25 | 4.5h | 测试 + E系列 |
| 04-26 | 6h | F1-F4 |
| 04-27 | 5h | F5-F6 + 文档 |
| 04-28 | 1.5h | 上线发布 |
| **总计** | **17h** | 分散在 4 天 |

### 10.6 Git 提交计划

| 日期 | Commit 内容 | 前缀 |
|------|-------------|------|
| 04-25 | 测试文件 + E系列 | `test+feat: Phase2 tests + CLI improvements` |
| 04-26 | F1-F4 数据迁移 | `feat: Knowledge + Memory + Skills migration` |
| 04-27 | F5-F6 + 文档 | `feat+docs: Data integrity + documentation` |
| 04-28 | 发布 v1.1.0 | `release: v1.1.0 - Data migration support` |

### 10.7 版本规划

| 版本 | 发布日期 | 核心更新 |
|------|----------|----------|
| v1.0.0 | 已发布 | 基础转换 |
| **v1.1.0** | 04-28 | 数据迁移 + 体验优化 |
| v1.2.0 | 待定 | MCP Server + 批量转换 |

---

## 十一、下一步行动

**04-25（周五）开始**：

```
上午：测试验证
  1. 创建 test/fixtures/ 目录
  2. 编写 11 个测试文件（含记忆/知识库/Skills）
  3. 执行 Parse 测试（11 个）
  4. 执行 Convert 测试（11 个）
  5. Skill 调用测试 + 数据迁移验证

下午：体验优化
  1. E1: --content 参数
  2. E2: 错误码系统
  3. E3-E5: 清理/置信度/校验
  4. E 系列测试验证
```

**目标**: 04-25 完成测试验证 + 体验优化。

---

**文档版本**: v3.2（04-25~04-28 排期版）
**更新日期**: 2026-04-24
**作者**: Claude + JasonD2019