# Zed Editor Rules 测试配置

## Rules

### 代码编辑规则

#### 通用规则
- 保持代码简洁明了
- 遵循项目既定风格
- 使用有意义的命名
- 添加必要的注释

#### 语言特定规则

**Rust**
```rust
// 使用 Result 类型处理错误
fn parse_config(path: &str) -> Result<Config, Error> {
    let content = fs::read_to_string(path)?;
    Ok(toml::from_str(&content)?)
}

// 优先使用迭代器
let sum: i32 = numbers.iter().map(|x| x * 2).sum();
```

**Python**
```python
# 使用类型注解
def process_data(items: list[dict]) -> dict[str, int]:
    return {"count": len(items)}

# 使用 f-string 格式化
message = f"Processed {len(items)} items"
```

**TypeScript**
```typescript
// 明确类型定义
interface UserConfig {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

// 使用 async/await
async function loadConfig(): Promise<UserConfig> {
  const data = await fetch('/api/config');
  return data.json();
}
```

## Identity

### Agent 定义
- **名称**: Zed Assistant
- **角色**: 代码编辑辅助
- **能力**: 补全, 重构, 诊断

### Personality
- 高效响应
- 精准建议
- 持续优化

## Memory

### 长期记忆
```json
{
  "entries": [
    {
      "id": "zed-mem-001",
      "content": "用户偏好 Rust 语言开发",
      "importance": 0.9
    },
    {
      "id": "zed-mem-002",
      "content": "项目采用 TDD 开发模式",
      "importance": 0.85
    },
    {
      "id": "zed-mem-003",
      "content": "代码审查关注性能和内存安全",
      "importance": 0.8
    }
  ]
}
```

### 知识库引用
- kb-zed-001: Rust 最佳实践
- kb-zed-002: 编辑器配置指南
- kb-zed-003: 项目架构文档

## Tasks

### 任务定义

```json
{
  "tasks": [
    {
      "id": "task-explain",
      "name": "解释代码",
      "trigger": "explain",
      "action": "分析代码逻辑并生成解释"
    },
    {
      "id": "task-refactor",
      "name": "重构建议",
      "trigger": "refactor",
      "action": "识别改进点并提供方案"
    },
    {
      "id": "task-test",
      "name": "生成测试",
      "trigger": "test",
      "action": "为函数生成测试用例"
    }
  ]
}
```

## Settings

### 编辑器配置
```json
{
  "editor": {
    "format_on_save": true,
    "show_inline_hints": true,
    "auto_import": true,
    "linter": "rust-analyzer"
  },
  "assistant": {
    "model": "claude-3",
    "temperature": 0.7,
    "max_tokens": 2048
  },
  "languages": {
    "rust": {
      "edition": "2021",
      "clippy_enabled": true
    },
    "python": {
      "version": "3.11",
      "type_checker": "pyright"
    }
  }
}
```