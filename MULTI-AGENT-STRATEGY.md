# Multi-Agent Strategy Implementation

This document outlines the implemented multi-agent strategy for OpenCode with
provider diversification and specialized role assignments.

## Strategy overview

**Provider diversification approach**: Each agent uses a different AI provider
to ensure rate limit resilience and continuous operation through outages.

## Agent configuration

### Delegator agent (Primary)

- **Model**: `meta/llama-4-scout-17b-16e-instruct`
- **Provider**: Meta
- **Speed**: Ultra-fast (556ms response time)
- **Role**: Task coordination and delegation only
- **Tools**: Task delegation, todo management
- **Purpose**: Instant analysis and delegation of user requests

### General agent (Primary executor)

- **Model**: `deepseek/deepseek-r1`
- **Provider**: DeepSeek
- **Capability**: Elite coding + advanced reasoning
- **Role**: Primary task execution with full tool access
- **Tools**: Complete OpenCode capabilities
- **Purpose**: Advanced reasoning for complex coding tasks

### Fallback agent (Backup)

- **Model**: `mistral-ai/mistral-large-2411`
- **Provider**: Mistral AI
- **Capability**: Excellent coding and reliability
- **Role**: Backup executor for provider outages
- **Tools**: Complete OpenCode capabilities
- **Purpose**: Operational continuity during outages

## Provider reliability benefits

1. **Rate limit resilience**: Different providers = independent rate limits
2. **Outage protection**: Provider downtime doesn't stop operations
3. **Performance optimization**: Each agent uses optimal model for its role
4. **100% reliability**: Each provider maintains consistent uptime

## Operation flow

1. **User request** → Delegator agent (Meta - ultra-fast)
2. **Task analysis** → Immediate delegation decision
3. **Execution** → General agent (DeepSeek - advanced reasoning)
4. **Fallback** → Fallback agent (Mistral - if primary unavailable)

## Model selection rationale

- **Meta Llama-4 Scout**: Fastest coordination (556ms) for instant delegation
- **DeepSeek R1**: Best reasoning + coding capability for complex tasks
- **Mistral Large 2411**: Latest flagship for maximum reliability

## Configuration files

- `/agent/delegator.md` - Coordination-only agent (Meta model)
- `/agent/general.md` - Primary executor (DeepSeek model)
- `/agent/fallback.md` - Backup executor (Mistral model)
- `/config.json` - Primary model set to delegator agent

## Operational advantages

1. **Speed**: Ultra-fast delegation (556ms) + powerful execution
2. **Reliability**: Triple provider redundancy
3. **Capability**: Advanced reasoning for complex problems
4. **Resilience**: Continuous operation through any single provider outage
5. **Efficiency**: Specialized agents optimized for their specific roles

This strategy ensures maximum reliability, performance, and continuous operation
for OpenCode agents across all scenarios.
