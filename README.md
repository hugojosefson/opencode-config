# OpenCode Configuration

These are the configurations, agent definitions, and tools that I use when coding using [opencode.ai](https://opencode.ai/).

I use these files by having this repo in `~/.config/opencode` on my computer.

## What's Here

| File/Directory             | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| [AGENTS.md](AGENTS.md)     | Techniques and patterns discovered during development |
| [config.json](config.json) | OpenCode configuration with multiple model providers  |
| [agent/](agent/)           | Custom agent definitions for specialized workflows    |
| [tool/](tool/)             | Custom tool implementations                           |

## Custom Agents

| Agent                           | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| [delegator](agent/delegator.md) | Primary coordination agent (delegation-only) |
| [general](agent/general.md)     | Full-capability subagent for actual work     |
