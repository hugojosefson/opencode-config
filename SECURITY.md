# Security Configuration Guide

## Overview

This repository contains OpenCode configuration with environment variable references for secure external API key management. The `config.json` file is published safely with environment variable placeholders instead of actual secrets.

## Setup Instructions

### 1. Set Environment Variables

Set the required environment variables in your shell or `.env` file:

```bash
# Required for ollama-vast provider
export OLLAMA_VAST_BASE_URL="https://your-ollama-vast-instance.com/v1"
export OLLAMA_VAST_API_KEY="your-api-key-here"

# Optional for ollama-local (defaults to localhost)
export OLLAMA_LOCAL_BASE_URL="http://your-local-instance:11434/v1"
```

### 2. Environment Variable Configuration

The configuration supports these environment variables:

- `OLLAMA_VAST_BASE_URL` - **Required**: Base URL for the vast Ollama instance
- `OLLAMA_VAST_API_KEY` - **Required**: API key for authentication
- `OLLAMA_LOCAL_BASE_URL` - **Optional**: Base URL for local Ollama (defaults to http://localhost:11434/v1)

## Security Best Practices

### ✅ Safe Configuration Publishing

- **Safe**: `config.json` contains environment variable references like `${OLLAMA_VAST_API_KEY}`
- **Safe**: Publishing configuration templates with placeholders
- **Safe**: Using default values for non-sensitive settings

### ⚠️ Never Commit Secrets

- **Never** commit `.env` files with actual values
- **Never** replace environment variable references with real secrets
- Always use environment variables for sensitive data

### 🔐 API Key Security

- Store API keys in secure password managers
- Rotate API keys regularly
- Use different keys for different environments (dev/staging/prod)
- Monitor API key usage for suspicious activity

### 🛡️ Network Security

- Use HTTPS endpoints when possible
- Avoid exposing internal IP addresses in public repositories
- Use localhost or 127.0.0.1 for local development defaults

## Environment-Specific Configurations

### Development

```bash
export OLLAMA_LOCAL_BASE_URL="http://localhost:11434/v1"
export OLLAMA_VAST_BASE_URL="https://dev-instance.trycloudflare.com/v1"
export OLLAMA_VAST_API_KEY="dev-api-key"
```

### Production

```bash
export OLLAMA_VAST_BASE_URL="https://prod-instance.your-domain.com/v1"
export OLLAMA_VAST_API_KEY="prod-api-key"
```

## Troubleshooting

### Missing Environment Variables

If you see errors about missing environment variables:

1. Check that all required variables are set
2. Verify variable names match exactly (case-sensitive)
3. Restart your application after setting variables

### Configuration Not Loading

1. Ensure `config.json` exists in the working directory
2. Check JSON syntax is valid
3. Verify environment variables are accessible to the application

## Recovery from Leaked Secrets

If secrets are accidentally committed:

1. **Immediately rotate all exposed API keys**
2. Remove secrets from Git history using `git filter-branch` or BFG Repo-Cleaner
3. Force push cleaned history: `git push --force-with-lease`
4. Notify team members to re-clone the repository

## Security Contacts

For security issues or questions:

- Review this security guide
- Check OpenCode documentation
- Follow responsible disclosure practices
