# OpenCode tool system

Technical reference for OpenCode's tool system.

## Overview

OpenCode combines built-in tools, file-based custom tools, and plugins.

## Tool loading

### Built-in tools (`packages/opencode/src/tool/`)

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

Each tool has `.ts` implementation and `.txt` description files.

### Custom tools

#### File-based locations

- Global: `~/.config/opencode/tool/*.{js,ts}`
- Project: `.opencode/tool/*.{js,ts}` (searches up directory tree)

#### Export patterns

- Default export: Tool named after file
- Named exports: `{filename}_{exportName}`

#### Plugin system

Tools from `@opencode-ai/plugin` interface implementations.

## Tool interfaces

### Core tool interface

```typescript
export namespace Tool {
  export type Context<M extends Metadata = Metadata> = {
    sessionID: string;
    messageID: string;
    agent: string;
    abort: AbortSignal;
    callID?: string;
    extra?: { [key: string]: any };
    metadata(input: { title?: string; metadata?: M }): void;
  };

  export interface Info<
    Parameters extends z.ZodType = z.ZodType,
    M extends Metadata = Metadata,
  > {
    id: string;
    init: () => Promise<{
      description: string;
      parameters: Parameters;
      execute(args: z.infer<Parameters>, ctx: Context): Promise<{
        title: string;
        metadata: M;
        output: string;
      }>;
    }>;
  }
}
```

### Plugin tool interface

```typescript
export type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

export function tool<Args extends z.ZodRawShape>(input: {
  description: string;
  args: Args;
  execute(
    args: z.infer<z.ZodObject<Args>>,
    context: ToolContext,
  ): Promise<string>;
}) {
  return input;
}
```

## Plugin system

### Plugin interface

```typescript
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>;
  project: Project;
  directory: string;
  worktree: string;
  $: BunShell; // Command execution interface
};

export type Plugin = (input: PluginInput) => Promise<Hooks>;

export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>;
  config?: (input: Config) => Promise<void>;
  tool?: { [key: string]: ToolDefinition };
  auth?: {/* OAuth and API key authentication */};
  "chat.message"?: (
    input: {},
    output: { message: UserMessage; parts: Part[] },
  ) => Promise<void>;
  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
  ) => Promise<void>;
  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: any },
  ) => Promise<void>;
  // ... other hooks
}
```

### BunShell interface

```typescript
export interface BunShell {
  (
    strings: TemplateStringsArray,
    ...expressions: ShellExpression[]
  ): BunShellPromise;

  braces(pattern: string): string[];
  escape(input: string): string;
  env(newEnv?: Record<string, string | undefined>): BunShell;
  cwd(newCwd?: string): BunShell;
  nothrow(): BunShell;
}

export interface BunShellPromise extends Promise<BunShellOutput> {
  readonly stdin: WritableStream;
  quiet(): this;
  lines(): AsyncIterable<string>;
  text(encoding?: BufferEncoding): Promise<string>;
  json(): Promise<any>;
  // ... other methods
}
```

## Tool registry and execution

### Registry operation

```typescript
export namespace ToolRegistry {
  // Built-in tools array
  const BUILTIN = [InvalidTool, BashTool, EditTool, WebFetchTool /* ... */];

  // Dynamic loading
  export const state = Instance.state(async () => {
    const custom = [] as Tool.Info[];

    // Load file-based tools
    for (const dir of await Config.directories()) {
      for await (
        const match of new Bun.Glob("tool/*.{js,ts}").scan({
          cwd: dir,
          absolute: true,
        })
      ) {
        const namespace = path.basename(match, path.extname(match));
        const mod = await import(match);
        for (const [id, def] of Object.entries<ToolDefinition>(mod)) {
          custom.push(
            fromPlugin(
              id === "default" ? namespace : `${namespace}_${id}`,
              def,
            ),
          );
        }
      }
    }

    // Load plugin tools
    const plugins = await Plugin.list();
    for (const plugin of plugins) {
      for (const [id, def] of Object.entries(plugin.tool ?? {})) {
        custom.push(fromPlugin(id, def));
      }
    }

    return { custom };
  });
}
```

### Execution lifecycle

1. **Tool registration** - Discovery and loading into registry
2. **Call initiation** - LLM requests execution with validated parameters
3. **Context creation** - Session/message IDs, abort signal, metadata function
4. **Hook execution** - `tool.execute.before` hooks called
5. **Tool execution** - Execute function called with args and context
6. **Result processing** - Output processed and formatted
7. **Hook completion** - `tool.execute.after` hooks called
8. **State update** - Tool state updated to completed/error

## Best practices

### Tool development

1. **Descriptive names** - Tool IDs should clearly indicate purpose
2. **Input validation** - Use Zod schemas for parameter validation
3. **Error handling** - Provide meaningful error messages
4. **Cancellation support** - Check abort signal for long operations
5. **Progress reporting** - Use metadata function for status updates

### Plugin development

1. **Lifecycle hooks** - Use before/after hooks for logging/monitoring
2. **Shell security** - Validate commands to prevent security issues
3. **Resource management** - Clean up resources on abort
4. **Testing** - Test tools in isolation and integrated

### Integration

1. **Permission awareness** - Design tools for OpenCode's permission system
2. **Context usage** - Use session/message context appropriately
3. **Performance** - Consider impact on chat response times
4. **Compatibility** - Ensure tools work across OpenCode versions

This architecture provides extensible toolsets while maintaining security,
performance, and user experience.
