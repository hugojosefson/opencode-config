# Security Configuration Guide

**Essential security practices for OpenCode configurations: environment variable
management, API key protection, and safe publishing of configuration files with
external service credentials.**

## Overview

This repository contains OpenCode configuration templates using environment
variable references for secure external API key management. Configuration files
use placeholder variables instead of actual secrets, enabling safe version
control and sharing.

## Configuration Files

| File                         | Description                                                   | Security Level      |
| ---------------------------- | ------------------------------------------------------------- | ------------------- |
| [config.json](config.json)   | OpenCode configuration with environment variable placeholders | ✅ Safe to commit   |
| [.env.example](.env.example) | Environment variable template                                 | ✅ Safe to commit   |
| `.env`                       | Actual environment variables                                  | ⚠️ **NEVER COMMIT** |

## Setup Instructions

### 1. Environment Variables

Create a `.env` file from the template or set variables directly:

```bash
# Copy template (recommended)
cp .env.example .env

# Edit with your actual values
# Required for external providers
export OLLAMA_VAST_BASE_URL="https://your-instance.com/v1"
export OLLAMA_VAST_API_KEY="your-api-key-here"

# Optional for local development
export OLLAMA_LOCAL_BASE_URL="http://localhost:11434/v1"
```

### 2. Variable Configuration

Environment variables supported by [config.json](config.json):

| Variable                | Required | Default                     | Purpose                      |
| ----------------------- | -------- | --------------------------- | ---------------------------- |
| `OLLAMA_VAST_BASE_URL`  | ✅       | -                           | External Ollama instance URL |
| `OLLAMA_VAST_API_KEY`   | ✅       | -                           | API key for authentication   |
| `OLLAMA_LOCAL_BASE_URL` | ❌       | `http://localhost:11434/v1` | Local Ollama instance URL    |

Additional providers may require different variables - check the configuration
file for `${VARIABLE_NAME}` patterns.

## Security Principles

### ✅ Safe Practices

- **Configuration Templates**: Use `${VARIABLE}` placeholders in JSON files
- **Environment Variables**: Store secrets outside version control
- **Template Sharing**: Commit `.env.example` with placeholder values
- **Documentation**: Reference security practices in [AGENTS.md](AGENTS.md) and
  [OpenCode-Tool-System-Documentation.md](OpenCode-Tool-System-Documentation.md)

### ⚠️ Critical Restrictions

- **Never** commit actual API keys or passwords
- **Never** replace environment variables with literal values in config files
- **Never** add `.env` files to version control
- **Always** validate environment variable patterns before committing

### 🔐 API Key Management

- Use secure password managers for key storage
- Rotate keys regularly (monthly/quarterly)
- Use environment-specific keys (dev/staging/prod)
- Monitor usage for unusual activity
- Revoke unused or compromised keys immediately

### 🛡️ Configuration Security

- Prefer HTTPS endpoints for external services
- Use localhost/127.0.0.1 for local development defaults
- Validate all external URLs before use
- Document required permissions in [AGENTS.md](AGENTS.md) and
  [OpenCode-Tool-System-Documentation.md](OpenCode-Tool-System-Documentation.md)

## Environment Examples

### Development

```bash
# Local development with external testing
export OLLAMA_LOCAL_BASE_URL="http://localhost:11434/v1"
export OLLAMA_VAST_BASE_URL="https://dev-instance.trycloudflare.com/v1"
export OLLAMA_VAST_API_KEY="dev-api-key"
```

### Production

```bash
# Production deployment
export OLLAMA_VAST_BASE_URL="https://prod-instance.your-domain.com/v1"
export OLLAMA_VAST_API_KEY="prod-api-key"
```

## Troubleshooting

### Missing Environment Variables

If you encounter errors about missing variables:

1. **Check variable names** - They are case-sensitive
2. **Verify values are set** - Use `echo $VARIABLE_NAME` to test
3. **Restart applications** after setting new variables
4. **Check `.env` loading** if using environment files

### Configuration Issues

1. **Validate JSON syntax** in [config.json](config.json)
2. **Check file permissions** for configuration files
3. **Verify variable expansion** using `envsubst < config.json`

## Security Incident Response

### If Secrets Are Compromised

**Immediate Actions:**

1. **Rotate all exposed credentials** immediately
2. **Revoke API keys** at the provider level
3. **Update environment variables** with new values
4. **Monitor for unauthorized usage**

**Git History Cleanup:**

```bash
# Remove secrets from Git history (DESTRUCTIVE)
git filter-branch --env-filter 'unset API_KEY' HEAD
git push --force-with-lease
```

⚠️ **Warning**: Force pushing rewrites history - coordinate with your team.

### Prevention

- Use pre-commit hooks to scan for secrets
- Regular security audits of configuration files
- Follow practices documented in [AGENTS.md](AGENTS.md) and
  [OpenCode-Tool-System-Documentation.md](OpenCode-Tool-System-Documentation.md)
- Reference OpenCode security guidelines at [opencode.ai](https://opencode.ai)

## Related Documentation

- [AGENTS.md](AGENTS.md) - Agent security, permission requirements, and advanced
  techniques
- [OpenCode-Tool-System-Documentation.md](OpenCode-Tool-System-Documentation.md) -
  Tool system architecture and security considerations
- [README.md](README.md) - Configuration overview and file structure
- [config.json](config.json) - OpenCode configuration with environment variable
  placeholders

For advanced security techniques and OpenCode-specific considerations, see the
comprehensive documentation in [AGENTS.md](AGENTS.md).
