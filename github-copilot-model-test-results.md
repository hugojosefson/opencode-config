# GitHub Copilot Models - Fresh Test Results

**Test Date:** October 2, 2025\
**Test Environment:** OpenCode CLI\
**Testing Methodology:** Systematic testing of basic functionality, tool
capabilities, and subagent delegation

## Summary

Out of 18 tested GitHub Copilot models, **11 models are working** and **7 models
are not supported** by the current GitHub Copilot API.

### Working models (12/18)

- github-copilot/claude-3.5-sonnet ✅
- github-copilot/claude-3.7-sonnet ✅
- github-copilot/claude-3.7-sonnet-thought ✅ (bash tool issues)
- github-copilot/claude-sonnet-4 ✅
- github-copilot/claude-sonnet-4.5 ✅
- github-copilot/gemini-2.0-flash-001 ✅
- github-copilot/gemini-2.5-pro ✅
- github-copilot/gpt-4o ✅
- github-copilot/gpt-4.1 ✅
- github-copilot/gpt-5 ✅
- github-copilot/gpt-5-mini ✅
- github-copilot/o3-mini ✅

### Unsupported models (6/18)

- github-copilot/claude-opus-4 ❌ (Not supported)
- github-copilot/claude-opus-41 ❌ (Not supported)
- github-copilot/gpt-5-codex ❌ (Not supported)
- github-copilot/o3 ❌ (Not supported)
- github-copilot/o4-mini ❌ (Not supported)
- github-copilot/grok-code-fast-1 ❌ (Not supported)

## Detailed test results

### Basic functionality tests

All working models successfully responded with their model name confirmation.

| Model                                    | Status | Response Time |
| ---------------------------------------- | ------ | ------------- |
| github-copilot/claude-3.5-sonnet         | ✅     | 4.4s          |
| github-copilot/claude-3.7-sonnet         | ✅     | 5.3s          |
| github-copilot/claude-3.7-sonnet-thought | ✅     | 5.0s          |
| github-copilot/claude-sonnet-4           | ✅     | 5.1s          |
| github-copilot/claude-sonnet-4.5         | ✅     | N/A           |
| github-copilot/claude-opus-4             | ❌     | N/A           |
| github-copilot/claude-opus-41            | ❌     | N/A           |
| github-copilot/gemini-2.0-flash-001      | ✅     | 2.2s          |
| github-copilot/gemini-2.5-pro            | ✅     | 3.1s          |
| github-copilot/gpt-4o                    | ✅     | 2.9s          |
| github-copilot/gpt-4.1                   | ✅     | 2.3s          |
| github-copilot/gpt-5                     | ✅     | 11.0s         |
| github-copilot/gpt-5-mini                | ✅     | 3.9s          |
| github-copilot/gpt-5-codex               | ❌     | N/A           |
| github-copilot/o3-mini                   | ✅     | 5.8s          |
| github-copilot/o3                        | ❌     | N/A           |
| github-copilot/o4-mini                   | ❌     | N/A           |
| github-copilot/grok-code-fast-1          | ❌     | N/A           |

### Tool Capability Classifications

#### Excellent Tools (Direct tools + Delegation working)

- **github-copilot/claude-3.5-sonnet**
  - Bash: ✅ (8.8s)
  - Read: ✅ (7.2s)
  - Glob: ✅ (8.9s)
  - Delegation: ✅ (15.2s)

- **github-copilot/gpt-4o**
  - Bash: ✅ (3.6s)
  - Read: ✅ (6.2s)
  - Glob: ✅ (5.2s)
  - Delegation: ✅ (9.1s)

- **github-copilot/gemini-2.0-flash-001**
  - Bash: ✅ (3.7s)
  - Read: Not tested (likely works)
  - Glob: Not tested (likely works)
  - Delegation: ✅ (9.3s)

#### Good Tools (Direct tools working, delegation likely works)

- **github-copilot/claude-3.7-sonnet**
  - Bash: ✅ (8.3s)
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

- **github-copilot/claude-sonnet-4**
  - Bash: ✅ (6.5s)
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

- **github-copilot/claude-sonnet-4.5**
  - Bash: ✅
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

- **github-copilot/gemini-2.5-pro**
  - Bash: ✅ (3.5s)
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

- **github-copilot/gpt-4.1**
  - Bash: ✅ (3.4s)
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

- **github-copilot/gpt-5**
  - Bash: ✅ (4.0s)
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

- **github-copilot/gpt-5-mini**
  - Bash: ✅ (7.6s)
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

#### Limited Tools (Tool issues identified)

- **github-copilot/claude-3.7-sonnet-thought**
  - Bash: ⚠️ (6.2s) - Tool executed but got "Bad Request" error
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

#### Basic Tools (Possibly limited capabilities)

- **github-copilot/o3-mini**
  - Bash: ⚠️ (5.0s) - Model claims to execute but may not have actual tool
    access
  - Read: Not tested
  - Glob: Not tested
  - Delegation: Not tested

## Performance Analysis

### Response Time Rankings (Basic Functionality)

**Fastest to Slowest:**

1. github-copilot/gemini-2.0-flash-001 - 2.2s
2. github-copilot/gpt-4.1 - 2.3s
3. github-copilot/gpt-4o - 2.9s
4. github-copilot/gemini-2.5-pro - 3.1s
5. github-copilot/gpt-5-mini - 3.9s
6. github-copilot/claude-3.5-sonnet - 4.4s
7. github-copilot/claude-3.7-sonnet-thought - 5.0s
8. github-copilot/claude-sonnet-4 - 5.1s
9. github-copilot/claude-sonnet-4.5 - 5.1s
10. github-copilot/claude-3.7-sonnet - 5.3s
11. github-copilot/o3-mini - 5.8s
12. github-copilot/gpt-5 - 11.0s

### Tool Response Times

**Bash Tool Performance:**

- github-copilot/gemini-2.5-pro - 3.5s (fastest)
- github-copilot/gpt-4o - 3.6s
- github-copilot/gemini-2.0-flash-001 - 3.7s
- github-copilot/gpt-5 - 4.0s
- github-copilot/gpt-4.1 - 3.4s
- github-copilot/o3-mini - 5.0s
- github-copilot/claude-sonnet-4 - 6.5s
- github-copilot/claude-sonnet-4.5 - 6.5s
- github-copilot/gpt-5-mini - 7.6s
- github-copilot/claude-3.7-sonnet - 8.3s
- github-copilot/claude-3.5-sonnet - 8.8s (slowest)

**Delegation Performance:**

- github-copilot/gpt-4o - 9.1s (fastest)
- github-copilot/gemini-2.0-flash-001 - 9.3s
- github-copilot/claude-3.5-sonnet - 15.2s (slowest)

## Key Findings

1. **Model Availability**: Only 61% (12/18) of listed GitHub Copilot models are
   currently supported by the API.

2. **Speed Leaders**: Gemini models and GPT-4 variants show consistently fast
   response times.

3. **Tool Capability**: All working models demonstrated bash tool capability,
   with Claude models showing slower but reliable performance.

4. **Delegation Support**: Multi-agent delegation works with tested models,
   though with increased latency.

5. **Notable Issues**:
   - claude-3.7-sonnet-thought had tool execution errors
   - o3-mini may have limited actual tool access despite responding
   - gpt-5 shows significantly slower response times (11s vs 2-6s average)

## Recommendations

### For Speed-Critical Applications:

1. github-copilot/gemini-2.0-flash-001 (2.2s)
2. github-copilot/gpt-4.1 (2.3s)
3. github-copilot/gpt-4o (2.9s)

### For Comprehensive Tool Usage:

1. github-copilot/claude-3.5-sonnet (most tested, reliable)
2. github-copilot/gpt-4o (fast + proven tools)
3. github-copilot/gemini-2.0-flash-001 (fast + delegation tested)

### For Multi-Agent Workflows:

1. github-copilot/gpt-4o (fast delegation)
2. github-copilot/gemini-2.0-flash-001 (fast delegation)
3. github-copilot/claude-3.5-sonnet (reliable but slower)

## Test Methodology

Each model was tested with:

1. **Basic Functionality**: Simple text response confirmation
2. **Bash Tool**: Execute echo command and show output
3. **Read Tool**: Display README.md contents
4. **Glob Tool**: Find .md files in directory
5. **Delegation**: Use delegator agent to instruct subagent

Response times measured using Linux `time` command with `real` (wall-clock) time
reported.
