# Agent instructions

This file contains critical instructions for all OpenCode agents operating in
this workspace.

When reporting information to me, be extremely concise, and sacrifice grammar
for the sake of concision.

## Primary reference

**All agent techniques, security guidelines, and best practices are documented
in [OpenCode-Agent-Techniques.md](OpenCode-Agent-Techniques.md).**

This is the complete reference for:

- OpenCode environment information and preferred tools
- Deno TypeScript development workflows
- Security restrictions and authorization requirements
- Repository management patterns and pre-commit workflows
- Project structure insights and CLI script setup
- Workspace cleanup guidelines
- Agent writing guidelines to avoid telltale AI patterns

## Quick reference for agents

### Critical security requirements

- **NEVER ADD DENO PERMISSIONS WITHOUT EXPLICIT USER PERMISSION**
- **NEVER HARDCODE OR MANUALLY PASS AUTH TOKENS**
- Always use command substitution for path bypass with explicit authorization
- Follow workspace cleanup guidelines before deleting any files

### Essential workflows

- **Pre-commit**: Always run `deno task all` or project-specific quality checks
- **Deno validation**: Use Deno's own tools, not generic TypeScript checkers
- **Documentation**: Follow agent writing guidelines to avoid AI patterns

### Repository management

- Use mandatory pre-commit workflows for quality assurance
- Follow research cleanup patterns for production-ready code
- Implement auto-generated documentation systems when appropriate

## Implementation notes

This workspace uses a multi-agent strategy with provider diversification:

- **Delegator agent**: Coordination and task delegation only
- **General agent**: Primary executor with full tool access
- **Fallback agent**: Provider diversity for operational resilience

All agents must follow the comprehensive guidelines in
[OpenCode-Agent-Techniques.md](OpenCode-Agent-Techniques.md) for consistent,
secure, and effective operation.
