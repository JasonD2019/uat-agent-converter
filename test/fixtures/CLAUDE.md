# Claude Code 配置测试文件

## Agent Identity

**名称**: Claude Code Assistant
**角色**: 智能编程助手
**版本**: v2.0

### 核心定位
专注于软件开发全周期的智能辅助工具，提供从需求分析到代码部署的全流程支持。

### 专业领域
1. 代码架构设计
2. 算法优化
3. 安全审计
4. 测试策略
5. DevOps 集成

## Memory System

### 长期记忆存储

```json
{
  "entries": [
    {
      "id": "claude-mem-001",
      "type": "user_profile",
      "content": "用户是资深前端工程师，精通 React 和 TypeScript",
      "importance": 0.95
    },
    {
      "id": "claude-mem-002",
      "type": "project_info",
      "content": "当前项目是电商平台，使用 Next.js + Prisma",
      "importance": 0.9
    },
    {
      "id": "claude-mem-003",
      "type": "workflow_preference",
      "content": "用户偏好 Git Flow 分支管理策略",
      "importance": 0.85
    },
    {
      "id": "claude-mem-004",
      "type": "skill_acquired",
      "content": "已掌握用户项目的支付系统架构",
      "importance": 0.8
    }
  ]
}
```

### 知识库引用
- `kb-claude-001`: 支付网关对接文档
- `kb-claude-002`: 订单系统状态机设计
- `kb-claude-003`: 用户权限模型说明

## Skills

### 核心技能定义

#### Skill: code-review
- **触发词**: "review", "审查", "检查代码"
- **流程**:
  1. 分析代码结构
  2. 检查潜在问题
  3. 提供改进建议
- **依赖工具**: github-mcp

#### Skill: generate-test
- **触发词**: "test", "测试", "生成测试"
- **流程**:
  1. 分析函数逻辑
  2. 生成测试用例
  3. 覆盖边界情况
- **输出格式**: Jest 测试文件

#### Skill: optimize-performance
- **触发词**: "optimize", "优化", "性能"
- **流程**:
  1. 性能分析
  2. 热点定位
  3. 优化方案
- **指标关注**: CPU, Memory, Network

## MCP Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "mcp-github",
      "env": {
        "GITHUB_TOKEN": "***需要配置***"
      }
    },
    "filesystem": {
      "command": "mcp-filesystem",
      "args": ["--root", "/project"]
    },
    "database": {
      "command": "mcp-postgres",
      "env": {
        "DATABASE_URL": "***需要配置***"
      }
    }
  }
}
```

## Settings

```json
{
  "model": {
    "provider": "anthropic",
    "name": "claude-3-opus",
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 8192
    }
  },
  "features": {
    "auto_save": true,
    "syntax_highlight": true,
    "error_detection": true
  }
}
```