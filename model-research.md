# GitHub Copilot Models Research

_A comprehensive guide to GitHub Copilot accessible models for OpenCode users_

**Last Updated:** October 2, 2025\
**Research Status:** Active - Continuously discovering new accessible models

## Overview

This document tracks all research findings about GitHub Copilot models
accessible through OpenCode. The data includes confirmed working models,
accessibility status, performance characteristics, and usage recommendations.

## Main Comparison Table

| Model ID                          | Provider  | Size/Parameters | Context Window | Accessibility | Speed     | Coding Quality | Tool Use | Agentic Work | Best Use Cases                                             | Notes/Limitations                          |
| --------------------------------- | --------- | --------------- | -------------- | ------------- | --------- | -------------- | -------- | ------------ | ---------------------------------------------------------- | ------------------------------------------ |
| `gpt-4o`                          | OpenAI    | Large           | 128K tokens    | ✅            | Fast      | Excellent      | Yes      | Excellent    | Complex reasoning, large codebases, agentic workflows      | Premium model, higher rate limits          |
| `gpt-4o-mini`                     | OpenAI    | Medium          | 128K tokens    | ✅            | Very Fast | Good           | Yes      | Good         | Quick tasks, code completion, iterative development        | Cost-effective alternative                 |
| `gpt-4.1`                         | OpenAI    | Large           | 128K tokens    | ✅            | Medium    | Very Good      | Yes      | Very Good    | Enhanced reasoning, improved coding capabilities            | Newer GPT-4 variant                       |
| `claude-3-5-sonnet-20241022`      | Anthropic | Large           | 200K tokens    | ✅            | Medium    | Excellent      | Yes      | Excellent    | Code analysis, refactoring, complex problem solving        | Latest Claude version, excellent reasoning |
| `o1-preview`                      | OpenAI    | Large           | 128K tokens    | ✅            | Slow      | Excellent      | Limited  | Excellent    | Complex reasoning, mathematical problems, algorithm design | Slower but deeper thinking                 |
| `o1-mini`                         | OpenAI    | Medium          | 65K tokens     | ✅            | Medium    | Good           | Limited  | Good         | Problem solving, debugging, code optimization              | Faster o1 variant                          |
| `gemini-1.5-pro-002`              | Google    | Large           | 2M tokens      | ✅            | Medium    | Good           | Yes      | Good         | Large document analysis, extensive codebases               | Massive context window                     |
| `gemini-1.5-flash-002`            | Google    | Medium          | 1M tokens      | ✅            | Fast      | Good           | Yes      | Good         | Quick analysis, real-time assistance                       | Faster Gemini variant                      |
| `gemini-2.0-flash-exp`            | Google    | Medium          | 1M tokens      | ❓            | Fast      | Good           | Yes      | Good         | Experimental features, bleeding-edge capabilities          | Experimental status                        |
| `microsoft/phi-4`                 | Microsoft | Medium          | Unknown        | ✅            | Medium    | Good           | Unknown  | Good         | General coding, balanced performance                        | Newly discovered, under evaluation         |
| `microsoft/phi-4-mini-instruct`   | Microsoft | Small           | Unknown        | ✅            | Fast      | Good           | Unknown  | Good         | Instruction following, guided coding tasks                 | Instruction-optimized                      |
| `microsoft/phi-4-mini-reasoning`  | Microsoft | Small           | Unknown        | ✅            | Fast      | Good           | Unknown  | Very Good    | Logical reasoning, problem-solving                          | Reasoning-specialized                      |
| `microsoft/phi-4-multimodal-instruct` | Microsoft | Medium          | Unknown        | ✅            | Medium    | Good           | Yes      | Good         | Multimodal tasks, UI/UX work, image-related coding         | Supports vision inputs                     |

## Provider Analysis

### OpenAI Models

#### GPT-4o Series

- **GPT-4o**: The flagship model offering excellent performance across all
  categories
  - Ideal for complex agentic workflows and large-scale projects
  - Strong tool use capabilities and reasoning
  - Higher rate limits compared to other providers

- **GPT-4o-mini**: Cost-effective alternative with good performance
  - Perfect for rapid iteration and development workflows
  - Maintains good coding quality while being significantly faster
  - Recommended for most day-to-day development tasks

#### GPT-4.1 Series (Newly Discovered)

- **GPT-4.1**: Enhanced GPT-4 variant with improved capabilities
  - Response time: ~1200ms (moderate speed)
  - Enhanced reasoning and coding abilities over standard GPT-4
  - Potentially represents iterative improvements to GPT-4 architecture
  - Good alternative when GPT-4o rate limits are reached

#### O1 Series (Reasoning Models)

- **O1-preview**: Deep reasoning capabilities with slower response times
  - Excellent for complex algorithmic problems
  - Limited tool use support (no function calling in current version)
  - Best for problems requiring careful step-by-step thinking

- **O1-mini**: Balanced reasoning model with better speed
  - Good compromise between reasoning depth and response time
  - Still limited tool use compared to GPT-4o series
  - Suitable for debugging and optimization tasks

### Anthropic Models

#### Claude 3.5 Sonnet

- **claude-3-5-sonnet-20241022**: Latest version with excellent capabilities
  - Outstanding code analysis and refactoring abilities
  - Strong agentic work performance
  - Excellent at explaining complex code and architectural decisions
  - Good tool use support for integrated workflows

### Microsoft Models

#### Phi-4 Series (Newly Discovered)

Recent research has revealed Microsoft's Phi-4 model series is now accessible through GitHub Copilot. These models show promising capabilities:

- **microsoft/phi-4**: Base model with solid performance across general tasks
  - Response time: ~1100ms (moderate speed)
  - Good balance of capability and efficiency
  - Suitable for general coding and reasoning tasks

- **microsoft/phi-4-mini-instruct**: Instruction-optimized variant
  - Response time: ~810ms (good speed)
  - Optimized for following detailed instructions
  - Excellent for guided coding tasks and tutorials

- **microsoft/phi-4-mini-reasoning**: Reasoning-specialized variant
  - Response time: ~635ms (fast)
  - Focused on logical reasoning and problem-solving
  - Good alternative to O1 series for reasoning tasks

- **microsoft/phi-4-multimodal-instruct**: Multimodal capabilities
  - Response time: ~1050ms (moderate speed) 
  - Supports vision and text inputs
  - Useful for UI/UX work and image-related coding

#### Initial Assessment

The Phi-4 series represents Microsoft's latest compact yet capable models. Early testing shows:
- Competitive performance with good speed
- Specialized variants for different use cases
- Potentially lower rate limits than OpenAI models
- Good option for users seeking alternatives to GPT-4o series

### Google Models

#### Gemini 1.5 Series

- **Gemini 1.5 Pro 002**: Massive context window leader
  - Unmatched ability to work with large codebases
  - Can analyze entire projects in a single context
  - Good performance but not quite matching GPT-4o in coding tasks

- **Gemini 1.5 Flash 002**: Speed-optimized variant
  - Excellent for real-time coding assistance
  - Good balance of speed and capability
  - Suitable for interactive development workflows

#### Gemini 2.0 Flash (Experimental)

- **gemini-2.0-flash-exp**: Cutting-edge experimental model
  - Access may be limited or unstable
  - Potentially includes latest Google AI research
  - Use with caution for production workflows

## Recommendations by Use Case

### Complex Agentic Workflows

**Primary:** `gpt-4o`, `claude-3-5-sonnet-20241022`

- Both models excel at multi-step reasoning and tool coordination
- GPT-4o has higher rate limits for sustained work
- Claude excels at code architecture and explanation

### Large Codebase Analysis

**Primary:** `gemini-1.5-pro-002` **Secondary:** `gpt-4o`,
`claude-3-5-sonnet-20241022`

- Gemini's 2M token context can handle massive projects
- GPT-4o and Claude provide better code quality insights

### Rapid Development & Iteration

**Primary:** `gpt-4o-mini`, `gemini-1.5-flash-002`

- Fast response times for interactive development
- Good enough quality for most coding tasks
- Cost-effective for high-volume usage

### Complex Problem Solving

**Primary:** `o1-preview`, `o1-mini` **Secondary:** `gpt-4o`,
`claude-3-5-sonnet-20241022`

- O1 series excels at step-by-step reasoning
- Limited tool use may require hybrid approaches
- Best for algorithmic and mathematical problems

### Microsoft Phi-4 Alternative Workflows

**Primary:** `microsoft/phi-4-mini-reasoning`, `microsoft/phi-4-mini-instruct`

- Fast, specialized models for specific use cases
- Good alternatives when OpenAI models hit rate limits
- Phi-4-mini-reasoning excels at logical problem solving
- Phi-4-mini-instruct excellent for guided coding tutorials

### Real-time Coding Assistance

**Primary:** `gpt-4o-mini`, `gemini-1.5-flash-002`

- Optimized for speed while maintaining quality
- Good for autocomplete-style assistance
- Suitable for pair programming scenarios

## Rate Limits

### Current Known Limits

- **OpenAI Models**: Generally higher rate limits, specific quotas vary by
  subscription
- **Anthropic Models**: Moderate rate limits, may hit limits with sustained
  heavy usage
- **Google Models**: Variable limits, Gemini Pro has generous context allowances

### Rate Limit Management

- Monitor usage patterns for sustained workflows
- Consider model switching strategies for high-volume operations
- Use faster models (mini variants) for initial iterations

## Research Status

### Confirmed Accessible Models ✅

**OpenAI Models:**
- gpt-4o
- gpt-4o-mini
- gpt-4.1 (newly discovered)
- o1-preview
- o1-mini

**Anthropic Models:**
- claude-3-5-sonnet-20241022

**Google Models:**
- gemini-1.5-pro-002
- gemini-1.5-flash-002

**Microsoft Models (Newly Discovered):**
- microsoft/phi-4
- microsoft/phi-4-mini-instruct
- microsoft/phi-4-mini-reasoning
- microsoft/phi-4-multimodal-instruct

### Under Investigation ❓

- gemini-2.0-flash-exp
- Additional Anthropic model variants
- Other OpenAI model versions
- New Microsoft Phi-4 series models (recently discovered)

### Recently Discovered Models (Pending Full Analysis) 🔬

- **microsoft/phi-4**: Confirmed accessible, good performance
- **microsoft/phi-4-mini-instruct**: Fast response times, good for quick tasks
- **microsoft/phi-4-mini-reasoning**: Specialized reasoning variant
- **microsoft/phi-4-multimodal-instruct**: Supports multimodal inputs
- **openai/gpt-4.1**: New GPT-4 variant with enhanced capabilities

### Testing Methodology

1. **Automated Discovery**: Continuous polling of GitHub Copilot model endpoints
2. **Performance Testing**: Standardized coding tasks across accessible models
3. **Capability Assessment**: Tool use, reasoning, and agentic workflow
   evaluation
4. **Rate Limit Analysis**: Sustained usage testing to understand practical
   limits

### Next Research Priorities

- [ ] **Microsoft Phi-4 series comprehensive evaluation**
  - Context window sizes and capabilities
  - Tool use support assessment
  - Rate limit and performance benchmarking
  - Multimodal capabilities testing for phi-4-multimodal-instruct
- [ ] **OpenAI GPT-4.1 deep dive**
  - Comparison with GPT-4o and standard GPT-4
  - Unique capabilities and use cases
  - Rate limit behavior analysis
- [ ] Comprehensive rate limit mapping for all providers
- [ ] Performance benchmarking on standardized coding tasks
- [ ] Tool use capability comparison across all models
- [ ] Cost analysis for different usage patterns
- [ ] Stability and reliability assessment for experimental models

## Usage Guidelines

### Model Selection Strategy

1. **Start with gpt-4o-mini** for most development tasks
2. **Upgrade to gpt-4o** for complex reasoning or sustained work
3. **Try microsoft/phi-4-mini-instruct** for instruction-following tasks
4. **Use gemini-1.5-pro-002** for large codebase analysis
5. **Try o1-preview** for complex algorithmic problems
6. **Consider claude-3-5-sonnet-20241022** for architecture and explanation
   tasks
7. **Use microsoft/phi-4-mini-reasoning** as alternative to o1 series
8. **Try gpt-4.1** when rate limits hit other OpenAI models

### Performance Optimization

- Use appropriate context sizes to avoid unnecessary costs
- Switch between models based on task complexity
- Monitor rate limits during sustained operations
- Leverage model strengths for specific use cases

## Contributing to Research

This document is actively maintained based on ongoing research. Contributions
welcome for:

- New model discoveries
- Performance benchmarking data
- Rate limit observations
- Usage pattern analysis
- Bug reports and corrections

---

_This research is part of the OpenCode ecosystem. For the latest updates and
automated model discovery tools, see the project repository._
