# Multi-agent strategy implementation

This document outlines the implemented multi-agent strategy for OpenCode with
provider diversification and specialized role assignments based on confirmed
OpenCode-compatible models.

## Strategy overview

**Two-agent coordination approach**: A specialized delegator agent handles task
coordination while a general-purpose agent executes all operations. Both agents
use GitHub Copilot's Claude Sonnet 4.5 for optimal performance.

## Agent configuration

### Delegator agent (Primary)

- **Model**: `github-copilot/claude-sonnet-4.5`
- **Provider**: Anthropic (via GitHub Copilot)
- **Capability**: Excellent coordination and fast response
- **Role**: Task coordination and delegation only
- **Tools**: Task delegation, todo management
- **Purpose**: Reliable analysis and delegation of user requests
- **OpenCode Status**: ✅ Confirmed working with full tool support

### General agent (Primary executor)

- **Model**: `github-copilot/claude-sonnet-4.5`
- **Provider**: Anthropic (via GitHub Copilot)
- **Capability**: Latest Claude with advanced reasoning capabilities
- **Role**: Primary task execution with full tool access
- **Tools**: Complete OpenCode capabilities
- **Purpose**: Advanced reasoning for complex coding tasks
- **OpenCode Status**: ✅ Confirmed working with excellent tool integration

## OpenCode-compatible model options

### Recommended for different roles

**For Delegation/Coordination:**

- `github-copilot/claude-sonnet-4.5` - Proven reliability
- `github-copilot/gemini-2.0-flash-001` - Speed focused
- `github-copilot/gpt-4o` - Good compatibility

**For Advanced Development:**

- `github-copilot/claude-sonnet-4.5` - Shows detailed tool usage
- `github-copilot/claude-sonnet-4.5` - High performance
- `github-copilot/gpt-5` - Latest capabilities

**For Reasoning Tasks:**

- `github-copilot/claude-3.7-sonnet-thought` - Reasoning focused
- `github-copilot/o3-mini` - Specialized reasoning
- `github-copilot/gpt-5` - Advanced reasoning

**For Resource Efficiency:**

- `github-copilot/gpt-5-mini` - Efficient option
- `github-copilot/o3-mini` - Compact reasoning
- `github-copilot/gemini-2.0-flash-001` - Fast responses

## Architecture benefits

1. **Simplified coordination**: Clear separation between delegation and
   execution
2. **Consistent performance**: Single high-quality model for both roles
3. **Performance optimization**: Each agent specialized for its specific role
4. **OpenCode compatibility**: Confirmed working model with full tool support
5. **Tool integration**: 100% tool capability in execution agent

## Operation flow

1. **User request** → Delegator agent (Claude Sonnet 4.5)
2. **Task analysis** → Immediate delegation decision
3. **Execution** → General agent (Claude Sonnet 4.5)

## Model selection rationale

- **Claude Sonnet 4.5**: Latest technology with advanced reasoning capabilities,
  used for both delegation and execution for consistent high performance

## Available OpenCode models

### Working models (12 confirmed)

**Claude Models (5):**

- `github-copilot/claude-3.5-sonnet`
- `github-copilot/claude-3.7-sonnet`
- `github-copilot/claude-3.7-sonnet-thought`
- `github-copilot/claude-sonnet-4`
- `github-copilot/claude-sonnet-4.5`

**GPT Models (4):**

- `github-copilot/gpt-4o`
- `github-copilot/gpt-4.1`
- `github-copilot/gpt-5`
- `github-copilot/gpt-5-mini`

**Gemini Models (2):**

- `github-copilot/gemini-2.0-flash-001`
- `github-copilot/gemini-2.5-pro`

**Reasoning Models (1):**

- `github-copilot/o3-mini`

### Non-working models (6 confirmed unsupported)

These models are listed in OpenCode but return "not supported" errors:

- `github-copilot/claude-opus-4`
- `github-copilot/claude-opus-41`
- `github-copilot/gpt-5-codex`
- `github-copilot/grok-code-fast-1`
- `github-copilot/o3`
- `github-copilot/o4-mini`

## Configuration files

- `/agent/delegator.md` - Coordination-only agent (Claude Sonnet 4.5)
- `/agent/general.md` - Primary executor (Claude Sonnet 4.5)
- `/config.json` - Primary model set to delegator agent

## Operational advantages

1. **Reliability**: Confirmed working model in OpenCode environment
2. **Tool support**: 100% tool capability in execution agent
3. **Consistent quality**: Same high-capability model for all tasks
4. **Performance**: Fast response times with advanced reasoning
5. **Clear architecture**: Simple two-agent coordination pattern
6. **Specialization**: Each agent optimized for its specific role

This strategy ensures consistent high performance and clear operational
architecture for OpenCode agents.
