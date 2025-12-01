# OpenCode configuration

Configuration files, agent definitions, and tools for
[opencode.ai](https://opencode.ai/).

Clone this repository as `~/.config/opencode` to use these configurations.

## What's here

| File/Directory             | Description                                 |
| :------------------------- | :------------------------------------------ |
| [AGENTS.md](AGENTS.md)     | Global agent instructions for all projects  |
| [config.json](config.json) | OpenCode configuration                      |
| [agent/](agent/)           | Custom agent definitions                    |
| [tool/](tool/)             | Custom tool implementations                 |
| [src/](src/)               | Utility scripts for model discovery/testing |

## Custom agents

| Agent                           | Description                          |
| :------------------------------ | :----------------------------------- |
| [delegator](agent/delegator.md) | Coordination agent (delegation-only) |
| [general](agent/general.md)     | Full-capability execution agent      |

### Agent flow

1. Chat with **delegator** agent (has TODO list management and task delegation
   only)

2. **Delegator** breaks requests into tasks and delegates to **general**
   subagent instances

3. **General** subagent performs actual work (file operations, code changes,
   commands)

4. Results return to **delegator** for coordination

Delegator saves tokens by not loading tool descriptions. General agent spends
all tokens on execution.

### Example

Context savings from delegator → general workflow:

![opencode-delegator-look-at-the-context-savings.png](opencode-delegator-look-at-the-context-savings.png)
