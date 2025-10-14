# GitHub Copilot Models - Fresh Test Results

**Test Date:** October 14, 2025\
**Test Environment:** OpenCode CLI\
**Testing Methodology:** Actual tool execution testing with bash tool - not
claim-based testing

## Summary

Out of 12 tested GitHub Copilot models, **11 models are fully working** with
verified tool execution and **1 model has partial functionality** (tool works
but API errors).

### Working models (11/12)

- github-copilot/claude-3.5-sonnet ✅
- github-copilot/claude-3.7-sonnet ✅
- github-copilot/claude-sonnet-4 ✅
- github-copilot/claude-sonnet-4.5 ✅
- github-copilot/gemini-2.0-flash-001 ✅
- github-copilot/gemini-2.5-pro ✅
- github-copilot/gpt-4o ✅
- github-copilot/gpt-4.1 ✅
- github-copilot/gpt-5 ✅
- github-copilot/gpt-5-mini ✅
- github-copilot/o3-mini ✅

### Partial support (1/12)

- github-copilot/claude-3.7-sonnet-thought ⚠️ (Tool execution works but returns
  Bad Request API error)

## Detailed test results

### Bash Tool Execution Tests (2025-10-14)

All tests used actual bash tool execution:
`opencode run --model [MODEL] 'use the bash tool to run "echo [MODEL] can use tools" and show the output'`

| Model                                    | Status | Response Time | Verified Tool Execution |
| ---------------------------------------- | ------ | ------------- | ----------------------- |
| github-copilot/gemini-2.0-flash-001      | ✅     | 3.2s          | ✅                      |
| github-copilot/gpt-4o                    | ✅     | 3.2s          | ✅                      |
| github-copilot/o3-mini                   | ✅     | 3.3s          | ✅                      |
| github-copilot/gpt-4.1                   | ✅     | 3.9s          | ✅                      |
| github-copilot/gemini-2.5-pro            | ✅     | 5.6s          | ✅                      |
| github-copilot/claude-sonnet-4           | ✅     | 5.8s          | ✅                      |
| github-copilot/gpt-5                     | ✅     | 5.8s          | ✅                      |
| github-copilot/claude-sonnet-4.5         | ✅     | 7.5s          | ✅                      |
| github-copilot/gpt-5-mini                | ✅     | 7.5s          | ✅                      |
| github-copilot/claude-3.5-sonnet         | ✅     | 7.8s          | ✅                      |
| github-copilot/claude-3.7-sonnet         | ✅     | 8.3s          | ✅                      |
| github-copilot/claude-3.7-sonnet-thought | ⚠️     | 13.0s         | ✅ (+ API error)        |

## Performance Analysis

### Response Time Rankings (Bash Tool Execution - 2025-10-14)

**Fastest to Slowest:**

1. github-copilot/gemini-2.0-flash-001 - 3.2s
2. github-copilot/gpt-4o - 3.2s
3. github-copilot/o3-mini - 3.3s
4. github-copilot/gpt-4.1 - 3.9s
5. github-copilot/gemini-2.5-pro - 5.6s
6. github-copilot/claude-sonnet-4 - 5.8s
7. github-copilot/gpt-5 - 5.8s
8. github-copilot/claude-sonnet-4.5 - 7.5s
9. github-copilot/gpt-5-mini - 7.5s
10. github-copilot/claude-3.5-sonnet - 7.8s
11. github-copilot/claude-3.7-sonnet - 8.3s
12. github-copilot/claude-3.7-sonnet-thought - 13.0s (with API error)

### Provider Performance Summary

**Google Gemini Models:**

- gemini-2.0-flash-001: 3.2s (fastest overall)
- gemini-2.5-pro: 5.6s

**OpenAI GPT Models:**

- gpt-4o: 3.2s (tied for fastest)
- o3-mini: 3.3s
- gpt-4.1: 3.9s
- gpt-5: 5.8s
- gpt-5-mini: 7.5s

**Anthropic Claude Models:**

- claude-sonnet-4: 5.8s
- claude-sonnet-4.5: 7.5s
- claude-3.5-sonnet: 7.8s
- claude-3.7-sonnet: 8.3s
- claude-3.7-sonnet-thought: 13.0s (partial support)

## Key Findings

1. **High Success Rate**: 92% (11/12) of tested models fully working with
   verified tool execution.

2. **Speed Leaders**: Gemini 2.0 Flash and GPT-4o tied for fastest at 3.2s, with
   O3-mini close behind at 3.3s.

3. **Tool Capability**: ALL tested models demonstrated actual bash tool
   execution capability (not just claims).

4. **Provider Distribution**:
   - Anthropic: 5 models (4 full + 1 partial)
   - OpenAI: 5 models (all full)
   - Google: 2 models (all full)

5. **Notable Issues**:
   - claude-3.7-sonnet-thought: Tool execution successful but API returns "Bad
     Request" error afterward
   - o3-mini: Verified actual tool access (NOT just claiming - actual execution
     confirmed)

## Recommendations

### For Speed-Critical Applications:

1. github-copilot/gemini-2.0-flash-001 (3.2s)
2. github-copilot/gpt-4o (3.2s)
3. github-copilot/o3-mini (3.3s)

### For Balanced Performance:

1. github-copilot/gpt-4.1 (3.9s - fast + proven)
2. github-copilot/gemini-2.5-pro (5.6s - advanced capabilities)
3. github-copilot/claude-sonnet-4 (5.8s - high-performance)

### For Advanced Reasoning:

1. github-copilot/o3-mini (3.3s - reasoning-focused + fast)
2. github-copilot/gpt-5 (5.8s - latest generation)
3. github-copilot/claude-sonnet-4.5 (7.5s - advanced capabilities)

## Test Methodology

**Testing Date:** 2025-10-14

**Test Command:**
`opencode run --model [MODEL] 'use the bash tool to run "echo [MODEL] can use tools" and show the output'`

**Verification Criteria:**

1. Tool execution must actually occur (not just claims)
2. Bash command output must be visible in response
3. Response time measured using Linux `time` command (real/wall-clock time)
4. Success requires both tool execution AND clean completion

**Key Difference from Previous Testing:**

- Previous tests (2025-10-02): Mixed claim-based and execution-based testing
- Current tests (2025-10-14): 100% actual tool execution verification
- All models now verified with real bash tool execution, not relying on model
  claims
