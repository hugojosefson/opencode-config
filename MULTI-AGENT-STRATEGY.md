# Multi-agent strategy

Two-agent coordination for OpenCode using GitHub Copilot's Claude Sonnet 4.5.

## Strategy

Delegator agent handles task coordination. General agent executes operations.
Both use Claude Sonnet 4.5.

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

## OpenCode-compatible models

Tested models confirmed working with OpenCode (from model-test-state.json):

**Claude models:**

- claude-3.5-sonnet
- claude-3.7-sonnet
- claude-3.7-sonnet-thought
- claude-sonnet-4
- claude-sonnet-4.5

**GPT models:**

- gpt-4o
- gpt-4.1
- gpt-5
- gpt-5-mini

**Gemini models:**

- gemini-2.0-flash-001
- gemini-2.5-pro

**Reasoning models:**

- o3-mini

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

## Model compatibility

See model-test-state.json for current OpenCode compatibility data.

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
