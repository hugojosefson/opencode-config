# OpenCode Tool System: Complete Architecture Guide

## Overview

OpenCode uses a sophisticated tool system that combines built-in tools, file-based custom tools, and a plugin architecture. This document provides a comprehensive guide to understanding and working with the OpenCode tool system.

## Tool Loading Architecture

### 1. Built-in Tools

Built-in tools are located in `packages/opencode/src/tool/` and include:

- **bash** - Command execution with security restrictions
- **edit** - File modification with surgical precision
- **webfetch** - Web content fetching and analysis
- **glob** - File pattern matching
- **grep** - Content search using regex
- **list** - Directory listing
- **read** - File reading with smart formatting
- **write** - File creation
- **todo** (read/write) - Task management
- **task** - Complex task delegation
- **patch** - Advanced file patching
- **invalid** - Error handling tool

Each built-in tool consists of:
- `.ts` implementation file with the tool logic
- `.txt` description file containing the tool's prompt description

### 2. Custom Tool Loading Mechanisms

#### File-Based Tools
OpenCode scans for custom tools in two locations:
- **Global**: `~/.config/opencode/tool/*.{js,ts}`
- **Project-specific**: `.opencode/tool/*.{js,ts}` (searches up directory tree)

Tools are loaded using `Bun.Glob` pattern matching and can export:
- **Default export**: Tool named after the file
- **Named exports**: Tools named as `{filename}_{exportName}`

#### Plugin System
Tools can also be loaded from installed plugins that implement the `@opencode-ai/plugin` interface.

## Tool Interface Definitions

### Core Tool Interface (Built-in Tools)

```typescript
// packages/opencode/src/tool/tool.ts
export namespace Tool {
  export type Context<M extends Metadata = Metadata> = {
    sessionID: string       // Current session identifier
    messageID: string       // Current message identifier  
    agent: string          // Agent name/identifier
    abort: AbortSignal     // Cancellation signal
    callID?: string        // Unique call identifier
    extra?: { [key: string]: any }  // Additional context data
    metadata(input: { title?: string; metadata?: M }): void  // Metadata reporter
  }

  export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
    id: string
    init: () => Promise<{
      description: string
      parameters: Parameters
      execute(
        args: z.infer<Parameters>,
        ctx: Context,
      ): Promise<{
        title: string
        metadata: M
        output: string
      }>
    }>
  }
}
```

### Plugin Tool Interface

```typescript
// packages/plugin/src/tool.ts
export type ToolContext = {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal
}

export function tool<Args extends z.ZodRawShape>(input: {
  description: string
  args: Args
  execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>
}) {
  return input
}

export type ToolDefinition = ReturnType<typeof tool>
```

## Plugin System Architecture

### Plugin Interface

```typescript
// packages/plugin/src/index.ts
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>
  project: Project
  directory: string
  worktree: string
  $: BunShell  // Bun shell interface for command execution
}

export type Plugin = (input: PluginInput) => Promise<Hooks>

export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>
  config?: (input: Config) => Promise<void>
  tool?: {
    [key: string]: ToolDefinition
  }
  auth?: { /* OAuth and API key authentication methods */ }
  "chat.message"?: (input: {}, output: { message: UserMessage; parts: Part[] }) => Promise<void>
  "chat.params"?: (
    input: { model: Model; provider: Provider; message: UserMessage },
    output: { temperature: number; topP: number; options: Record<string, any> },
  ) => Promise<void>
  "permission.ask"?: (input: Permission, output: { status: "ask" | "deny" | "allow" }) => Promise<void>
  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
  ) => Promise<void>
  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: any },
  ) => Promise<void>
}
```

### Shell Interface for Plugins

Plugins have access to a `BunShell` interface for command execution:

```typescript
// packages/plugin/src/shell.ts
export interface BunShell {
  (strings: TemplateStringsArray, ...expressions: ShellExpression[]): BunShellPromise
  
  braces(pattern: string): string[]                    // Bash-like brace expansion
  escape(input: string): string                        // Shell escaping
  env(newEnv?: Record<string, string | undefined>): BunShell  // Environment variables
  cwd(newCwd?: string): BunShell                      // Working directory
  nothrow(): BunShell                                 // Don't throw on non-zero exit
  throws(shouldThrow: boolean): BunShell              // Configure throw behavior
}

export interface BunShellPromise extends Promise<BunShellOutput> {
  readonly stdin: WritableStream
  cwd(newCwd: string): this
  env(newEnv: Record<string, string> | undefined): this
  quiet(): this                                        // Only buffer output
  lines(): AsyncIterable<string>                       // Read stdout line by line
  text(encoding?: BufferEncoding): Promise<string>     // Read stdout as text
  json(): Promise<any>                                 // Read stdout as JSON
  arrayBuffer(): Promise<ArrayBuffer>                  // Read stdout as ArrayBuffer
  blob(): Promise<Blob>                               // Read stdout as Blob
  nothrow(): this
  throws(shouldThrow: boolean): this
}
```

## Tool Registry and Loading Process

### Registry Operation

The `ToolRegistry` maintains all tools through a unified system:

```typescript
// packages/opencode/src/tool/registry.ts
export namespace ToolRegistry {
  // Built-in tools
  const BUILTIN = [
    InvalidTool, BashTool, EditTool, WebFetchTool, GlobTool, GrepTool,
    ListTool, PatchTool, ReadTool, WriteTool, TodoWriteTool, TodoReadTool, TaskTool,
  ]

  // Dynamic loading state
  export const state = Instance.state(async () => {
    const custom = [] as Tool.Info[]
    const glob = new Bun.Glob("tool/*.{js,ts}")

    // Load file-based tools
    for (const dir of await Config.directories()) {
      for await (const match of glob.scan({ cwd: dir, absolute: true })) {
        const namespace = path.basename(match, path.extname(match))
        const mod = await import(match)
        for (const [id, def] of Object.entries<ToolDefinition>(mod)) {
          custom.push(fromPlugin(id === "default" ? namespace : `${namespace}_${id}`, def))
        }
      }
    }

    // Load plugin-based tools
    const plugins = await Plugin.list()
    for (const plugin of plugins) {
      for (const [id, def] of Object.entries(plugin.tool ?? {})) {
        custom.push(fromPlugin(id, def))
      }
    }

    return { custom }
  })
}
```

### Tool Context Creation

Tool contexts are created during execution and provide:

1. **Session/Message IDs**: For tracking tool calls within conversations
2. **Agent Identifier**: The agent making the tool call
3. **Abort Signal**: For cancellation support
4. **Metadata Function**: For reporting execution details back to the UI
5. **Extra Context**: Additional data like `bypassCwdCheck` for special operations

## Example Tool Implementations

### Simple Plugin Tool Example

```typescript
// ~/.config/opencode/tool/example.ts or plugin implementation
import { tool } from "@opencode-ai/plugin"

export const mytool = tool({
  description: "This is a custom tool that greets users",
  args: {
    name: tool.schema.string().describe("Name to greet"),
  },
  async execute(args, context) {
    // Access to context: sessionID, messageID, agent, abort signal
    return `Hello ${args.name}!`
  },
})

export default mytool  // Can also export as default
```

### Plugin with Shell Access

```typescript
// Plugin with shell capabilities
export const ExamplePlugin: Plugin = async (ctx) => {
  return {
    tool: {
      shellExample: tool({
        description: "Execute shell commands via plugin",
        args: {
          command: tool.schema.string().describe("Command to execute"),
        },
        async execute(args) {
          // Use the Bun shell interface
          const result = await ctx.$`${args.command}`.text()
          return result
        },
      }),
    },
    
    // Hook into tool execution lifecycle
    async "tool.execute.before"(input, output) {
      console.log(`Executing tool: ${input.tool}`)
    },
    
    async "tool.execute.after"(input, output) {
      console.log(`Tool ${input.tool} completed: ${output.title}`)
    },
  }
}
```

## Tool Execution Lifecycle

### State Management

Tools go through several states during execution:

```typescript
// From packages/opencode/src/session/message-v2.ts
export const ToolStatePending = z.object({
  status: z.literal("pending"),
})

export const ToolStateRunning = z.object({
  status: z.literal("running"),
  input: z.any(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z.object({
    start: z.number(),
  }),
})

export const ToolStateCompleted = z.object({
  status: z.literal("completed"),
  input: z.record(z.string(), z.any()),
  output: z.string(),
  title: z.string(),
  metadata: z.record(z.string(), z.any()),
  time: z.object({
    start: z.number(),
    end: z.number(),
    compacted: z.number().optional(),  // For old content cleanup
  }),
})

export const ToolStateError = z.object({
  status: z.literal("error"),
  input: z.record(z.string(), z.any()),
  error: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z.object({
    start: z.number(),
    end: z.number(),
  }),
})
```

### Execution Flow

1. **Tool Registration**: Tools are discovered and loaded into the registry
2. **Call Initiation**: LLM requests tool execution with validated parameters
3. **Context Creation**: Execution context created with session/message IDs, abort signal, metadata function
4. **Hook Execution**: `tool.execute.before` hooks are called
5. **Tool Execution**: Tool's execute function is called with args and context
6. **Result Processing**: Output is processed and formatted
7. **Hook Completion**: `tool.execute.after` hooks are called  
8. **State Update**: Tool state is updated to completed/error

## Permission System Integration

Tools are subject to OpenCode's permission system:

```typescript
// packages/opencode/src/tool/registry.ts
export async function enabled(
  _providerID: string,
  _modelID: string,
  agent: Agent.Info,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}
  result["patch"] = false  // Patch tool disabled by default

  if (agent.permission.edit === "deny") {
    result["edit"] = false
    result["patch"] = false  
    result["write"] = false
  }
  
  if (agent.permission.bash["*"] === "deny" && Object.keys(agent.permission.bash).length === 1) {
    result["bash"] = false
  }
  
  if (agent.permission.webfetch === "deny") {
    result["webfetch"] = false
  }

  return result
}
```

## Advanced Features

### Tool Result Compaction

OpenCode includes a compaction system for managing tool result history:
- Long tool outputs can be compacted to save memory
- Compacted results show "[Old tool result content cleared]" in the UI
- Compaction timestamps are tracked in tool state

### File System Security

Built-in tools include security measures:
- Path validation to ensure operations stay within workspace boundaries
- Bypass mechanisms for authorized external file access (using `bypassCwdCheck`)
- Binary file detection and handling

### LSP Integration

Some tools integrate with Language Server Protocol:
- File operations can trigger LSP notifications
- Symbol information can be included in tool results
- IDE integration for better development experience

## Configuration and Discovery

### Directory Scanning

OpenCode searches for configuration and tools in this order:
1. Global config: `~/.config/opencode/`
2. Project-specific configs: `.opencode/` directories up the file tree from current working directory

### Module Resolution

Custom tools support both:
- **ES Modules**: `export default` and named exports
- **CommonJS**: `module.exports` patterns
- **TypeScript**: Direct .ts file execution via Bun runtime

## Best Practices

### Tool Development

1. **Use Descriptive Names**: Tool IDs should clearly indicate their purpose
2. **Validate Input**: Use Zod schemas for robust parameter validation
3. **Handle Errors Gracefully**: Provide meaningful error messages
4. **Respect Cancellation**: Check the abort signal for long-running operations
5. **Use Metadata**: Report progress and results via the metadata function

### Plugin Development

1. **Implement Lifecycle Hooks**: Use before/after hooks for logging and monitoring
2. **Shell Security**: Validate shell commands in plugins to prevent security issues
3. **Resource Management**: Clean up resources when operations are aborted
4. **Testing**: Test tools in isolation and as part of the larger system

### Integration

1. **Permission Awareness**: Design tools to work with OpenCode's permission system
2. **Context Sensitivity**: Use session/message context appropriately
3. **Performance**: Consider the impact of tool execution on chat response times
4. **Compatibility**: Ensure tools work across different OpenCode versions

This architecture enables OpenCode to provide a rich, extensible toolset while maintaining security, performance, and user experience standards.