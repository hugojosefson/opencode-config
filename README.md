# OpenCode Configuration

These are the configurations, agent definitions, and tools that I use when
coding using the opensource client [opencode.ai](https://opencode.ai/).

I use these files by having this repo cloned as `~/.config/opencode` on my
computer.

## What's here

| File/Directory             | Description                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)     | My global `AGENTS.md` that is loaded for all projects, in addition to any `AGENTS.md` in each project |
| [config.json](config.json) | OpenCode configuration. Ignore the `provider` part.                                                   |
| [agent/](agent/)           | Custom agent definitions for efficient token use in contexts                                          |
| [tool/](tool/)             | Custom tool implementations                                                                           |

## Custom agents

| Agent                           | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| [delegator](agent/delegator.md) | Primary coordination agent (delegation-only) |
| [general](agent/general.md)     | Full-capability subagent for actual work     |

### Agent flow

1. I chat with the **delegator** agent, which doesn't have any tools except the
   ability to keep track of its own TODO list, and to delegate tasks to the
   **general** agent.

2. Whatever I ask the **delegator** to do, it breaks down into smaller tasks,
   and delegates those to a new instance of the **general** subagent by writing
   a prompt to call the **general** agent with.

3. The **general** subagent gets the same context and the same `AGENTS.md` as
   the **delegator**. But the **general** agent starts with an otherwise empty
   context, so it can spend all of its tokens on the actual task.

4. The **general** agent has access to all the tools (except further
   delegation), and does the actual work of writing code, committing, pushing,
   etc. When it finishes a task, it reports back to the **delegator**.

This saves the **delegator** sooo many tokens, because it doesn't have to load
all the tools and context. All the failed detailed things that the subagent runs
into and fixes; all those "wasted" tokens, the **delegator** just doesn't have
to see. It only has to write subagent prompts, read completed results from
subagents, keep track of the overall plan and the TODO list.
